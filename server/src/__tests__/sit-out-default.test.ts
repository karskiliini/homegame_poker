import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig } from '@poker/shared';
import { START_COUNTDOWN_MS } from '@poker/shared';

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

describe('Sit Out by Default', () => {
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

  describe('addPlayer', () => {
    it('first player auto-sits-in with waiting status and isReady: true', () => {
      const socket = createMockSocket('s1');
      gm.addPlayer(socket, 'Alice', 200);

      const player = gm.getPlayerBySocketId('s1');
      expect(player).toBeDefined();
      expect(player!.status).toBe('waiting');
      expect(player!.isReady).toBe(true);
    });

    it('second player joins as sitting_out with isReady: false', () => {
      const s1 = createMockSocket('s1');
      const s2 = createMockSocket('s2');
      gm.addPlayer(s1, 'Alice', 200);
      gm.addPlayer(s2, 'Bob', 200);

      const bob = gm.getPlayerBySocketId('s2');
      expect(bob!.status).toBe('sitting_out');
      expect(bob!.isReady).toBe(false);
    });

    it('sends initial PrivatePlayerState matching player status', () => {
      const s1 = createMockSocket('s1');
      const s2 = createMockSocket('s2');
      gm.addPlayer(s1, 'Alice', 200);
      gm.addPlayer(s2, 'Bob', 200);

      // First player gets waiting status
      const aliceStates = s1.emit.mock.calls.filter(
        (c: any[]) => c[0] === 'player:private_state'
      );
      expect(aliceStates[0][1].status).toBe('waiting');

      // Second player gets sitting_out status
      const bobStates = s2.emit.mock.calls.filter(
        (c: any[]) => c[0] === 'player:private_state'
      );
      expect(bobStates[0][1].status).toBe('sitting_out');
    });
  });

  describe('handleSitIn', () => {
    it('transitions player from sitting_out to waiting with isReady: true', () => {
      const s1 = createMockSocket('s1');
      const s2 = createMockSocket('s2');
      gm.addPlayer(s1, 'Alice', 200);
      gm.addPlayer(s2, 'Bob', 200); // Bob joins as sitting_out

      gm.handleSitIn('s2');

      const bob = gm.getPlayerBySocketId('s2');
      expect(bob!.status).toBe('waiting');
      expect(bob!.isReady).toBe(true);
    });

    it('does nothing if player is not sitting_out', () => {
      const s1 = createMockSocket('s1');
      gm.addPlayer(s1, 'Alice', 200); // First player, auto waiting

      // Try sit in — already waiting, should stay waiting
      gm.handleSitIn('s1');
      expect(gm.getPlayerBySocketId('s1')!.status).toBe('waiting');
    });

    it('does nothing if stack <= 0', () => {
      const s1 = createMockSocket('s1');
      const s2 = createMockSocket('s2');
      gm.addPlayer(s1, 'Alice', 200);
      gm.addPlayer(s2, 'Bob', 200);

      // Drain Bob's stack
      const bob = gm.getPlayerBySocketId('s2')!;
      bob.stack = 0;

      gm.handleSitIn('s2');
      expect(bob.status).toBe('sitting_out');
      expect(bob.isReady).toBe(false);
    });
  });

  describe('game start with sit in', () => {
    it('game starts when first player (auto-in) + second player sits in', () => {
      const s1 = createMockSocket('s1');
      const s2 = createMockSocket('s2');
      gm.addPlayer(s1, 'Alice', 200); // auto waiting
      gm.addPlayer(s2, 'Bob', 200);   // sitting_out

      // Only Alice ready — not enough
      gm.checkStartGame();
      expect(gm.getPhase()).toBe('waiting_for_players');

      // Bob sits in — game should start
      gm.handleSitIn('s2');
      gm.checkStartGame();
      expect(gm.getPhase()).toBe('hand_in_progress');
    });

    it('game does NOT start with only 1 player sat in', () => {
      const s1 = createMockSocket('s1');
      const s2 = createMockSocket('s2');
      gm.addPlayer(s1, 'Alice', 200); // auto waiting
      gm.addPlayer(s2, 'Bob', 200);   // sitting_out

      gm.checkStartGame();
      expect(gm.getPhase()).toBe('waiting_for_players');
    });
  });

  describe('countdown', () => {
    it('START_COUNTDOWN_MS is 5000', () => {
      expect(START_COUNTDOWN_MS).toBe(5000);
    });
  });
});
