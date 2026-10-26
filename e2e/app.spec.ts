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
