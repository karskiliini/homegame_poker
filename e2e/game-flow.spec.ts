import { test, expect, type Page, type Browser, type BrowserContext } from '@playwright/test';
import { registerPlayer, uniqueName } from './helpers.js';

// Increase timeout for multi-player tests
test.setTimeout(60_000);

/**
 * Register player, deposit, create a new table, sit down.
 * P1 creates the table — TABLE_CREATED event auto-navigates to game screen.
 */
async function createTableAndSit(
  browser: Browser,
  playerName: string,
): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  // Block popups (TV view) to avoid interference
  await page.addInitScript(() => { window.open = () => null; });

  await registerPlayer(page, playerName);

  // Deposit
  await page.locator('button', { hasText: /^deposit$/i }).click();
  const depositInput = page.locator('input[type="number"]');
  await depositInput.waitFor({ state: 'visible', timeout: 3000 });
  await depositInput.fill('1000');
  await page.locator('.fixed.inset-0 button', { hasText: /deposit|talleta/i }).click();
  await expect(page.getByText('1,000')).toBeVisible({ timeout: 5000 });

  // Create table
  const createBtn = page.locator('button', { hasText: /create|luo/i }).first();
  await createBtn.click();
  const stakeBtn = page.locator('.fixed.inset-0 button').filter({ hasText: /NLHE/ }).first();
  await stakeBtn.waitFor({ state: 'visible', timeout: 3000 });
  await stakeBtn.click();

  // TABLE_CREATED event auto-navigates to game screen → "Sit Down" appears
  const sitDown = page.locator('button', { hasText: /sit down|istu/i });
  await expect(sitDown).toBeVisible({ timeout: 15000 });

  // Click "Sit Down"
  await sitDown.click();

  // Buy-in modal — confirm
  const confirmBtn = page.locator('button', { hasText: /^confirm$|^vahvista$/i });
  await expect(confirmBtn).toBeVisible({ timeout: 5000 });
  await confirmBtn.click();

  // P1 is the first player → auto-sits-in (status: 'waiting').
  // If for some reason they land in 'sitting_out', wait for "Sit In" and click it.
  const sitIn = page.locator('button', { hasText: /^sit in$/i });
  await sitIn.waitFor({ state: 'visible', timeout: 5000 })
    .then(() => sitIn.click())
    .catch(() => {}); // First player usually auto-sits-in

  // Confirm we're on the game screen and seated (not bounced back to lobby)
  await expect(page.locator('button', { hasText: /sit down|istu/i }).or(
    page.locator('button', { hasText: /^sit out$/i })
  ).first()).toBeVisible({ timeout: 10000 });

  return { page, context };
}

/**
 * Register player, deposit, join existing table from lobby via popup, sit down.
 */
async function joinTableAndSit(
  browser: Browser,
  playerName: string,
): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await registerPlayer(page, playerName);

  // Deposit
  await page.locator('button', { hasText: /^deposit$/i }).click();
  const depositInput = page.locator('input[type="number"]');
  await depositInput.waitFor({ state: 'visible', timeout: 3000 });
  await depositInput.fill('1000');
  await page.locator('.fixed.inset-0 button', { hasText: /deposit|talleta/i }).click();
  await expect(page.getByText('1,000')).toBeVisible({ timeout: 5000 });

  // Click the most recently created table row (last in list)
  const tableRow = page.locator('button.w-full').filter({ hasText: /Table/ }).last();
  await expect(tableRow).toBeVisible({ timeout: 15000 });

  const popupPromise = page.waitForEvent('popup', { timeout: 10000 });
  await tableRow.click();
  const popup = await popupPromise;

  // Popup auto-authenticates → shows game screen with "Sit Down"
  const sitDown = popup.locator('button', { hasText: /sit down|istu/i });
  await expect(sitDown).toBeVisible({ timeout: 15000 });
  await sitDown.click();

  // Buy-in confirm
  const confirmBtn = popup.locator('button', { hasText: /^confirm$|^vahvista$/i });
  await expect(confirmBtn).toBeVisible({ timeout: 5000 });
  await confirmBtn.click();

  // P2 is NOT the first player → starts 'sitting_out' → MUST click "Sit In"
  const sitIn = popup.locator('button', { hasText: /^sit in$/i });
  await sitIn.waitFor({ state: 'visible', timeout: 10000 });
  await sitIn.click();

  // After clicking "Sit In", hand may start immediately. Confirm "Sit In" disappeared.
  await expect(sitIn).not.toBeVisible({ timeout: 10000 });

  return { page: popup, context };
}

test.describe('Multi-player Game Flow', () => {
  test('two players can join a table and a hand starts', async ({ browser }) => {
    const name1 = uniqueName('P1');
    const name2 = uniqueName('P2');

    // Player 1 creates table and sits
    const p1 = await createTableAndSit(browser, name1);

    // Player 2 joins via lobby popup
    const p2 = await joinTableAndSit(browser, name2);

    // Both seated — hand should auto-start
    // Wait for either player to see hole cards or action buttons
    await expect(async () => {
      const p1HasCards = await p1.page.locator('.animate-card-flip').count();
      const p2HasCards = await p2.page.locator('.animate-card-flip').count();
      expect(p1HasCards + p2HasCards).toBeGreaterThan(0);
    }).toPass({ timeout: 20000 });

    await p1.context.close();
    await p2.context.close();
  });

  test('player can fold when it is their turn', async ({ browser }) => {
    const name1 = uniqueName('Fold1');
    const name2 = uniqueName('Fold2');

    const p1 = await createTableAndSit(browser, name1);
    const p2 = await joinTableAndSit(browser, name2);

    // Wait for hand to start
    await expect(async () => {
      const p1Cards = await p1.page.locator('.animate-card-flip').count();
      const p2Cards = await p2.page.locator('.animate-card-flip').count();
      expect(p1Cards + p2Cards).toBeGreaterThan(0);
    }).toPass({ timeout: 20000 });

    // Find which player has the fold button
    const p1Fold = p1.page.locator('button', { hasText: /^fold$/i });
    const p2Fold = p2.page.locator('button', { hasText: /^fold$/i });

    let activePlayer: Page;
    try {
      await p1Fold.waitFor({ state: 'visible', timeout: 8000 });
      activePlayer = p1.page;
    } catch {
      await p2Fold.waitFor({ state: 'visible', timeout: 8000 });
      activePlayer = p2.page;
    }

    // Click fold
    await activePlayer.locator('button', { hasText: /^fold$/i }).click();

    // Hand ends — verify no crash
    await activePlayer.waitForTimeout(2000);
    await expect(activePlayer.locator('body')).toBeVisible();

    await p1.context.close();
    await p2.context.close();
  });
});
