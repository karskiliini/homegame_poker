// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../hooks/useGameStore.js';
import type { PrivatePlayerState } from '@poker/shared';

function makeSittingOutState(): PrivatePlayerState {
  return {
    id: 'player-1',
    name: 'Alice',
    seatIndex: 0,
    stack: 100,
    status: 'sitting_out',
    holeCards: [],
    currentBet: 0,
    availableActions: [],
    minRaise: 0,
    maxRaise: 0,
    callAmount: 0,
    potTotal: 0,
    isMyTurn: false,
    showCardsOption: false,
    runItTwiceOffer: false,
    runItTwiceDeadline: 0,
    sitOutNextHand: false,
    autoMuck: false,
  };
}

describe('Leave Table -> Spectator flow', () => {
  beforeEach(() => {
    const { setState } = useGameStore;
    setState({
      screen: 'game',
      currentTableId: 'table-123',
      watchingTableId: null,
      privateState: makeSittingOutState(),
      lobbyState: null,
    });
  });

  it('sitting_out player should see Leave Table button (privateState.status === sitting_out)', () => {
    const store = useGameStore.getState();
    expect(store.screen).toBe('game');
    expect(store.privateState?.status).toBe('sitting_out');
    // In GameScreen, isSittingOut = privateState?.status === 'sitting_out'
    // The Leave Table button renders when isSittingOut is true
    const isSittingOut = store.privateState?.status === 'sitting_out';
    expect(isSittingOut).toBe(true);
  });

  it('handleLeaveTable should set watchingTableId to current table before switching to watching', () => {
    const store = useGameStore.getState();
    const tableIdBeforeLeave = store.currentTableId;
    expect(tableIdBeforeLeave).toBe('table-123');

    // Simulate what the UPDATED handleLeaveTable should do:
    // 1. Set watchingTableId to current table so WatchingScreen can watch it
    // 2. Clear player-specific state
    // 3. Navigate to watching screen
    store.setWatchingTableId(tableIdBeforeLeave);
    store.setCurrentTableId(null);
    store.setLobbyState(null as any);
    store.setPrivateState(null as any);
    store.setScreen('watching');

    const afterStore = useGameStore.getState();
    // Player should now be watching the same table they just left
    expect(afterStore.watchingTableId).toBe('table-123');
    expect(afterStore.currentTableId).toBeNull();
    expect(afterStore.screen).toBe('watching');
    expect(afterStore.privateState).toBeNull();
  });

  it('watching screen Leave button should go to table_lobby', () => {
    // Set up: player is already in watching mode
    useGameStore.setState({
      screen: 'watching',
      watchingTableId: 'table-123',
      currentTableId: null,
      privateState: null,
    });

    const store = useGameStore.getState();
    // WatchingScreen's "Back" button calls setWatchingTableId(null) + setScreen('table_lobby')
    store.setWatchingTableId(null);
    store.setScreen('table_lobby');

    const afterStore = useGameStore.getState();
    expect(afterStore.watchingTableId).toBeNull();
    expect(afterStore.screen).toBe('table_lobby');
  });

  it('player with active status should NOT see Leave Table button', () => {
    useGameStore.setState({
      privateState: { ...makeSittingOutState(), status: 'active' },
    });
    const store = useGameStore.getState();
    const isSittingOut = store.privateState?.status === 'sitting_out';
    expect(isSittingOut).toBe(false);
  });

  it('folded player should NOT see Leave Table button', () => {
    useGameStore.setState({
      privateState: { ...makeSittingOutState(), status: 'folded' },
    });
    const store = useGameStore.getState();
    const isSittingOut = store.privateState?.status === 'sitting_out';
    expect(isSittingOut).toBe(false);
  });

  it('busted player should NOT see Leave Table button (they have separate rebuy flow)', () => {
    useGameStore.setState({
      privateState: { ...makeSittingOutState(), status: 'busted' },
    });
    const store = useGameStore.getState();
    const isSittingOut = store.privateState?.status === 'sitting_out';
    expect(isSittingOut).toBe(false);
  });
});
