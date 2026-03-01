import type BetterSqlite3 from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type { PlayerRepository, PlayerRecord } from '../types.js';

const BCRYPT_ROUNDS = 10;

export function createPlayerRepo(db: BetterSqlite3.Database): PlayerRepository {
  return {
    findByName(name: string): PlayerRecord | undefined {
      return db.prepare('SELECT * FROM players WHERE name = ? COLLATE NOCASE').get(name) as PlayerRecord | undefined;
    },

    findById(id: string): PlayerRecord | undefined {
      return db.prepare('SELECT * FROM players WHERE id = ?').get(id) as PlayerRecord | undefined;
    },

    async create(name: string, password: string, avatarId: string = '1'): Promise<PlayerRecord> {
      const id = uuidv4();
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      db.prepare(
        'INSERT INTO players (id, name, password_hash, avatar_id) VALUES (?, ?, ?, ?)'
      ).run(id, name.trim(), passwordHash, avatarId);
      return this.findByName(name)!;
    },

    async verifyPassword(player: PlayerRecord, password: string): Promise<boolean> {
      return bcrypt.compare(password, player.password_hash);
    },

    updateAvatar(playerId: string, avatarId: string): void {
      db.prepare('UPDATE players SET avatar_id = ? WHERE id = ?').run(avatarId, playerId);
    },

    updateLastLogin(playerId: string): void {
      db.prepare("UPDATE players SET last_login = datetime('now') WHERE id = ?").run(playerId);
    },
  };
}
