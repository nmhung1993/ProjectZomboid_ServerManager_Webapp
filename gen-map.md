# Phân tích Kỹ thuật: Cơ chế Lấy và Hợp nhất Map Mod (`gen-map`)
# Technical Analysis: Active Mod Map Extraction & Compositing Mechanism (`gen-map`)

---

## 1. Tổng quan / Overview

### Tiếng Việt
Lệnh `.\make.ps1 gen-map` chạy command Laravel `zomboid:generate-map-tiles` (file `app/app/Console/Commands/GenerateMapTiles.php`). Cốt lõi lấy map mod nằm ở hàm **`resolveModMaps()`** (dòng 299–352).

### English
The `.\make.ps1 gen-map` command executes Laravel's `zomboid:generate-map-tiles` command (`app/app/Console/Commands/GenerateMapTiles.php`). The core logic for mod map extraction resides within **`resolveModMaps()`** (lines 299–352).

---

## 2. Nguồn dữ liệu Local / Local Data Sources

### Tiếng Việt & English
`gen-map` không lấy gì từ internet. Nó đọc dữ liệu từ **3 nguồn local**:
*(The `gen-map` pipeline operates completely offline from 3 local sources:)*

| Nguồn / Source | Đường dẫn / Path | Vai trò / Role |
|---|---|---|
| `server.ini` | `/pz-data/Server/*.ini` | Cho biết server đang bật những map nào (dòng `Map=`) / Active server map line |
| Game data vanilla | `/pz-server/media/maps/...` | Map gốc của game / Official vanilla game map data |
| Workshop mods | `/pz-server/steamapps/workshop/content/108600/<id>/mods/<mod>/common/media/maps/...` | Map mod đã cài qua Steam Workshop / Installed workshop mod maps |
| pzmap2dzi conf | `/opt/pzmap2dzi/conf/vanilla.txt` + `conf/mod/maps-*.txt` | Định nghĩa: tên map ↔ key pzmap2dzi / Map name to pzmap2dzi key mapping |

---

## 3. Dòng `Map=` Thực tế / Example `Map=` Line

```ini
Map=Muldraugh, KY;EchoCreek;Fort Benning B42;Fort Waterfront B42;EchoCreek MilitaryBase回音河 军事基地
```

Sau khi `explode(';')` + `trim`, `resolveModMaps()` có danh sách `activeMaps`:
*(After parsing with `explode(';')` and `trim`, `resolveModMaps()` acquires the active array:)*
```php
[
  "Muldraugh, KY",
  "EchoCreek",
  "Fort Benning B42",
  "Fort Waterfront B42",
  "EchoCreek MilitaryBase回音河 军事基地",
]
```

---

## 4. Quy trình 4 bước của `resolveModMaps()` / 4-Step Resolution Pipeline

### Bước 1 — Đọc vanilla names (`parseVanillaMapNames`) / Step 1: Read Vanilla Names
Đọc `conf/vanilla.txt`, parse mọi `map_path`:
```yaml
default:
    map_path: '{pz_root}/media/maps/Muldraugh, KY'
```
→ `vanillaNames = ["Muldraugh, KY", "Tutorial", "Studio", "Kingsmouth", ...]`
*Dùng để loại bỏ map vanilla khỏi danh sách mod (vanilla render qua `base_map` riêng).*

### Bước 2 — Đọc mod map keys (`parseModMapKeys`) / Step 2: Read Mod Map Keys
Quét `conf/mod/maps-*.txt`, parse cấu trúc YAML để dựng mapping `map_name → key`:
```yaml
RavenCreek:                    # ← key (dùng để render / render key)
  map_name: RavenCreek         # ← tên trong game / in-game name
  steam_id: '2196102849'
```
→ `modMapKeys["RavenCreek"] = "RavenCreek"`

### Bước 3 — Auto-discover (`discoverModMapKeys`) / Step 3: Auto-Discovery
Với các map active **không khớp** với vanilla lẫn mod definition có sẵn, hệ thống quét thẳng thư mục Workshop:
```
/pz-server/steamapps/workshop/content/108600/<steam_id>/mods/<mod_name>/common/media/maps/<map_name>
```
Nếu tìm thấy thư mục map:
1. Tạo key bằng cách lọc ký tự đặc biệt: `sanitizeModMapKey($mapName)`.
2. Ghi ra file `conf/mod/maps-auto-generated.txt` để pzmap2dzi đọc lần sau.
3. Thêm vào mapping bộ nhớ.

### Bước 4 — Đối chiếu và trả kết quả / Step 4: Map Key Resolution
```php
foreach ($activeMaps as $mapName) {
    if (in_array($mapName, $vanillaNames, true)) continue;   // bỏ vanilla
    $key = $modMapKeys[$mapName] ?? null;
    if ($key !== null) {
        $modMaps[] = $key;                                    // thêm key mod
    } else {
        // cảnh báo: không tìm thấy / warning: unknown map key
    }
}
```

---

## 5. Kết quả Đối chiếu Mẫu / Concrete Map Resolution Example

| Tên trong `Map=` / Name in `Map=` | Kết quả / Result | Vì sao / Reason |
|---|---|---|
| `Muldraugh, KY` | **Bỏ qua** (vanilla) | Có trong `vanilla.txt` → render qua `base_map` |
| `EchoCreek` | → key `EchoCreekMB` | Khớp qua alias mapping (pzmap2dzi key khác tên game) |
| `Fort Benning B42` | → key `FortBenning` | Alias `"Fort Benning B42" → FortBenning` |
| `Fort Waterfront B42` | → key `FortWaterfront` | Alias `"Fort Waterfront B42" → FortWaterfront` |
| `EchoCreek MilitaryBase回音河 军事基地` | **Cảnh báo: bỏ qua** | Tên Unicode không khớp mapping và bị strip ký tự đặc biệt |

---

## 6. Quy trình Render và Hợp nhất Tile / Render & Tile Compositing Workflow

```
server.ini (Map=)
    │
    ├─ tách ';' → danh sách tên map
    │
    ├─ so với vanilla.txt → vanilla? → bỏ (render bằng base_map)
    │
    ├─ so với conf/mod/maps-*.txt → khớp → lấy key pzmap2dzi
    │
    └─ không khớp → quét Workshop folder → tự tìm thư mục map → sinh key
                    │
                    ▼
    các key mod → ghi vào generated.yaml (mod_maps:)
                    │
                    ▼
    pzmap2dzi render vanilla + từng mod (cùng config, cùng tỷ lệ)
                    │
                    ▼
    composite-map-tiles.py merge mod vào vanilla theo tọa độ x0/y0
```

> **Điểm cốt lõi / Key Takeaway:** Mọi map (vanilla lẫn mod) đều được render lại từ đầu bằng cùng một phiên bản `pzmap2dzi` với cùng cấu hình tỷ lệ (`top_view_square_size: 4`), đảm bảo tuyệt đối không lệch `sqr`, `tile_size` hay hệ tọa độ.