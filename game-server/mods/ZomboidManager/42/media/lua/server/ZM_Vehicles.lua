--
-- ZM_Vehicles.lua — Server-side Vehicle Manager & AVCS Integration
-- Scans active vehicles, integrates with Another Vehicle Claim System (AVCS), and executes commands.
--

require("ZM_Utils")

ZM_Vehicles = {}

local VEHICLES_FILE = "vehicles.json"
local COMMANDS_FILE = "vehicle_commands.json"

--- Export vehicles to vehicles.json
function ZM_Vehicles.export()
    local avcsData = nil
    if ModData and ModData.exists and ModData.exists("AVCSByVehicleSQLID") then
        avcsData = ModData.getOrCreate("AVCSByVehicleSQLID")
    end

    local vehicleList = {}

    -- Scan active vehicles from IsoWorld
    if getCell and getCell() then
        local cell = getCell()
        local vehicles = cell:getVehicles()
        if vehicles then
            for i = 0, vehicles:size() - 1 do
                local v = vehicles:get(i)
                if v then
                    local sqlId = v:getSqlId() or v:getId()
                    local scriptName = v:getScriptName() or "Base.CarNormal"
                    local owner = nil

                    -- Check AVCS claim
                    if avcsData and sqlId and avcsData[tostring(sqlId)] then
                        owner = avcsData[tostring(sqlId)].OwnerPlayerID
                    elseif avcsData and sqlId and avcsData[sqlId] then
                        owner = avcsData[sqlId].OwnerPlayerID
                    end

                    -- Vehicle stats
                    local enginePart = v:getPartById("Engine")
                    local engineCond = enginePart and enginePart:getCondition() or 100

                    local gasPart = v:getPartById("GasTank")
                    local fuelLevel = 100
                    if gasPart and gasPart:getContainerContentAmount() and gasPart:getContainerCapacity() > 0 then
                        fuelLevel = (gasPart:getContainerContentAmount() / gasPart:getContainerCapacity()) * 100
                    end

                    local batteryPart = v:getPartById("Battery")
                    local batteryCharge = batteryPart and batteryPart:getCondition() or 100

                    table.insert(vehicleList, {
                        sql_id = sqlId,
                        name = v:getScript() and v:getScript():getName() or scriptName,
                        model = scriptName,
                        owner = owner,
                        is_claimed = (owner ~= nil),
                        x = v:getX(),
                        y = v:getY(),
                        z = v:getZ(),
                        engine_condition = engineCond,
                        fuel_level = fuelLevel,
                        battery_charge = batteryCharge,
                    })
                end
            end
        end
    end

    -- Also include offline AVCS claimed vehicles that might not currently be loaded in active cell
    if avcsData then
        for sqlIdStr, entry in pairs(avcsData) do
            local numId = tonumber(sqlIdStr) or sqlIdStr
            local alreadyInList = false
            for _, existing in ipairs(vehicleList) do
                if existing.sql_id == numId then
                    alreadyInList = true
                    break
                end
            end

            if not alreadyInList and entry and type(entry) == "table" then
                table.insert(vehicleList, {
                    sql_id = numId,
                    name = entry.CarModel or "Claimed Vehicle",
                    model = entry.CarModel or "Base.CarNormal",
                    owner = entry.OwnerPlayerID,
                    is_claimed = true,
                    x = entry.LastLocationX or 0,
                    y = entry.LastLocationY or 0,
                    z = 0,
                    engine_condition = 100,
                    fuel_level = 100,
                    battery_charge = 100,
                })
            end
        end
    end

    ZM_Utils.writeJsonFile(VEHICLES_FILE, {
        timestamp = getTimestamp and getTimestamp() or os.time(),
        count = #vehicleList,
        vehicles = vehicleList,
    })
end

--- Process pending vehicle management commands
local function processCommands()
    local commands = ZM_Utils.readJsonFile(COMMANDS_FILE)
    if not commands or not commands.actions or #commands.actions == 0 then
        return
    end

    local cell = getCell and getCell()
    for _, cmd in ipairs(commands.actions) do
        local action = cmd.action
        local sqlId = cmd.sql_id

        if action == "unclaim" and sqlId then
            if ModData and ModData.exists and ModData.exists("AVCSByVehicleSQLID") then
                local avcs = ModData.getOrCreate("AVCSByVehicleSQLID")
                avcs[tostring(sqlId)] = nil
                avcs[sqlId] = nil
                print("[ZomboidManager-Vehicles] Unclaimed vehicle SQL ID: " .. tostring(sqlId))
            end
        elseif action == "repair" and sqlId and cell then
            local vehicles = cell:getVehicles()
            if vehicles then
                for i = 0, vehicles:size() - 1 do
                    local v = vehicles:get(i)
                    if v and (v:getSqlId() == sqlId or v:getId() == sqlId) then
                        v:repair()
                        print("[ZomboidManager-Vehicles] Repaired vehicle SQL ID: " .. tostring(sqlId))
                        break
                    end
                end
            end
        end
    end

    -- Clear commands
    ZM_Utils.writeJsonFile(COMMANDS_FILE, { actions = {} })
end

function ZM_Vehicles.tick()
    ZM_Vehicles.export()
    processCommands()
end

function ZM_Vehicles.init()
    print("[ZomboidManager-Vehicles] Initialized Vehicle Manager")
end

return ZM_Vehicles
