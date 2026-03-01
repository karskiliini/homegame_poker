import type BetterSqlite3 from 'better-sqlite3';
import type { BugRepository, BugReport } from '../types.js';

const MAX_DESCRIPTION_LENGTH = 2000;

export function createBugRepo(db: BetterSqlite3.Database): BugRepository {
  return {
    insert(description: string, reporterName: string, tableId?: string): void {
      const desc = description.slice(0, MAX_DESCRIPTION_LENGTH);
      db.prepare(
        'INSERT INTO bug_reports (description, reporter_name, table_id) VALUES (?, ?, ?)'
      ).run(desc, reporterName, tableId ?? null);
    },

    getAll(): BugReport[] {
      return db.prepare('SELECT * FROM bug_reports WHERE archived = 0 ORDER BY id DESC').all() as BugReport[];
    },

    archive(ids: number[]): number {
      if (ids.length === 0) return 0;
      const placeholders = ids.map(() => '?').join(',');
      const result = db.prepare(`DELETE FROM bug_reports WHERE id IN (${placeholders})`).run(...ids);
      return result.changes;
    },
  };
}
