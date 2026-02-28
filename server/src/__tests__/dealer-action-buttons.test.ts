import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { GameConfig, PrivatePlayerState } from '@poker/shared';
import { S2C_PLAYER } from '@poker/shared';

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

function getPrivateStates(socket: any): PrivatePlayerState[] {
  return socket.emit.mock.calls
    .filter((call: any[]) => call[0] === S2C_PLAYER.PRIVATE_STATE)
    .map((call: any[]) => call[1] as PrivatePlayerState);
}

function getLatestPrivateState(socket: any): PrivatePlayerState | null {
  const states = getPrivateStates(socket);
  return states.length > 0 ? states[states.length - 1] : null;
}

// ============================================================================
// Tests
// ============================================================================

describe('Dealer action buttons', () => {
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

  function drainEventQueue() {
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(3100);
    }
  }

  it('after player_turn is processed, current actor gets isMyTurn=true with availableActions', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    const sock3 = createMockSocket('sock-3');
    const sockets: Record<string, any> = { 'sock-1': sock1, 'sock-2': sock2, 'sock-3': sock3 };

    gm.addPlayer(sock1, 'Alice', 200);
    gm.addPlayer(sock2, 'Bob', 200);
    gm.addPlayer(sock3, 'Charlie', 200);

    gm.setPlayerReady('sock-1');
    gm.setPlayerReady('sock-2');
    gm.setPlayerReady('sock-3');
    gm.checkStartGame();

    drainEventQueue();

    const handEngine = (gm as any).handEngine;
    const currentActorId = handEngine.getCurrentActorId();
    const actorSocketId = (gm as any).playerIdToSocketId.get(currentActorId);
    const actorSocket = sockets[actorSocketId];

    const state = getLatestPrivateState(actorSocket);
    expect(state).not.toBeNull();
    expect(state!.isMyTurn).toBe(true);
    expect(state!.availableActions.length).toBeGreaterThan(0);
  });

  it('every player gets isMyTurn=true when it becomes their turn during preflop', () => {
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    const sock3 = createMockSocket('sock-3');
    const sockets: Record<string, any> = { 'sock-1': sock1, 'sock-2': sock2, 'sock-3': sock3 };

    gm.addPlayer(sock1, 'Alice', 200);
    gm.addPlayer(sock2, 'Bob', 200);
    gm.addPlayer(sock3, 'Charlie', 200);

    gm.setPlayerReady('sock-1');
    gm.setPlayerReady('sock-2');
    gm.setPlayerReady('sock-3');
    gm.checkStartGame();

    const handEngine = (gm as any).handEngine;
    drainEventQueue();

    const actedPlayers: string[] = [];

    for (let turn = 0; turn < 3; turn++) {
      const currentActorId = handEngine.getCurrentActorId();
      if (!currentActorId || handEngine.isHandComplete()) break;

      const actorSocketId = (gm as any).playerIdToSocketId.get(currentActorId);
      const actorSocket = sockets[actorSocketId];

      const state = getLatestPrivateState(actorSocket);
      expect(state).not.toBeNull();
      expect(state!.isMyTurn).toBe(true);
      expect(state!.availableActions.length).toBeGreaterThan(0);

      for (const [sockId, sock] of Object.entries(sockets)) {
        if (sockId !== actorSocketId) {
          const otherState = getLatestPrivateState(sock);
          if (otherState) {
            expect(otherState.isMyTurn).toBe(false);
          }
        }
      }

      actedPlayers.push(currentActorId);

      const actions = state!.availableActions;
      if (actions.includes('check')) {
        gm.handlePlayerAction(actorSocketId, 'check');
      } else {
        gm.handlePlayerAction(actorSocketId, 'call');
      }

      drainEventQueue();
    }

    expect(actedPlayers.length).toBe(3);
  });

  it('sendPrivateStateToAll uses getCurrentTurnInfo for accurate availableActions on street transitions', () => {
    // After street_dealt, sendPrivateStateToAll should use getCurrentTurnInfo()
    // instead of stale lastTurnEvent from the previous street.
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');
    const sock3 = createMockSocket('sock-3');
    const sockets: Record<string, any> = { 'sock-1': sock1, 'sock-2': sock2, 'sock-3': sock3 };

    gm.addPlayer(sock1, 'Alice', 200);
    gm.addPlayer(sock2, 'Bob', 200);
    gm.addPlayer(sock3, 'Charlie', 200);

    gm.setPlayerReady('sock-1');
    gm.setPlayerReady('sock-2');
    gm.setPlayerReady('sock-3');
    gm.checkStartGame();

    const handEngine = (gm as any).handEngine;
    drainEventQueue();

    // Play through preflop: everyone calls/checks
    for (let i = 0; i < 3; i++) {
      const actorId = handEngine.getCurrentActorId();
      if (!actorId) break;
      const socketId = (gm as any).playerIdToSocketId.get(actorId);
      const actions = handEngine.getCurrentTurnInfo()?.availableActions ?? [];
      if (actions.includes('check')) {
        gm.handlePlayerAction(socketId, 'check');
      } else {
        gm.handlePlayerAction(socketId, 'call');
      }
      drainEventQueue();
    }

    // Now we should be on the flop
    expect(handEngine.getCurrentStreetName()).toBe('flop');

    // Verify the first postflop actor has correct state
    const flopActorId = handEngine.getCurrentActorId();
    expect(flopActorId).not.toBeNull();

    const flopActorSocketId = (gm as any).playerIdToSocketId.get(flopActorId);
    const flopActorSocket = sockets[flopActorSocketId];

    const state = getLatestPrivateState(flopActorSocket);
    expect(state).not.toBeNull();
    expect(state!.isMyTurn).toBe(true);
    expect(state!.availableActions.length).toBeGreaterThan(0);
    // Postflop with no bet: should have check and bet (not call/raise from preflop)
    expect(state!.availableActions).toContain('check');
    expect(state!.availableActions).toContain('bet');
    expect(state!.availableActions).not.toContain('call');
  });

  it('during cards_dealt, nobody has isMyTurn=true (hand not yet started action)', () => {
    // When cards are dealt, currentActorIndex is -1 in HandEngine,
    // so no player should have isMyTurn=true until player_turn event fires.
    const sock1 = createMockSocket('sock-1');
    const sock2 = createMockSocket('sock-2');

    gm.addPlayer(sock1, 'Alice', 200);
    gm.addPlayer(sock2, 'Bob', 200);

    gm.setPlayerReady('sock-1');
    gm.setPlayerReady('sock-2');
    gm.checkStartGame();

    // Don't advance timers — only cards_dealt has been processed, not player_turn
    // Get the first PRIVATE_STATE for each player
    const states1 = getPrivateStates(sock1);
    const states2 = getPrivateStates(sock2);

    expect(states1.length).toBeGreaterThan(0);
    expect(states2.length).toBeGreaterThan(0);

    // During cards_dealt, nobody should have isMyTurn=true
    expect(states1[0].isMyTurn).toBe(false);
    expect(states2[0].isMyTurn).toBe(false);

    // But they should have hole cards
    expect(states1[0].holeCards.length).toBe(2);
    expect(states2[0].holeCards.length).toBe(2);

    // Now advance to process player_turn — the correct actor should get isMyTurn=true
    drainEventQueue();

    const handEngine = (gm as any).handEngine;
    const currentActorId = handEngine.getCurrentActorId();
    const actorSocketId = (gm as any).playerIdToSocketId.get(currentActorId);
    const actorSocket = actorSocketId === 'sock-1' ? sock1 : sock2;

    const finalState = getLatestPrivateState(actorSocket);
    expect(finalState!.isMyTurn).toBe(true);
    expect(finalState!.availableActions.length).toBeGreaterThan(0);
  });
});
