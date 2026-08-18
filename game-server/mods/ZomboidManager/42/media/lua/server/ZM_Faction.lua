--
-- ZM_Faction.lua — Server-side Faction & Territory Manager for ZomboidManager
-- Reads faction_config.json, caches player faction memberships, and enforces territory protections.
--

require("ZM_Utils")

ZM_Faction = {}

local CONFIG_FILE = "faction_config.json"
local lastLoadedTime = 0

ZM_Faction.factions = {}         -- id -> { name, tag, color, members = {} }
ZM_Faction.playerFaction = {}    -- username -> { id, name, tag, color }
ZM_Faction.territories = {}      -- list of { id, faction_id, faction_name, faction_tag, name, x1, y1, x2, y2, z, is_safe_house }

--- Reload faction configuration from disk
local function reloadConfig()
    local config = ZM_Utils.readJsonFile(CONFIG_FILE)
    if not config then return end

    local updatedAt = tonumber(config.updated_at) or 0
    if updatedAt == lastLoadedTime and lastLoadedTime > 0 then
        return
    end

    lastLoadedTime = updatedAt
    ZM_Faction.factions = {}
    ZM_Faction.playerFaction = {}
    ZM_Faction.territories = config.territories or {}

    local factionsList = config.factions or {}
    for _, f in ipairs(factionsList) do
        local fId = tostring(f.id)
        local memberMap = {}
        local members = f.members or {}
        for _, uname in ipairs(members) do
            memberMap[uname] = true
            ZM_Faction.playerFaction[uname] = {
                id = f.id,
                name = f.name,
                tag = f.tag,
                color = f.color or "#3b82f6",
            }
        end

        ZM_Faction.factions[fId] = {
            id = f.id,
            name = f.name,
            tag = f.tag,
            color = f.color or "#3b82f6",
            members = memberMap,
        }
    end

    print("[ZomboidManager-Faction] Loaded " .. #factionsList .. " faction(s) and " .. #ZM_Faction.territories .. " territory(ies)")
end

--- Get faction info for a player by username
function ZM_Faction.getPlayerFaction(username)
    if not username then return nil end
    return ZM_Faction.playerFaction[username]
end

--- Check if coordinates (x, y, z) are inside any faction territory
function ZM_Faction.getTerritoryAt(x, y, z)
    if not x or not y then return nil end
    for _, t in ipairs(ZM_Faction.territories) do
        if x >= t.x1 and x <= t.x2 and y >= t.y1 and y <= t.y2 then
            return t
        end
    end
    return nil
end

--- Periodic tick called from ZM_Main
function ZM_Faction.tick()
    reloadConfig()
end

--- Initialize faction system
function ZM_Faction.init()
    lastLoadedTime = 0
    reloadConfig()
    print("[ZomboidManager-Faction] Initialized Faction system")
end

return ZM_Faction
