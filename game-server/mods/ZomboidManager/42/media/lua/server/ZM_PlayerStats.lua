--
-- ZM_PlayerStats.lua — Exports player stats (kills, hours survived, skills, profession, traits)
-- Combines server-side stats with client-reported profiles (Profession & Traits).
-- Writes to Lua/player_stats.json.
--

local JSON = require("ZM_JSON")

ZM_PlayerStats = {}
ZM_PlayerStats.clientProfiles = {} -- username -> { profession = "...", traits = {...} }

local STATS_FILE = "player_stats.json"

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

--- Collect all perk levels for a player
local function getSkills(player)
    local skills = {}

    local perkList = PerkFactory.PerkList
    if not perkList then
        return skills
    end

    for i = 0, perkList:size() - 1 do
        local perk = perkList:get(i)
        if perk then
            local ok, level = pcall(player.getPerkLevel, player, perk)
            if ok and level and level > 0 then
                local name = perk:getName() or tostring(perk)
                skills[name] = level
            end
        end
    end

    return skills
end

--- Get the player's profession (B42 + B41 fallback)
local function getProfessionFallback(player)
    if not player then return "unemployed" end
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

--- Collect traits for a player (B42 + B41 fallback)
local function getTraitsFallback(player)
    local traits = {}
    if not player then return traits end
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

--- Handle client commands on the server (receiving client reported profile)
local function onClientCommand(module, command, player, args)
    if module ~= "ZomboidManager" then return end

    if command == "reportProfile" then
        local username = nil
        if player and player.getUsername then
            username = player:getUsername()
        end
        if username and args then
            ZM_PlayerStats.clientProfiles[username] = {
                profession = args.profession or "unemployed",
                traits = args.traits or {},
                updated_at = os.time(),
            }
            print("[ZomboidManager] Client '" .. tostring(username) .. "' reported profile: profession=" .. tostring(args.profession) .. ", traits count=" .. tostring(#(args.traits or {})))
            -- Export stats immediately with updated profile
            ZM_PlayerStats.exportAll()
        end
    end
end

Events.OnClientCommand.Add(onClientCommand)

--- Export stats for all online players
--- @return number count of players exported
function ZM_PlayerStats.exportAll()
    local onlinePlayers = getOnlinePlayers()
    if not onlinePlayers then
        return 0
    end

    local playerStats = {}
    for i = 0, onlinePlayers:size() - 1 do
        local player = onlinePlayers:get(i)
        if player then
            local ok, entry = pcall(function()
                local username = player:getUsername() or "unknown"

                local zombieKills = 0
                if player.getZombieKills then
                    zombieKills = player:getZombieKills() or 0
                end

                local hoursSurvived = 0
                if player.getHoursSurvived then
                    hoursSurvived = math.floor((player:getHoursSurvived() or 0) * 10 + 0.5) / 10
                end

                local profession = "unemployed"
                local traits = {}

                -- Check client reported profile first (ground truth from client instance)
                local clientProfile = ZM_PlayerStats.clientProfiles[username]
                if clientProfile and (clientProfile.profession ~= "unemployed" or #clientProfile.traits > 0) then
                    profession = clientProfile.profession or "unemployed"
                    traits = clientProfile.traits or {}
                else
                    -- Fallback to server side extraction
                    profession = getProfessionFallback(player)
                    traits = getTraitsFallback(player)

                    -- Request client to send updated profile
                    pcall(sendServerCommand, player, "ZomboidManager", "requestProfile", {})
                end

                return {
                    username = username,
                    zombie_kills = zombieKills,
                    hours_survived = hoursSurvived,
                    profession = profession,
                    skills = getSkills(player),
                    traits = traits,
                    is_dead = player:isDead() or false,
                }
            end)

            if ok and entry then
                table.insert(playerStats, entry)
            elseif not ok then
                print("[ZomboidManager] WARNING: failed to export stats for player index " .. i .. ": " .. tostring(entry))
            end
        end
    end

    local data = {
        timestamp = getTimestamp(),
        player_count = #playerStats,
        players = playerStats,
    }

    local ok, jsonStr = pcall(JSON.encode, data)
    if not ok then
        print("[ZomboidManager] ERROR encoding player stats: " .. tostring(jsonStr))
        return 0
    end

    local writer = getFileWriter(STATS_FILE, true, false)
    if not writer then
        print("[ZomboidManager] ERROR: cannot write player stats")
        return 0
    end

    writer:write(jsonStr)
    writer:close()

    return #playerStats
end

return ZM_PlayerStats
