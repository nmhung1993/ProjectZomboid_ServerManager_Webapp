## Phân tích: cách lệnh `gen-map` lấy các map mod đang active

Lệnh `.\make.ps1 gen-map` chạy command Laravel `zomboid:generate-map-tiles` (file `app/app/Console/Commands/GenerateMapTiles.php`). Cốt lõi lấy map mod nằm ở hàm **`resolveModMaps()`** (dòng 299–352).

---

### Bức tranh tổng thể về nguồn dữ liệu

`gen-map` không lấy gì từ internet. Nó đọc dữ liệu từ **3 nguồn local**:

| Nguồn | Đường dẫn | Vai trò |
|---|---|---|
| `server.ini` | `/pz-data/Server/*.ini` | Cho biết server đang bật những map nào (dòng `Map=`) |
| Game data vanilla | `/pz-server/media/maps/...` | Map gốc của game |
| Workshop mods | `/pz-server/steamapps/workshop/content/108600/<id>/mods/<mod>/common/media/maps/...` | Map mod đã cài qua Steam Workshop |
| pzmap2dzi conf | `/opt/pzmap2dzi/conf/vanilla.txt` + `conf/mod/maps-*.txt` | Định nghĩa: tên map ↔ key pzmap2dzi |

---

### Dòng `Map=` thực tế của bạn

```
Map=Muldraugh, KY;EchoCreek;Fort Benning B42;Fort Waterfront B42;EchoCreek MilitaryBase回音河 军事基地
```

Sau khi `explode(';')` + `trim`, `resolveModMaps()` có danh sách `activeMaps`:
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

### Quy trình 4 bước của `resolveModMaps()`

#### Bước 1 — Đọc vanilla names (`parseVanillaMapNames`)

Đọc `conf/vanilla.txt`, parse mọi `map_path`:
```yaml
default:
    map_path: '{pz_root}/media/maps/Muldraugh, KY'
```
→ `vanillaNames = ["Muldraugh, KY", "Tutorial", "Studio", "Kingsmouth", ...]`

Dùng để loại bỏ map vanilla khỏi danh sách mod (vanilla render qua `base_map` riêng).

#### Bước 2 — Đọc mod map keys (`parseModMapKeys`)

Quét `conf/mod/maps-*.txt`, parse cấu trúc YAML để dựng mapping `map_name → key`:

```yaml
RavenCreek:                    # ← key (dùng để render)
  map_name: RavenCreek         # ← tên trong game
  steam_id: '2196102849'
```
→ `modMapKeys["RavenCreek"] = "RavenCreek"`

#### Bước 3 — Auto-discover (`discoverModMapKeys`) [quan trọng nhất]

Với các map active **không khớp** với vanilla lẫn mod definition có sẵn, nó quét thẳng thư mục Workshop:

```
/pz-server/steamapps/workshop/content/108600/<steam_id>/mods/<mod_name>/common/media/maps/<map_name>
```

Nếu tìm thấy thư mục map, nó:
1. Tạo key bằng cách lọc ký tự đặc biệt: `sanitizeModMapKey($mapName)`.
2. Ghi ra file `conf/mod/maps-auto-generated.txt` để pzmap2dzi đọc lần sau.
3. Thêm vào mapping.

#### Bước 4 — Đối chiếu và trả kết quả

```php
foreach ($activeMaps as $mapName) {
    if (in_array($mapName, $vanillaNames, true)) continue;   // bỏ vanilla
    $key = $modMapKeys[$mapName] ?? null;
    if ($key !== null) {
        $modMaps[] = $key;                                    // thêm key mod
    } else {
        // báo warning: không tìm thấy, bỏ qua
    }
}
```

---

### Ví dụ cụ thể với danh sách map của bạn

| Tên trong `Map=` | Kết quả | Vì sao |
|---|---|---|
| `Muldraugh, KY` | **Bỏ qua** (vanilla) | Có trong `vanilla.txt` → render qua `base_map` |
| `EchoCreek` | → key `EchoCreekMB` | Khớp qua alias mapping (pzmap2dzi key khác tên game) |
| `Fort Benning B42` | → key `FortBenning` | Alias `"Fort Benning B42" → FortBenning` |
| `Fort Waterfront B42` | → key `FortWaterfront` | Alias `"Fort Waterfront B42" → FortWaterfront` |
| `EchoCreek MilitaryBase回音河 军事基地` | **WARNING: bỏ qua** | Tên Unicode (Tiếng Trung) không khớp mapping nào và `sanitizeModMapKey` loại bỏ hết ký tự đặc biệt → không resolve được |

> ⚠️ Đây là lý do lần chạy `merge-mod-maps` trước đó bạn thấy dòng:
> ```
> [WARN] Unknown map (no CDN key): EchoCreek MilitaryBase回音河 军事基地
> ```

---

### Sau khi có các key `$modMaps`, chuyện gì xảy ra?

**1. Generate config (`generateConfig` dòng 179–186):**
```yaml
mod_root: /pz-server/steamapps/workshop/content/108600
mod_maps:
  - EchoCreekMB
  - FortBenning
  - FortWaterfront
```

**2. pzmap2dzi render:**
- `render base` → vanilla vào `map_data/base/`
- Mỗi mod → `map_data/mod_maps/<key>/base_top/` hoặc `base/`

**3. Merge (`mergeModTiles` + `composite-map-tiles.py`):**
- Vì vanilla và mod đều do **cùng pzmap2dzi render với cùng config** `top_view_square_size: 4`, nên mọi map có **cùng `sqr`, cùng `tile_size`, cùng format**.
- Script chỉ cần tính độ lệch `x0/y0` rồi copy tile mod đè lên vanilla đúng vị trí.
- Hàm `merge_mod` còn kiểm tra: nếu `sqr` hoặc `tile_size` khác nhau thì **ném exception** (`ValueError`) — vì không cùng hệ tọa độ.

---

### Tóm tắt cơ chế "lấy map mod active"

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

Điểm mấu chốt khiến `gen-map` hiển thị "hoàn hảo": **mọi map — vanilla lẫn mod — đều được render lại từ đầu bằng cùng một pzmap2dzi với cùng cấu hình tỷ lệ**, nên không bao giờ lệch `sqr`/`tile_size`/format như bản tải từ CDN.