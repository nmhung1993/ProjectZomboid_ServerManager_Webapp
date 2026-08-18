--
-- ZM_ClientCommands.lua — Client-side handler for ZomboidManager
-- 1. Mirrors server-side inventory changes on the client for instant UI updates.
-- 2. Reports client-side player profile (Profession & Traits) to the server via client command.
--

print("[ZM_ClientCommands] Lua file loaded — client-side handler is active")

local function reportPlayerProfile()
    local player = getSpecificPlayer(0)
    if not player then return end

    -- Extract Profession
    local prof = "unemployed"
    if player.getDescriptor then
        local ok, desc = pcall(player.getDescriptor, player)
        if ok and desc then
            if desc.getProfession then
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

    -- Resolve profession display name if ProfessionFactory available on client
    if prof and ProfessionFactory and ProfessionFactory.getProfession then
        local ok, profObj = pcall(ProfessionFactory.getProfession, prof)
        if ok and profObj and profObj.getName then
            local okN, name = pcall(profObj.getName, profObj)
            if okN and name and name ~= "" then
                prof = tostring(name)
            end
        end
    end

    -- Extract Traits
    local traits = {}
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
            if not s then s = tostring(t) end
        else
            s = tostring(t)
        end

        if s and s ~= "" and s ~= "nil" and not seen[s] then
            seen[s] = true
            table.insert(traits, s)
        end
    end

    -- 1. Check TraitFactory against player:HasTrait / hasTrait on client
    if TraitFactory and TraitFactory.getTraits then
        local ok, allTraits = pcall(TraitFactory.getTraits)
        if ok and allTraits then
            local function checkObj(traitObj)
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
                    if okGet and tObj then checkObj(tObj) end
                end
            elseif allTraits.iterator then
                local okIter, iter = pcall(allTraits.iterator, allTraits)
                if okIter and iter then
                    while iter:hasNext() do checkObj(iter:next()) end
                end
            end
        end
    end

    -- 2. Fallback: player:getTraits() on client
    if #traits == 0 and player.getTraits then
        local ok, tl = pcall(player.getTraits, player)
        if ok and tl then
            if tl.size and tl.get then
                for i = 0, tl:size() - 1 do
                    local okGet, t = pcall(tl.get, tl, i)
                    if okGet and t then addTrait(t) end
                end
            elseif tl.iterator then
                local okIter, iter = pcall(tl.iterator, tl)
                if okIter and iter then
                    while iter:hasNext() do addTrait(iter:next()) end
                end
            end
        end
    end

    -- Send profile to server
    print("[ZM_ClientCommands] Reporting player profile to server: prof=" .. tostring(prof) .. ", traits count=" .. tostring(#traits))
    sendClientCommand(player, "ZomboidManager", "reportProfile", {
        profession = prof,
        traits = traits,
    })
end

local function onServerCommand(module, command, args)
    if module ~= "ZomboidManager" then
        return
    end

    print("[ZM_ClientCommands] Received command: module=" .. tostring(module) .. " command=" .. tostring(command) .. " args=" .. tostring(args))

    local playerObj = getSpecificPlayer(0)
    if not playerObj then
        print("[ZM_ClientCommands] No player object found, skipping")
        return
    end

    if command == "requestProfile" then
        reportPlayerProfile()
        return
    end

    local inv = playerObj:getInventory()
    if not inv then
        print("[ZM_ClientCommands] No inventory found, skipping")
        return
    end

    if command == "removeItem" then
        local itemType = args.item_type
        local count = tonumber(args.count) or 1
        print("[ZM_ClientCommands] removeItem: type=" .. tostring(itemType) .. " count=" .. tostring(count))
        for i = 1, count do
            local item = inv:getFirstTypeRecurse(itemType)
            if item then
                local container = item:getContainer() or inv
                container:Remove(item)
                print("[ZM_ClientCommands] removeItem: removed instance " .. tostring(i) .. " of " .. tostring(itemType))
            else
                print("[ZM_ClientCommands] removeItem: item NOT found for instance " .. tostring(i) .. " of " .. tostring(itemType))
            end
        end

    elseif command == "addItem" then
        local itemType = args.item_type
        local count = tonumber(args.count) or 1
        print("[ZM_ClientCommands] addItem: type=" .. tostring(itemType) .. " count=" .. tostring(count))
        for i = 1, count do
            inv:AddItem(itemType)
            print("[ZM_ClientCommands] addItem: added instance " .. tostring(i) .. " of " .. tostring(itemType))
        end
    end
end

Events.OnServerCommand.Add(onServerCommand)
Events.OnGameStart.Add(reportPlayerProfile)
Events.OnCreatePlayer.Add(function() reportPlayerProfile() end)
Events.EveryTenMinutes.Add(reportPlayerProfile)

print("[ZM_ClientCommands] Event handlers registered (OnServerCommand, OnGameStart, OnCreatePlayer, EveryTenMinutes)")
