# Khắc Phục Sự Cố & Câu Hỏi Thường Gặp
# Troubleshooting & FAQ

---

## 1. Lỗi "Permission denied" khi chạy lệnh Docker / "Permission denied" on Docker commands

### Tiếng Việt
Đảm bảo tài khoản người dùng của bạn đã được thêm vào nhóm `docker`:
```bash
sudo usermod -aG docker $USER
```
Sau đó hãy **đăng xuất và đăng nhập lại**.

### English
Make sure your user is in the docker group:
```bash
sudo usermod -aG docker $USER
```
Then **log out and back in**.

---

## 2. Container liên tục khởi động lại / Containers keep restarting

```bash
make logs    # hoặc .\make.ps1 logs trên Windows
```

### Tiếng Việt
Game server cần vài phút để tải về thông qua SteamCMD trong lần khởi chạy đầu tiên. Vui lòng kiên nhẫn đợi tiến trình hoàn tất.

### English
The game server takes a few minutes to download via SteamCMD on first launch. Please be patient.

---

## 3. Không thể kết nối vào Game / Cannot connect in-game

### Tiếng Việt
1. Kiểm tra địa chỉ IP công khai: `make info`
2. Đảm bảo bạn đã mở port game: `make expose`
3. Kiểm tra quy tắc tường lửa đám mây (xem [Lưu ý Nhà cung cấp Cloud](#5-lưu-ý-nhà-cung-cấp-đám-mây--cloud-provider-notes))
4. Xác minh container server đang chạy: `make ps`
5. Trên Windows, đảm bảo quy tắc Windows Firewall đã được cấu hình (xem [Hướng dẫn Windows](installation-windows.md))

### English
1. Check your public IP: `make info`
2. Make sure you ran: `make expose`
3. Check cloud firewall rules (see [Cloud Provider Notes](#5-lưu-ý-nhà-cung-cấp-đám-mây--cloud-provider-notes))
4. Verify the server is running: `make ps`
5. On Windows, ensure Windows Firewall rules are set (see [Windows guide](installation-windows.md))

---

## 4. Không mở được trang Web Quản trị (Admin Panel) / Admin panel not loading

### Tiếng Việt
1. Kiểm tra truy cập cục bộ: `http://localhost:8000`
2. Để truy cập từ xa, hãy chắc chắn đã chạy: `make admin-expose`
3. Kiểm tra tường lửa Cloud đối với port 80/443
4. Kiểm tra nhật ký hệ thống: `make logs`

### English
1. Check local access: `http://localhost:8000`
2. For remote access, make sure you ran: `make admin-expose`
3. Check cloud firewall for ports 80/443
4. Check logs: `make logs`

---

## 5. Khởi tạo lại từ đầu (Reset toàn bộ) / Want to start fresh

```bash
make nuke    # CẢNH BÁO: Lệnh này sẽ xóa sạch dữ liệu cũ / WARNING: deletes everything
make init
```

---

## 6. Lưu ý Nhà cung cấp Đám mây / Cloud Provider Notes

### Tiếng Việt
Nếu chạy trên máy ảo đám mây (Oracle Cloud, AWS, GCP, Hetzner...), bạn cần mở các cổng này trong **Security Group / Firewall Rules** của nhà cung cấp:

### English
If running on a cloud VM (Oracle Cloud, AWS, GCP, Hetzner, etc.), you also need to open these ports in your cloud provider's **security group / firewall rules**:

| Port / Cổng | Protocol / Giao thức | Mục đích / Purpose |
|------|----------|---------|
| 16261 | UDP | Luồng kết nối game Project Zomboid (Game traffic) |
| 16262 | UDP | Kết nối trực tiếp người chơi (Direct connection) |
| 443 | TCP | Web Admin HTTPS (khi dùng `admin-expose`) |
| 80 | TCP | Tự động chuyển hướng HTTP -> HTTPS (HTTP redirect) |

*Lưu ý: Lệnh `make expose` / `make admin-expose` chỉ áp dụng cho tường lửa HĐH máy chủ (OS-level firewall).*

---

## 7. Cấu hình Phần cứng Tối thiểu / Minimum Hardware

| Tài nguyên / Resource | Tối thiểu / Minimum | Khuyến nghị / Recommended |
|---|---|---|
| CPU | 2 cores | 4 cores+ |
| RAM | 4 GB | 8 GB+ |
| Dung lượng ổ cứng / Disk | 20 GB trống | 30 GB+ SSD |

| OS | Ubuntu 22.04+, Debian 12+, Fedora 38+ | Any modern Linux with Docker |

The PZ game server alone needs 2-4 GB of RAM. On Windows, this stack requires a Linux container backend. Windows Server 2022/2025 is not supported in Windows-container mode.
