import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../db/index.js';
import type { Database } from '../db/index.js';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('Balance flow', () => {
  it('new player starts with 0 balance', async () => {
    const player = await db.players.create('Zero', 'pass');
    expect(db.balance.get(player.id)).toBe(0);
  });

  it('deposit adds to balance', async () => {
    const player = await db.players.create('Depositor', 'pass');
    db.balance.update(player.id, 1000);
    expect(db.balance.get(player.id)).toBe(1000);
  });

  it('buy-in deducts from balance', async () => {
    const player = await db.players.create('BuyIn', 'pass');
    db.balance.set(player.id, 500);
    const ok = db.balance.update(player.id, -200);
    expect(ok).toBe(true);
    expect(db.balance.get(player.id)).toBe(300);
  });

  it('buy-in fails when balance insufficient', async () => {
    const player = await db.players.create('Poor', 'pass');
    db.balance.set(player.id, 50);
    const ok = db.balance.update(player.id, -100);
    expect(ok).toBe(false);
    expect(db.balance.get(player.id)).toBe(50);
  });

  it('leave table credits remaining stack back to balance', async () => {
    const player = await db.players.create('Leaver', 'pass');
    db.balance.set(player.id, 1000);
    db.balance.update(player.id, -200);
    expect(db.balance.get(player.id)).toBe(800);
    db.balance.update(player.id, 350);
    expect(db.balance.get(player.id)).toBe(1150);
  });

  it('rebuy deducts additional amount', async () => {
    const player = await db.players.create('Rebuyer', 'pass');
    db.balance.set(player.id, 1000);
    db.balance.update(player.id, -200);
    expect(db.balance.get(player.id)).toBe(800);
    db.balance.update(player.id, -200);
    expect(db.balance.get(player.id)).toBe(600);
  });

  it('multiple deposits accumulate', async () => {
    const player = await db.players.create('MultiDeposit', 'pass');
    db.balance.update(player.id, 500);
    db.balance.update(player.id, 300);
    db.balance.update(player.id, 200);
    expect(db.balance.get(player.id)).toBe(1000);
  });

  it('exact balance can be deducted (goes to 0)', async () => {
    const player = await db.players.create('Exact', 'pass');
    db.balance.set(player.id, 100);
    const ok = db.balance.update(player.id, -100);
    expect(ok).toBe(true);
    expect(db.balance.get(player.id)).toBe(0);
  });
});
