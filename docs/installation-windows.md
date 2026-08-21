# Hướng Dẫn Cài Đặt Trên Windows
# Windows Installation Guide

---

> **Thử nghiệm / Alpha:** Hỗ trợ Windows đang trong giai đoạn Alpha. Các script PowerShell (`make.ps1`, `scripts/setup.ps1`) tương đương với Makefile trên Linux và yêu cầu chạy backend Docker Linux container. *(Windows support is in alpha. PowerShell scripts mirror the Linux Makefile and run with a Linux container backend).*

- **Windows 10 / 11:** Docker Desktop với WSL 2 backend là lựa chọn đơn giản và tối ưu nhất.
- **Windows Server 2022 / 2025:** Không hỗ trợ chế độ Windows container trực tiếp cho stack này. Khuyên dùng chạy trong Máy ảo Linux (Linux VM) trên Hyper-V.
- **WSL 2:** Có thể sử dụng trực tiếp môi trường Ubuntu WSL2 nếu muốn dùng lệnh `make` thuần Linux.

---

## Lựa chọn A — Windows 10 / 11 với PowerShell Gốc (Khuyên Dùng)
## Option A — Windows 10/11 with Native PowerShell (Recommended)

Bộ script PowerShell (`make.ps1`, `easy-init.ps1`, `easy-deploy.ps1`) cho phép bạn quản trị server trực tiếp từ PowerShell mà không cần gõ lệnh bash.

### 1. Yêu Cầu / Requirements

| # | Phần mềm / Dependency | Link tải / Download |
|---|-----------|------|
| 1 | **Docker Desktop for Windows** | [Cài đặt Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) |
| 2 | **Git for Windows** (bao gồm OpenSSL) | [Cài đặt Git](https://git-scm.com/downloads/win) |

> **Quan trọng:** Trong Docker Desktop: Settings > General, đảm bảo đã bật **"Use the WSL 2 based engine"** (mặc định đã bật).

---

### 2. Các Bước Cài Đặt / Setup Steps

**Bước 1: Clone Repository**
```powershell
git clone https://github.com/nmhung1993/ProjectZomboid_ServerManager_Webapp.git
cd ProjectZomboid_ServerManager_Webapp
```

**Bước 2: Chạy Wizard Cài Đặt**
```powershell
.\make.ps1 init
# hoặc chạy nhanh:
.\easy-init.ps1
```

**Bước 3: Mở Cổng Game Tường Lửa (Windows Firewall)**
```powershell
.\make.ps1 expose
```
Lệnh này sẽ tự động tạo các quy tắc trên Windows Firewall cho cổng UDP 16261-16262.

**Bước 4: Truy Cập Bảng Điều Khiển Web**
- **Cục bộ (Local):** `http://localhost:8000`
- **Công khai qua HTTPS (Public HTTPS):**
```powershell
.\make.ps1 admin-expose
```

---

### Bảng Tra Cứu Lệnh PowerShell / PowerShell Command Reference

| Lệnh / Command | Chức năng / Description |
|---|---|
| `.\make.ps1 up` | Khởi động toàn bộ các container dịch vụ / Start all services |
| `.\make.ps1 deploy` | Khởi chạy dịch vụ (hoặc tự động cài nếu chưa có cấu hình) / Start or setup |
| `.\make.ps1 down` | Dừng toàn bộ các container / Stop all services |
| `.\make.ps1 restart` | Khởi động lại toàn bộ dịch vụ / Restart all services |
| `.\make.ps1 logs` | Xem log trực tiếp thời gian thực / Follow live logs |
| `.\make.ps1 ps` | Xem danh sách container đang chạy / List running containers |
| `.\make.ps1 info` | Xem URL, IP công khai và trạng thái tường lửa / Show URLs and IP |
| `.\make.ps1 test` | Chạy bộ kiểm thử tự động / Run test suite |
| `.\make.ps1 exec "CMD"` | Thực thi lệnh bên trong container app / Execute command inside app |
| `.\make.ps1 expose` | Mở port game (UDP 16261-16262) / Open game ports |
| `.\make.ps1 hide` | Đóng port game / Close game ports |
| `.\make.ps1 admin-expose` | Mở port HTTPS cho Web Admin / Open admin HTTPS ports |
| `.\make.ps1 admin-hide` | Đóng port HTTPS Web Admin / Close admin HTTPS ports |
| `.\make.ps1 db-backup` | Sao lưu Database PostgreSQL / Backup database |
| `.\make.ps1 db-restore` | Khôi phục bản sao lưu DB mới nhất / Restore latest database backup |
| `.\make.ps1 nuke` | Xóa sạch toàn bộ dữ liệu (Nguy hiểm) / Destroy ALL data |
| `.\make.ps1 help` | Xem danh sách trợ giúp lệnh / Show command help |

---

## Lựa chọn B — Windows Server với Máy Ảo Linux (Hyper-V VM)
## Option B — Windows Server with a Linux VM

Trên Windows Server (2022/2025):
1. Tạo một máy ảo Ubuntu Server trên Hyper-V.
2. Cài đặt Docker Engine và Docker Compose trong máy ảo.
3. Clone repository và làm theo hướng dẫn [Cài đặt Linux (installation-linux.md)](installation-linux.md).
4. Cấu hình port forwarding từ Windows Server host vào IP của máy ảo Hyper-V.

---

## Lựa chọn C — Môi trường WSL 2 (Chạy lệnh Linux thuần trên Windows)
## Option C — WSL2 (Native Linux experience on Windows)

Nếu bạn quen thuộc với bash và Makefile trên Linux:
1. Mở PowerShell (Run as Administrator):
```powershell
wsl --install -d Ubuntu-24.04
```
2. Cài đặt Docker Engine bên trong Ubuntu WSL.
3. Clone repo và chạy lệnh `make init` tương tự như môi trường Linux chuẩn.

