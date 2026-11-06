import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function results(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Find my pause' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your road, thoughtfully planned.' }),
  ).toBeVisible();
}
test('complete demo journey, selection, budget, rating sorting and empty state', async ({
  page,
}) => {
  await results(page);
  await expect(page.getByText('FICTIONAL SAMPLE').first()).toBeVisible();
  await page.getByLabel('Sort hotels').selectOption('rating');
  const cards = page.locator('.hotel-card');
  await expect(cards.first()).toContainText('Linden House');
  await cards.first().getByRole('button', { name: 'Select stay' }).click();
  await expect(page.getByRole('status')).toContainText('Linden House');
  await page.getByLabel('Maximum sample price').fill('30');
  await expect(page.getByRole('heading', { name: 'No matching stays' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Interactive route map' })).toBeVisible();
});
test('direction-only demo is explicitly exploratory', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Destination (optional)').fill('');
  await expect(page.getByLabel('Approximate direction')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Find my pause' }).click();
  await expect(
    page.getByText('Exploratory sample — a destination is required for accurate live planning.'),
  ).toBeVisible();
});
test('German and Persian preferences persist and set RTL', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Language' }).selectOption('de');
  await expect(page.getByRole('heading', { name: /Gute Reisen/ })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await page.getByRole('combobox', { name: 'Sprache' }).selectOption('fa');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('button', { name: 'ادامه' })).toBeVisible();
});
test('dark mode persists and layout fits viewport', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch color theme' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('keyboard-friendly form and result accessibility', async ({ page }) => {
  await page.goto('/');
  let scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  await results(page);
  scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
});
test('API errors are shown without losing the trip', async ({ page }) => {
  await page.route('**/api/plan', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'The map provider timed out. Please try again.' }),
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Find my pause' }).click();
  await expect(page.getByRole('alert', { name: 'Let’s check those details' })).toContainText(
    'provider timed out',
  );
  await expect(page.getByLabel('Total budget per night')).toHaveValue('180');
});

test('breakfast refinement only includes sample rates with included breakfast', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Breakfast must be included').uncheck();
  await page.getByRole('button', { name: 'Find my pause' }).click();
  await expect(page.locator('.hotel-card')).toHaveCount(5);
  await page.getByLabel('Included breakfast only').check();
  await expect(page.locator('.hotel-card')).toHaveCount(4);
  await expect(page.locator('.hotel-list')).not.toContainText('Riverside Rooms');
});

test('invalid postal code is rejected without losing form data', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Starting postal code').fill('bad-code');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Find my pause' }).click();
  await expect(page.getByRole('alert', { name: 'Let’s check those details' })).toContainText(
    'Postal code',
  );
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel('Starting postal code')).toHaveValue('bad-code');
});

test('Persian results remain accessible and fit the mobile viewport in dark mode', async ({
  page,
}) => {
  await results(page);
  await page.getByRole('combobox', { name: 'Language' }).selectOption('fa');
  await page.getByRole('button', { name: 'تغییر رنگ‌بندی' }).click();
  await expect(page.getByRole('heading', { name: 'مسیر شما، با برنامه‌ای دلپذیر.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
});
