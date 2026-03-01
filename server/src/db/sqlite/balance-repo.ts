import type BetterSqlite3 from 'better-sqlite3';
import type { BalanceRepository, TransactionRecord } from '../types.js';

export function createBalanceRepo(db: BetterSqlite3.Database): BalanceRepository {
  return {
    get(playerId: string): number {
      const row = db.prepare('SELECT balance FROM players WHERE id = ?').get(playerId) as { balance: number } | undefined;
      return row?.balance ?? 0;
    },

    update(playerId: string, delta: number): boolean {
      const result = db.prepare(
        'UPDATE players SET balance = balance + ? WHERE id = ? AND balance + ? >= 0'
      ).run(delta, playerId, delta);
      return result.changes > 0;
    },

    set(playerId: string, balance: number): void {
      db.prepare('UPDATE players SET balance = ? WHERE id = ?').run(balance, playerId);
    },

    logTransaction(playerId: string, type: string, amount: number, tableId?: string): void {
      db.prepare(
        'INSERT INTO balance_transactions (player_id, type, amount, table_id) VALUES (?, ?, ?, ?)'
      ).run(playerId, type, amount, tableId ?? null);
    },

    getTransactions(playerId: string, limit: number = 50): TransactionRecord[] {
      return db.prepare(
        'SELECT * FROM balance_transactions WHERE player_id = ? ORDER BY id DESC LIMIT ?'
      ).all(playerId, limit) as TransactionRecord[];
    },
  };
}
