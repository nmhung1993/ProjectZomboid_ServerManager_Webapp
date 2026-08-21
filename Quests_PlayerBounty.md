# Kế hoạch Triển khai: Giai đoạn 2 — Hệ thống Nhiệm vụ & Săn Tiền Thưởng
# Implementation Plan: Phase 2 — Daily/Weekly Quests & Player Bounty

---

## 1. Mục tiêu / Objectives

### Tiếng Việt
Xây dựng hệ thống Nhiệm vụ (Quests) và Săn tiền thưởng (Player Bounty) tương tác 2 chiều giữa Web Portal và Máy chủ Project Zomboid Build 42.

### English
Build a two-way interactive Quests and Player Bounty system between the Web Portal and Project Zomboid Build 42 Game Server.

```mermaid
graph TD
    UserPortal[Người chơi trên Portal / Player Portal] -->|Nhận & Làm Quest / Take Quest| QuestSystem[Hệ thống Nhiệm vụ / Quest System]
    UserPortal -->|Đặt Tiền Truy Nã / Place Bounty| BountyBoard[Bảng Truy nã / Bounty Board]
    PZServer[Game Server PvP Tracker] -->|Phát hiện Kill Mục tiêu / Detect Target Kill| BountyClaim[Tự động Phát Thưởng Ví / Auto Claim Reward]
    PZServer[Game Server Stats Tracker] -->|Cập nhật Zombie Kills, Giờ sống / Update Stats| QuestProgress[Tự động Cập nhật Tiến độ / Update Quest Progress]
```

---

## 2. Thiết kế Cơ sở Dữ liệu & Models / Database Schema & Models

### 2.1 Bảng `quests` / `quests` Table
- `id`: Primary key
- `title`: Tên nhiệm vụ / Quest Title (VD: *Thợ săn Zombie Rosewood*, *Sinh tồn qua đêm đông* / *Rosewood Zombie Hunter*)
- `description`: Chi tiết nhiệm vụ / Quest Description
- `type`: `daily` (hàng ngày / daily), `weekly` (hàng tuần / weekly), `achievement` (thành tựu / achievement)
- `category`: `zombie_kills` (diệt zombie), `survival_hours` (giờ sinh tồn), `pvp_kills` (diệt người chơi), `custom`
- `target_count`: Số lượng mục tiêu cần đạt / Target count (VD: 50, 100, 24)
- `reward_coins`: Số tiền thưởng chuyển vào Ví Portal / Reward coins credited to portal wallet
- `reward_items`: Danh sách vật phẩm quà tặng dạng JSON `[{"item_id": "Base.Axe", "count": 1}]` / Optional reward items JSON
- `is_active`: Boolean
- `starts_at`, `expires_at`: Thời gian bắt đầu / kết thúc (Start / Expiry timestamp)

### 2.2 Bảng `player_quests` / `player_quests` Table
- `id`: Primary key
- `quest_id`: Foreign key tới `quests`
- `user_id`: Foreign key tới `users`
- `username`: Tên nhân vật in-game / In-game character name
- `current_progress`: Số lượng đã hoàn thành / Current count progress (VD: 35/50)
- `is_completed`: Boolean
- `completed_at`: Timestamp
- `reward_claimed`: Boolean
- `claimed_at`: Timestamp

### 2.3 Bảng `bounties` / `bounties` Table
- `id`: Primary key
- `target_username`: Tên người chơi bị truy nã / Wanted player target
- `target_user_id`: Nullable foreign key tới `users`
- `creator_id`: Foreign key tới `users` (người đặt lệnh truy nã, hoặc `null` nếu là lệnh từ Server/Admin) / Creator user id
- `reward_amount`: Số tiền thưởng (được trừ từ ví người đặt và giữ trong quỹ truy nã) / Escrowed bounty reward amount
- `reason`: Lý do truy nã / Bounty justification (VD: *PK cướp xe tại West Point*, *Phá hoại căn cứ*)
- `status`: `active` (đang có hiệu lực), `claimed` (đã nhận thưởng), `cancelled` (hủy & hoàn tiền), `expired`
- `hunter_username`: Tên người chơi đã tiêu diệt mục tiêu và nhận thưởng / Hunter username
- `hunter_user_id`: Nullable foreign key tới `users`
- `claimed_at`: Timestamp
- `expires_at`: Timestamp

---

## 3. Kiến trúc Services & Xử lý Backend / Backend Services Architecture

### Tiếng Việt
1. **`QuestManager.php` (`app/app/Services/QuestManager.php`)**:
   - `syncPlayerQuests(User $user)`: Tự động gán các daily/weekly quest đang active cho người chơi.
   - `updateProgress(User $user)`: Đối chiếu số zombie kills, survival hours từ `player_stats` để cập nhật `current_progress` và đánh dấu `is_completed`.
   - `claimReward(User $user, int $questId)`: Cộng `reward_coins` vào Ví cá nhân và tạo đơn giao vật phẩm `reward_items` (nếu có).

2. **`BountyManager.php` (`app/app/Services/BountyManager.php`)**:
   - `createBounty(User $creator, string $targetUsername, float $rewardAmount, string $reason)`: Trừ tiền ví của người tạo, kích hoạt lệnh truy nã và bắn webhook Discord thông báo toàn server.
   - `processPvpKill(string $killerUsername, string $victimUsername)`: Kiểm tra xem `victimUsername` có lệnh truy nã `active` không. Nếu có, tự động hoàn tất bounty, cộng tiền thưởng vào ví của `killerUsername`, gửi tin nhắn thông báo trên Discord và in-game.
   - `cancelBounty(int $bountyId, User $actor)`: Hủy lệnh và hoàn trả 100% tiền vào ví người đặt.

3. **Command Định kỳ `zomboid:process-quests-bounties`**:
   - Chạy mỗi phút (qua cron/schedule) để đồng bộ tiến độ quest cho người chơi online và kiểm tra các sự kiện PvP mới nhất để khớp lệnh truy nã.

### English
1. **`QuestManager.php` (`app/app/Services/QuestManager.php`)**:
   - `syncPlayerQuests(User $user)`: Assigns active daily/weekly quests to players.
   - `updateProgress(User $user)`: Cross-references zombie kills and survival hours from `player_stats` to increment `current_progress` and set `is_completed`.
   - `claimReward(User $user, int $questId)`: Credits `reward_coins` to personal wallet and creates reward delivery items.

2. **`BountyManager.php` (`app/app/Services/BountyManager.php`)**:
   - `createBounty(User $creator, string $targetUsername, float $rewardAmount, string $reason)`: Escrows bounty coins, activates the contract, and broadcasts across Discord and game chat.
   - `processPvpKill(string $killerUsername, string $victimUsername)`: Verifies if the victim has active bounties. If matched, credits reward to the killer's wallet and triggers server announcements.
   - `cancelBounty(int $bountyId, User $actor)`: Cancels the contract and refunds 100% of escrowed coins.

3. **Periodic Command `zomboid:process-quests-bounties`**:
   - Executes every minute to sync online player quest metrics and evaluate latest PvP kill events against active bounties.

---

## 4. Giao diện Người chơi & Quản trị / User Interface & Admin Views

### Tiếng Việt
1. **Player Portal (`/portal/quests`)**:
   - **Tab Nhiệm vụ**: Danh sách Daily / Weekly quests với thanh tiến trình trực quan, hiển thị tiền thưởng và nút "Nhận thưởng".
   - **Tab Bảng Truy nã (Bounties Board)**: Danh sách tội phạm đang bị truy nã, số tiền thưởng, lý do, nút "Đặt lệnh truy nã người chơi".
   - **Tab Lịch sử Thợ săn (Bounty Claims)**: Nhật ký các vụ săn tiền thưởng thành công.
2. **Admin Management (`/admin/quests`)**:
   - Quản lý tạo/sửa/xóa Nhiệm vụ Daily/Weekly/Thành tựu.
   - Quản lý lệnh truy nã: Tạo lệnh truy nã từ Server, hủy bỏ / hoàn tiền bounty.
3. **Sidebar Navigation**:
   - Thêm mục **Nhiệm vụ & Truy nã (Quests & Bounty)** vào thanh điều hướng.

### English
1. **Player Portal (`/portal/quests`)**:
   - **Quests Tab**: Daily and Weekly quest list with animated progress bars, reward previews, and "Claim Reward" buttons.
   - **Bounties Board Tab**: Active wanted contracts, reward escrow totals, justification notes, and "Place Player Bounty" button.
   - **Bounty Claims History Tab**: Feed of completed contracts and reward settlements.
2. **Admin Management (`/admin/quests`)**:
   - Quest editor for Daily, Weekly, and Achievement contracts.
   - Bounty moderation: Server-sponsored bounties, cancellation, and escrow refunds.
3. **Sidebar Navigation**:
   - Added **Quests & Bounty** navigation links for both Portal and Admin.

---

## 5. Kế hoạch Thực hiện / Implementation Steps

### Tiếng Việt
1. Tạo Database Migrations cho `quests`, `player_quests`, `bounties`.
2. Tạo Models và Factories.
3. Xây dựng Services `QuestManager` và `BountyManager`.
4. Tạo Artisan Command `ProcessQuestsAndBounties`.
5. Tạo Controllers `QuestPortalController` và `QuestAdminController`.
6. Đăng ký Routes, Permissions và Translations.
7. Xây dựng Giao diện React Frontend cho Portal và Admin.
8. Viết Unit & Feature Tests, biên dịch frontend và kiểm thử hệ thống.

### English
1. Create Database Migrations for `quests`, `player_quests`, and `bounties`.
2. Create Eloquent Models and Model Factories.
3. Implement `QuestManager` and `BountyManager` services.
4. Create Artisan command `ProcessQuestsAndBounties`.
5. Create controllers `QuestPortalController` and `QuestAdminController`.
6. Register routes, permissions, and i18n translations.
7. Develop React frontend interfaces for Player Portal and Admin.
8. Write Unit & Feature Tests, compile assets, and verify system integrity.

