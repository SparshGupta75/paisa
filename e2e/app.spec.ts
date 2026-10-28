import { expect, test, type Page } from '@playwright/test';

/** The visible tab's content. Hidden tabs stay mounted, so page-wide text lookups would find duplicates. */
const shown = (page: Page) => page.locator('main:visible');

test('quick add an expense and see it everywhere', async ({ page }) => {
  await page.goto('/');
  await expect(shown(page).getByText('Welcome to Paisa')).toBeVisible();

  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('chai 40');
  await expect(page.getByRole('button', { name: 'Add ₹40' })).toBeEnabled();
  await page.getByRole('button', { name: 'Add ₹40' }).click();

  await expect(page.getByRole('status')).toContainText('Added ₹40 · Food');
  await expect(shown(page).getByText('₹40').first()).toBeVisible();

  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(shown(page).getByText('Today')).toBeVisible();
  await expect(shown(page).getByText('chai')).toBeVisible();

  await page.reload();
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(shown(page).getByText('chai')).toBeVisible();
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

  await shown(page).getByRole('button', { name: /chai/ }).click();
  await page.getByLabel('Note').fill('masala chai');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(shown(page).getByText('masala chai')).toBeVisible();

  await page.getByLabel('Search').fill('uber');
  await expect(shown(page).getByText('1 result')).toBeVisible();
  await expect(shown(page).getByText('masala chai')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear search' }).click();

  await shown(page).getByRole('button', { name: /masala chai/ }).click();
  await page.getByRole('button', { name: 'Delete expense' }).click();
  await expect(shown(page).getByText('masala chai')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(shown(page).getByText('masala chai')).toBeVisible();
});

test('monthly budget drives safe-to-spend', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('lunch 250');
  await page.getByLabel('Quick add').press('Enter');

  await shown(page).getByRole('button', { name: 'Set a monthly budget' }).click();
  await page.getByLabel('Budget amount').fill('31000');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await expect(page.getByLabel('Safe to spend today')).toBeVisible();
  await expect(shown(page).getByText('Top categories')).toBeVisible();
  await expect(shown(page).getByText(/₹250 of ₹31,000/)).toBeVisible();
});

test('manage categories in settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Add category' }).click();
  await page.getByLabel('Emoji').fill('🐶');
  await page.getByLabel('Category name').fill('Pets');
  await page.getByLabel('Monthly limit').fill('2000');
  await page.getByRole('button', { name: 'Create category' }).click();
  await expect(page.getByRole('button', { name: /Pets/ })).toContainText('₹2,000/mo');

  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('vet 2500');
  await page.getByRole('dialog').getByRole('button', { name: /Pets/ }).click();
  await page.getByRole('button', { name: 'Add ₹2,500' }).click();
  await page.getByRole('tab', { name: 'Home' }).click();
  await expect(shown(page).getByText('/ ₹2,000')).toBeVisible();

  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Pets/ }).click();
  await page.getByRole('button', { name: 'Delete category' }).click();
  await page.getByRole('button', { name: /Tap again/ }).click();
  await expect(page.getByRole('button', { name: /Pets/ })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(shown(page).getByText('Other', { exact: true })).toBeVisible();
});

test('back up, then restore the backup', async ({ page }) => {
  // Headless WebKit has no share sheet (share() never settles), so use the download path.
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('chai 40');
  await page.getByLabel('Quick add').press('Enter');
  await expect(shown(page).getByText('Back up your expenses')).toBeVisible();

  await page.getByRole('tab', { name: 'Settings' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Back up' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^paisa-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  await expect(shown(page).getByText(/Backed up today/)).toBeVisible();

  // Change the data, then restore: the backup's version wins.
  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('uber 320');
  await page.getByLabel('Quick add').press('Enter');
  await page.getByLabel('Backup file').setInputFiles(path);
  await expect(page.getByText('Restore this backup?')).toBeVisible();
  await expect(page.getByText(/1 expense \(₹40\)/)).toBeVisible();
  await page.getByRole('button', { name: 'Replace with backup' }).click();
  await expect(page.getByRole('status')).toContainText('Restored 1 expense');

  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(shown(page).getByText('chai')).toBeVisible();
  await expect(shown(page).getByText('uber')).toHaveCount(0);
});

test('rejects a file that is not a backup', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByLabel('Backup file').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') });
  await expect(page.getByRole('status')).toContainText('isn’t a Paisa backup');
});

test('import a bank statement, learn a category, skip re-imports', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByLabel('Statement file').setInputFiles('e2e/fixtures/hdfc.csv');

  const sheet = page.getByRole('dialog', { name: 'Review import' });
  await expect(sheet.getByText('Swiggy')).toBeVisible();
  await expect(sheet.getByLabel('Category for Swiggy')).toHaveValue('food');
  await expect(sheet.getByLabel('Category for Uber')).toHaveValue('transport');
  await expect(sheet.getByLabel('Category for Acme Corp')).toHaveValue('salary'); // the salary credit comes in as money in
  await sheet.getByLabel('Category for Uber').selectOption('shopping');
  await sheet.getByRole('button', { name: 'Import 3 · ₹1,599.50 · +₹85,000' }).click();
  await expect(page.getByRole('status')).toContainText('Imported 3 entries');

  // Same file again: nothing new.
  await page.getByLabel('Statement file').setInputFiles('e2e/fixtures/hdfc.csv');
  await expect(sheet.getByText('Everything in this file is already in Paisa.')).toBeVisible();
  await sheet.getByRole('button', { name: 'Cancel' }).click();

  // Next month's statement: Uber now defaults to the category picked last time.
  await page.getByLabel('Statement file').setInputFiles('e2e/fixtures/hdfc-next.csv');
  await expect(sheet.getByLabel('Category for Uber')).toHaveValue('shopping');
});

test('insights show the month, trend, breakdown and calendar', async ({ page }) => {
  await page.goto('/');
  for (const text of ['chai 40', 'uber 300 yesterday', 'rent 15000 1st']) {
    await page.getByRole('button', { name: 'Add expense' }).click();
    await page.getByLabel('Quick add').fill(text);
    await page.getByLabel('Quick add').press('Enter');
  }
  await page.getByRole('tab', { name: 'Insights' }).click();
  await expect(shown(page).getByText('Spent so far')).toBeVisible();
  await expect(shown(page).getByText('Where it went')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Rent' }).first()).toBeVisible();
  await page.getByRole('button', { name: /^Today:/ }).click();
  await expect(shown(page).getByText('Today · ₹40')).toBeVisible();
  await page.getByRole('button', { name: 'Previous month' }).isDisabled();
});

test('money in and splits: spent 1000, got 200, split 200', async ({ page }) => {
  await page.goto('/');
  for (const text of ['shopping 1000', 'got 200 from rahul', 'dinner 200 split']) {
    await page.getByRole('button', { name: 'Add expense' }).click();
    await page.getByLabel('Quick add').fill(text);
    await page.getByLabel('Quick add').press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }

  // Spending counts the full ₹1,000 plus your ₹100 share of dinner; money in is separate.
  await expect(shown(page).getByText('₹1,100').first()).toBeVisible();
  await expect(shown(page).getByText('Money in', { exact: true })).toBeVisible();
  await expect(shown(page).getByText('+₹200').first()).toBeVisible();
  await expect(shown(page).getByText('Net this month')).toBeVisible();

  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(shown(page).getByText('₹1,100 · +₹200')).toBeVisible();
  await expect(shown(page).getByText(/Split · your share ₹100/)).toBeVisible();

  // Switching type by hand in the sheet.
  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByRole('radio', { name: 'Money in' }).click();
  for (const key of ['5', '0', '0']) await page.getByRole('button', { name: key, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Refunds/ }).click();
  await page.getByRole('button', { name: 'Add +₹500' }).click();
  await expect(page.getByRole('status')).toContainText('Added +₹500');

  // Custom split share.
  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('cab 300');
  await page.getByRole('radio', { name: 'Custom share' }).click();
  await page.getByLabel('My share').fill('120');
  await expect(page.getByText('Your share ₹120')).toBeVisible();
  await page.getByRole('button', { name: 'Add ₹300' }).click();
  await expect(page.getByRole('status')).toContainText('your share ₹120');
});

test('every change can be taken back', async ({ page }) => {
  await page.goto('/');
  // First run says what to do next.
  await expect(shown(page).getByRole('button', { name: 'Add an expense' })).toBeVisible();

  // Add → Undo.
  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Quick add').fill('chai 40');
  await page.getByLabel('Quick add').press('Enter');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(shown(page).getByText('Welcome to Paisa')).toBeVisible();

  // Import → Undo removes the whole import.
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByLabel('Statement file').setInputFiles('e2e/fixtures/hdfc.csv');
  await page.getByRole('dialog', { name: 'Review import' }).getByRole('button', { name: /^Import 3/ }).click();
  await expect(page.getByRole('status')).toContainText('Imported 3 entries');
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(shown(page).getByText('Nothing here yet')).toBeVisible();

  // Budget → Undo (from Settings).
  await page.getByRole('tab', { name: 'Settings' }).click();
  await shown(page).getByRole('button', { name: /Monthly budget/ }).click();
  await page.getByLabel('Budget amount').fill('30000');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await expect(page.getByRole('status')).toContainText('Budget set to ₹30,000 a month');
  await expect(shown(page).getByRole('button', { name: /Monthly budget/ })).toContainText('₹30,000');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(shown(page).getByRole('button', { name: /Monthly budget/ })).toContainText('Not set');
});
