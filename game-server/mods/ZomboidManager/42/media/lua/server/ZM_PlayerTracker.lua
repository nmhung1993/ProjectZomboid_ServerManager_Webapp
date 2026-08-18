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

--- Get the player's profession
local function getProfession(player)
    if not player then return "unemployed" end
    local prof = nil
    if player.getDescriptor then
        local desc = player:getDescriptor()
        if desc then
            if desc.getProfession then
                local ok, p = pcall(desc.getProfession, desc)
                if ok and p and p ~= "" then
                    prof = p
                end
            end
            if not prof and desc.getProfessionName then
                local ok, p = pcall(desc.getProfessionName, desc)
                if ok and p and p ~= "" then
                    prof = p
                end
            end
        end
    end
    if not prof and player.getSurvivorDesc then
        local desc = player:getSurvivorDesc()
        if desc then
            if desc.getProfession then
                local ok, p = pcall(desc.getProfession, desc)
                if ok and p and p ~= "" then
                    prof = p
                end
            end
            if not prof and desc.getProfessionName then
                local ok, p = pcall(desc.getProfessionName, desc)
                if ok and p and p ~= "" then
                    prof = p
                end
            end
        end
    end
    if not prof and player.getProfession then
        local ok, p = pcall(player.getProfession, player)
        if ok and p and p ~= "" then
            prof = p
        end
    end
    return prof or "unemployed"
end

--- Collect all traits for a player
local function getTraits(player)
    local traits = {}
    if not player then return traits end
    local seen = {}

    local function addTrait(t)
        if not t then return end
        local s = tostring(t)
        if s and s ~= "" and not seen[s] then
            seen[s] = true
            table.insert(traits, s)
        end
    end

    -- Method 1: Check all registered traits in TraitFactory
    if TraitFactory and TraitFactory.getTraits then
        local ok, allTraits = pcall(TraitFactory.getTraits)
        if ok and allTraits and allTraits.size then
            for i = 0, allTraits:size() - 1 do
                local traitObj = allTraits:get(i)
                if traitObj then
                    local tType = nil
                    if traitObj.getType then
                        local okT, t = pcall(traitObj.getType, traitObj)
                        if okT and t and t ~= "" then tType = tostring(t) end
                    end
                    local tLabel = nil
                    if traitObj.getLabel then
                        local okL, l = pcall(traitObj.getLabel, traitObj)
                        if okL and l and l ~= "" then tLabel = tostring(l) end
                    end

                    local has = false
                    if tType then
                        if player.HasTrait then
                            local okH, h = pcall(player.HasTrait, player, tType)
                            if okH and h then has = true end
                        end
                        if not has and player.hasTrait then
                            local okH, h = pcall(player.hasTrait, player, tType)
                            if okH and h then has = true end
                        end
                    end
                    if not has and tLabel then
                        if player.HasTrait then
                            local okH, h = pcall(player.HasTrait, player, tLabel)
                            if okH and h then has = true end
                        end
                        if not has and player.hasTrait then
                            local okH, h = pcall(player.hasTrait, player, tLabel)
                            if okH and h then has = true end
                        end
                    end

                    if has then
                        addTrait(tType or tLabel)
                    end
                end
            end
        end
    end

    -- Method 2: player:getTraits()
    if player.getTraits then
        local ok, traitList = pcall(player.getTraits, player)
        if ok and traitList then
            if traitList.size then
                for i = 0, traitList:size() - 1 do
                    local okGet, t = pcall(traitList.get, traitList, i)
                    if okGet and t then
                        if type(t) == "userdata" and t.getType then
                            local okType, tType = pcall(t.getType, t)
                            if okType and tType then addTrait(tType) else addTrait(t) end
                        else
                            addTrait(t)
                        end
                    end
                end
            elseif type(traitList) == "table" then
                for _, t in pairs(traitList) do
                    addTrait(t)
                end
            end
        end
    end

    -- Method 3: player:getCharacterTraits()
    if player.getCharacterTraits then
        local ok, ct = pcall(player.getCharacterTraits, player)
        if ok and ct then
            if ct.getTraits then
                local ok2, inner = pcall(ct.getTraits, ct)
                if ok2 and inner and inner.size then
                    for i = 0, inner:size() - 1 do
                        local okGet, t = pcall(inner.get, inner, i)
                        if okGet and t then addTrait(t) end
                    end
                end
            elseif ct.size then
                for i = 0, ct:size() - 1 do
                    local okGet, t = pcall(ct.get, ct, i)
                    if okGet and t then addTrait(t) end
                end
            end
        end
    end

    -- Method 4: Descriptor CharacterTraits
    if player.getDescriptor then
        local desc = player:getDescriptor()
        if desc and desc.getCharacterTraits then
            local ok, ct = pcall(desc.getCharacterTraits, desc)
            if ok and ct and ct.size then
                for i = 0, ct:size() - 1 do
                    local okGet, t = pcall(ct.get, ct, i)
                    if okGet and t then addTrait(t) end
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
