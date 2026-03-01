import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../db/index.js';
import type { Database } from '../db/index.js';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('Balance transactions', () => {
  it('logTransaction stores a transaction record', async () => {
    const player = await db.players.create('Test', 'pass');
    db.balance.logTransaction(player.id, 'deposit', 500);
    const txns = db.balance.getTransactions(player.id);
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe('deposit');
    expect(txns[0].amount).toBe(500);
    expect(txns[0].table_id).toBeNull();
  });

  it('logTransaction stores tableId for buy_in', async () => {
    const player = await db.players.create('Test2', 'pass');
    db.balance.logTransaction(player.id, 'buy_in', -200, 'table-abc');
    const txns = db.balance.getTransactions(player.id);
    expect(txns[0].table_id).toBe('table-abc');
  });

  it('getTransactions returns newest first, limited to 50', async () => {
    const player = await db.players.create('Test3', 'pass');
    for (let i = 0; i < 55; i++) {
      db.balance.logTransaction(player.id, 'deposit', i + 1);
    }
    const txns = db.balance.getTransactions(player.id);
    expect(txns).toHaveLength(50);
    expect(txns[0].amount).toBe(55); // newest first
  });

  it('getTransactions returns empty array for new player', async () => {
    const player = await db.players.create('Fresh', 'pass');
    const txns = db.balance.getTransactions(player.id);
    expect(txns).toEqual([]);
  });
});
