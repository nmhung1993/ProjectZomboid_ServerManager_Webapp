# Cấu Hình Tường Lửa — Thủ Công / Hệ Điều Hành Khác
# Firewall Configuration — Manual / Unsupported OS

---

Tài liệu này dành cho các hệ điều hành chưa hỗ trợ cấu hình tự động (khác firewalld/ufw), hoặc khi bạn chọn chế độ "manual" trong `make init`.

---

## 1. Bảng Tra Cứu Các Cổng Mạng / Ports Reference

| Port / Cổng | Protocol / Giao thức | Mục đích / Purpose | Khi nào cần mở / When to open |
|---|---|---|---|
| `16261` | UDP | Cổng kết nối game PZ chính | `make expose` — cho người chơi kết nối |
| `16262` | UDP | Cổng kết nối trực tiếp PZ | `make expose` — cho người chơi kết nối |
| *Caddy HTTP* | TCP | Tự động chuyển hướng sang HTTPS | `make admin-expose` — Web Admin |
| *Caddy HTTPS* | TCP | Bảng điều khiển Web Admin | `make admin-expose` — Web Admin |
| `8000` | TCP | App backend nội bộ | **Không bao giờ mở ra ngoài** (chỉ `127.0.0.1`) |

---

## 2. Các Lệnh Cấu Hình Theo Từng Công Cụ / Firewall Tool Syntax

### A. iptables (Linux)
```bash
# Mở cổng game UDP
sudo iptables -A INPUT -p udp --dport 16261 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 16262 -j ACCEPT

# Mở cổng Web Admin Caddy
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Đóng cổng (thay -A bằng -D)
sudo iptables -D INPUT -p udp --dport 16261 -j ACCEPT
```

### B. nftables (Linux)
```bash
# Mở cổng game
sudo nft add rule inet filter input udp dport { 16261, 16262 } accept

# Mở cổng Caddy
sudo nft add rule inet filter input tcp dport { 80, 443 } accept
```

### C. Windows Firewall (PowerShell)
```powershell
New-NetFirewallRule -DisplayName "PZ Game" -Direction Inbound -Protocol UDP -LocalPort 16261,16262 -Action Allow
New-NetFirewallRule -DisplayName "PZ Admin HTTPS" -Direction Inbound -Protocol TCP -LocalPort 80,443 -Action Allow
```

### D. macOS (pf)
```bash
echo "pass in proto udp from any to any port { 16261, 16262 }" | sudo pfctl -ef -
```

---

## 3. Mở Port Trên Router (Port Forwarding) / Router Port Forwarding

1. Tìm IP nội bộ của máy chủ (`ip addr` hoặc `ipconfig`).
2. Mở trình duyệt truy cập vào modem/router.
3. Chuyển tiếp cổng `16261/UDP`, `16262/UDP`, `80/TCP`, `443/TCP` về IP máy chủ.


---

## 4. Chuyển Sang Backend Được Hỗ Trợ Tự Động / Switching to a Supported Backend

Nếu bạn cài đặt `ufw` hoặc `firewalld` sau này, chỉ cần chạy lại:
```bash
make init
```
Hệ thống sẽ tự động quét lại môi trường và ghi đè `.firewall.conf`.

---

## 5. Cấu Trúc File `.firewall.conf` / About `.firewall.conf`

File này được tạo tự động bởi `make init` để lưu cấu hình firewall của server:
```ini
# Tự động sinh bởi make init — có thể chỉnh sửa thủ công
FIREWALL_BACKEND=manual    # firewalld | ufw | manual
FIREWALL_OS=unknown        # Tên HĐH nhận diện từ /etc/os-release
FIREWALL_ZONE=             # Zone firewalld (nếu dùng firewalld)
CADDY_ENABLED=true         # Trạng thái reverse proxy Caddy
ADMIN_PUBLIC_HOST=         # Domain hoặc IP cho public admin
ADMIN_HTTP_PORT=80         # Cổng HTTP Caddy
ADMIN_HTTPS_PORT=443       # Cổng HTTPS Caddy
```
*(File này nằm trong `.gitignore` và chỉ tồn tại cục bộ trên máy chủ).*

