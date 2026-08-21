# Danh Mục Lệnh Quản Trị Hệ Thống
# System Command Reference

---

Tất cả các lệnh đều có thể thực thi qua `make` (Linux) hoặc `.\make.ps1` (Windows PowerShell).
*(All management commands are executable via `make` on Linux or `.\make.ps1` on Windows PowerShell).*

---

## 1. Khởi Tạo & Cài Đặt / Setup

| Linux | Windows | Chức năng (Tiếng Việt) | Description (English) |
|---|---|---|---|
| `make init` | `.\make.ps1 init` | Trình wizard thiết lập hệ thống tương tác | Interactive first-run setup wizard |
| `make setup` | `.\make.ps1 setup` | Tương đương `make init` | Alias for `init` |
| `-` | `.\easy-init.ps1` | Phím tắt khởi tạo nhanh cho Windows | Convenience wrapper for `.\make.ps1 init` |
| `-` | `.\easy-deploy.ps1` | Phím tắt triển khai nhanh cho Windows | Convenience wrapper for `.\make.ps1 deploy` |

---

## 2. Quản Lý Dịch Vụ / Container Services

| Linux | Windows | Chức năng (Tiếng Việt) | Description (English) |
|---|---|---|---|
| `-` | `.\make.ps1 deploy` | Khởi chạy dịch vụ (hoặc setup nếu chưa có cấu hình) | Start services, or run setup first if env missing |
| `make up` | `.\make.ps1 up` | Khởi động toàn bộ container dịch vụ | Start all services |
| `make down` | `.\make.ps1 down` | Dừng và hạ toàn bộ container | Stop all services |
| `make build` | `.\make.ps1 build` | Build lại Docker images | Build Docker images |
| `make restart` | `.\make.ps1 restart` | Khởi động lại toàn bộ dịch vụ | Restart all services |
| `make stop` | `.\make.ps1 stop` | Dừng tạm thời không xóa container | Stop without removing containers |
| `make logs` | `.\make.ps1 logs` | Theo dõi log trực tiếp | Follow service logs |
| `make ps` | `.\make.ps1 ps` | Xem danh sách container đang chạy | List running containers |
| `make pull` | `.\make.ps1 pull` | Kéo images mới nhất từ Docker Registry | Pull latest images |

---

## 3. Tường Lửa & Kết Nối / Firewall & Networking

| Linux | Windows | Chức năng (Tiếng Việt) | Description (English) |
|---|---|---|---|
| `make expose` | `.\make.ps1 expose` | Mở port game (UDP 16261-16262) | Open game ports (UDP 16261-16262) |
| `make hide` | `.\make.ps1 hide` | Đóng port game | Close game ports |
| `make admin-expose` | `.\make.ps1 admin-expose` | Mở port HTTPS Web Admin | Open admin HTTPS ports |
| `make admin-hide` | `.\make.ps1 admin-hide` | Đóng port HTTPS Web Admin | Close admin HTTPS ports |

---

## 4. Cơ Sở Dữ Liệu / Database

| Linux | Windows | Chức năng (Tiếng Việt) | Description (English) |
|---|---|---|---|
| `make db-check` | `.\make.ps1 db-check` | Kiểm tra / tạo volume DB | Check/create DB volume |
| `make db-init` | `.\make.ps1 db-init` | Tạo volume DB rỗng | Create empty DB volume |
| `make db-reset` | `.\make.ps1 db-reset` | Reset volume DB (**Nguy hiểm**) | Reset DB volume (**danger**) |
| `make db-backup` | `.\make.ps1 db-backup` | Sao lưu Database vào `db-backups/` | Backup database to `db-backups/` |
| `make db-restore` | `.\make.ps1 db-restore` | Khôi phục bản sao lưu DB gần nhất | Restore latest backup |

---

## 5. Ứng Dụng & Quản Trị Mã Nguồn / App Management

| Linux | Windows | Chức năng (Tiếng Việt) | Description (English) |
|---|---|---|---|
| `make migrate` | `.\make.ps1 migrate` | Chạy migrations cơ sở dữ liệu | Run database migrations |
| `make test` | `.\make.ps1 test` | Chạy bộ kiểm thử tự động (Unit/Feature) | Run the test suite |
| `make exec CMD="..."` | `.\make.ps1 exec php artisan ...` | Thực thi lệnh trong container app | Run command in app container |

### Các Lệnh Thực Thi Phổ Biến / Common Exec Examples
```bash
# Định dạng code PHP (Laravel Pint)
make exec CMD="vendor/bin/pint --dirty --format agent"

# Sinh Typescript Routes (Wayfinder)
make exec CMD="php artisan wayfinder:generate"

# Build Frontend (Vite/React)
make exec CMD="npm run build"

# Xóa Cache Cấu Hình Laravel
make exec CMD="php artisan config:clear"
```

---

## 6. Lệnh Khác / System & Maintenance

| Linux | Windows | Chức năng (Tiếng Việt) | Description (English) |
|---|---|---|---|
| `make info` | `.\make.ps1 info` | Xem URL, IP và trạng thái tường lửa | Show URLs, public IP, and firewall status |
| `make arch` | `.\make.ps1 arch` | Xem kiến trúc CPU nhận diện | Show detected CPU architecture |
| `make update-version` | `.\make.ps1 update-version` | Cập nhật `game-version.conf` sau update PZ | Update `game-version.conf` after PZ update |
| `make wipe-pz` | `.\make.ps1 wipe-pz` | Xóa dữ liệu game thế giới PZ (**Nguy hiểm**) | Wipe game data; keep config/tiles (**danger**) |
| `make nuke` | `.\make.ps1 nuke` | Xóa sạch toàn bộ dữ liệu (**Nguy hiểm**) | Destroy ALL data and stop services (**danger**) |
| `make help` | `.\make.ps1 help` | Hiển thị tất cả các lệnh khả dụng | Show all available commands |

