--
-- ZM_Delivery.lua — In-game Delivery System for Marketplace & Rewards
-- Delivers items purchased on Web Marketplace / Auctions to player inventory upon login or tick.
--

require("ZM_Utils")

ZM_Delivery = {}

local DELIVERIES_FILE = "pending_deliveries.json"

function ZM_Delivery.tick()
    local data = ZM_Utils.readJsonFile(DELIVERIES_FILE)
    if not data or not data.deliveries or #data.deliveries == 0 then
        return
    end

    local remainingDeliveries = {}
    local deliveredAny = false

    for _, delivery in ipairs(data.deliveries) do
        local targetUsername = delivery.username
        local itemId = delivery.item_id
        local qty = delivery.quantity or 1
        local player = nil

        -- Search for online player
        if getOnlinePlayers and getOnlinePlayers() then
            local online = getOnlinePlayers()
            for i = 0, online:size() - 1 do
                local p = online:get(i)
                if p and p:getUsername() and string.lower(p:getUsername()) == string.lower(targetUsername) then
                    player = p
                    break
                end
            end
        end

        if player and player:getInventory() then
            local inv = player:getInventory()
            for c = 1, qty do
                inv:AddItem(itemId)
            end

            print("[ZomboidManager-Delivery] Delivered " .. tostring(qty) .. "x " .. tostring(itemId) .. " to " .. targetUsername)
            deliveredAny = true
        else
            -- Keep in queue if player is not online
            table.insert(remainingDeliveries, delivery)
        end
    end

    if deliveredAny then
        ZM_Utils.writeJsonFile(DELIVERIES_FILE, { deliveries = remainingDeliveries })
    end
end

function ZM_Delivery.init()
    print("[ZomboidManager-Delivery] Initialized Marketplace Delivery System")
end

return ZM_Delivery
