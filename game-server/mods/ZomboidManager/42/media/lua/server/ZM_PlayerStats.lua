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

--- Get the player's profession (Server-side fallback)
local function getProfessionFallback(player)
    if not player then return "unemployed" end
    local prof = nil

    local function checkDesc(desc)
        if not desc then return nil end
        if desc.getProfession then
            local ok, p = pcall(desc.getProfession, desc)
            if ok and p and tostring(p) ~= "" and tostring(p) ~= "nil" then
                return tostring(p)
            end
        end
        if desc.getProfessionName then
            local ok, p = pcall(desc.getProfessionName, desc)
            if ok and p and tostring(p) ~= "" and tostring(p) ~= "nil" then
                return tostring(p)
            end
        end
        if desc.profession then
            local p = desc.profession
            if p and tostring(p) ~= "" and tostring(p) ~= "nil" then
                return tostring(p)
            end
        end
        return nil
    end

    if player.getDescriptor then
        local ok, desc = pcall(player.getDescriptor, player)
        if ok and desc then
            prof = checkDesc(desc)
        end
    end

    if not prof and player.getSurvivorDesc then
        local ok, desc = pcall(player.getSurvivorDesc, player)
        if ok and desc then
            prof = checkDesc(desc)
        end
    end

    if not prof and player.getProfession then
        local ok, p = pcall(player.getProfession, player)
        if ok and p and tostring(p) ~= "" and tostring(p) ~= "nil" then
            prof = tostring(p)
        end
    end

    if prof and ProfessionFactory and ProfessionFactory.getProfession then
        local ok, profObj = pcall(ProfessionFactory.getProfession, prof)
        if ok and profObj and profObj.getName then
            local okN, name = pcall(profObj.getName, profObj)
            if okN and name and name ~= "" then
                prof = tostring(name)
            end
        end
    end

    return prof or "unemployed"
end

--- Collect traits for a player (Server-side fallback)
local function getTraitsFallback(player)
    local traits = {}
    if not player then return traits end
    local seen = {}

    local function addTrait(t)
        if not t then return end
        local s = nil
        if type(t) == "userdata" then
            if t.getType then
                local ok, res = pcall(t.getType, t)
                if ok and res and res ~= "" then s = tostring(res) end
            end
            if not s and t.getLabel then
                local ok, res = pcall(t.getLabel, t)
                if ok and res and res ~= "" then s = tostring(res) end
            end
            if not s and t.getName then
                local ok, res = pcall(t.getName, t)
                if ok and res and res ~= "" then s = tostring(res) end
            end
            if not s and t.getTrait then
                local ok, res = pcall(t.getTrait, t)
                if ok and res and res ~= "" then s = tostring(res) end
            end
            if not s then s = tostring(t) end
        else
            s = tostring(t)
        end

        if s and s ~= "" and s ~= "nil" and not seen[s] then
            seen[s] = true
            table.insert(traits, s)
        end
    end

    local function processCollection(col)
        if not col then return end

        if col.iterator then
            local okIter, iter = pcall(col.iterator, col)
            if okIter and iter and iter.hasNext and iter.next then
                local count = 0
                while iter:hasNext() and count < 200 do
                    count = count + 1
                    local okNext, item = pcall(iter.next, iter)
                    if okNext and item then addTrait(item) end
                end
                if count > 0 then return end
            end
        end

        if col.toArray then
            local okArr, arr = pcall(col.toArray, col)
            if okArr and arr then
                local len = arr.length or #arr
                if len and len > 0 then
                    for idx = 0, len - 1 do
                        local item = arr[idx]
                        if item then addTrait(item) end
                    end
                    return
                end
            end
        end

        if col.size and col.get then
            local okSize, sz = pcall(col.size, col)
            if okSize and sz and sz > 0 then
                for idx = 0, sz - 1 do
                    local okGet, item = pcall(col.get, col, idx)
                    if okGet and item then addTrait(item) end
                end
                return
            end
        end

        if type(col) == "table" then
            for _, item in pairs(col) do addTrait(item) end
        end
    end

    if player.getCharacterTraits then
        local ok, ct = pcall(player.getCharacterTraits, player)
        if ok and ct then
            processCollection(ct)
            if ct.getTraits then
                local ok2, inner = pcall(ct.getTraits, ct)
                if ok2 and inner then processCollection(inner) end
            end
        end
    end

    if player.getTraits then
        local ok, tl = pcall(player.getTraits, player)
        if ok and tl then
            processCollection(tl)
            if tl.getTraits then
                local ok2, inner = pcall(tl.getTraits, tl)
                if ok2 and inner then processCollection(inner) end
            end
        end
    end

    if player.getDescriptor then
        local okDesc, desc = pcall(player.getDescriptor, player)
        if okDesc and desc then
            if desc.getCharacterTraits then
                local ok, ct = pcall(desc.getCharacterTraits, desc)
                if ok and ct then processCollection(ct) end
            end
            if desc.getTraits then
                local ok, tl = pcall(desc.getTraits, desc)
                if ok and tl then processCollection(tl) end
            end
        end
    end

    if TraitFactory and TraitFactory.getTraits then
        local ok, allTraits = pcall(TraitFactory.getTraits)
        if ok and allTraits then
            local function checkTraitObj(traitObj)
                if not traitObj then return end
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

            if allTraits.size and allTraits.get then
                for i = 0, allTraits:size() - 1 do
                    local okGet, tObj = pcall(allTraits.get, allTraits, i)
                    if okGet and tObj then checkTraitObj(tObj) end
                end
            elseif allTraits.iterator then
                local okIter, iter = pcall(allTraits.iterator, allTraits)
                if okIter and iter then
                    while iter:hasNext() do checkTraitObj(iter:next()) end
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
                if clientProfile then
                    profession = clientProfile.profession or "unemployed"
                    traits = clientProfile.traits or {}
                else
                    -- Request client to send profile
                    pcall(sendServerCommand, player, "ZomboidManager", "requestProfile", {})
                    -- Fallback to server side extraction
                    profession = getProfessionFallback(player)
                    traits = getTraitsFallback(player)
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
