import { expect, test } from '@playwright/test';

test('quick add an expense and see it everywhere', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Welcome to Paisa')).toBeVisible();

  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('chai 40');
  await expect(page.getByRole('button', { name: 'Add ₹40' })).toBeEnabled();
  await page.getByRole('button', { name: 'Add ₹40' }).click();

  await expect(page.getByRole('status')).toContainText('Added ₹40 · Food');
  await expect(page.getByText('₹40').first()).toBeVisible();

  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(page.getByText('Today')).toBeVisible();
  await expect(page.getByText('chai')).toBeVisible();

  await page.reload();
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(page.getByText('chai')).toBeVisible();
});

test('keypad entry with a picked category', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add expense' }).click();
  for (const key of ['1', '2', '5', '0']) await page.getByRole('button', { name: key, exact: true }).click();
  await page.getByRole('button', { name: /Groceries/ }).click();
  await page.getByRole('button', { name: 'Add ₹1,250' }).click();
  await expect(page.getByRole('status')).toContainText('Added ₹1,250 · Groceries');
});

test('edit, delete with undo, and search', async ({ page }) => {
  await page.goto('/');
  for (const text of ['chai 40', 'uber 320']) {
    await page.getByRole('button', { name: 'Add expense' }).click();
    await page.getByLabel('Quick add').fill(text);
    await page.getByLabel('Quick add').press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.getByRole('tab', { name: 'Activity' }).click();

  await page.getByRole('button', { name: /chai/ }).click();
  await page.getByLabel('Note').fill('masala chai');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('masala chai')).toBeVisible();

  await page.getByLabel('Search').fill('uber');
  await expect(page.getByText('1 result')).toBeVisible();
  await expect(page.getByText('masala chai')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear search' }).click();

  await page.getByRole('button', { name: /masala chai/ }).click();
  await page.getByRole('button', { name: 'Delete expense' }).click();
  await expect(page.getByText('masala chai')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('masala chai')).toBeVisible();
});

test('monthly budget drives safe-to-spend', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Set a monthly budget' }).click();
  await page.getByLabel('Budget amount').fill('31000');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await expect(page.getByLabel('Safe to spend today')).toBeVisible();

  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('lunch 250');
  await page.getByLabel('Quick add').press('Enter');
  await expect(page.getByText('Top categories')).toBeVisible();
  await expect(page.getByText(/₹250 of ₹31,000/)).toBeVisible();
});

test('manage categories in settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Add category' }).click();
  await page.getByLabel('Emoji').fill('🐶');
  await page.getByLabel('Category name').fill('Pets');
  await page.getByLabel('Monthly limit').fill('2000');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /Pets/ })).toContainText('₹2,000/mo');

  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('vet 2500');
  await page.getByRole('dialog').getByRole('button', { name: /Pets/ }).click();
  await page.getByRole('button', { name: 'Add ₹2,500' }).click();
  await page.getByRole('tab', { name: 'Home' }).click();
  await expect(page.getByText('/ ₹2,000')).toBeVisible();

  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Pets/ }).click();
  await page.getByRole('button', { name: 'Delete category' }).click();
  await page.getByRole('button', { name: /Tap again/ }).click();
  await expect(page.getByRole('button', { name: /Pets/ })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(page.getByText('Other', { exact: true })).toBeVisible();
});

test('back up, then restore the backup', async ({ page }) => {
  // Headless WebKit has no share sheet (share() never settles), so use the download path.
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('chai 40');
  await page.getByLabel('Quick add').press('Enter');
  await expect(page.getByText('Back up your expenses')).toBeVisible();

  await page.getByRole('tab', { name: 'Settings' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Back up' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^paisa-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  await expect(page.getByText(/Backed up today/)).toBeVisible();

  // Change the data, then restore: the backup's version wins.
  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('uber 320');
  await page.getByLabel('Quick add').press('Enter');
  await page.getByLabel('Backup file').setInputFiles(path);
  await expect(page.getByText('Restore this backup?')).toBeVisible();
  await expect(page.getByText(/1 expense \(₹40\)/)).toBeVisible();
  await page.getByRole('button', { name: 'Replace with backup' }).click();
  await expect(page.getByRole('status')).toContainText('Backup restored');

  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(page.getByText('chai')).toBeVisible();
  await expect(page.getByText('uber')).toHaveCount(0);
});

test('rejects a file that is not a backup', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByLabel('Backup file').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') });
  await expect(page.getByRole('status')).toContainText('isn’t a Paisa backup');
});
