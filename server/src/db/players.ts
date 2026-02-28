import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface PlayerRecord {
  id: string;
  name: string;
  password_hash: string;
  avatar_id: string;
  balance: number;
  created_at: string;
  last_login: string;
}

const BCRYPT_ROUNDS = 10;

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(path.join(dataDir, 'players.db'));
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
  }
  return db;
}

/** For testing: inject an in-memory database */
export function _setDb(testDb: Database.Database) {
  db = testDb;
}

/** Initialize the players table on an existing database instance */
export function _initSchema(database: Database.Database) {
  database.exec(`
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
}

export function findPlayerByName(name: string): PlayerRecord | undefined {
  return getDb().prepare('SELECT * FROM players WHERE name = ? COLLATE NOCASE').get(name) as PlayerRecord | undefined;
}

export async function createPlayer(name: string, password: string, avatarId: string = '1'): Promise<PlayerRecord> {
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  getDb().prepare(
    'INSERT INTO players (id, name, password_hash, avatar_id) VALUES (?, ?, ?, ?)'
  ).run(id, name.trim(), passwordHash, avatarId);
  return findPlayerByName(name)!;
}

export async function verifyPassword(player: PlayerRecord, password: string): Promise<boolean> {
  return bcrypt.compare(password, player.password_hash);
}

export function getPlayerBalance(playerId: string): number {
  const row = getDb().prepare('SELECT balance FROM players WHERE id = ?').get(playerId) as { balance: number } | undefined;
  return row?.balance ?? 0;
}

/** Atomically adjust balance by delta. Returns false if result would go negative. */
export function updateBalance(playerId: string, delta: number): boolean {
  const result = getDb().prepare(
    'UPDATE players SET balance = balance + ? WHERE id = ? AND balance + ? >= 0'
  ).run(delta, playerId, delta);
  return result.changes > 0;
}

export function setBalance(playerId: string, balance: number): void {
  getDb().prepare('UPDATE players SET balance = ? WHERE id = ?').run(balance, playerId);
}

export function updateLastLogin(playerId: string): void {
  getDb().prepare("UPDATE players SET last_login = datetime('now') WHERE id = ?").run(playerId);
}

export function updateAvatar(playerId: string, avatarId: string): void {
  getDb().prepare('UPDATE players SET avatar_id = ? WHERE id = ?').run(avatarId, playerId);
}
