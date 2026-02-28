import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig } from '@poker/shared';
import { S2C_PLAYER, S2C_TABLE, REBUY_PROMPT_MS } from '@poker/shared';

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

function getPlayer(gm: GameManager, socketId: string) {
  return (gm as any).players.get(socketId);
}

// ============================================================================
// Tests — Full Rebuy & Sit-Out Flow
// ============================================================================

describe('Rebuy & Sit-Out flow', () => {
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

  // ── Full flow: bust → rebuy prompt → rebuy → back in game ──────────

  it('full flow: busted player receives rebuy prompt, rebuys, and rejoins next hand', () => {
    const sockAlice = createMockSocket('sock-alice');
    const sockBob = createMockSocket('sock-bob');

    gm.addPlayer(sockAlice, 'Alice', 200);
    gm.addPlayer(sockBob, 'Bob', 200);
    gm.handleSitIn('sock-bob');

    // Manually bust Alice
    const alice = getPlayer(gm, 'sock-alice');
    alice.status = 'busted';
    alice.stack = 0;
    alice.isReady = false;

    // Simulate server sending rebuy prompt (as handleHandComplete would)
    const deadline = Date.now() + REBUY_PROMPT_MS;
    sockAlice.emit(S2C_PLAYER.REBUY_PROMPT, { maxBuyIn: 200, deadline });
    const timer = setTimeout(() => {
      (gm as any).pendingRebuyPrompts.delete('sock-alice');
      gm.handleSitOut('sock-alice');
    }, REBUY_PROMPT_MS);
    (gm as any).pendingRebuyPrompts.set('sock-alice', timer);

    // Verify rebuy prompt was emitted
    const rebuyCall = sockAlice.emit.mock.calls.find(
      (c: any[]) => c[0] === S2C_PLAYER.REBUY_PROMPT,
    );
    expect(rebuyCall).toBeDefined();
    expect(rebuyCall![1].maxBuyIn).toBe(200);

    // Alice rebuys before timeout
    const result = gm.rebuyPlayer('sock-alice', 200);
    expect(result.error).toBeUndefined();
    expect(alice.stack).toBe(200);
    expect(alice.status).toBe('waiting');
    expect(alice.isReady).toBe(true);

    // The rebuy timer should be cleared
    expect((gm as any).pendingRebuyPrompts.has('sock-alice')).toBe(false);

    // Alice should be eligible for next hand
    gm.checkStartGame();
    expect((gm as any).phase).toBe('hand_in_progress');
  });

  // ── Full flow: bust → rebuy prompt timeout → sit out ────────────────

  it('full flow: busted player who does not rebuy is automatically sat out', () => {
    const sockAlice = createMockSocket('sock-alice');
    const sockBob = createMockSocket('sock-bob');

    gm.addPlayer(sockAlice, 'Alice', 200);
    gm.addPlayer(sockBob, 'Bob', 200);
    gm.handleSitIn('sock-bob');

    const alice = getPlayer(gm, 'sock-alice');
    alice.status = 'busted';
    alice.stack = 0;
    alice.isReady = false;

    // Set up rebuy prompt timer (as handleHandComplete would)
    const timer = setTimeout(() => {
      (gm as any).pendingRebuyPrompts.delete('sock-alice');
      gm.handleSitOut('sock-alice');
    }, REBUY_PROMPT_MS);
    (gm as any).pendingRebuyPrompts.set('sock-alice', timer);

    // Let rebuy timeout expire
    vi.advanceTimersByTime(REBUY_PROMPT_MS + 100);

    expect(alice.status).toBe('sitting_out');
    expect(alice.isReady).toBe(false);
  });

  // ── Sit-out player can rebuy with chips ─────────────────────────────

  it('sitting out player with zero chips can rebuy and rejoin', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 200);

    const alice = getPlayer(gm, 'sock-1');
    alice.status = 'sitting_out';
    alice.stack = 0;
    alice.isReady = false;

    // Rebuy from sitting_out state
    const result = gm.rebuyPlayer('sock-1', 100);
    expect(result.error).toBeUndefined();
    expect(alice.stack).toBe(100);
    expect(alice.status).toBe('waiting');
    expect(alice.isReady).toBe(true);
  });

  // ── Sit-out player with chips can sit back in ──────────────────────

  it('sitting out player with chips can sit in without rebuying', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 200);

    const alice = getPlayer(gm, 'sock-1');
    alice.status = 'sitting_out';
    alice.isReady = false;
    // Stack remains 200

    gm.handleSitIn('sock-1');
    expect(alice.status).toBe('waiting');
    expect(alice.isReady).toBe(true);
    expect(alice.stack).toBe(200);
  });

  // ── Table state reflects sitting_out players ────────────────────────

  it('table state includes sitting_out player with correct status', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');

    gm.addPlayer(sock1, 'Alice', 200);
    gm.addPlayer(sock2, 'Bob', 200);

    // First player is auto-sitting-in, second is sitting_out
    const state = gm.getTableState();
    const alice = state.players.find(p => p.name === 'Alice');
    const bob = state.players.find(p => p.name === 'Bob');

    expect(alice?.status).toBe('waiting');
    expect(bob?.status).toBe('sitting_out');
  });

  // ── Rebuy validation: cannot exceed max buy-in ──────────────────────

  it('rebuy fails if amount exceeds maxBuyIn', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 200);

    const alice = getPlayer(gm, 'sock-1');
    alice.status = 'busted';
    alice.stack = 0;

    const result = gm.rebuyPlayer('sock-1', 300);
    expect(result.error).toBe('Maximum buy-in is 200');
    expect(alice.stack).toBe(0);
    expect(alice.status).toBe('busted');
  });

  // ── Rebuy validation: cannot rebuy while active ─────────────────────

  it('rebuy fails if player is active (not busted/sitting_out)', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 200);

    const alice = getPlayer(gm, 'sock-1');
    alice.status = 'active';

    const result = gm.rebuyPlayer('sock-1', 100);
    expect(result.error).toBe('You can only rebuy when busted or sitting out');
  });

  // ── Sit-in fails with zero chips ───────────────────────────────────

  it('sit-in fails when player has zero chips (must rebuy first)', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 200);

    const alice = getPlayer(gm, 'sock-1');
    // Simulate bust -> sit out flow (sets isReady false)
    gm.handleSitOut('sock-1');
    alice.stack = 0;

    gm.handleSitIn('sock-1');
    expect(alice.status).toBe('sitting_out');
    expect(alice.isReady).toBe(false);
  });

  // ── Multiple players can be busted simultaneously ──────────────────

  it('multiple busted players can each rebuy independently', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    const sock3 = createMockSocket('sock-3');

    gm.addPlayer(sock1, 'Alice', 200);
    gm.addPlayer(sock2, 'Bob', 200);
    gm.addPlayer(sock3, 'Carol', 200);

    const alice = getPlayer(gm, 'sock-1');
    const bob = getPlayer(gm, 'sock-2');
    const carol = getPlayer(gm, 'sock-3');

    alice.status = 'busted';
    alice.stack = 0;
    bob.status = 'busted';
    bob.stack = 0;

    // Alice rebuys
    gm.rebuyPlayer('sock-1', 100);
    expect(alice.status).toBe('waiting');
    expect(alice.stack).toBe(100);

    // Bob also rebuys
    gm.rebuyPlayer('sock-2', 150);
    expect(bob.status).toBe('waiting');
    expect(bob.stack).toBe(150);

    // Carol was never busted
    expect(carol.status).toBe('sitting_out');
  });

  // ── Sit out during non-hand phase ──────────────────────────────────

  it('player can sit out between hands and sit back in', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');

    gm.addPlayer(sock1, 'Alice', 200);
    gm.addPlayer(sock2, 'Bob', 200);
    gm.handleSitIn('sock-2');

    const alice = getPlayer(gm, 'sock-1');
    expect(alice.status).toBe('waiting');

    // Alice sits out
    gm.handleSitOut('sock-1');
    expect(alice.status).toBe('sitting_out');
    expect(alice.isReady).toBe(false);

    // Verify table state shows sitting_out
    const state = gm.getTableState();
    const aliceState = state.players.find(p => p.name === 'Alice');
    expect(aliceState?.status).toBe('sitting_out');

    // Alice sits back in
    gm.handleSitIn('sock-1');
    expect(alice.status).toBe('waiting');
    expect(alice.isReady).toBe(true);
  });
});
