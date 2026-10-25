import { test as base, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * WebKit refuses OPFS sync access handles in Playwright's ephemeral contexts
 * ("unknown transient reason"), which is also how Safari Private Browsing
 * behaves. A home-screen app has persistent storage, so every test gets a fresh
 * persistent profile instead.
 */
export const test = base.extend<{ context: BrowserContext; page: Page }>({
  context: async ({ playwright, browserName, contextOptions, baseURL }, use) => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paisa-e2e-'));
    const context = await playwright[browserName].launchPersistentContext(userDataDir, {
      ...contextOptions,
      baseURL,
    });
    await use(context);
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  },
  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? (await context.newPage()));
  },
});

export { expect } from '@playwright/test';
