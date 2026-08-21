# Cấu Hình Tường Lửa — Firewalld (Fedora / RHEL / CentOS)
# Firewall Configuration — firewalld (Fedora / RHEL / CentOS)

---

Tài liệu này hướng dẫn quản trị tường lửa máy chủ Project Zomboid trên các bản phân phối Linux sử dụng **firewalld** (như **Fedora**, **RHEL**, **CentOS**, **AlmaLinux**, **Rocky Linux**).

---

## 1. Cơ Chế Hoạt Động / How It Works

### Tiếng Việt
Lệnh `make init` tự động nhận diện firewalld và lưu cấu hình vào `.firewall.conf`. Các lệnh `make expose` / `make hide` / `make admin-expose` / `make admin-hide` sau đó sẽ tự động sử dụng `firewall-cmd` để quản lý các cổng mạng.
Mặc định các rule tạo ra ở chế độ **runtime only** (không vĩnh viễn), an toàn khi thử nghiệm.

### English
`make init` detects firewalld and persists details into `.firewall.conf`. Commands `make expose`, `make hide`, `make admin-expose`, and `make admin-hide` automatically invoke `firewall-cmd` (runtime rules by default).

---

## 2. Các Cấp Độ Truy Cập / Access Levels

### 1. Chỉ Nội Bộ / Local-Only (Mặc định)
Sau khi `make up`, bảng điều khiển web sẵn sàng tại `http://localhost:8000`. Server game chạy an toàn và không bị truy cập từ ngoài Internet.

### 2. Mở Cổng Game / Game Ports Open (LAN / Internet)
```bash
make expose    # Mở UDP 16261 + UDP 16262 (runtime)
make hide      # Thu hồi và đóng cổng
```

### 3. Mở Cổng Web Quản Trị Public / Public Admin HTTPS
```bash
make admin-expose   # Mở các cổng Caddy HTTPS công khai (mặc định 80/tcp + 443/tcp)
make admin-hide     # Đóng cổng Caddy HTTPS
```

---

## 3. Lệnh Cấu Hình Thủ Công / Manual Commands

```bash
# Kiểm tra zone mặc định / Get current default zone
firewall-cmd --get-default-zone

# Mở cổng game thủ công (thay FedoraWorkstation bằng zone của bạn)
sudo firewall-cmd --zone=FedoraWorkstation --add-port=16261/udp
sudo firewall-cmd --zone=FedoraWorkstation --add-port=16262/udp

# Đóng cổng game thủ công
sudo firewall-cmd --zone=FedoraWorkstation --remove-port=16261/udp
sudo firewall-cmd --zone=FedoraWorkstation --remove-port=16262/udp

# Mở cổng Web Admin Caddy
sudo firewall-cmd --zone=FedoraWorkstation --add-port=80/tcp
sudo firewall-cmd --zone=FedoraWorkstation --add-port=443/tcp

# Xem danh sách các port đang mở
sudo firewall-cmd --zone=FedoraWorkstation --list-ports

# Lưu quy tắc thành vĩnh viễn qua các lần reboot (tùy chọn)
sudo firewall-cmd --runtime-to-permanent
```

---

## 4. Mở Port Trên Router (Port Forwarding) / Router Port Forwarding

1. Tra cứu IP nội bộ máy chủ: `ip addr`
2. Đăng nhập trang quản trị Router/Modem.
3. Chuyển tiếp (Port Forward) các cổng sau về IP máy chủ:
   - `16261/UDP` — Game port
   - `16262/UDP` — Direct connection port
   - Cổng HTTP/HTTPS Caddy (xem qua `make info`) nếu muốn mở Web Admin ra ngoài.

---

## 5. Kiểm Tra Hoạt Động / Verification

```bash
# Kiểm tra port trong firewalld
sudo firewall-cmd --zone=FedoraWorkstation --query-port=16261/udp
sudo firewall-cmd --zone=FedoraWorkstation --query-port=16262/udp

# Kiểm tra kết nối từ máy khác
nc -zuv <server-ip> 16261
```

