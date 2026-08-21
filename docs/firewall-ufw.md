# Cấu Hình Tường Lửa — UFW (Ubuntu / Debian)
# Firewall Configuration — ufw (Ubuntu / Debian)

---

Tài liệu này hướng dẫn quản lý tường lửa máy chủ Project Zomboid trên các bản phân phối Linux sử dụng **ufw** (Uncomplicated Firewall) như **Ubuntu** hoặc **Debian**.

---

## 1. Cơ Chế Hoạt Động / How It Works

### Tiếng Việt
Lệnh `make init` tự động nhận diện `ufw` và lưu thông tin vào `.firewall.conf`. Các lệnh `make expose` / `make hide` / `make admin-expose` / `make admin-hide` sau đó sẽ tự động cấu hình các port tương ứng qua `ufw`.
*(Quy tắc ufw có tính lưu trữ vĩnh viễn qua các lần reboot).*

### English
`make init` detects ufw and persists config into `.firewall.conf`. The `make expose`, `make hide`, `make admin-expose`, and `make admin-hide` commands manipulate `ufw` rules automatically.

---

## 2. Các Cấp Độ Truy Cập / Access Levels

### 1. Chỉ Nội Bộ / Local-Only (Mặc định)
Sau khi `make up`, bảng điều khiển web sẵn sàng tại `http://localhost:8000`. Server game chạy ngầm và không mở cổng ra ngoài Internet nếu chưa cấp phép.

### 2. Mở Cổng Game / Game Ports Open (LAN / Internet)
```bash
make expose    # Mở UDP 16261 + UDP 16262
make hide      # Thu hồi và đóng cổng
```

### 3. Mở Cổng Web Quản Trị Public / Public Admin HTTPS
```bash
make admin-expose   # Mở các cổng Caddy HTTPS công khai (mặc định 80/tcp + 443/tcp)
make admin-hide     # Đóng cổng Caddy HTTPS
```

---

## 3. Lệnh Cấu Hình Thủ Công / Manual ufw Commands

```bash
# Đảm bảo ufw đang hoạt động / Ensure ufw is enabled
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable

# Mở / Đóng cổng game thủ công
sudo ufw allow 16261/udp
sudo ufw allow 16262/udp
# sudo ufw delete allow 16261/udp

# Mở / Đóng cổng Web Admin Caddy thủ công
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# sudo ufw delete allow 443/tcp

# Xem trạng thái quy tắc chi tiết
sudo ufw status verbose
```

---

## 4. Mở Port Trên Router (Port Forwarding) / Router Port Forwarding

> **Quan trọng / Important:** Mở tường lửa HĐH máy chủ và mở Port trên Router là hai bước độc lập:
> - Tường lửa máy chủ (UFW): Cho phép máy chủ chấp nhận gói tin từ cổng.
> - Port Forwarding Router: Định tuyến dữ liệu từ Internet bên ngoài tới IP nội bộ của máy chủ.

1. Tra cứu IP nội bộ máy chủ: `ip addr` (ví dụ: `192.168.1.100`)
2. Đăng nhập trang quản trị Modem/Router WiFi của bạn.
3. Chuyển tiếp (Port Forward) các cổng sau về IP máy chủ:
   - `16261/UDP` — Cổng kết nối game chính (Game port)
   - `16262/UDP` — Cổng kết nối trực tiếp người chơi (Direct connect port)
   - `80/TCP` & `443/TCP` — Cổng HTTPS Web Admin (nếu muốn truy cập dashboard từ xa)

---

## 5. Kiểm Tra Hoạt Động / Verification

```bash
# Kiểm tra danh sách rules đã cấp
sudo ufw status numbered

# Kiểm tra port UDP từ máy khác trong mạng LAN
nc -zuv <server-ip> 16261
```

