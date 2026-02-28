import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  _setDb, _initSchema,
  findPlayerByName, findPlayerById, createPlayer, verifyPassword,
  createSession, findSession,
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

describe('Auth flow', () => {
  it('new player: CHECK_NAME returns exists=false, REGISTER creates account', async () => {
    // Step 1: Check name — should not exist
    const existing = findPlayerByName('NewPlayer');
    expect(existing).toBeUndefined();

    // Step 2: Register
    const player = await createPlayer('NewPlayer', 'password123', '3');
    expect(player.name).toBe('NewPlayer');
    expect(player.balance).toBe(0);

    // Step 3: Name now exists
    const found = findPlayerByName('NewPlayer');
    expect(found).toBeDefined();
    expect(found!.id).toBe(player.id);
  });

  it('returning player: CHECK_NAME returns exists=true, LOGIN verifies password', async () => {
    // Register first
    const player = await createPlayer('Returning', 'mypassword');

    // Step 1: Check name — should exist
    const found = findPlayerByName('Returning');
    expect(found).toBeDefined();

    // Step 2: Login with correct password
    const valid = await verifyPassword(found!, 'mypassword');
    expect(valid).toBe(true);

    // Step 3: Login with wrong password
    const invalid = await verifyPassword(found!, 'wrongpassword');
    expect(invalid).toBe(false);
  });

  it('registration preserves avatar choice', async () => {
    const player = await createPlayer('AvatarPlayer', 'pass', '7');
    expect(player.avatar_id).toBe('7');
  });

  it('case-insensitive name lookup prevents duplicates', async () => {
    await createPlayer('CaseSensitive', 'pass');
    const found = findPlayerByName('casesensitive');
    expect(found).toBeDefined();
    expect(found!.name).toBe('CaseSensitive');

    // Trying to register same name in different case should fail
    await expect(createPlayer('CASESENSITIVE', 'pass2')).rejects.toThrow();
  });
});

describe('Session auth flow', () => {
  it('login creates a session token that can be used to auto-login', async () => {
    // Register
    const player = await createPlayer('SessionPlayer', 'pass');
    // Simulate server creating session on login
    const sessionToken = createSession(player.id);
    expect(sessionToken).toBeTruthy();

    // Simulate auto-login with session token (as if server restarted)
    const session = findSession(sessionToken);
    expect(session).toBeDefined();
    expect(session!.player_id).toBe(player.id);

    // Look up player from session
    const found = findPlayerById(session!.player_id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('SessionPlayer');
  });

  it('session token is invalid after re-login (new session replaces old)', async () => {
    const player = await createPlayer('ReLogin', 'pass');
    const token1 = createSession(player.id);
    const token2 = createSession(player.id); // Simulates re-login

    // Old token should be invalid
    expect(findSession(token1)).toBeUndefined();
    // New token should work
    expect(findSession(token2)).toBeDefined();
  });

  it('session token persists player data across simulated server restart', async () => {
    const player = await createPlayer('Persistent', 'pass', '5');
    // Deposit some money
    const { updateBalance, getPlayerBalance } = await import('../db/players.js');
    updateBalance(player.id, 1000);

    const sessionToken = createSession(player.id);

    // Simulate "server restart" — clear all in-memory state, but DB persists
    // In real server, the in-memory Maps are gone but SQLite file stays

    // Client reconnects with session token
    const session = findSession(sessionToken);
    expect(session).toBeDefined();
    const restored = findPlayerById(session!.player_id);
    expect(restored).toBeDefined();
    expect(restored!.name).toBe('Persistent');
    expect(restored!.avatar_id).toBe('5');
    expect(getPlayerBalance(restored!.id)).toBe(1000);
  });
});
