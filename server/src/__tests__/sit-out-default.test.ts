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
    it('creates player with sitting_out status and isReady: false', () => {
      const socket = createMockSocket('s1');
      gm.addPlayer(socket, 'Alice', 200);

      const player = gm.getPlayerBySocketId('s1');
      expect(player).toBeDefined();
      expect(player!.status).toBe('sitting_out');
      expect(player!.isReady).toBe(false);
    });

    it('sends initial PrivatePlayerState to the joining player', () => {
      const socket = createMockSocket('s1');
      gm.addPlayer(socket, 'Alice', 200);

      // Should have emitted private state with sitting_out status
      const privateStateCalls = socket.emit.mock.calls.filter(
        (c: any[]) => c[0] === 'player:private_state'
      );
      expect(privateStateCalls.length).toBe(1);
      expect(privateStateCalls[0][1].status).toBe('sitting_out');
      expect(privateStateCalls[0][1].stack).toBe(200);
      expect(privateStateCalls[0][1].name).toBe('Alice');
    });
  });

  describe('handleSitIn', () => {
    it('transitions player from sitting_out to waiting with isReady: true', () => {
      const socket = createMockSocket('s1');
      gm.addPlayer(socket, 'Alice', 200);

      gm.handleSitIn('s1');

      const player = gm.getPlayerBySocketId('s1');
      expect(player!.status).toBe('waiting');
      expect(player!.isReady).toBe(true);
    });

    it('does nothing if player is not sitting_out', () => {
      const socket = createMockSocket('s1');
      gm.addPlayer(socket, 'Alice', 200);

      // Manually set to waiting (simulating already sat in)
      gm.handleSitIn('s1');
      expect(gm.getPlayerBySocketId('s1')!.status).toBe('waiting');

      // Try sit in again — should stay waiting
      gm.handleSitIn('s1');
      expect(gm.getPlayerBySocketId('s1')!.status).toBe('waiting');
    });

    it('does nothing if stack <= 0', () => {
      const socket = createMockSocket('s1');
      gm.addPlayer(socket, 'Alice', 200);

      // Drain the stack
      const player = gm.getPlayerBySocketId('s1')!;
      player.stack = 0;

      gm.handleSitIn('s1');
      expect(player.status).toBe('sitting_out');
      expect(player.isReady).toBe(false);
    });
  });

  describe('game start with sit in', () => {
    it('game starts when 2 players sit in', () => {
      const s1 = createMockSocket('s1');
      const s2 = createMockSocket('s2');
      gm.addPlayer(s1, 'Alice', 200);
      gm.addPlayer(s2, 'Bob', 200);

      // Both sitting out — game should not start
      gm.checkStartGame();
      expect(gm.getPhase()).toBe('waiting_for_players');

      // One sits in — still not enough
      gm.handleSitIn('s1');
      gm.checkStartGame();
      expect(gm.getPhase()).toBe('waiting_for_players');

      // Second sits in — game should start
      gm.handleSitIn('s2');
      gm.checkStartGame();
      expect(gm.getPhase()).toBe('hand_in_progress');
    });

    it('game does NOT start with only 1 player sat in', () => {
      const s1 = createMockSocket('s1');
      const s2 = createMockSocket('s2');
      gm.addPlayer(s1, 'Alice', 200);
      gm.addPlayer(s2, 'Bob', 200);

      gm.handleSitIn('s1');
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
