import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig } from '@poker/shared';
import { S2C_PLAYER, S2C_TABLE, RIT_TIMEOUT_MS } from '@poker/shared';

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
  const roomObj = { emit: emitFn };
  const namespaceObj = {
    emit: emitFn,
    to: vi.fn().mockReturnValue(roomObj),
  };
  return {
    of: vi.fn().mockReturnValue(namespaceObj),
    _emitFn: emitFn,
    _namespaceObj: namespaceObj,
  } as any;
}

function setupTwoPlayers() {
  const io = createMockIo();
  const gm = new GameManager(makeConfig(), io, 'test-table');
  const sock1 = createMockSocket('sock-1');
  const sock2 = createMockSocket('sock-2');
  gm.addPlayer(sock1, 'Alice', 200);
  gm.addPlayer(sock2, 'Bob', 200);

  const player1 = (gm as any).players.get('sock-1');
  const player2 = (gm as any).players.get('sock-2');
  player1.id = 'p1';
  player2.id = 'p2';

  (gm as any).playerIdToSocketId.set('p1', 'sock-1');
  (gm as any).playerIdToSocketId.set('p2', 'sock-2');
  (gm as any).phase = 'hand_in_progress';

  // Mock the handEngine so setRunItTwice can be tracked
  const setRunItTwice = vi.fn();
  (gm as any).handEngine = { setRunItTwice };

  return { gm, io, sock1, sock2, player1, player2, setRunItTwice };
}

function getRitOffers(socket: any) {
  return socket.emit.mock.calls.filter(
    (call: any[]) => call[0] === S2C_PLAYER.RIT_OFFER
  );
}

describe('Run It Twice preference — always_yes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('player with always_yes preference: RIT auto-accepted without prompt when both players have always_yes', () => {
    const { gm, sock1, sock2, player1, player2, setRunItTwice } = setupTwoPlayers();

    // Both players have always_yes preference
    player1.runItTwicePreference = 'always_yes';
    player2.runItTwicePreference = 'always_yes';

    // Trigger RIT offer
    (gm as any).handleRitOffer(['p1', 'p2']);

    // Neither player should receive an RIT_OFFER prompt
    expect(getRitOffers(sock1)).toHaveLength(0);
    expect(getRitOffers(sock2)).toHaveLength(0);

    // RIT should be auto-accepted (after the 1500ms delay)
    vi.advanceTimersByTime(1500);
    expect(setRunItTwice).toHaveBeenCalledWith(true);
  });

  it('player with always_no preference: RIT auto-declined without prompt', () => {
    const { gm, sock1, sock2, player1, player2, setRunItTwice } = setupTwoPlayers();

    // One player has always_no
    player1.runItTwicePreference = 'always_no';
    player2.runItTwicePreference = 'ask';

    // Trigger RIT offer
    (gm as any).handleRitOffer(['p1', 'p2']);

    // Neither player should receive an RIT_OFFER prompt (declined immediately)
    expect(getRitOffers(sock1)).toHaveLength(0);
    expect(getRitOffers(sock2)).toHaveLength(0);

    // RIT should be declined
    expect(setRunItTwice).toHaveBeenCalledWith(false);
  });

  it('mixed: one always_yes + one ask → only the "ask" player gets prompt', () => {
    const { gm, sock1, sock2, player1, player2, setRunItTwice } = setupTwoPlayers();

    player1.runItTwicePreference = 'always_yes';
    player2.runItTwicePreference = 'ask';

    (gm as any).handleRitOffer(['p1', 'p2']);

    // Player 1 (always_yes) should NOT receive prompt
    expect(getRitOffers(sock1)).toHaveLength(0);

    // Player 2 (ask) SHOULD receive prompt
    expect(getRitOffers(sock2)).toHaveLength(1);

    // Auto-accept is recorded for player 1
    expect((gm as any).ritResponses.get('p1')).toBe(true);

    // Player 2 responds yes → RIT accepted
    gm.handleRitResponse('sock-2', true, false);

    vi.advanceTimersByTime(1500);
    expect(setRunItTwice).toHaveBeenCalledWith(true);
  });

  it('mixed: one always_yes + one ask, ask player declines → RIT declined', () => {
    const { gm, sock1, sock2, player1, player2, setRunItTwice } = setupTwoPlayers();

    player1.runItTwicePreference = 'always_yes';
    player2.runItTwicePreference = 'ask';

    (gm as any).handleRitOffer(['p1', 'p2']);

    // Player 2 declines
    gm.handleRitResponse('sock-2', false, false);

    expect(setRunItTwice).toHaveBeenCalledWith(false);
  });

  it('handleRitResponse with alwaysYes=true saves always_yes preference', () => {
    const { gm, player2 } = setupTwoPlayers();

    // Default is 'ask'
    expect(player2.runItTwicePreference).toBe('ask');

    (gm as any).handleRitOffer(['p1', 'p2']);

    // Player 2 accepts with alwaysYes flag
    gm.handleRitResponse('sock-2', true, false, true);

    // Preference should be saved
    expect(player2.runItTwicePreference).toBe('always_yes');
  });

  it('handleRitResponse with alwaysNo=true saves always_no preference', () => {
    const { gm, player2 } = setupTwoPlayers();

    expect(player2.runItTwicePreference).toBe('ask');

    (gm as any).handleRitOffer(['p1', 'p2']);

    // Player 2 declines with alwaysNo flag
    gm.handleRitResponse('sock-2', false, true, false);

    expect(player2.runItTwicePreference).toBe('always_no');
  });

  it('always_no takes priority over always_yes: if any player has always_no, RIT is declined', () => {
    const { gm, sock1, sock2, player1, player2, setRunItTwice } = setupTwoPlayers();

    player1.runItTwicePreference = 'always_yes';
    player2.runItTwicePreference = 'always_no';

    (gm as any).handleRitOffer(['p1', 'p2']);

    // No prompts sent
    expect(getRitOffers(sock1)).toHaveLength(0);
    expect(getRitOffers(sock2)).toHaveLength(0);

    // RIT declined immediately
    expect(setRunItTwice).toHaveBeenCalledWith(false);
  });
});
