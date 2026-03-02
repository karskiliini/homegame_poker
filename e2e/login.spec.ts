import { test, expect } from '@playwright/test';
import { uniqueName } from './helpers.js';

test.describe('Login & Registration', () => {
  test('new player can register and reach table lobby', async ({ page }) => {
    const name = uniqueName('Reg');
    await page.goto('/');

    // Login screen loads with title
    await expect(page.getByText('CCCPokeri')).toBeVisible({ timeout: 10000 });

    // Enter name and continue
    const nameInput = page.locator('input[type="text"]');
    await nameInput.fill(name);
    await page.locator('button', { hasText: /continue|jatka/i }).click();

    // Registration form: password fields appear
    const pwFields = page.locator('input[type="password"]');
    await expect(pwFields.first()).toBeVisible({ timeout: 5000 });

    // Fill password + confirm
    await pwFields.nth(0).fill('secret123');
    await pwFields.nth(1).fill('secret123');

    // Submit registration
    await page.locator('button', { hasText: /create account|luo tili/i }).click();

    // Arrive at table lobby (title: "Tables")
    await expect(page.getByRole('heading', { name: 'Tables' })).toBeVisible({ timeout: 10000 });
    // Player name is shown in "Playing as ..."
    await expect(page.getByText(name)).toBeVisible();
  });

  test('returning player can log in', async ({ page }) => {
    const name = uniqueName('Login');

    // First: register
    await page.goto('/');
    await page.locator('input[type="text"]').fill(name);
    await page.locator('button', { hasText: /continue|jatka/i }).click();

    const pwFields = page.locator('input[type="password"]');
    await pwFields.first().waitFor({ state: 'visible', timeout: 5000 });
    await pwFields.nth(0).fill('pw1234');
    await pwFields.nth(1).fill('pw1234');
    await page.locator('button', { hasText: /create account|luo tili/i }).click();
    await expect(page.getByRole('heading', { name: 'Tables' })).toBeVisible({ timeout: 10000 });

    // Clear session storage and reload to force fresh login
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');

    // Enter name again
    await page.locator('input[type="text"]').fill(name);
    await page.locator('button', { hasText: /continue|jatka/i }).click();

    // "Welcome back" login form (single password field)
    const loginPw = page.locator('input[type="password"]');
    await expect(loginPw).toHaveCount(1, { timeout: 5000 });
    await loginPw.fill('pw1234');
    await page.locator('button', { hasText: /log in|kirjaudu/i }).click();

    // Back at table lobby
    await expect(page.getByRole('heading', { name: 'Tables' })).toBeVisible({ timeout: 10000 });
  });

  test('wrong password shows error', async ({ page }) => {
    const name = uniqueName('WrongPw');

    // Register first
    await page.goto('/');
    await page.locator('input[type="text"]').fill(name);
    await page.locator('button', { hasText: /continue|jatka/i }).click();
    const pwFields = page.locator('input[type="password"]');
    await pwFields.first().waitFor({ state: 'visible', timeout: 5000 });
    await pwFields.nth(0).fill('correct');
    await pwFields.nth(1).fill('correct');
    await page.locator('button', { hasText: /create account|luo tili/i }).click();
    await expect(page.getByRole('heading', { name: 'Tables' })).toBeVisible({ timeout: 10000 });

    // Try to log in with wrong password
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await page.locator('input[type="text"]').fill(name);
    await page.locator('button', { hasText: /continue|jatka/i }).click();

    const loginPw = page.locator('input[type="password"]');
    await loginPw.waitFor({ state: 'visible', timeout: 5000 });
    await loginPw.fill('wrongpassword');
    await page.locator('button', { hasText: /log in|kirjaudu/i }).click();

    // Error message appears
    await expect(page.locator('text=/wrong|invalid|väärä|virhe/i')).toBeVisible({ timeout: 5000 });
  });
});
