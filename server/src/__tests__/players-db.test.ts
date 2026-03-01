import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../db/index.js';
import type { Database } from '../db/index.js';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('Player DB', () => {
  it('createPlayer() creates a new player with hashed password', async () => {
    const player = await db.players.create('Alice', 'secret123', '3');
    expect(player.name).toBe('Alice');
    expect(player.avatar_id).toBe('3');
    expect(player.balance).toBe(0);
    expect(player.password_hash).not.toBe('secret123');
    expect(player.id).toBeTruthy();
  });

  it('findPlayerByName() finds player case-insensitively', async () => {
    await db.players.create('Bob', 'pass');
    const found = db.players.findByName('bob');
    expect(found).toBeDefined();
    expect(found!.name).toBe('Bob');

    const foundUpper = db.players.findByName('BOB');
    expect(foundUpper).toBeDefined();
    expect(foundUpper!.name).toBe('Bob');
  });

  it('findPlayerByName() returns undefined for missing player', () => {
    const found = db.players.findByName('nobody');
    expect(found).toBeUndefined();
  });

  it('verifyPassword() returns true for correct password', async () => {
    const player = await db.players.create('Charlie', 'mypass');
    expect(await db.players.verifyPassword(player, 'mypass')).toBe(true);
  });

  it('verifyPassword() returns false for wrong password', async () => {
    const player = await db.players.create('Dave', 'correct');
    expect(await db.players.verifyPassword(player, 'wrong')).toBe(false);
  });

  it('createPlayer() rejects duplicate names (case-insensitive)', async () => {
    await db.players.create('Eve', 'pass1');
    await expect(db.players.create('eve', 'pass2')).rejects.toThrow();
  });

  it('getPlayerBalance() returns 0 for new player', async () => {
    const player = await db.players.create('Frank', 'pass');
    expect(db.balance.get(player.id)).toBe(0);
  });

  it('updateBalance() adds to balance', async () => {
    const player = await db.players.create('Grace', 'pass');
    const ok = db.balance.update(player.id, 500);
    expect(ok).toBe(true);
    expect(db.balance.get(player.id)).toBe(500);
  });

  it('updateBalance() subtracts from balance', async () => {
    const player = await db.players.create('Heidi', 'pass');
    db.balance.set(player.id, 1000);
    const ok = db.balance.update(player.id, -300);
    expect(ok).toBe(true);
    expect(db.balance.get(player.id)).toBe(700);
  });

  it('updateBalance() prevents negative balance', async () => {
    const player = await db.players.create('Ivan', 'pass');
    db.balance.set(player.id, 100);
    const ok = db.balance.update(player.id, -200);
    expect(ok).toBe(false);
    expect(db.balance.get(player.id)).toBe(100);
  });

  it('setBalance() sets exact balance', async () => {
    const player = await db.players.create('Judy', 'pass');
    db.balance.set(player.id, 999);
    expect(db.balance.get(player.id)).toBe(999);
  });

  it('updateAvatar() changes avatar', async () => {
    const player = await db.players.create('Karl', 'pass', '1');
    db.players.updateAvatar(player.id, '5');
    const updated = db.players.findByName('Karl');
    expect(updated!.avatar_id).toBe('5');
  });

  it('updateLastLogin() updates last_login timestamp', async () => {
    const player = await db.players.create('Lucy', 'pass');
    db.players.updateLastLogin(player.id);
    const updated = db.players.findByName('Lucy');
    expect(updated!.last_login).toBeTruthy();
  });

  it('findPlayerById() finds player by their UUID', async () => {
    const player = await db.players.create('Mike', 'pass');
    const found = db.players.findById(player.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Mike');
    expect(found!.id).toBe(player.id);
  });

  it('findPlayerById() returns undefined for missing player', () => {
    const found = db.players.findById('nonexistent-id');
    expect(found).toBeUndefined();
  });
});

describe('Session DB', () => {
  it('createSession() stores a session token for a player', async () => {
    const player = await db.players.create('Alice', 'pass');
    const token = db.sessions.create(player.id);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('findSession() retrieves a valid session', async () => {
    const player = await db.players.create('Bob', 'pass');
    const token = db.sessions.create(player.id);
    const session = db.sessions.find(token);
    expect(session).toBeDefined();
    expect(session!.player_id).toBe(player.id);
  });

  it('findSession() returns undefined for invalid token', () => {
    const session = db.sessions.find('bad-token');
    expect(session).toBeUndefined();
  });

  it('deleteSession() removes a session', async () => {
    const player = await db.players.create('Charlie', 'pass');
    const token = db.sessions.create(player.id);
    expect(db.sessions.find(token)).toBeDefined();
    db.sessions.delete(token);
    expect(db.sessions.find(token)).toBeUndefined();
  });

  it('deletePlayerSessions() removes the active session for a player', async () => {
    const player = await db.players.create('Dave', 'pass');
    const token = db.sessions.create(player.id);
    expect(db.sessions.find(token)).toBeDefined();
    db.sessions.deleteByPlayer(player.id);
    expect(db.sessions.find(token)).toBeUndefined();
  });

  it('session persists across "server restarts" (same DB)', async () => {
    const player = await db.players.create('Eve', 'pass');
    const token = db.sessions.create(player.id);
    const session = db.sessions.find(token);
    expect(session).toBeDefined();
    expect(session!.player_id).toBe(player.id);
  });

  it('createSession() replaces previous session for same player (single active session)', async () => {
    const player = await db.players.create('Frank', 'pass');
    const token1 = db.sessions.create(player.id);
    const token2 = db.sessions.create(player.id);
    expect(db.sessions.find(token1)).toBeUndefined();
    expect(db.sessions.find(token2)).toBeDefined();
    expect(db.sessions.find(token2)!.player_id).toBe(player.id);
  });
});
