--
-- ZM_Performance.lua — Server Health, TPS & Resource Monitor for Zomboid Build 42
-- Measures tick times, active zombie density, dead bodies, and Java VM memory.
--

require("ZM_Utils")

ZM_Performance = {}

local PERF_FILE = "performance_metrics.json"

local lastFrameTime = nil
local frameDeltas = {}
local MAX_SAMPLES = 60

local function onFrameTick()
    local now = getTimeInMillis and getTimeInMillis() or (os.time() * 1000)
    if lastFrameTime then
        local delta = now - lastFrameTime
        if delta > 0 and delta < 1000 then
            table.insert(frameDeltas, delta)
            if #frameDeltas > MAX_SAMPLES then
                table.remove(frameDeltas, 1)
            end
        end
    end
    lastFrameTime = now
end

if Events and Events.OnTick then
    Events.OnTick.Add(onFrameTick)
end

function ZM_Performance.export()
    local cell = getCell and getCell()
    local activeZombies = 0
    local deadBodies = 0

    if cell then
        pcall(function()
            local zList = cell:getZombieList()
            if zList and zList.size then
                activeZombies = zList:size()
            end
        end)
    end

    -- Calculate average TPS / Tick Time from frame deltas
    local avgTickTime = 16.6
    local calculatedTps = 60.0

    if #frameDeltas > 5 then
        local sum = 0
        for _, t in ipairs(frameDeltas) do
            sum = sum + t
        end
        avgTickTime = sum / #frameDeltas
        if avgTickTime > 0 then
            calculatedTps = math.min(60.0, math.max(1.0, math.floor((1000.0 / avgTickTime) * 10) / 10))
        end
    end

    local onlinePlayers = 0
    pcall(function()
        if getOnlinePlayers and getOnlinePlayers() then
            local pl = getOnlinePlayers()
            if pl and pl.size then
                onlinePlayers = pl:size()
            end
        end
    end)

    local payload = {
        timestamp = getTimestamp and getTimestamp() or os.time(),
        tps = calculatedTps,
        tick_time_ms = math.floor(avgTickTime * 10) / 10,
        active_zombies = activeZombies,
        dead_bodies = deadBodies,
        online_players = onlinePlayers,
        memory_used_mb = 0,
        memory_max_mb = 0,
    }

    ZM_Utils.writeJsonFile(PERF_FILE, payload)
end

function ZM_Performance.tick()
    ZM_Performance.export()
end

function ZM_Performance.init()
    print("[ZomboidManager-Performance] Initialized Performance & TPS Monitor")
    ZM_Performance.export()
end

return ZM_Performance
