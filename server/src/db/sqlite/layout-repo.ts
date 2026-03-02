import type BetterSqlite3 from 'better-sqlite3';
import type { LayoutRepository, LayoutPositions } from '../types.js';

export function createLayoutRepo(db: BetterSqlite3.Database): LayoutRepository {
  return {
    getPositions(): LayoutPositions | null {
      const row = db.prepare('SELECT positions FROM layout_config WHERE id = 1').get() as { positions: string } | undefined;
      return row ? JSON.parse(row.positions) : null;
    },
    savePositions(data: LayoutPositions): void {
      db.prepare(
        `INSERT INTO layout_config (id, positions) VALUES (1, ?)
         ON CONFLICT(id) DO UPDATE SET positions = excluded.positions, updated_at = datetime('now')`
      ).run(JSON.stringify(data));
    },
  };
}
