import type BetterSqlite3 from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { SessionRepository, SessionRecord } from '../types.js';

export function createSessionRepo(db: BetterSqlite3.Database): SessionRepository {
  return {
    create(playerId: string): string {
      const token = uuidv4();
      db.prepare('DELETE FROM sessions WHERE player_id = ?').run(playerId);
      db.prepare('INSERT INTO sessions (token, player_id) VALUES (?, ?)').run(token, playerId);
      return token;
    },

    find(token: string): SessionRecord | undefined {
      return db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as SessionRecord | undefined;
    },

    delete(token: string): void {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    },

    deleteByPlayer(playerId: string): void {
      db.prepare('DELETE FROM sessions WHERE player_id = ?').run(playerId);
    },
  };
}
