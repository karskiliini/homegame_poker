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

describe('Sit In / Sit Out', () => {
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

  it('handleSitIn sets status to waiting and isReady to true when player has chips', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 100);

    const player = getPlayer(gm, 'sock-1');
    player.status = 'sitting_out';
    player.isReady = false;

    gm.handleSitIn('sock-1');

    expect(player.status).toBe('waiting');
    expect(player.isReady).toBe(true);
  });

  it('handleSitIn does nothing when player has no chips', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 100);

    const player = getPlayer(gm, 'sock-1');
    player.status = 'sitting_out';
    player.stack = 0;
    player.isReady = false;

    gm.handleSitIn('sock-1');

    expect(player.status).toBe('sitting_out');
    expect(player.isReady).toBe(false);
  });

  it('handleSitIn does nothing when player is not sitting out', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 100);

    const player = getPlayer(gm, 'sock-1');
    player.status = 'waiting';
    player.isReady = true;

    gm.handleSitIn('sock-1');

    expect(player.status).toBe('waiting');
    expect(player.isReady).toBe(true);
  });

  it('handleSitIn does nothing for unknown socket', () => {
    expect(() => gm.handleSitIn('unknown')).not.toThrow();
  });

  it('handleSitOut followed by handleSitIn round-trips correctly', () => {
    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 100);

    const player = getPlayer(gm, 'sock-1');
    expect(player.status).toBe('waiting');
    expect(player.isReady).toBe(true);

    gm.handleSitOut('sock-1');
    expect(player.status).toBe('sitting_out');
    expect(player.isReady).toBe(false);

    gm.handleSitIn('sock-1');
    expect(player.status).toBe('waiting');
    expect(player.isReady).toBe(true);
  });

  it('handleSitIn emits updated private state with status waiting', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock1, 'Alice', 100);
    gm.addPlayer(sock2, 'Bob', 100);
    gm.handleSitIn('sock-2');

    // Start a hand so phase is hand_in_progress
    gm.checkStartGame();
    vi.advanceTimersByTime(10000);
    expect((gm as any).phase).toBe('hand_in_progress');

    // Add a third player who joins mid-hand (sitting_out by default)
    const sock3 = createMockSocket('sock-3');
    gm.addPlayer(sock3, 'Charlie', 100);
    sock3.emit.mockClear();

    // Sit in during hand — should emit PRIVATE_STATE with status 'waiting'
    gm.handleSitIn('sock-3');
    const privateStateCall = sock3.emit.mock.calls.find(
      (c: any[]) => c[0] === 'player:private_state'
    );
    expect(privateStateCall).toBeDefined();
    expect(privateStateCall![1].status).toBe('waiting');
  });

  it('handleSitOut emits private state with status sitting_out so client shows Sit In and Leave Table buttons', () => {
    const sock1 = createMockSocket('sock-1');
    gm.addPlayer(sock1, 'Alice', 100);
    sock1.emit.mockClear();

    // Player presses Sit Out between hands
    gm.handleSitOut('sock-1');

    // Server must emit PRIVATE_STATE with status 'sitting_out'
    // Without this, the client never learns the status changed and buttons are broken
    const privateStateCall = sock1.emit.mock.calls.find(
      (c: any[]) => c[0] === 'player:private_state'
    );
    expect(privateStateCall).toBeDefined();
    expect(privateStateCall![1].status).toBe('sitting_out');
  });

  it('handleSitOut during hand emits private state with sitting_out status', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock1, 'Alice', 100);
    gm.addPlayer(sock2, 'Bob', 100);
    gm.handleSitIn('sock-2');

    // Start a hand
    gm.checkStartGame();
    vi.advanceTimersByTime(10000);
    expect((gm as any).phase).toBe('hand_in_progress');

    // Add a third player who joins mid-hand (sitting_out by default)
    const sock3 = createMockSocket('sock-3');
    gm.addPlayer(sock3, 'Charlie', 100);
    gm.handleSitIn('sock-3');
    sock3.emit.mockClear();

    // Player presses Sit Out during a hand they're not in
    gm.handleSitOut('sock-3');

    // Must emit private state with sitting_out
    const privateStateCall = sock3.emit.mock.calls.find(
      (c: any[]) => c[0] === 'player:private_state'
    );
    expect(privateStateCall).toBeDefined();
    expect(privateStateCall![1].status).toBe('sitting_out');
  });

  it('player who sits back in is eligible for next hand', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    gm.addPlayer(sock1, 'Alice', 100);
    gm.addPlayer(sock2, 'Bob', 100);

    // Bob joins as sitting_out by default (second player), sit him in
    gm.handleSitIn('sock-2');

    // Alice sits out
    gm.handleSitOut('sock-1');
    const alice = getPlayer(gm, 'sock-1');
    expect(alice.isReady).toBe(false);

    // Alice sits back in
    gm.handleSitIn('sock-1');
    expect(alice.isReady).toBe(true);
    expect(alice.status).toBe('waiting');

    // checkStartGame should start a hand since both players are ready
    gm.checkStartGame();
    expect((gm as any).phase).toBe('hand_in_progress');
  });
});
