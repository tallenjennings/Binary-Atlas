import { test, expect } from 'playwright/test';

const SHA_256_HEX = /[a-f0-9]{64}/i;

test('enter binary, hash file, save and persist landmark', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto('/explore');
  await expect(page.getByRole('heading', { name: 'Atlas Explorer' })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByRole('heading', { name: 'Atlas Explorer' })).toBeVisible();
  expect(browserErrors).toEqual([]);

  await page.getByLabel('Binary input').fill('101');
  await expect(page.getByTestId('key-output')).toContainText('12');
  await page.getByRole('button', { name: /Move camera/ }).click();

  await page.setInputFiles('[data-testid="file-input"]', {
    name: 'sample.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello atlas'),
  });
  const fingerprint = page.getByTestId('fingerprint-output');
  await expect(fingerprint).toBeVisible();
  await expect(fingerprint).toContainText(SHA_256_HEX);

  await page.getByTestId('save-landmark').click();
  await expect(page.getByText(/Landmark 1 key/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Landmark 1 key/)).toBeVisible();
  expect(browserErrors).toEqual([]);
});
