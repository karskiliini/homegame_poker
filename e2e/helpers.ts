import { type Page } from '@playwright/test';

/** Register a new player and arrive at the table lobby. */
export async function registerPlayer(page: Page, name: string, password = 'test1234') {
  await page.goto('/');

  // Step 1: enter name and click Continue
  const nameInput = page.locator('input[type="text"]');
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput.fill(name);
  await page.locator('button', { hasText: /continue|jatka/i }).click();

  // Step 2: registration form appears (new player)
  const pwInput = page.locator('input[type="password"]').first();
  await pwInput.waitFor({ state: 'visible', timeout: 5000 });
  await pwInput.fill(password);

  const confirmInput = page.locator('input[type="password"]').nth(1);
  await confirmInput.fill(password);

  // Click "Create Account"
  await page.locator('button', { hasText: /create account|luo tili/i }).click();

  // Wait for table lobby: heading shows "Tables" or "Poydat"
  await page.getByRole('heading', { name: /Tables|Poydat/i }).waitFor({ state: 'visible', timeout: 10000 });
}

/** Log in an existing player. */
export async function loginPlayer(page: Page, name: string, password = 'test1234') {
  await page.goto('/');

  const nameInput = page.locator('input[type="text"]');
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput.fill(name);
  await page.locator('button', { hasText: /continue|jatka/i }).click();

  // "Welcome back" password prompt (single password field)
  const pwInput = page.locator('input[type="password"]').first();
  await pwInput.waitFor({ state: 'visible', timeout: 5000 });
  await pwInput.fill(password);

  await page.locator('button', { hasText: /log in|kirjaudu/i }).click();

  await page.getByRole('heading', { name: /Tables|Poydat/i }).waitFor({ state: 'visible', timeout: 10000 });
}

/** Generate a unique player name to avoid collisions between test runs. */
export function uniqueName(prefix = 'E2E') {
  return `${prefix}_${Date.now().toString(36)}`;
}
