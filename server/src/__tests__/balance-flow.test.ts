import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  _setDb, _initSchema,
  createPlayer, getPlayerBalance, updateBalance, setBalance,
} from '../db/players.js';

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  _initSchema(db);
  _setDb(db);
});

afterEach(() => {
  db.close();
});

describe('Balance flow', () => {
  it('new player starts with 0 balance', async () => {
    const player = await createPlayer('Zero', 'pass');
    expect(getPlayerBalance(player.id)).toBe(0);
  });

  it('deposit adds to balance', async () => {
    const player = await createPlayer('Depositor', 'pass');
    updateBalance(player.id, 1000);
    expect(getPlayerBalance(player.id)).toBe(1000);
  });

  it('buy-in deducts from balance', async () => {
    const player = await createPlayer('BuyIn', 'pass');
    setBalance(player.id, 500);
    const ok = updateBalance(player.id, -200);
    expect(ok).toBe(true);
    expect(getPlayerBalance(player.id)).toBe(300);
  });

  it('buy-in fails when balance insufficient', async () => {
    const player = await createPlayer('Poor', 'pass');
    setBalance(player.id, 50);
    const ok = updateBalance(player.id, -100);
    expect(ok).toBe(false);
    expect(getPlayerBalance(player.id)).toBe(50);
  });

  it('leave table credits remaining stack back to balance', async () => {
    const player = await createPlayer('Leaver', 'pass');
    setBalance(player.id, 1000);
    // Simulate buy-in
    updateBalance(player.id, -200);
    expect(getPlayerBalance(player.id)).toBe(800);
    // Simulate leaving with some winnings
    updateBalance(player.id, 350);
    expect(getPlayerBalance(player.id)).toBe(1150);
  });

  it('rebuy deducts additional amount', async () => {
    const player = await createPlayer('Rebuyer', 'pass');
    setBalance(player.id, 1000);
    // Initial buy-in
    updateBalance(player.id, -200);
    expect(getPlayerBalance(player.id)).toBe(800);
    // Rebuy
    updateBalance(player.id, -200);
    expect(getPlayerBalance(player.id)).toBe(600);
  });

  it('multiple deposits accumulate', async () => {
    const player = await createPlayer('MultiDeposit', 'pass');
    updateBalance(player.id, 500);
    updateBalance(player.id, 300);
    updateBalance(player.id, 200);
    expect(getPlayerBalance(player.id)).toBe(1000);
  });

  it('exact balance can be deducted (goes to 0)', async () => {
    const player = await createPlayer('Exact', 'pass');
    setBalance(player.id, 100);
    const ok = updateBalance(player.id, -100);
    expect(ok).toBe(true);
    expect(getPlayerBalance(player.id)).toBe(0);
  });
});
