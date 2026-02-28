import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  _setDb, _initSchema,
  findPlayerByName, createPlayer, verifyPassword,
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
