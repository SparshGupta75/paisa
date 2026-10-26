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
