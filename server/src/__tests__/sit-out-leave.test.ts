import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig } from '@poker/shared';

function makeConfig(): GameConfig {
  return {
    gameType: 'NLHE',
    smallBlind: 1,
    bigBlind: 2,
    maxBuyIn: 200,
    actionTimeSeconds: 30,
    minPlayers: 2,
    maxPlayers: 10,
  };
}

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
  const namespaceObj = { emit: emitFn, to: vi.fn().mockReturnValue({ emit: emitFn }) };
  return {
    of: vi.fn().mockReturnValue(namespaceObj),
    _emitFn: emitFn,
  } as any;
}

function getPlayer(gm: GameManager, socketId: string) {
  return (gm as any).players.get(socketId);
}

describe('Bug #9: Sit Out + Leave Table should fully remove player', () => {
  let gm: GameManager;
  let io: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    vi.useFakeTimers();
    io = createMockIo();
    gm = new GameManager(makeConfig(), io, 'test-table');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('player who folds during hand, sits out, then leaves should be fully removed even if player_acted event has not been processed yet', () => {
    // Setup: 3 players, start a hand
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    const sock3 = createMockSocket('sock-3');
    gm.addPlayer(sock1, 'Alice', 100);
    gm.addPlayer(sock2, 'Bob', 100);
    gm.addPlayer(sock3, 'Charlie', 100);
    gm.handleSitIn('sock-2');
    gm.handleSitIn('sock-3');

    // Start a hand
    gm.checkStartGame();
    vi.advanceTimersByTime(10000);
    expect((gm as any).phase).toBe('hand_in_progress');

    // Verify all three are in the hand
    const handPlayers = gm as any;
    expect(handPlayers.currentHandPlayers.size).toBe(3);

    // Find which player has the action and fold them
    // We need to find a player who can fold, then have them sit out and leave
    // For simplicity, we'll just directly call handleSitOut on one player
    // (simulating: player folded from client's perspective, then pressed Sit Out + Leave Table)

    // Player sits out (this is the state that matters - the client shows "Leave Table" only for sitting_out players)
    gm.handleSitOut('sock-3');
    expect(getPlayer(gm, 'sock-3').status).toBe('sitting_out');

    // Player leaves table while hand is still in progress
    gm.leaveTable('sock-3');

    // CRITICAL: Player should be FULLY removed, not just pending removal
    expect(getPlayer(gm, 'sock-3')).toBeUndefined();
    expect((gm as any).pendingRemovals.has('sock-3')).toBe(false);

    // Hand should still be in progress
    expect((gm as any).phase).toBe('hand_in_progress');
  });

  it('player who sits out between hands, then another hand starts, then player leaves should be fully removed', () => {
    // Setup: 3 players
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    const sock3 = createMockSocket('sock-3');
    gm.addPlayer(sock1, 'Alice', 100);
    gm.addPlayer(sock2, 'Bob', 100);
    gm.addPlayer(sock3, 'Charlie', 100);
    gm.handleSitIn('sock-2');
    gm.handleSitIn('sock-3');

    // Charlie sits out before hand starts
    gm.handleSitOut('sock-3');

    // Start a hand (only Alice and Bob are ready)
    gm.checkStartGame();
    vi.advanceTimersByTime(10000);
    expect((gm as any).phase).toBe('hand_in_progress');

    // Charlie leaves while hand is in progress (but Charlie is NOT in the hand)
    gm.leaveTable('sock-3');

    // Charlie should be fully removed
    expect(getPlayer(gm, 'sock-3')).toBeUndefined();
    expect((gm as any).pendingRemovals.has('sock-3')).toBe(false);

    // The seat should be free for other players
    const charlieWasAtSeat = 2; // Third player gets seat 2
    expect((gm as any).seatMap.has(charlieWasAtSeat)).toBe(false);
  });

  it('player who is actively playing (not sitting_out) and tries to leave should still be deferred', () => {
    // Setup: 2 players, start a hand
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock1, 'Alice', 100);
    gm.addPlayer(sock2, 'Bob', 100);
    gm.handleSitIn('sock-2');

    // Start a hand
    gm.checkStartGame();
    vi.advanceTimersByTime(10000);
    expect((gm as any).phase).toBe('hand_in_progress');

    // Active player tries to leave (not sitting_out)
    expect(getPlayer(gm, 'sock-1').status).not.toBe('sitting_out');
    gm.leaveTable('sock-1');

    // Player should be pending removal, NOT immediately removed
    expect(getPlayer(gm, 'sock-1')).toBeDefined();
    expect((gm as any).pendingRemovals.has('sock-1')).toBe(true);
  });

  it('sitting_out player who leaves should free their seat for new players', () => {
    // Setup: 2 players
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock1, 'Alice', 100);
    gm.addPlayer(sock2, 'Bob', 100);
    gm.handleSitIn('sock-2');

    const aliceSeat = getPlayer(gm, 'sock-1').seatIndex;

    // Alice sits out
    gm.handleSitOut('sock-1');

    // Alice leaves
    gm.leaveTable('sock-1');

    // Alice's seat should be free
    expect((gm as any).seatMap.has(aliceSeat)).toBe(false);

    // New player should be able to sit at Alice's old seat
    const sock3 = createMockSocket('sock-3');
    const result = gm.addPlayer(sock3, 'Charlie', 100, undefined, aliceSeat);
    expect(result.error).toBeUndefined();
    expect(getPlayer(gm, 'sock-3').seatIndex).toBe(aliceSeat);
  });
});
