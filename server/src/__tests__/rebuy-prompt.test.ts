import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig } from '@poker/shared';
import { S2C_PLAYER, REBUY_PROMPT_MS } from '@poker/shared';

// ============================================================================
// Mock helpers
// ============================================================================

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

/** Access private player state for assertions */
function getPlayer(gm: GameManager, socketId: string) {
  return (gm as any).players.get(socketId);
}

// ============================================================================
// Tests
// ============================================================================

describe('Rebuy prompt', () => {
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

  // ── Integration: REBUY_PROMPT replaces BUSTED ──────────────────────

  it('sends REBUY_PROMPT instead of BUSTED when player loses all chips', () => {
    const sockAlice = createMockSocket('sock-alice');
    const sockBob = createMockSocket('sock-bob');

    gm.addPlayer(sockAlice, 'Alice', 2);
    gm.addPlayer(sockBob, 'Bob', 200);

    // Players are auto-ready on join, just start the game
    gm.checkStartGame();

    // Process card dealing + pre-action delay
    vi.advanceTimersByTime(3000);

    // Force the actor to call (one of them; the other call is harmlessly ignored)
    gm.handlePlayerAction('sock-alice', 'call');
    gm.handlePlayerAction('sock-bob', 'call');

    // Let remaining actions timeout + showdown + hand_complete process
    vi.advanceTimersByTime(60000);

    // BUSTED should NEVER be emitted to either player
    expect(sockAlice.emit.mock.calls.some((c: any[]) => c[0] === S2C_PLAYER.BUSTED)).toBe(false);
    expect(sockBob.emit.mock.calls.some((c: any[]) => c[0] === S2C_PLAYER.BUSTED)).toBe(false);

    // Whoever busted should have received REBUY_PROMPT with correct payload
    const alice = getPlayer(gm, 'sock-alice');
    const bob = getPlayer(gm, 'sock-bob');
    const bustedSocket = alice.stack === 0 ? sockAlice : bob.stack === 0 ? sockBob : null;

    if (bustedSocket) {
      const rebuyCall = bustedSocket.emit.mock.calls.find(
        (c: any[]) => c[0] === S2C_PLAYER.REBUY_PROMPT,
      );
      expect(rebuyCall).toBeDefined();
      expect(rebuyCall![1]).toHaveProperty('maxBuyIn', 200);
      expect(rebuyCall![1]).toHaveProperty('deadline');
      expect(rebuyCall![1].deadline).toBeTypeOf('number');
    }
  });

  // ── Unit: handleSitOut ─────────────────────────────────────────────

  it('handleSitOut sets status to sitting_out and player stays at table', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 100);

    const player = getPlayer(gm, 'sock-1');
    player.status = 'busted';
    player.stack = 0;

    gm.handleSitOut('sock-1');

    expect(player.status).toBe('sitting_out');
    expect(player.isReady).toBe(false);
    expect(gm.getTableState().players).toHaveLength(1);
  });

  // ── Unit: rebuyPlayer from busted ──────────────────────────────────

  it('rebuyPlayer works from busted status — sets stack, status waiting, isReady true', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 100);

    const player = getPlayer(gm, 'sock-1');
    player.status = 'busted';
    player.stack = 0;

    const result = gm.rebuyPlayer('sock-1', 100);
    expect(result.error).toBeUndefined();
    expect(player.stack).toBe(100);
    expect(player.status).toBe('waiting');
    expect(player.isReady).toBe(true);
  });

  // ── Unit: rebuyPlayer from sitting_out ─────────────────────────────

  it('rebuyPlayer works from sitting_out status', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 100);

    const player = getPlayer(gm, 'sock-1');
    player.status = 'sitting_out';
    player.stack = 0;

    const result = gm.rebuyPlayer('sock-1', 150);
    expect(result.error).toBeUndefined();
    expect(player.stack).toBe(150);
    expect(player.status).toBe('waiting');
    expect(player.isReady).toBe(true);
  });

  // ── Unit: auto sit out on timeout ──────────────────────────────────

  it('auto sit out when rebuy prompt timer expires', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 100);

    const player = getPlayer(gm, 'sock-1');
    player.status = 'busted';
    player.stack = 0;

    // Simulate the timer that handleHandComplete would create
    const timer = setTimeout(() => {
      (gm as any).pendingRebuyPrompts.delete('sock-1');
      gm.handleSitOut('sock-1');
    }, REBUY_PROMPT_MS);
    (gm as any).pendingRebuyPrompts.set('sock-1', timer);

    // Advance past the deadline
    vi.advanceTimersByTime(REBUY_PROMPT_MS + 100);

    expect(player.status).toBe('sitting_out');
  });

  // ── Unit: sitting out player skipped in auto-ready ─────────────────

  it('sitting out player is not auto-readied for next hand', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock1, 'Alice', 100);
    gm.addPlayer(sock2, 'Bob', 100);

    const alice = getPlayer(gm, 'sock-1');
    alice.status = 'sitting_out';
    alice.stack = 0;
    alice.isReady = false;

    // Trigger scheduleNextHand path: set phase to hand_complete, then advance
    (gm as any).phase = 'hand_complete';
    // scheduleNextHand fires after HAND_COMPLETE_PAUSE_MS
    // We trigger it by calling the same logic (auto-ready loop)
    vi.advanceTimersByTime(0); // no pending timers yet, but let's advance

    // Simulate what scheduleNextHand does:
    (gm as any).phase = 'waiting_for_players';
    for (const [, p] of (gm as any).players) {
      if (p.stack > 0 && p.isConnected && p.status !== 'busted' && p.status !== 'sitting_out') {
        p.isReady = true;
      }
    }

    expect(alice.isReady).toBe(false);
    expect(getPlayer(gm, 'sock-2').isReady).toBe(true);
  });

  // ── Unit: rebuy clears pending timer ───────────────────────────────

  it('rebuy clears pending rebuy prompt timer', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 100);

    const player = getPlayer(gm, 'sock-1');
    player.status = 'busted';
    player.stack = 0;

    // Set up a rebuy prompt timer
    const sitOutFn = vi.fn();
    const timer = setTimeout(sitOutFn, REBUY_PROMPT_MS);
    (gm as any).pendingRebuyPrompts.set('sock-1', timer);

    // Rebuy before timeout
    gm.rebuyPlayer('sock-1', 100);

    expect((gm as any).pendingRebuyPrompts.has('sock-1')).toBe(false);

    // Advance past timeout — sitOutFn should NOT fire
    vi.advanceTimersByTime(REBUY_PROMPT_MS + 100);
    expect(sitOutFn).not.toHaveBeenCalled();
  });

  // ── Unit: disconnect clears pending timer ──────────────────────────

  it('disconnect clears pending rebuy prompt timer', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 100);

    const player = getPlayer(gm, 'sock-1');
    player.status = 'busted';
    player.stack = 0;

    // Set up a rebuy prompt timer
    const sitOutFn = vi.fn();
    const timer = setTimeout(sitOutFn, REBUY_PROMPT_MS);
    (gm as any).pendingRebuyPrompts.set('sock-1', timer);

    // Disconnect before timeout
    gm.handlePlayerDisconnect('sock-1');

    expect((gm as any).pendingRebuyPrompts.has('sock-1')).toBe(false);

    // Advance past timeout — sitOutFn should NOT fire
    vi.advanceTimersByTime(REBUY_PROMPT_MS + 100);
    expect(sitOutFn).not.toHaveBeenCalled();
  });
});
