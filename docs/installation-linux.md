# Hướng Dẫn Cài Đặt Trên Linux
# Linux Installation Guide

---

## 1. Yêu Cầu Hệ Thống / System Requirements

### Tiếng Việt
Bạn cần một máy chủ Linux (Ubuntu, Debian, Fedora...) với tối thiểu **4 GB RAM** (khuyến nghị 8 GB). Hỗ trợ cả kiến trúc **x86_64** (AMD/Intel) và **ARM64** (Oracle Cloud Free Tier, Raspberry Pi 5, AWS Graviton...) — hệ thống sẽ tự động nhận diện kiến trúc CPU.

Cài đặt các gói phụ thuộc sau trước khi bắt đầu:

### English
You need a Linux server (Ubuntu, Debian, Fedora, etc.) with at least **4 GB RAM** (8 GB recommended). Works on both **x86_64** (AMD/Intel) and **ARM64** (Oracle Cloud free tier, Raspberry Pi 5, AWS Graviton, etc.) — CPU architecture is auto-detected.

Install these dependencies before beginning:

| # | Phần mềm / Dependency | Ghi chú / Notes |
|---|-----------|-------|
| 1 | **Git** | Thường đã có sẵn / Pre-installed. [Cài đặt](https://git-scm.com/downloads/linux) |
| 2 | **Docker Engine** | Dùng Docker Engine chính thức (không dùng Docker Desktop trên Linux). [Cài đặt](https://docs.docker.com/engine/install/) |
| 3 | **Docker Compose v2** | Đi kèm với Docker Engine |
| 4 | **Make** | Thường đã có sẵn / Usually pre-installed |
| 5 | **OpenSSL** | Có sẵn trên hầu hết các distro Linux |
| 6 | **curl** | Có sẵn trên hầu hết các distro Linux |

---

### Cài đặt nhanh Docker (Ubuntu/Debian) / Quick Docker Install

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Đăng xuất và đăng nhập lại sau lệnh này / Log out and back in after this
```

---

## 2. Các Bước Cài Đặt / Installation Steps

### Bước 1 — Clone Repository / Step 1: Clone Repository
```bash
git clone https://github.com/nmhung1993/ProjectZomboid_ServerManager_Webapp.git
cd ProjectZomboid_ServerManager_Webapp
```

### Bước 2 — Chạy Wizard Thiết Lập / Step 2: Run Setup Wizard
```bash
make init
```

Trình hướng dẫn cài đặt tương tác sẽ tự động:
- Thiết lập thông số game server (tên server, mật khẩu, RAM, slot người chơi)
- Tạo tài khoản Admin cho Web Dashboard
- Cấu hình HTTPS (Tên miền hoặc Chứng chỉ tự ký SSL)
- Tự động nhận diện Tường lửa (`ufw` / `firewalld` / `manual`)
- Tạo file môi trường `.env` và các volume database
- Khởi động toàn bộ container Docker và chạy database migrations

### Bước 3 — Mở Cổng Game Cho Người Chơi / Step 3: Open Game Ports
Mặc định cổng game sẽ đóng. Để mở cho người chơi kết nối vào:
```bash
make expose     # Mở UDP 16261-16262
make hide       # Đóng cổng khi cần bảo trì
```

### Bước 4 — Truy Cập Bảng Điều Khiển Quản Trị / Step 4: Access Admin Panel
- **Truy cập nội bộ / Local:** `http://localhost:8000`
- **Mở cổng truy cập từ xa / Remote public HTTPS:**
```bash
make admin-expose
```

### Bước 5 — Kết Nối Vào Game / Step 5: Connect In-Game
Trong game Project Zomboid:
1. Chọn **Join** từ Menu chính
2. Nhập Địa chỉ IP công khai của server và Port `16261`
3. Nhập mật khẩu server (nếu có đặt)

Kiểm tra thông tin IP và trạng thái server:
```bash
make info
```

