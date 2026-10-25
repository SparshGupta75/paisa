import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from './fixtures';

const SW_PATH = path.join(__dirname, '..', 'dist', 'sw.js');

test.describe('app update', () => {
  let original: string;

  test.beforeEach(() => {
    original = fs.readFileSync(SW_PATH, 'utf8');
  });

  test.afterEach(() => {
    fs.writeFileSync(SW_PATH, original);
  });

  test('offers an update when a new version is deployed, and switches to it on tap', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to Paisa')).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    await expect(page.getByText('A new version of Paisa is ready.')).toHaveCount(0);

    // Deploy: same files, new worker version.
    const oldVersion = /const VERSION = "([0-9a-f]{12})";/.exec(original)?.[1];
    expect(oldVersion).toBeTruthy();
    const newVersion = 'fedcba987654';
    fs.writeFileSync(SW_PATH, original.replace(`"${oldVersion}"`, `"${newVersion}"`));

    // Returning to the foreground makes the app check for a new worker.
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(page.getByText('A new version of Paisa is ready.')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Update Paisa now' }).click();
    await page.waitForEvent('load');
    await expect(page.getByText('Welcome to Paisa')).toBeVisible();
    await expect(page.getByText('A new version of Paisa is ready.')).toHaveCount(0);

    const cacheNames = await page.evaluate(() => caches.keys());
    expect(cacheNames.filter((name) => name.startsWith('paisa-shell-'))).toEqual([`paisa-shell-${newVersion}`]);
  });
});
