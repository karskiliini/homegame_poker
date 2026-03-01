import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
});

import { saveTableSession, loadTableSession, clearTableSession } from '../utils/tableSession.js';

describe('per-table session storage', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
  });

  it('saves and loads session for specific table', () => {
    const session = { playerId: 'p1', playerToken: 'tok1', tableId: 'table-abc', playerName: 'Alice', playerAvatar: 'ninja' };
    saveTableSession('table-abc', session);
    expect(loadTableSession('table-abc')).toEqual(session);
  });

  it('returns null for unknown table', () => {
    expect(loadTableSession('unknown')).toBeNull();
  });

  it('clears session for specific table without affecting others', () => {
    saveTableSession('t1', { playerId: 'p1', playerToken: 'tok1', tableId: 't1', playerName: 'A', playerAvatar: '1' });
    saveTableSession('t2', { playerId: 'p2', playerToken: 'tok2', tableId: 't2', playerName: 'B', playerAvatar: '2' });
    clearTableSession('t1');
    expect(loadTableSession('t1')).toBeNull();
    expect(loadTableSession('t2')).not.toBeNull();
  });
});
