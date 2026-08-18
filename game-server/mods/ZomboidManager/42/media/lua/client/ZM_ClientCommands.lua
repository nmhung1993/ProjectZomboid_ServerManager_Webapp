--
-- ZM_ClientCommands.lua — Client-side handler for ZomboidManager
-- 1. Mirrors server-side inventory changes on the client for instant UI updates.
-- 2. Reports client-side player profile (Profession & Traits) to the server via client command.
--

print("[ZM_ClientCommands] Lua file loaded — client-side handler is active")

local function reportPlayerProfile()
    local player = getSpecificPlayer(0)
    if not player then return end

    -- 1. Extract Profession (B42 + B41 fallback)
    local prof = "unemployed"

    -- B42 CharacterProfessionDefinition
    if player.getDescriptor then
        local okDesc, desc = pcall(player.getDescriptor, player)
        if okDesc and desc then
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

    -- Resolve profession display name if ProfessionFactory available
    if prof and prof ~= "unemployed" and ProfessionFactory and ProfessionFactory.getProfession then
        local ok, profObj = pcall(ProfessionFactory.getProfession, prof)
        if ok and profObj and profObj.getName then
            local okN, name = pcall(profObj.getName, profObj)
            if okN and name and name ~= "" then
                prof = tostring(name)
            end
        end
    end

    -- 2. Extract Traits (B42 CharacterTraitDefinition + B41 fallback)
    local traits = {}
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
