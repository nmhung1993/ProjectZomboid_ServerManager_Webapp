# Báo Cáo Kiểm Thử & Kiểm Định Chất Lượng
# Quality Audit & Test Report

**Dự án / Project:** Zomboid Server Manager (Web Application & Dockerized Server)  
**Ngày thực hiện / Date:** 21/08/2026  
**Mục tiêu / Objectives:** Kiểm thử và đánh giá toàn diện tính năng Progressive Web App (PWA), Service Worker, Manifest, Unit Test & Playwright E2E Test. *(Comprehensive audit and testing of PWA features, Service Worker, Manifest, Unit Tests, and Playwright E2E suites).*

---

## 1. Tổng Quan Các Tính Năng Đã Phát Triển / Feature Implementation Overview

| Tính năng / Feature | Thành phần triển khai / Implemented Components | Mục đích / Description |
|---|---|---|
| **PWA Badge Name / App Name** | Database (`site_settings`), Model `SiteSetting`, Admin UI (`/admin/site-settings`), `UpdateSiteSettingRequest` | Cho phép quản trị viên tùy biến tên hiển thị của ứng dụng PWA trên màn hình chính (home screen) và app launcher của thiết bị di động/desktop. Tự động fallback về `site_name`. *(Configurable PWA home screen app title with automatic fallback to site name).* |
| **Dynamic PWA Manifest & Icons** | Controller `ManifestController` (`/manifest.webmanifest`, `/manifest.json`), Blade Layout `app.blade.php` | Phục vụ Web App Manifest động theo thời gian thực. Khi admin thay đổi/upload logo mới, icon PWA tự động cập nhật và đồng bộ kích thước chuẩn (192x192, 512x512, maskable). *(Dynamic real-time manifest and icon generation matching uploaded branding).* |
| **PWA Service Worker** | `public/sw.js`, `resources/js/app.tsx` | Đăng ký Service Worker client-side, thực hiện caching tĩnh các asset PWA, đảm bảo ứng dụng đạt chuẩn PWA Installable. *(Client-side service worker registration and static asset caching for installable PWA compliance).* |
| **Mobile & Apple Web App Tags** | `app.blade.php` | Cung cấp đầy đủ thẻ meta: `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-touch-icon`, `theme-color`. *(Comprehensive meta tags for iOS and mobile standalone experience).* |

---

## 2. Kết Quả Kiểm Thử / Test Suite Execution Results

### A. Unit Tests (Pest PHP)
- **File test:** `tests/Unit/SiteSettingPwaUnitTest.php`
- **Nội dung kiểm tra / Test cases:**
  1. `defaults pwaBadgeName to site_name when pwa_badge_name is null or empty` -> **PASSED**
  2. `returns custom pwaBadgeName when set` -> **PASSED**
  3. `resolves pwaIconUrl with priority order logo -> favicon -> apple-touch-icon fallback` -> **PASSED**

### B. Feature & Integration Tests (Pest PHP)
- **File test:** `tests/Feature/ManifestTest.php`
  1. `returns dynamic webmanifest with default settings` -> **PASSED**
  2. `returns custom pwa badge name and updated logo in manifest` -> **PASSED**
  3. `accessible via manifest.json alias route` -> **PASSED**
- **File test:** `tests/Feature/Admin/SiteSettingTest.php`
  - 23/23 assertions passed, bao gồm:
    - Hiển thị `pwa_badge_name` trong dữ liệu Inertia settings.
    - Cập nhật text field `pwa_badge_name`.
    - Kiểm tra validation: từ chối `pwa_badge_name` vượt quá 50 ký tự (`max:50`).

### C. End-to-End Tests (Playwright)
- **File test:** `app/tests/e2e/pwa.spec.ts` & `e2e/pwa.spec.ts`
- **Cấu hình / Config:** `playwright.config.ts` (Chromium / Desktop Chrome)
- **Kết quả / Results:**
  ```text
  Running 4 tests using 4 workers
    ok 1 [chromium] › tests/e2e/pwa.spec.ts › manifest.webmanifest returns valid JSON manifest with dynamic branding
    ok 2 [chromium] › tests/e2e/pwa.spec.ts › manifest.json alias endpoint works correctly
    ok 3 [chromium] › tests/e2e/pwa.spec.ts › Service worker /sw.js is accessible and serves valid JavaScript
    ok 4 [chromium] › tests/e2e/pwa.spec.ts › HTML head includes PWA manifest link and mobile web app meta tags

  4 passed (1.9s)
  ```

### D. TypeScript & Static Analysis Audit
- Chạy lệnh `npm run types` (`tsc --noEmit`): **0 errors, clean output**.
- Toàn bộ các component liên quan đến Site Settings, Player Dialog, Shop, Portal Achievements đều đạt chuẩn type an toàn.

---

## 3. Hướng Dẫn Chạy Kiểm Thử / How to Execute Tests

### Chạy Pest Unit/Feature Tests (Docker):
```bash
docker exec -e APP_ENV=testing -e APP_CONFIG_CACHE=/tmp/laravel-test-config.php -e DB_CONNECTION=pgsql -e DB_DATABASE=zomboid_test pz-app sh -lc "php artisan test tests/Unit/SiteSettingPwaUnitTest.php tests/Feature/ManifestTest.php tests/Feature/Admin/SiteSettingTest.php"
```

### Chạy Playwright E2E Tests:
```bash
cd app
npm run test:e2e
```

