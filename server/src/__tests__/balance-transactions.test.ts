import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  _setDb, _initSchema,
  createPlayer, setBalance, updateBalance,
  logTransaction, getTransactions,
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

describe('Balance transactions', () => {
  it('logTransaction stores a transaction record', async () => {
    const player = await createPlayer('Test', 'pass');
    logTransaction(player.id, 'deposit', 500);
    const txns = getTransactions(player.id);
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe('deposit');
    expect(txns[0].amount).toBe(500);
    expect(txns[0].table_id).toBeNull();
  });

  it('logTransaction stores tableId for buy_in', async () => {
    const player = await createPlayer('Test2', 'pass');
    logTransaction(player.id, 'buy_in', -200, 'table-abc');
    const txns = getTransactions(player.id);
    expect(txns[0].table_id).toBe('table-abc');
  });

  it('getTransactions returns newest first, limited to 50', async () => {
    const player = await createPlayer('Test3', 'pass');
    for (let i = 0; i < 55; i++) {
      logTransaction(player.id, 'deposit', i + 1);
    }
    const txns = getTransactions(player.id);
    expect(txns).toHaveLength(50);
    expect(txns[0].amount).toBe(55); // newest first
  });

  it('getTransactions returns empty array for new player', async () => {
    const player = await createPlayer('Fresh', 'pass');
    const txns = getTransactions(player.id);
    expect(txns).toEqual([]);
  });
});
