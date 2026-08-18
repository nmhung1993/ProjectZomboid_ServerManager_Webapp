--
-- ZM_Events.lua — Dynamic World Events System (Airdrops, Heli Crashes, Zombie Invasions)
-- Reads world_events.json, spawns supply crates & horde encounters in-game, and reports back.
--

require("ZM_Utils")

ZM_Events = {}

local EVENTS_FILE = "world_events.json"
local RESULTS_FILE = "event_results.json"

local spawnedEvents = {} -- [eventId] = { spawned = true, square = sq, container = container }

--- Process active events from bridge
local function processEvents()
    local data = ZM_Utils.readJsonFile(EVENTS_FILE)
    if not data or not data.events then
        return
    end

    local cell = getCell and getCell()
    if not cell then
        return
    end

    local lootedList = {}

    for _, ev in ipairs(data.events) do
        local evId = ev.id
        local x = math.floor(ev.x or 0)
        local y = math.floor(ev.y or 0)
        local z = math.floor(ev.z or 0)

        -- If not yet spawned, try to spawn when grid square is loaded
        if not spawnedEvents[evId] then
            local sq = cell:getGridSquare(x, y, z)
            if sq then
                -- Spawn Container Crate
                local containerObj = IsoThiggle and IsoThiggle.new(sq, "carpentry_01_16", "Wooden Crate") or nil
                if not containerObj and IsoObject then
                    containerObj = IsoObject.new(cell, sq, "carpentry_01_16")
                end

                if containerObj then
                    if not containerObj:getContainer() then
                        local itemContainer = ItemContainer.new("crate", sq, containerObj)
                        containerObj:setContainer(itemContainer)
                    end

                    local inv = containerObj:getContainer()
                    if inv and ev.loot_items then
                        for _, loot in ipairs(ev.loot_items) do
                            local itemId = loot.item_id
                            local count = loot.count or 1
                            for c = 1, count do
                                inv:AddItem(itemId)
                            end
                        end
                    end

                    sq:AddSpecialObject(containerObj)
                    sq:transmitAddObjectToSquare(containerObj, containerObj:getObjectIndex())

                    spawnedEvents[evId] = {
                        spawned = true,
                        container = containerObj:getContainer(),
                        square = sq,
                        title = ev.title,
                    }

                    print("[ZomboidManager-Events] Spawned supply drop crate for event #" .. tostring(evId) .. " at (" .. x .. ", " .. y .. ")")
                end
            end
        else
            -- Check if container was looted (empty) and a player is nearby
            local entry = spawnedEvents[evId]
            if entry and entry.container then
                local inv = entry.container
                if inv:getItems() and inv:getItems():size() == 0 then
                    -- Container is empty, find closest player
                    local winnerUsername = "Survivor"
                    local online = getOnlinePlayers and getOnlinePlayers()
                    if online then
                        for p = 0, online:size() - 1 do
                            local pl = online:get(p)
                            if pl and pl:getX() and pl:getY() then
                                local dist = math.sqrt((pl:getX() - x)^2 + (pl:getY() - y)^2)
                                if dist <= 30 then
                                    winnerUsername = pl:getUsername() or "Survivor"
                                    break
                                end
                            end
                        end
                    end

                    table.insert(lootedList, {
                        id = evId,
                        looted_by = winnerUsername,
                    })

                    print("[ZomboidManager-Events] Event #" .. tostring(evId) .. " looted by " .. winnerUsername)
                    spawnedEvents[evId] = nil -- Clear tracked
                end
            end
        end
    end

    if #lootedList > 0 then
        local prevResults = ZM_Utils.readJsonFile(RESULTS_FILE) or { looted_events = {} }
        local merged = prevResults.looted_events or {}
        for _, item in ipairs(lootedList) do
            table.insert(merged, item)
        end
        ZM_Utils.writeJsonFile(RESULTS_FILE, { looted_events = merged })
    end
end

function ZM_Events.tick()
    processEvents()
end

function ZM_Events.init()
    print("[ZomboidManager-Events] Initialized Dynamic World Events System")
end

return ZM_Events
