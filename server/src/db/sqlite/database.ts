import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Database } from '../types.js';
import { createPlayerRepo } from './player-repo.js';
import { createSessionRepo } from './session-repo.js';
import { createBalanceRepo } from './balance-repo.js';
import { createBugRepo } from './bug-repo.js';
import { createLayoutRepo } from './layout-repo.js';

function initSchema(db: BetterSqlite3.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      avatar_id TEXT DEFAULT '1',
      balance REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS balance_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      table_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    )
  `);
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS layout_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      positions TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  // Migration: add archived column if table already exists without it
  const cols = db.prepare("PRAGMA table_info(bug_reports)").all() as { name: string }[];
  if (!cols.some(c => c.name === 'archived')) {
    db.exec('ALTER TABLE bug_reports ADD COLUMN archived INTEGER DEFAULT 0');
  }
}

function createFromSqlite(db: BetterSqlite3.Database): Database {
  initSchema(db);
  return {
    players: createPlayerRepo(db),
    sessions: createSessionRepo(db),
    balance: createBalanceRepo(db),
    bugs: createBugRepo(db),
    layout: createLayoutRepo(db),
  };
}

export function createSQLiteDatabase(dataDir?: string): Database {
  const dir = dataDir ?? path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Single DB file for all tables
  const db = new BetterSqlite3(path.join(dir, 'poker.db'));
  return createFromSqlite(db);
}

export function createSQLiteTestDatabase(): Database {
  const db = new BetterSqlite3(':memory:');
  return createFromSqlite(db);
}
