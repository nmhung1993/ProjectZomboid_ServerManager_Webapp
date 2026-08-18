--
-- ZM_Cleaner.lua — Server-side Lag Cleaner & Garbage Collector
-- Handles automated dead body cleanup and ground junk item removal.
--

require("ZM_Utils")

ZM_Cleaner = {}

local COMMANDS_FILE = "cleaner_commands.json"
local RESULTS_FILE = "cleaner_results.json"

--- Execute cleanup actions based on commands
local function processCleanerCommands()
    local commands = ZM_Utils.readJsonFile(COMMANDS_FILE)
    if not commands or not commands.actions or #commands.actions == 0 then
        return
    end

    local cell = getCell and getCell()
    if not cell then return end

    local results = {
        timestamp = getTimestamp and getTimestamp() or os.time(),
        actions_completed = {},
    }

    for _, cmd in ipairs(commands.actions) do
        local action = cmd.action

        if action == "clean_dead_bodies" then
            local removedBodies = 0
            -- Scan squares in active cell and remove IsoDeadBody objects
            local minX = cell:getMinX() or 0
            local maxX = cell:getMaxX() or 0
            local minY = cell:getMinY() or 0
            local maxY = cell:getMaxY() or 0

            for x = minX, maxX do
                for y = minY, maxY do
                    local sq = cell:getGridSquare(x, y, 0)
                    if sq then
                        local deadBodies = sq:getDeadBodys()
                        if deadBodies and deadBodies:size() > 0 then
                            for b = deadBodies:size() - 1, 0, -1 do
                                local body = deadBodies:get(b)
                                if body then
                                    sq:removeCorpse(body, false)
                                    removedBodies = removedBodies + 1
                                end
                            end
                        end
                    end
                end
            end

            table.insert(results.actions_completed, {
                action = "clean_dead_bodies",
                items_removed = removedBodies,
            })
            print("[ZomboidManager-Cleaner] Removed " .. removedBodies .. " dead bodies from loaded squares")

        elseif action == "clean_ground_items" then
            local blacklist = cmd.blacklist or {
                "Base.RippedSheets", "Base.RippedSheetsDirty", "Base.TreeBranch", "Base.Twigs", "Base.ShatteredGlass"
            }
            local blMap = {}
            for _, itemType in ipairs(blacklist) do
                blMap[itemType] = true
            end

            local removedItems = 0
            local minX = cell:getMinX() or 0
            local maxX = cell:getMaxX() or 0
            local minY = cell:getMinY() or 0
            local maxY = cell:getMaxY() or 0

            for x = minX, maxX do
                for y = minY, maxY do
                    local sq = cell:getGridSquare(x, y, 0)
                    if sq then
                        local worldObjects = sq:getWorldObjects()
                        if worldObjects and worldObjects:size() > 0 then
                            for o = worldObjects:size() - 1, 0, -1 do
                                local wObj = worldObjects:get(o)
                                local item = wObj and wObj:getItem()
                                if item and blMap[item:getFullType()] then
                                    sq:transmitRemoveItemFromSquare(wObj)
                                    removedItems = removedItems + 1
                                end
                            end
                        end
                    end
                end
            end

            table.insert(results.actions_completed, {
                action = "clean_ground_items",
                items_removed = removedItems,
            })
            print("[ZomboidManager-Cleaner] Removed " .. removedItems .. " junk items from ground")
        end
    end

    ZM_Utils.writeJsonFile(RESULTS_FILE, results)
    ZM_Utils.writeJsonFile(COMMANDS_FILE, { actions = {} })
end

function ZM_Cleaner.tick()
    processCleanerCommands()
end

function ZM_Cleaner.init()
    print("[ZomboidManager-Cleaner] Initialized Auto Lag Cleaner")
end

return ZM_Cleaner
