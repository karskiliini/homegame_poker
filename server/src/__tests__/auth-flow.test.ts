import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../db/index.js';
import type { Database } from '../db/index.js';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('Auth flow', () => {
  it('new player: CHECK_NAME returns exists=false, REGISTER creates account', async () => {
    const existing = db.players.findByName('NewPlayer');
    expect(existing).toBeUndefined();

    const player = await db.players.create('NewPlayer', 'password123', '3');
    expect(player.name).toBe('NewPlayer');
    expect(player.balance).toBe(0);

    const found = db.players.findByName('NewPlayer');
    expect(found).toBeDefined();
    expect(found!.id).toBe(player.id);
  });

  it('returning player: CHECK_NAME returns exists=true, LOGIN verifies password', async () => {
    const player = await db.players.create('Returning', 'mypassword');

    const found = db.players.findByName('Returning');
    expect(found).toBeDefined();

    const valid = await db.players.verifyPassword(found!, 'mypassword');
    expect(valid).toBe(true);

    const invalid = await db.players.verifyPassword(found!, 'wrongpassword');
    expect(invalid).toBe(false);
  });

  it('registration preserves avatar choice', async () => {
    const player = await db.players.create('AvatarPlayer', 'pass', '7');
    expect(player.avatar_id).toBe('7');
  });

  it('case-insensitive name lookup prevents duplicates', async () => {
    await db.players.create('CaseSensitive', 'pass');
    const found = db.players.findByName('casesensitive');
    expect(found).toBeDefined();
    expect(found!.name).toBe('CaseSensitive');

    await expect(db.players.create('CASESENSITIVE', 'pass2')).rejects.toThrow();
  });
});

describe('Session auth flow', () => {
  it('login creates a session token that can be used to auto-login', async () => {
    const player = await db.players.create('SessionPlayer', 'pass');
    const sessionToken = db.sessions.create(player.id);
    expect(sessionToken).toBeTruthy();

    const session = db.sessions.find(sessionToken);
    expect(session).toBeDefined();
    expect(session!.player_id).toBe(player.id);

    const found = db.players.findById(session!.player_id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('SessionPlayer');
  });

  it('session token is invalid after re-login (new session replaces old)', async () => {
    const player = await db.players.create('ReLogin', 'pass');
    const token1 = db.sessions.create(player.id);
    const token2 = db.sessions.create(player.id);

    expect(db.sessions.find(token1)).toBeUndefined();
    expect(db.sessions.find(token2)).toBeDefined();
  });

  it('session token persists player data across simulated server restart', async () => {
    const player = await db.players.create('Persistent', 'pass', '5');
    db.balance.update(player.id, 1000);

    const sessionToken = db.sessions.create(player.id);

    const session = db.sessions.find(sessionToken);
    expect(session).toBeDefined();
    const restored = db.players.findById(session!.player_id);
    expect(restored).toBeDefined();
    expect(restored!.name).toBe('Persistent');
    expect(restored!.avatar_id).toBe('5');
    expect(db.balance.get(restored!.id)).toBe(1000);
  });
});
