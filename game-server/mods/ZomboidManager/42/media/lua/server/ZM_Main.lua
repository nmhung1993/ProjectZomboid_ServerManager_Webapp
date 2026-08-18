--
-- ZM_Main.lua — Entry point for ZomboidManager server-side mod
-- Registers PZ event hooks for inventory export, delivery queue, and position tracking.
--

require("ZM_Utils")
require("ZM_InventoryExporter")
require("ZM_DeliveryQueue")
require("ZM_PlayerTracker")
require("ZM_ItemCatalog")
require("ZM_GameState")
require("ZM_PlayerStats")
require("ZM_RespawnDelay")
require("ZM_SafeZone")
require("ZM_PvpTracker")
require("ZM_MoneyDeposit")
require("ZM_AntiCheat")
require("ZM_Faction")
require("ZM_Vehicles")
require("ZM_Cleaner")
require("ZM_Delivery")
require("ZM_Events")
require("ZM_Performance")

print("[ZomboidManager] Initializing server-side bridge mod...")

-- Tick counters for reduced-frequency operations.
-- NOTE: PZ EveryOneMinute fires every ~2.5 real seconds (one in-game minute),
-- NOT every 60 real seconds. Intervals below are in game-minute ticks.
local positionTickCounter = 0
local POSITION_EXPORT_INTERVAL = 4 -- ~10 real seconds

local statsTickCounter = 0
local STATS_EXPORT_INTERVAL = 6 -- ~15 real seconds

local gameStateTickCounter = 0
local GAME_STATE_EXPORT_INTERVAL = 24 -- ~1 real minute

local deliveryTickCounter = 0
local DELIVERY_PROCESS_INTERVAL = 1 -- ~2.5 real seconds (near instant)

local depositTickCounter = 0
local DEPOSIT_PROCESS_INTERVAL = 1 -- ~2.5 real seconds (near instant)

--- OnCreatePlayer — triggered when a player connects/spawns
--- NOTE: On PZ dedicated servers, this event may not fire reliably.
--- Death detection and respawn blocking are handled via EveryOneMinute tick instead.
local function onCreatePlayer(playerIndex, player)
    if not player then
        return
    end
    print("[ZomboidManager] Player connected: " .. (player:getUsername() or "unknown"))

    -- Export this player's inventory
    ZM_InventoryExporter.exportPlayer(player)

    -- Export stats and positions immediately for fresh web display
    ZM_PlayerStats.exportAll()
    ZM_PlayerTracker.exportPositions()

    -- Process any pending deliveries for this player
    ZM_DeliveryQueue.process()
end

--- EveryTenMinutes — periodic stats export fallback
local function onEveryTenMinutes()
    local statsCount = ZM_PlayerStats.exportAll()
    if statsCount > 0 then
        print("[ZomboidManager] Exported stats for " .. statsCount .. " players")
    end
end

--- EveryOneMinute — inventory export, delivery queue, live positions, game state
--- NOTE: This fires every ~2.5 real seconds (one in-game minute), not every 60s.
local function onEveryOneMinute()
    -- Process on-demand export requests (lightweight file existence check every tick)
    ZM_InventoryExporter.processExportRequests()

    -- Process delivery queue (near instant)
    deliveryTickCounter = deliveryTickCounter + 1
    if deliveryTickCounter >= DELIVERY_PROCESS_INTERVAL then
        deliveryTickCounter = 0
        local processed = ZM_DeliveryQueue.process()
        if processed > 0 then
            print("[ZomboidManager] Processed " .. processed .. " delivery entries")
        end
    end

    -- Process money deposit requests (near instant)
    depositTickCounter = depositTickCounter + 1
    if depositTickCounter >= DEPOSIT_PROCESS_INTERVAL then
        depositTickCounter = 0
        local deposited = ZM_MoneyDeposit.process()
        if deposited > 0 then
            print("[ZomboidManager] Processed " .. deposited .. " money deposit(s)")
        end
    end

    -- Export player positions for map updates
    positionTickCounter = positionTickCounter + 1
    if positionTickCounter >= POSITION_EXPORT_INTERVAL then
        positionTickCounter = 0
        ZM_PlayerTracker.exportPositions()
    end

    -- Export player stats periodically so web stats / traits are always real-time
    statsTickCounter = statsTickCounter + 1
    if statsTickCounter >= STATS_EXPORT_INTERVAL then
        statsTickCounter = 0
        ZM_PlayerStats.exportAll()
    end

    -- Export game state (time, weather, season)
    gameStateTickCounter = gameStateTickCounter + 1
    if gameStateTickCounter >= GAME_STATE_EXPORT_INTERVAL then
        gameStateTickCounter = 0
        ZM_GameState.export()
    end

    -- Respawn delay: reload config, process resets, clean expired
    if ZM_RespawnDelay and ZM_RespawnDelay.tick then ZM_RespawnDelay.tick() end

    -- Safe zone: reload config, flush violations
    if ZM_SafeZone and ZM_SafeZone.tick then ZM_SafeZone.tick() end

    -- PvP tracker: scan for kills, flush to disk
    if ZM_PvpTracker and ZM_PvpTracker.tick then ZM_PvpTracker.tick() end

    -- AntiCheat: scan online players for godmode, noclip, and admin cheats
    if ZM_AntiCheat and ZM_AntiCheat.tick then ZM_AntiCheat.tick() end

    -- Faction: reload config and cache
    if ZM_Faction and ZM_Faction.tick then ZM_Faction.tick() end

    -- Vehicles: export vehicles and process commands
    if ZM_Vehicles and ZM_Vehicles.tick then ZM_Vehicles.tick() end

    -- Cleaner: process cleanup requests
    if ZM_Cleaner and ZM_Cleaner.tick then ZM_Cleaner.tick() end

    -- Delivery: process item deliveries to online players
    if ZM_Delivery and ZM_Delivery.tick then ZM_Delivery.tick() end

    -- World Events: process active airdrops, heli crashes, invasions
    if ZM_Events and ZM_Events.tick then ZM_Events.tick() end

    -- Performance: monitor tick time, zombies, heap memory
    if ZM_Performance and ZM_Performance.tick then ZM_Performance.tick() end
end

--- OnServerStarted — export game state and item catalog on server boot
local function onServerStarted()
    -- Initialize respawn delay system
    if ZM_RespawnDelay and ZM_RespawnDelay.init then ZM_RespawnDelay.init() end

    -- Initialize safe zone system
    if ZM_SafeZone and ZM_SafeZone.init then ZM_SafeZone.init() end

    -- Initialize PvP tracker
    if ZM_PvpTracker and ZM_PvpTracker.init then ZM_PvpTracker.init() end

    -- Initialize anticheat scanner
    if ZM_AntiCheat and ZM_AntiCheat.init then ZM_AntiCheat.init() end

    -- Initialize faction system
    if ZM_Faction and ZM_Faction.init then ZM_Faction.init() end

    -- Initialize vehicles system
    if ZM_Vehicles and ZM_Vehicles.init then ZM_Vehicles.init() end

    -- Initialize cleaner
    if ZM_Cleaner and ZM_Cleaner.init then ZM_Cleaner.init() end

    -- Initialize delivery system
    if ZM_Delivery and ZM_Delivery.init then ZM_Delivery.init() end

    -- Initialize world events system
    if ZM_Events and ZM_Events.init then ZM_Events.init() end

    -- Initialize performance monitor
    if ZM_Performance and ZM_Performance.init then ZM_Performance.init() end

    -- Initialize money deposit system
    if ZM_MoneyDeposit and ZM_MoneyDeposit.init then ZM_MoneyDeposit.init() end

    -- Export game state immediately so it's available even when server is paused
    if ZM_GameState and ZM_GameState.export then
        if ZM_GameState.export() then
            print("[ZomboidManager] Exported initial game state")
        end
    end

    local ok, count = pcall(ZM_ItemCatalog.export)
    if ok and count and count > 0 then
        print("[ZomboidManager] Exported item catalog: " .. count .. " items")
    else
        print("[ZomboidManager] WARNING: item catalog export failed or returned 0 items")
    end
end

-- Register event hooks
Events.OnCreatePlayer.Add(onCreatePlayer)
Events.OnWeaponHitCharacter.Add(ZM_SafeZone.onWeaponHitCharacter)
Events.OnWeaponHitCharacter.Add(ZM_PvpTracker.onWeaponHitCharacter)
Events.EveryTenMinutes.Add(onEveryTenMinutes)
Events.EveryOneMinute.Add(onEveryOneMinute)
Events.OnServerStarted.Add(onServerStarted)

print("[ZomboidManager] Event hooks registered: OnCreatePlayer, OnWeaponHitCharacter(2), EveryTenMinutes, EveryOneMinute, OnServerStarted, MoneyDeposit")
