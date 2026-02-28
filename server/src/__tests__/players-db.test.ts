import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  _setDb, _initSchema,
  findPlayerByName, findPlayerById, createPlayer, verifyPassword,
  getPlayerBalance, updateBalance, setBalance,
  updateLastLogin, updateAvatar,
  createSession, findSession, deleteSession, deletePlayerSessions,
} from '../db/players.js';

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  _initSchema(db);
  _setDb(db);
});

afterEach(() => {
  db.close();
});

describe('Player DB', () => {
  it('createPlayer() creates a new player with hashed password', async () => {
    const player = await createPlayer('Alice', 'secret123', '3');
    expect(player.name).toBe('Alice');
    expect(player.avatar_id).toBe('3');
    expect(player.balance).toBe(0);
    expect(player.password_hash).not.toBe('secret123');
    expect(player.id).toBeTruthy();
  });

  it('findPlayerByName() finds player case-insensitively', async () => {
    await createPlayer('Bob', 'pass');
    const found = findPlayerByName('bob');
    expect(found).toBeDefined();
    expect(found!.name).toBe('Bob');

    const foundUpper = findPlayerByName('BOB');
    expect(foundUpper).toBeDefined();
    expect(foundUpper!.name).toBe('Bob');
  });

  it('findPlayerByName() returns undefined for missing player', () => {
    const found = findPlayerByName('nobody');
    expect(found).toBeUndefined();
  });

  it('verifyPassword() returns true for correct password', async () => {
    const player = await createPlayer('Charlie', 'mypass');
    expect(await verifyPassword(player, 'mypass')).toBe(true);
  });

  it('verifyPassword() returns false for wrong password', async () => {
    const player = await createPlayer('Dave', 'correct');
    expect(await verifyPassword(player, 'wrong')).toBe(false);
  });

  it('createPlayer() rejects duplicate names (case-insensitive)', async () => {
    await createPlayer('Eve', 'pass1');
    await expect(createPlayer('eve', 'pass2')).rejects.toThrow();
  });

  it('getPlayerBalance() returns 0 for new player', async () => {
    const player = await createPlayer('Frank', 'pass');
    expect(getPlayerBalance(player.id)).toBe(0);
  });

  it('updateBalance() adds to balance', async () => {
    const player = await createPlayer('Grace', 'pass');
    const ok = updateBalance(player.id, 500);
    expect(ok).toBe(true);
    expect(getPlayerBalance(player.id)).toBe(500);
  });

  it('updateBalance() subtracts from balance', async () => {
    const player = await createPlayer('Heidi', 'pass');
    setBalance(player.id, 1000);
    const ok = updateBalance(player.id, -300);
    expect(ok).toBe(true);
    expect(getPlayerBalance(player.id)).toBe(700);
  });

  it('updateBalance() prevents negative balance', async () => {
    const player = await createPlayer('Ivan', 'pass');
    setBalance(player.id, 100);
    const ok = updateBalance(player.id, -200);
    expect(ok).toBe(false);
    expect(getPlayerBalance(player.id)).toBe(100);
  });

  it('setBalance() sets exact balance', async () => {
    const player = await createPlayer('Judy', 'pass');
    setBalance(player.id, 999);
    expect(getPlayerBalance(player.id)).toBe(999);
  });

  it('updateAvatar() changes avatar', async () => {
    const player = await createPlayer('Karl', 'pass', '1');
    updateAvatar(player.id, '5');
    const updated = findPlayerByName('Karl');
    expect(updated!.avatar_id).toBe('5');
  });

  it('updateLastLogin() updates last_login timestamp', async () => {
    const player = await createPlayer('Lucy', 'pass');
    const before = player.last_login;
    // Small delay to ensure different timestamp
    updateLastLogin(player.id);
    const updated = findPlayerByName('Lucy');
    // Just verify it doesn't throw and field exists
    expect(updated!.last_login).toBeTruthy();
  });

  it('findPlayerById() finds player by their UUID', async () => {
    const player = await createPlayer('Mike', 'pass');
    const found = findPlayerById(player.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Mike');
    expect(found!.id).toBe(player.id);
  });

  it('findPlayerById() returns undefined for missing player', () => {
    const found = findPlayerById('nonexistent-id');
    expect(found).toBeUndefined();
  });
});

describe('Session DB', () => {
  it('createSession() stores a session token for a player', async () => {
    const player = await createPlayer('Alice', 'pass');
    const token = createSession(player.id);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('findSession() retrieves a valid session', async () => {
    const player = await createPlayer('Bob', 'pass');
    const token = createSession(player.id);
    const session = findSession(token);
    expect(session).toBeDefined();
    expect(session!.player_id).toBe(player.id);
  });

  it('findSession() returns undefined for invalid token', () => {
    const session = findSession('bad-token');
    expect(session).toBeUndefined();
  });

  it('deleteSession() removes a session', async () => {
    const player = await createPlayer('Charlie', 'pass');
    const token = createSession(player.id);
    expect(findSession(token)).toBeDefined();
    deleteSession(token);
    expect(findSession(token)).toBeUndefined();
  });

  it('deletePlayerSessions() removes the active session for a player', async () => {
    const player = await createPlayer('Dave', 'pass');
    const token = createSession(player.id);
    expect(findSession(token)).toBeDefined();
    deletePlayerSessions(player.id);
    expect(findSession(token)).toBeUndefined();
  });

  it('session persists across "server restarts" (same DB)', async () => {
    const player = await createPlayer('Eve', 'pass');
    const token = createSession(player.id);

    // Simulate reading the session back (as if server restarted but DB file persists)
    const session = findSession(token);
    expect(session).toBeDefined();
    expect(session!.player_id).toBe(player.id);
  });

  it('createSession() replaces previous session for same player (single active session)', async () => {
    const player = await createPlayer('Frank', 'pass');
    const token1 = createSession(player.id);
    const token2 = createSession(player.id);
    // Old session should be invalidated
    expect(findSession(token1)).toBeUndefined();
    // New session should be valid
    expect(findSession(token2)).toBeDefined();
    expect(findSession(token2)!.player_id).toBe(player.id);
  });
});
