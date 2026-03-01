import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../db/index.js';
import type { Database } from '../db/index.js';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('Bug report DB', () => {
  it('insertBugReport() stores a report in the database', () => {
    db.bugs.insert('Cards not showing', 'TestPlayer', 'table-1');
    const reports = db.bugs.getAll();
    expect(reports).toHaveLength(1);
    expect(reports[0].description).toBe('Cards not showing');
    expect(reports[0].reporter_name).toBe('TestPlayer');
    expect(reports[0].table_id).toBe('table-1');
  });

  it('insertBugReport() works without tableId', () => {
    db.bugs.insert('General bug', 'Player2');
    const reports = db.bugs.getAll();
    expect(reports).toHaveLength(1);
    expect(reports[0].table_id).toBeNull();
  });

  it('getAllBugReports() returns all reports', () => {
    db.bugs.insert('Bug 1', 'Player1', 'table-1');
    db.bugs.insert('Bug 2', 'Player2', 'table-2');
    db.bugs.insert('Bug 3', 'Player3');

    const reports = db.bugs.getAll();
    expect(reports).toHaveLength(3);
    expect(reports[0].description).toBe('Bug 3'); // newest first
    expect(reports[2].description).toBe('Bug 1');
  });

  it('archiveBugReports() marks bugs as archived and hides them from getAllBugReports()', () => {
    db.bugs.insert('Bug 1', 'Player1');
    db.bugs.insert('Bug 2', 'Player2');
    db.bugs.insert('Bug 3', 'Player3');

    const before = db.bugs.getAll();
    expect(before).toHaveLength(3);

    const archived = db.bugs.archive([before[0].id, before[1].id]);
    expect(archived).toBe(2);

    const after = db.bugs.getAll();
    expect(after).toHaveLength(1);
    expect(after[0].description).toBe('Bug 1');
  });

  it('archiveBugReports() with empty array returns 0', () => {
    expect(db.bugs.archive([])).toBe(0);
  });

  it('archiveBugReports() ignores already-archived bugs', () => {
    db.bugs.insert('Bug 1', 'Player1');
    const reports = db.bugs.getAll();
    db.bugs.archive([reports[0].id]);
    const result = db.bugs.archive([reports[0].id]);
    expect(result).toBe(0);
  });

  it('insertBugReport() sanitizes description (strips HTML)', () => {
    db.bugs.insert('<script>alert("xss")</script>Bug here', 'Hacker');
    const reports = db.bugs.getAll();
    expect(reports).toHaveLength(1);
    expect(reports[0].reporter_name).toBe('Hacker');
  });

  it('insertBugReport() truncates very long descriptions', () => {
    const longDesc = 'A'.repeat(5000);
    db.bugs.insert(longDesc, 'Player');
    const reports = db.bugs.getAll();
    expect(reports[0].description.length).toBeLessThanOrEqual(2000);
  });
});
