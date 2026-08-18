--
-- ZM_PlayerTracker.lua — Writes online player positions to players_live.json
--

local JSON = require("ZM_JSON")

ZM_PlayerTracker = {}

local POSITIONS_FILE = "players_live.json"

--- Get ISO 8601 timestamp
local function getTimestamp()
    if getGameTime then
        local gt = getGameTime()
        return string.format("%04d-%02d-%02dT%02d:%02d:%02d",
            gt:getYear(), gt:getMonth() + 1, gt:getDay(),
            gt:getHour(), gt:getMinutes(), 0)
    end
    local cal = Calendar.getInstance()
    return string.format("%04d-%02d-%02dT%02d:%02d:%02d",
        cal:get(Calendar.YEAR), cal:get(Calendar.MONTH) + 1, cal:get(Calendar.DAY_OF_MONTH),
        cal:get(Calendar.HOUR_OF_DAY), cal:get(Calendar.MINUTE), cal:get(Calendar.SECOND))
end

--- Get the player's profession (B42 + B41 fallback)
local function getProfession(player)
    if not player then return "unemployed" end

    -- Check client profile cache if available
    local username = player:getUsername()
    if username and ZM_PlayerStats and ZM_PlayerStats.clientProfiles and ZM_PlayerStats.clientProfiles[username] then
        local cp = ZM_PlayerStats.clientProfiles[username]
        if cp.profession and cp.profession ~= "unemployed" then
            return cp.profession
        end
    end

    local prof = "unemployed"
    if player.getDescriptor then
        local okDesc, desc = pcall(player.getDescriptor, player)
        if okDesc and desc then
            -- B42 CharacterProfessionDefinition
            if desc.getCharacterProfession and CharacterProfessionDefinition and CharacterProfessionDefinition.getCharacterProfessionDefinition then
                local okProf, charProf = pcall(desc.getCharacterProfession, desc)
                if okProf and charProf then
                    local okDef, def = pcall(CharacterProfessionDefinition.getCharacterProfessionDefinition, charProf)
                    if okDef and def and def.getUIName then
                        local okName, name = pcall(def.getUIName, def)
                        if okName and name and tostring(name) ~= "" then
                            prof = tostring(name)
                        end
                    end
                end
            end

            if prof == "unemployed" and desc.getProfession then
                local okP, p = pcall(desc.getProfession, desc)
                if okP and p and tostring(p) ~= "" and tostring(p) ~= "nil" then
                    prof = tostring(p)
                end
            end

            if prof == "unemployed" and desc.getProfessionName then
                local okP, p = pcall(desc.getProfessionName, desc)
                if okP and p and tostring(p) ~= "" and tostring(p) ~= "nil" then
                    prof = tostring(p)
                end
            end
        end
    end

    if prof == "unemployed" and player.getProfession then
        local okP, p = pcall(player.getProfession, player)
        if okP and p and tostring(p) ~= "" and tostring(p) ~= "nil" then
            prof = tostring(p)
        end
    end

    if prof and prof ~= "unemployed" and ProfessionFactory and ProfessionFactory.getProfession then
        local ok, profObj = pcall(ProfessionFactory.getProfession, prof)
        if ok and profObj and profObj.getName then
            local okN, name = pcall(profObj.getName, profObj)
            if okN and name and name ~= "" then
                prof = tostring(name)
            end
        end
    end

    return prof
end

--- Collect all traits for a player (B42 + B41 fallback)
local function getTraits(player)
    local traits = {}
    if not player then return traits end

    -- Check client profile cache if available
    local username = player:getUsername()
    if username and ZM_PlayerStats and ZM_PlayerStats.clientProfiles and ZM_PlayerStats.clientProfiles[username] then
        local cp = ZM_PlayerStats.clientProfiles[username]
        if cp.traits and #cp.traits > 0 then
            return cp.traits
        end
    end

    local seen = {}
    local function addTrait(t)
        if not t then return end
        local s = tostring(t)
        if s and s ~= "" and s ~= "nil" and not seen[s] then
            seen[s] = true
            table.insert(traits, s)
        end
    end

    -- B42 CharacterTraits.getKnownTraits() + CharacterTraitDefinition
    if player.getCharacterTraits then
        local okCt, ct = pcall(player.getCharacterTraits, player)
        if okCt and ct and ct.getKnownTraits then
            local okKnown, known = pcall(ct.getKnownTraits, ct)
            if okKnown and known and known.size then
                for i = 0, known:size() - 1 do
                    local tKey = known:get(i)
                    if tKey then
                        local added = false
                        if CharacterTraitDefinition and CharacterTraitDefinition.getCharacterTraitDefinition then
                            local okDef, def = pcall(CharacterTraitDefinition.getCharacterTraitDefinition, tKey)
                            if okDef and def and def.getLabel then
                                local okLbl, lbl = pcall(def.getLabel, def)
                                if okLbl and lbl and tostring(lbl) ~= "" then
                                    addTrait(tostring(lbl))
                                    added = true
                                end
                            end
                        end
                        if not added then
                            addTrait(tostring(tKey))
                        end
                    end
                end
            end
        end
    end

    -- B41 TraitFactory fallback
    if #traits == 0 and TraitFactory and TraitFactory.getTraits then
        local ok, allTraits = pcall(TraitFactory.getTraits)
        if ok and allTraits and allTraits.size then
            for i = 0, allTraits:size() - 1 do
                local tObj = allTraits:get(i)
                if tObj then
                    local tType = tObj.getType and tObj:getType() or tostring(tObj)
                    local tLabel = tObj.getLabel and tObj:getLabel() or tType
                    if (player.HasTrait and player:HasTrait(tType)) or (player.hasTrait and player:hasTrait(tType)) then
                        addTrait(tLabel)
                    end
                end
            end
        end
    end

    return traits
end

--- Export positions of all online players
function ZM_PlayerTracker.exportPositions()
    local onlinePlayers = getOnlinePlayers()
    if not onlinePlayers then
        return false
    end

    local players = {}
    for i = 0, onlinePlayers:size() - 1 do
        local player = onlinePlayers:get(i)
        if player then
            local entry = {
                username = player:getUsername() or "unknown",
                profession = getProfession(player),
                traits = getTraits(player),
                x = math.floor((player:getX() or 0) * 10) / 10,
                y = math.floor((player:getY() or 0) * 10) / 10,
                z = math.floor(player:getZ() or 0),
                is_dead = player:isDead() or false,
                is_ghost = player:isGhostMode() and player:isGhostMode() or false,
            }
            table.insert(players, entry)
        end
    end

    local data = {
        timestamp = getTimestamp(),
        players = players,
    }

    local ok, jsonStr = pcall(JSON.encode, data)
    if not ok then
        print("[ZomboidManager] ERROR encoding player positions: " .. tostring(jsonStr))
        return false
    end

    local writer = getFileWriter(POSITIONS_FILE, true, false)
    if not writer then
        print("[ZomboidManager] ERROR: cannot write player positions")
        return false
    end

    writer:write(jsonStr)
    writer:close()

    return true
end

return ZM_PlayerTracker
