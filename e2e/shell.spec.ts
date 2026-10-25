import { expect, test } from './fixtures';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SECURITY_HEADERS } = require('../scripts/web/headers');

const TABS = ['Home', 'Activity', 'Budgets', 'Settings'];
const ORIGIN = 'http://localhost:4173';

test.describe('PWA shell', () => {
  test('serves every response with the production security headers', async ({ page }) => {
    const seen: { url: string; headers: Record<string, string> }[] = [];
    page.on('response', (response) => {
      // blob: URLs report our origin but carry no HTTP headers.
      if (response.url().startsWith(`${ORIGIN}/`)) {
        seen.push({ url: response.url(), headers: response.headers() });
      }
    });

    await page.goto('/');
    await expect(page.getByText('Welcome to Paisa')).toBeVisible();

    expect(seen.length).toBeGreaterThan(1);
    for (const { url, headers } of seen) {
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        expect(headers[name.toLowerCase()], `${name} on ${url}`).toBe(value);
      }
    }
  });

  test('is cross-origin isolated, so SQLite can use SharedArrayBuffer', async ({ page }) => {
    await page.goto('/');
    const isolation = await page.evaluate(() => ({
      isolated: globalThis.crossOriginIsolated,
      sab: typeof SharedArrayBuffer,
    }));
    expect(isolation).toEqual({ isolated: true, sab: 'function' });
  });

  test('opens the SQLite database in the origin private file system', async ({ page }) => {
    await page.goto('/');
    // The home screen only renders after migrations have run (Suspense).
    await expect(page.getByText('Welcome to Paisa')).toBeVisible();

    const entries = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const names: string[] = [];
      for await (const name of root.keys()) names.push(name);
      return names;
    });
    expect(entries.length).toBeGreaterThan(0);
  });

  test('shows an iOS-style bottom tab bar with every tab', async ({ page }) => {
    await page.goto('/');
    const tabBar = page.getByRole('tablist');
    await expect(tabBar).toBeVisible();
    for (const name of TABS) {
      await expect(tabBar.getByRole('tab', { name })).toBeVisible();
    }

    const box = await tabBar.boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport && box.y + box.height).toBeGreaterThan((viewport?.height ?? 0) * 0.85);

    await tabBar.getByRole('tab', { name: 'Settings' }).click();
    await expect(page.getByText('Stored on this device')).toBeVisible();
  });

  test('opens on the Home tab, and every tab has its own URL', async ({ page }) => {
    await page.goto('/');
    const tabBar = page.getByRole('tablist');
    await expect(tabBar.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Welcome to Paisa')).toBeVisible();

    const paths = new Set<string>();
    for (const name of TABS) {
      await tabBar.getByRole('tab', { name }).click();
      await expect(tabBar.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
      paths.add(new URL(page.url()).pathname);
    }
    expect(paths.size).toBe(TABS.length);
  });

  test('tab labels are fully visible, not clipped', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('tablist')).toBeVisible();
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll('[role="tab"] *')]
        .filter((el) => el.children.length === 0 && (el.textContent ?? '').trim() !== '')
        .filter((el) => el.scrollHeight > el.clientHeight + 1)
        .map((el) => el.textContent),
    );
    expect(clipped).toEqual([]);
  });

  test('links a manifest that installs as a standalone app', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();

    const manifest = await (await request.get(href!)).json();
    expect(manifest).toMatchObject({ name: 'Paisa', short_name: 'Paisa', display: 'standalone', start_url: '/' });
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));

    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/);
  });

  test('starts with no network once the service worker has installed', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to Paisa')).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // A reload puts the page under the worker's control.
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
      .toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('Welcome to Paisa')).toBeVisible();
    const isolated = await page.evaluate(() => globalThis.crossOriginIsolated);
    expect(isolated).toBe(true);
  });

  test('loads nothing from another origin', async ({ page }) => {
    const foreign: string[] = [];
    page.on('request', (req) => {
      const origin = new URL(req.url()).origin;
      if (origin !== ORIGIN && !req.url().startsWith('blob:') && !req.url().startsWith('data:')) {
        foreign.push(req.url());
      }
    });
    await page.goto('/');
    await expect(page.getByText('Welcome to Paisa')).toBeVisible();
    expect(foreign).toEqual([]);
  });
});
