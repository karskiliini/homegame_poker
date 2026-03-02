import { test, expect } from '@playwright/test';
import { registerPlayer, uniqueName } from './helpers.js';

test.describe('Table Lobby', () => {
  test('player can create a table', async ({ page }) => {
    const name = uniqueName('CreateT');
    await registerPlayer(page, name);

    // Should see "Create" button
    const createBtn = page.locator('button', { hasText: /create|luo/i }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Stake level modal appears — pick first NLHE option
    const stakeBtn = page.locator('.fixed.inset-0 button').filter({ hasText: /NLHE/ }).first();
    await expect(stakeBtn).toBeVisible({ timeout: 3000 });
    await stakeBtn.click();

    // Table created — should navigate to game view (watching mode)
    // The watching mode shows "Sit Down" button
    await expect(page.locator('button', { hasText: /sit down|istu/i })).toBeVisible({ timeout: 10000 });
  });

  test('deposit adds to balance', async ({ page }) => {
    const name = uniqueName('Depo');
    await registerPlayer(page, name);

    // Click Deposit button
    const depositBtn = page.locator('button', { hasText: /^deposit$/i });
    await depositBtn.click();

    // Deposit modal with input
    const depositInput = page.locator('input[type="number"]');
    await expect(depositInput).toBeVisible({ timeout: 3000 });
    await depositInput.fill('500');

    // Click confirm deposit button (inside the modal, the button that says "Deposit")
    const confirmBtn = page.locator('.fixed button', { hasText: /deposit|talleta/i });
    await confirmBtn.click();

    // Balance should show 500
    await expect(page.getByText('500')).toBeVisible({ timeout: 5000 });
  });
});
