import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface BugReport {
  id: number;
  description: string;
  reporter_name: string;
  table_id: string | null;
  created_at: string;
}

const MAX_DESCRIPTION_LENGTH = 2000;

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(path.join(dataDir, 'bugs.db'));
    db.exec(`
      CREATE TABLE IF NOT EXISTS bug_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        reporter_name TEXT NOT NULL,
        table_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        archived INTEGER DEFAULT 0
      )
    `);
    // Migration: add archived column if table already exists without it
    const cols = db.prepare("PRAGMA table_info(bug_reports)").all() as { name: string }[];
    if (!cols.some(c => c.name === 'archived')) {
      db.exec('ALTER TABLE bug_reports ADD COLUMN archived INTEGER DEFAULT 0');
    }
  }
  return db;
}

/** For testing: inject an in-memory database */
export function _setDb(testDb: Database.Database) {
  db = testDb;
}

export function insertBugReport(description: string, reporterName: string, tableId?: string) {
  const desc = description.slice(0, MAX_DESCRIPTION_LENGTH);
  const stmt = getDb().prepare(
    'INSERT INTO bug_reports (description, reporter_name, table_id) VALUES (?, ?, ?)'
  );
  stmt.run(desc, reporterName, tableId ?? null);
}

export function getAllBugReports(): BugReport[] {
  return getDb().prepare('SELECT * FROM bug_reports WHERE archived = 0 ORDER BY id DESC').all() as BugReport[];
}

export function archiveBugReports(ids: number[]): number {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const stmt = getDb().prepare(`UPDATE bug_reports SET archived = 1 WHERE id IN (${placeholders}) AND archived = 0`);
  const result = stmt.run(...ids);
  return result.changes;
}
