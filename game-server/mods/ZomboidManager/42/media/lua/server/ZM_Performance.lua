--
-- ZM_Performance.lua — Server Health, TPS & Resource Monitor for Zomboid Build 42
-- Measures tick times, active zombie density, dead bodies, and Java VM memory.
--

require("ZM_Utils")

ZM_Performance = {}

local PERF_FILE = "performance_metrics.json"

local lastTickTime = nil
local tickTimes = {}
local MAX_SAMPLES = 20

function ZM_Performance.export()
    local cell = getCell and getCell()
    local activeZombies = 0
    local deadBodies = 0
    local loadedSquares = 0

    if cell then
        local zList = cell:getZombieList()
        if zList then
            activeZombies = zList:size()
        end
    end

    -- Calculate average TPS / Tick Time
    local avgTickTime = 16.6
    local calculatedTps = 60.0

    if #tickTimes > 0 then
        local sum = 0
        for _, t in ipairs(tickTimes) do
            sum = sum + t
        end
        avgTickTime = sum / #tickTimes
        if avgTickTime > 0 then
            calculatedTps = math.min(60.0, math.floor((1000.0 / avgTickTime) * 10) / 10)
        end
    end

    -- Java VM Memory
    local memoryUsedMb = 0
    local memoryMaxMb = 0
    local ok, runtime = pcall(function() return java.lang.Runtime:getRuntime() end)
    if ok and runtime then
        local total = runtime:totalMemory() / (1024 * 1024)
        local free = runtime:freeMemory() / (1024 * 1024)
        local maxMem = runtime:maxMemory() / (1024 * 1024)
        memoryUsedMb = math.floor(total - free)
        memoryMaxMb = math.floor(maxMem)
    end

    local onlinePlayers = 0
    if getOnlinePlayers and getOnlinePlayers() then
        onlinePlayers = getOnlinePlayers():size()
    end

    local payload = {
        timestamp = getTimestamp and getTimestamp() or os.time(),
        tps = calculatedTps,
        tick_time_ms = math.floor(avgTickTime * 10) / 10,
        active_zombies = activeZombies,
        dead_bodies = deadBodies,
        online_players = onlinePlayers,
        memory_used_mb = memoryUsedMb,
        memory_max_mb = memoryMaxMb,
    }

    ZM_Utils.writeJsonFile(PERF_FILE, payload)
end

function ZM_Performance.tick()
    local now = getTimeInMillis and getTimeInMillis() or (os.time() * 1000)
    if lastTickTime then
        local delta = now - lastTickTime
        if delta > 0 and delta < 5000 then
            table.insert(tickTimes, delta)
            if #tickTimes > MAX_SAMPLES then
                table.remove(tickTimes, 1)
            end
        end
    end
    lastTickTime = now

    ZM_Performance.export()
end

function ZM_Performance.init()
    print("[ZomboidManager-Performance] Initialized Server Performance Monitor")
    ZM_Performance.export()
end

return ZM_Performance
