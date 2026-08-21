import { test, expect } from '@playwright/test';

test.describe('PWA and Web App Manifest Integration', () => {
  test('manifest.webmanifest returns valid JSON manifest with dynamic branding', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/manifest+json');

    const manifest = await response.json();
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.icons[0]).toHaveProperty('src');
    expect(manifest.icons[0]).toHaveProperty('sizes');
  });

  test('manifest.json alias endpoint works correctly', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
  });

  test('Service worker /sw.js is accessible and serves valid JavaScript', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('addEventListener');
    expect(body).toContain('manifest.webmanifest');
  });

  test('HTML head includes PWA manifest link and mobile web app meta tags', async ({ page }) => {
    await page.goto('/');

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');

    const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleTouchIcon).toHaveCount(1);

    const mobileWebAppCapable = page.locator('meta[name="mobile-web-app-capable"]');
    await expect(mobileWebAppCapable).toHaveAttribute('content', 'yes');

    const appleMobileWebAppCapable = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleMobileWebAppCapable).toHaveAttribute('content', 'yes');
  });
});
