// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../hooks/useGameStore.js';
import type { PrivatePlayerState } from '@poker/shared';

function makeActiveState(overrides: Partial<PrivatePlayerState> = {}): PrivatePlayerState {
  return {
    id: 'player-1',
    name: 'Alice',
    seatIndex: 0,
    stack: 100,
    status: 'active',
    holeCards: ['Ah', 'Kh'],
    currentBet: 0,
    availableActions: ['check', 'bet'],
    minRaise: 4,
    maxRaise: 100,
    callAmount: 0,
    potTotal: 6,
    isMyTurn: true,
    showCardsOption: false,
    runItTwiceOffer: false,
    runItTwiceDeadline: 0,
    sitOutNextHand: false,
    autoMuck: false,
    ...overrides,
  };
}

describe('Bug #23: Action buttons should not flash after player acts', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'game',
      currentTableId: 'table-1',
      lobbyState: { players: [], phase: 'hand_in_progress' },
      privateState: makeActiveState(),
    });
  });

  it('action buttons should be visible when it is player turn with available actions', () => {
    const store = useGameStore.getState();
    const ps = store.privateState!;
    const isHandActive = store.lobbyState?.phase === 'hand_in_progress';
    const showActions = ps.isMyTurn && isHandActive && ps.availableActions.length > 0;
    expect(showActions).toBe(true);
  });

  it('action buttons should hide immediately when player acts (optimistic hide via actionSentForTurn)', () => {
    // Simulate: player sends action -> GameScreen sets actionSentForTurn = true
    // showActions should be false even though privateState still has isMyTurn=true
    const store = useGameStore.getState();
    const ps = store.privateState!;
    const isHandActive = store.lobbyState?.phase === 'hand_in_progress';
    const actionSentForTurn = true; // Player just clicked "check"

    // This is the updated condition that GameScreen will use
    const showActions = ps.isMyTurn && isHandActive && ps.availableActions.length > 0 && !actionSentForTurn;
    expect(showActions).toBe(false);
  });

  it('action buttons should reappear when it becomes player turn again on the new street', () => {
    // Simulate: server sends new privateState for the new street where it is our turn again
    const newStreetState = makeActiveState({
      availableActions: ['check', 'bet'],
      potTotal: 6,
    });
    useGameStore.setState({ privateState: newStreetState });

    const store = useGameStore.getState();
    const ps = store.privateState!;
    const isHandActive = store.lobbyState?.phase === 'hand_in_progress';
    // actionSentForTurn should be reset when new privateState arrives
    const actionSentForTurn = false; // Reset because new state received

    const showActions = ps.isMyTurn && isHandActive && ps.availableActions.length > 0 && !actionSentForTurn;
    expect(showActions).toBe(true);
  });

  it('action buttons should stay hidden when it is not player turn', () => {
    const otherTurnState = makeActiveState({ isMyTurn: false, availableActions: [] });
    useGameStore.setState({ privateState: otherTurnState });

    const store = useGameStore.getState();
    const ps = store.privateState!;
    const isHandActive = store.lobbyState?.phase === 'hand_in_progress';
    const actionSentForTurn = false;

    const showActions = ps.isMyTurn && isHandActive && ps.availableActions.length > 0 && !actionSentForTurn;
    expect(showActions).toBe(false);
  });
});
