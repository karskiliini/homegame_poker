import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig } from '@poker/shared';
import { S2C_TABLE } from '@poker/shared';

function createMockSocket(id: string) {
  return {
    id,
    emit: vi.fn(),
    on: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
  } as any;
}

function createMockIo() {
  const emitFn = vi.fn();
  const toFn = vi.fn().mockReturnValue({ emit: emitFn });
  const namespaceObj = { emit: emitFn, to: toFn };
  return {
    of: vi.fn().mockReturnValue(namespaceObj),
    _emitFn: emitFn,
    _toFn: toFn,
  } as any;
}

const defaultConfig: GameConfig = {
  smallBlind: 1,
  bigBlind: 2,
  maxBuyIn: 200,
  minPlayers: 2,
  maxPlayers: 10,
  gameType: 'NLHE',
  actionTimeSeconds: 30,
};

describe('Bug #10: Pot cleared when all but one player sits out', () => {
  let gm: GameManager;
  let io: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    vi.useFakeTimers();
    io = createMockIo();
    gm = new GameManager(defaultConfig, io, 'test-table');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should clear pots from table state when hand ends and not enough players for next hand', () => {
    const s1 = createMockSocket('s1');
    const s2 = createMockSocket('s2');

    // Set up and start a hand
    gm.addPlayer(s1, 'Alice', 200);
    gm.addPlayer(s2, 'Bob', 200);
    gm.handleSitIn('s2');
    gm.checkStartGame();
    expect(gm.getPhase()).toBe('hand_in_progress');

    // Bob toggles sit-out-next-hand during the hand
    gm.handleSitOutNextHand('s2');

    // Complete the hand: one player folds
    gm.handlePlayerAction('s1', 'fold');
    gm.handlePlayerAction('s2', 'fold');

    // Run all timers to process event queue + hand complete + scheduleNextHand
    vi.runAllTimers();

    // Bob should now be sitting out
    expect(gm.getPlayerBySocketId('s2')!.status).toBe('sitting_out');

    // Only Alice is active — not enough players for a new hand
    expect(gm.getPhase()).toBe('waiting_for_players');

    // The table state should show empty pots (previous hand's pot should be cleared)
    const tableState = gm.getTableState();
    expect(tableState.pots).toEqual([]);
    expect(tableState.communityCards).toEqual([]);
  });

  it('should clear pots when hand ends and both players sit out', () => {
    const s1 = createMockSocket('s1');
    const s2 = createMockSocket('s2');

    gm.addPlayer(s1, 'Alice', 200);
    gm.addPlayer(s2, 'Bob', 200);
    gm.handleSitIn('s2');
    gm.checkStartGame();
    expect(gm.getPhase()).toBe('hand_in_progress');

    // Both toggle sit-out-next-hand
    gm.handleSitOutNextHand('s1');
    gm.handleSitOutNextHand('s2');

    // Complete the hand
    gm.handlePlayerAction('s1', 'fold');
    gm.handlePlayerAction('s2', 'fold');

    vi.runAllTimers();

    // Both sitting out
    expect(gm.getPlayerBySocketId('s1')!.status).toBe('sitting_out');
    expect(gm.getPlayerBySocketId('s2')!.status).toBe('sitting_out');
    expect(gm.getPhase()).toBe('waiting_for_players');

    // Pots should be empty
    const tableState = gm.getTableState();
    expect(tableState.pots).toEqual([]);
  });
});
