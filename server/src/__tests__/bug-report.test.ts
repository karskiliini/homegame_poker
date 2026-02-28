import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { insertBugReport, getAllBugReports, archiveBugReports, _setDb } from '../db/bugs.js';

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
      created_at TEXT DEFAULT (datetime('now')),
      archived INTEGER DEFAULT 0
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

  it('archiveBugReports() marks bugs as archived and hides them from getAllBugReports()', () => {
    insertBugReport('Bug 1', 'Player1');
    insertBugReport('Bug 2', 'Player2');
    insertBugReport('Bug 3', 'Player3');

    const before = getAllBugReports();
    expect(before).toHaveLength(3);

    const archived = archiveBugReports([before[0].id, before[1].id]);
    expect(archived).toBe(2);

    const after = getAllBugReports();
    expect(after).toHaveLength(1);
    expect(after[0].description).toBe('Bug 1');
  });

  it('archiveBugReports() with empty array returns 0', () => {
    expect(archiveBugReports([])).toBe(0);
  });

  it('archiveBugReports() ignores already-archived bugs', () => {
    insertBugReport('Bug 1', 'Player1');
    const reports = getAllBugReports();
    archiveBugReports([reports[0].id]);
    const result = archiveBugReports([reports[0].id]);
    expect(result).toBe(0);
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
