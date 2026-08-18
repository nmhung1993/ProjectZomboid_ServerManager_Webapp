--
-- ZM_AntiCheat.lua — Scans online players for unauthorized admin powers & cheats
-- Checks non-admin users for God Mode, No Clip / Ghost Mode, Invisibility, Unlimited Ammo, etc.
-- Automatically disables unauthorized cheats and logs violations to anticheat_violations.json.
--

require("ZM_Utils")

ZM_AntiCheat = {}

local VIOLATIONS_FILE = "anticheat_violations.json"
local MAX_VIOLATIONS = 300
local VIOLATION_COOLDOWN_SECONDS = 15 -- Don't flood same violation every second

-- Staff access levels that are authorized to use admin powers
local STAFF_ROLES = {
    ["admin"] = true,
    ["moderator"] = true,
    ["gm"] = true,
    ["overseer"] = true,
    ["observer"] = true,
}

local pendingViolations = {}
local lastViolationTime = {} -- username -> timestamp

--- Check if an access level is an authorized staff role
local function isStaff(accessLevel)
    if not accessLevel then return false end
    local lower = string.lower(tostring(accessLevel))
    return STAFF_ROLES[lower] == true
end

--- Scan all online players for unauthorized cheat usage
local function scanPlayers()
    local players = getOnlinePlayers()
    if not players then return end

    local now = os.time()

    for i = 0, players:size() - 1 do
        local player = players:get(i)
        if player then
            local ok, err = pcall(function()
                local username = player:getUsername()
                if not username then return end

                local accessLevel = "none"
                if player.getAccessLevel then
                    local okAcc, acc = pcall(player.getAccessLevel, player)
                    if okAcc and acc and tostring(acc) ~= "" then
                        accessLevel = tostring(acc)
                    end
                end

                -- If the player is authorized staff, skip cheat checks
                if isStaff(accessLevel) then
                    return
                end

                -- Non-admin player: Scan for unauthorized cheats
                local detectedCheats = {}

                -- 1. God Mode
                local isGod = false
                if player.isGodMod then
                    local okG, g = pcall(player.isGodMod, player)
                    if okG and g then isGod = true end
                end
                if not isGod and player.isGodmode then
                    local okG, g = pcall(player.isGodmode, player)
                    if okG and g then isGod = true end
                end
                if not isGod and player.getGodMod then
                    local okG, g = pcall(player.getGodMod, player)
                    if okG and g then isGod = true end
                end
                if isGod then
                    table.insert(detectedCheats, "godmode")
                    if player.setGodMod then pcall(player.setGodMod, player, false) end
                    if player.setGodmode then pcall(player.setGodmode, player, false) end
                end

                -- 2. No Clip / Ghost Mode
                local isNoClip = false
                if player.isNoClip then
                    local okN, n = pcall(player.isNoClip, player)
                    if okN and n then isNoClip = true end
                end
                if not isNoClip and player.isGhostMode then
                    local okN, n = pcall(player.isGhostMode, player)
                    if okN and n then isNoClip = true end
                end
                if isNoClip then
                    table.insert(detectedCheats, "noclip")
                    if player.setNoClip then pcall(player.setNoClip, player, false) end
                    if player.setGhostMode then pcall(player.setGhostMode, player, false) end
                end

                -- 3. Invisibility
                local isInvisible = false
                if player.isInvisible then
                    local okI, inv = pcall(player.isInvisible, player)
                    if okI and inv then isInvisible = true end
                end
                if isInvisible then
                    table.insert(detectedCheats, "invisible")
                    if player.setInvisible then pcall(player.setInvisible, player, false) end
                end

                -- 4. Unlimited Ammo
                local isUnlAmmo = false
                if player.isUnlimitedAmmo then
                    local okA, a = pcall(player.isUnlimitedAmmo, player)
                    if okA and a then isUnlAmmo = true end
                end
                if isUnlAmmo then
                    table.insert(detectedCheats, "unlimited_ammo")
                    if player.setUnlimitedAmmo then pcall(player.setUnlimitedAmmo, player, false) end
                end

                -- 5. Unlimited Carry
                local isUnlCarry = false
                if player.isUnlimitedCarry then
                    local okC, c = pcall(player.isUnlimitedCarry, player)
                    if okC and c then isUnlCarry = true end
                end
                if isUnlCarry then
                    table.insert(detectedCheats, "unlimited_carry")
                    if player.setUnlimitedCarry then pcall(player.setUnlimitedCarry, player, false) end
                end

                -- 6. Unlimited Endurance
                local isUnlEnd = false
                if player.isUnlimitedEndurance then
                    local okE, e = pcall(player.isUnlimitedEndurance, player)
                    if okE and e then isUnlEnd = true end
                end
                if isUnlEnd then
                    table.insert(detectedCheats, "unlimited_endurance")
                    if player.setUnlimitedEndurance then pcall(player.setUnlimitedEndurance, player, false) end
                end

                -- 7. Build Cheat
                local isBuild = false
                if player.isBuildCheat then
                    local okB, b = pcall(player.isBuildCheat, player)
                    if okB and b then isBuild = true end
                end
                if isBuild then
                    table.insert(detectedCheats, "build_cheat")
                    if player.setBuildCheat then pcall(player.setBuildCheat, player, false) end
                end

                -- 8. Farming Cheat
                local isFarm = false
                if player.isFarmingCheat then
                    local okF, f = pcall(player.isFarmingCheat, player)
                    if okF and f then isFarm = true end
                end
                if isFarm then
                    table.insert(detectedCheats, "farming_cheat")
                    if player.setFarmingCheat then pcall(player.setFarmingCheat, player, false) end
                end

                -- 9. Health Cheat
                local isHealth = false
                if player.isHealthCheat then
                    local okH, h = pcall(player.isHealthCheat, player)
                    if okH and h then isHealth = true end
                end
                if isHealth then
                    table.insert(detectedCheats, "health_cheat")
                    if player.setHealthCheat then pcall(player.setHealthCheat, player, false) end
                end

                -- 10. Mechanics Cheat
                local isMech = false
                if player.isMechanicsCheat then
                    local okM, m = pcall(player.isMechanicsCheat, player)
                    if okM and m then isMech = true end
                end
                if isMech then
                    table.insert(detectedCheats, "mechanics_cheat")
                    if player.setMechanicsCheat then pcall(player.setMechanicsCheat, player, false) end
                end

                -- 11. Movables Cheat
                local isMov = false
                if player.isMovablesCheat then
                    local okM, m = pcall(player.isMovablesCheat, player)
                    if okM and m then isMov = true end
                end
                if isMov then
                    table.insert(detectedCheats, "movables_cheat")
                    if player.setMovablesCheat then pcall(player.setMovablesCheat, player, false) end
                end

                -- 12. Instant Action Cheat
                local isInstant = false
                if player.isTimedActionInstantCheat then
                    local okT, t = pcall(player.isTimedActionInstantCheat, player)
                    if okT and t then isInstant = true end
                end
                if not isInstant and player.isTimedActionInstant then
                    local okT, t = pcall(player.isTimedActionInstant, player)
                    if okT and t then isInstant = true end
                end
                if isInstant then
                    table.insert(detectedCheats, "instant_actions")
                    if player.setTimedActionInstantCheat then pcall(player.setTimedActionInstantCheat, player, false) end
                end

                -- 13. Admin Tag
                local isTag = false
                if player.isShowAdminTag then
                    local okT, t = pcall(player.isShowAdminTag, player)
                    if okT and t then isTag = true end
                end
                if isTag then
                    table.insert(detectedCheats, "admin_tag")
                    if player.setShowAdminTag then pcall(player.setShowAdminTag, player, false) end
                end

                -- If any cheats detected: Record violation
                if #detectedCheats > 0 then
                    local lastTime = lastViolationTime[username] or 0
                    if (now - lastTime) >= VIOLATION_COOLDOWN_SECONDS then
                        lastViolationTime[username] = now

                        local px = math.floor(player:getX() or 0)
                        local py = math.floor(player:getY() or 0)
                        local pz = math.floor(player:getZ() or 0)

                        local cheatListStr = table.concat(detectedCheats, ", ")

                        table.insert(pendingViolations, {
                            username = username,
                            access_level = accessLevel,
                            cheats = detectedCheats,
                            cheat_string = cheatListStr,
                            x = px,
                            y = py,
                            z = pz,
                            occurred_at = now,
                        })

                        print("[ZomboidManager-AntiCheat] VIOLATION: Non-admin player '" .. tostring(username) .. "' (role: " .. tostring(accessLevel) .. ") detected using: [" .. cheatListStr .. "]. Cheats forced OFF.")
                    end
                end
            end)

            if not ok then
                print("[ZomboidManager-AntiCheat] Error scanning player: " .. tostring(err))
            end
        end
    end
end

--- Flush pending violations to anticheat_violations.json
local function flushViolations()
    if #pendingViolations == 0 then return end

    local existing = ZM_Utils.readJsonFile(VIOLATIONS_FILE)
    local list = {}
    if existing and existing.violations then
        list = existing.violations
    end

    for _, v in ipairs(pendingViolations) do
        table.insert(list, v)
    end

    while #list > MAX_VIOLATIONS do
        table.remove(list, 1)
    end

    ZM_Utils.writeJsonFile(VIOLATIONS_FILE, { violations = list })
    print("[ZomboidManager-AntiCheat] Flushed " .. #pendingViolations .. " violation(s) to disk")
    pendingViolations = {}
end

--- Called on periodic tick from ZM_Main
function ZM_AntiCheat.tick()
    scanPlayers()
    flushViolations()
end

--- Called on server initialization
function ZM_AntiCheat.init()
    pendingViolations = {}
    lastViolationTime = {}
    print("[ZomboidManager-AntiCheat] Initialized anticheat scanner")
end

return ZM_AntiCheat
