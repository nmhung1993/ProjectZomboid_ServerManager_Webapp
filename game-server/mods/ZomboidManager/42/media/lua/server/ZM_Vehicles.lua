--
-- ZM_Vehicles.lua — Server-side Vehicle Manager & AVCS Integration
-- Scans active vehicles, integrates with Another Vehicle Claim System (AVCS), and executes commands.
--

require("ZM_Utils")

ZM_Vehicles = {}

local VEHICLES_FILE = "vehicles.json"
local COMMANDS_FILE = "vehicle_commands.json"

--- Safely retrieve all active vehicles from cell regardless of Java/Lua type
local function getActiveVehicles(cell)
    if not cell then return {} end
    local list = {}
    local ok, vehicles = pcall(function() return cell:getVehicles() end)
    if not ok or not vehicles then return {} end

    -- Check if it's a Java collection with :size() and :get()
    local hasSize = false
    local hasGet = false
    pcall(function() hasSize = (type(vehicles.size) == "function" or type(vehicles.size) == "userdata") end)
    pcall(function() hasGet = (type(vehicles.get) == "function" or type(vehicles.get) == "userdata") end)

    if hasSize and hasGet then
        local sizeOk, sz = pcall(function() return vehicles:size() end)
        if sizeOk and type(sz) == "number" and sz > 0 then
            for i = 0, sz - 1 do
                local getOk, v = pcall(function() return vehicles:get(i) end)
                if getOk and v then
                    table.insert(list, v)
                end
            end
        end
    elseif type(vehicles) == "table" then
        for _, v in pairs(vehicles) do
            if v and type(v) ~= "function" then
                table.insert(list, v)
            end
        end
    end

    return list
end

--- Export vehicles to vehicles.json
function ZM_Vehicles.export()
    local ok, err = pcall(function()
        local avcsData = nil
        if ModData and ModData.exists and ModData.exists("AVCSByVehicleSQLID") then
            local getAvcsOk, data = pcall(function() return ModData.getOrCreate("AVCSByVehicleSQLID") end)
            if getAvcsOk then
                avcsData = data
            end
        end

        local vehicleList = {}

        -- Scan active vehicles from IsoWorld
        if getCell and getCell() then
            local activeVehicles = getActiveVehicles(getCell())
            for _, v in ipairs(activeVehicles) do
                if v then
                    local sqlId = nil
                    pcall(function() sqlId = v:getSqlId() or v:getId() end)

                    local scriptName = "Base.CarNormal"
                    pcall(function() scriptName = v:getScriptName() or scriptName end)

                    local vehicleName = scriptName
                    pcall(function()
                        if v:getScript() and v:getScript():getName() then
                            vehicleName = v:getScript():getName()
                        end
                    end)

                    local owner = nil
                    -- Check AVCS claim
                    if avcsData and sqlId then
                        local strId = tostring(sqlId)
                        if avcsData[strId] and avcsData[strId].OwnerPlayerID then
                            owner = avcsData[strId].OwnerPlayerID
                        elseif avcsData[sqlId] and avcsData[sqlId].OwnerPlayerID then
                            owner = avcsData[sqlId].OwnerPlayerID
                        end
                    end

                    -- Vehicle stats
                    local engineCond = 100
                    pcall(function()
                        local enginePart = v:getPartById("Engine")
                        if enginePart and enginePart:getCondition() then
                            engineCond = enginePart:getCondition()
                        end
                    end)

                    local fuelLevel = 100
                    pcall(function()
                        local gasPart = v:getPartById("GasTank")
                        if gasPart and gasPart:getContainerContentAmount() and gasPart:getContainerCapacity() and gasPart:getContainerCapacity() > 0 then
                            fuelLevel = (gasPart:getContainerContentAmount() / gasPart:getContainerCapacity()) * 100
                        end
                    end)

                    local batteryCharge = 100
                    pcall(function()
                        local batteryPart = v:getPartById("Battery")
                        if batteryPart and batteryPart:getCondition() then
                            batteryCharge = batteryPart:getCondition()
                        end
                    end)

                    local vx, vy, vz = 0, 0, 0
                    pcall(function()
                        vx = v:getX() or 0
                        vy = v:getY() or 0
                        vz = v:getZ() or 0
                    end)

                    table.insert(vehicleList, {
                        sql_id = sqlId or 0,
                        name = vehicleName,
                        model = scriptName,
                        owner = owner,
                        is_claimed = (owner ~= nil),
                        x = vx,
                        y = vy,
                        z = vz,
                        engine_condition = engineCond,
                        fuel_level = fuelLevel,
                        battery_charge = batteryCharge,
                    })
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
    end)

    if not ok then
        print("[ZomboidManager-Vehicles] Error in export(): " .. tostring(err))
    end
end

--- Process pending vehicle management commands
local function processCommands()
    local ok, err = pcall(function()
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
                local activeVehicles = getActiveVehicles(cell)
                for _, v in ipairs(activeVehicles) do
                    local vId = nil
                    pcall(function() vId = v:getSqlId() or v:getId() end)
                    if v and (vId == sqlId or tostring(vId) == tostring(sqlId)) then
                        pcall(function() v:repair() end)
                        print("[ZomboidManager-Vehicles] Repaired vehicle SQL ID: " .. tostring(sqlId))
                        break
                    end
                end
            end
        end

        -- Clear commands
        ZM_Utils.writeJsonFile(COMMANDS_FILE, { actions = {} })
    end)

    if not ok then
        print("[ZomboidManager-Vehicles] Error in processCommands(): " .. tostring(err))
    end
end

function ZM_Vehicles.tick()
    ZM_Vehicles.export()
    processCommands()
end

function ZM_Vehicles.init()
    print("[ZomboidManager-Vehicles] Initialized Vehicle Manager")
end

return ZM_Vehicles
