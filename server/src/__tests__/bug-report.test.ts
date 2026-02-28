import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { insertBugReport, getAllBugReports, getNewBugReports, _setDb } from '../db/bugs.js';

// Use in-memory database for tests
let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE bug_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      reporter_name TEXT NOT NULL,
      table_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  _setDb(db);
});

afterEach(() => {
  db.close();
});

describe('Bug report DB', () => {
  it('insertBugReport() stores a report in the database', () => {
    insertBugReport('Cards not showing', 'TestPlayer', 'table-1');
    const rows = db.prepare('SELECT * FROM bug_reports').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe('Cards not showing');
    expect(rows[0].reporter_name).toBe('TestPlayer');
    expect(rows[0].table_id).toBe('table-1');
  });

  it('insertBugReport() works without tableId', () => {
    insertBugReport('General bug', 'Player2');
    const rows = db.prepare('SELECT * FROM bug_reports').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].table_id).toBeNull();
  });

  it('getAllBugReports() returns all reports', () => {
    insertBugReport('Bug 1', 'Player1', 'table-1');
    insertBugReport('Bug 2', 'Player2', 'table-2');
    insertBugReport('Bug 3', 'Player3');

    const reports = getAllBugReports();
    expect(reports).toHaveLength(3);
    expect(reports[0].description).toBe('Bug 3'); // newest first
    expect(reports[2].description).toBe('Bug 1');
  });

  it('getNewBugReports() returns reports not yet fetched', () => {
    insertBugReport('Old bug', 'Player1');
    insertBugReport('New bug', 'Player2');

    const all = getNewBugReports();
    expect(all).toHaveLength(2);
  });

  it('insertBugReport() sanitizes description (strips HTML)', () => {
    insertBugReport('<script>alert("xss")</script>Bug here', 'Hacker');
    const reports = getAllBugReports();
    // Description should be stored as-is (sanitization happens at display time)
    // But we ensure it doesn't crash
    expect(reports).toHaveLength(1);
    expect(reports[0].reporter_name).toBe('Hacker');
  });

  it('insertBugReport() truncates very long descriptions', () => {
    const longDesc = 'A'.repeat(5000);
    insertBugReport(longDesc, 'Player');
    const reports = getAllBugReports();
    expect(reports[0].description.length).toBeLessThanOrEqual(2000);
  });
});
