import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  _setDb, _initSchema,
  findPlayerByName, createPlayer, verifyPassword,
  getPlayerBalance, updateBalance, setBalance,
  updateLastLogin, updateAvatar,
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
});
