import type { GameState, PublicPlayerState, CardString, GameConfig } from '@poker/shared';

const DEFAULT_CONFIG: GameConfig = {
  gameType: 'NLHE',
  smallBlind: 1,
  bigBlind: 2,
  maxBuyIn: 200,
  actionTimeSeconds: 30,
  minPlayers: 2,
  maxPlayers: 10,
};

const NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
const AVATARS = ['ninja', 'cowgirl', 'robot', 'pirate', 'wizard', 'alien'];

/** Create a player at a given seat */
export function mockPlayer(overrides: Partial<PublicPlayerState> & { seatIndex: number }): PublicPlayerState {
  const i = overrides.seatIndex;
  return {
    id: `player-${i}`,
    name: NAMES[i % NAMES.length],
    seatIndex: i,
    stack: 200,
    status: 'active',
    isConnected: true,
    disconnectedAt: null,
    currentBet: 0,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    isCurrentActor: false,
    holeCards: null,
    hasCards: true,
    avatarId: AVATARS[i % AVATARS.length],
    ...overrides,
  };
}

/** Create a GameState snapshot */
export function mockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'hand_in_progress',
    config: DEFAULT_CONFIG,
    handNumber: 1,
    players: [
      mockPlayer({ seatIndex: 0, isDealer: true }),
      mockPlayer({ seatIndex: 2, isSmallBlind: true }),
      mockPlayer({ seatIndex: 4, isBigBlind: true }),
      mockPlayer({ seatIndex: 6 }),
    ],
    communityCards: [],
    pots: [{ amount: 0, eligible: ['player-0', 'player-2', 'player-4', 'player-6'] }],
    currentStreet: null,
    dealerSeatIndex: 0,
    currentActorSeatIndex: null,
    actionTimeRemaining: 30,
    ...overrides,
  };
}

// Sample hands for scenarios
export const HANDS = {
  royalFlush: ['As', 'Ks'] as CardString[],
  pocketAces: ['Ah', 'Ad'] as CardString[],
  pocketKings: ['Kh', 'Kd'] as CardString[],
  suitedConnectors: ['9h', '8h'] as CardString[],
  lowPair: ['5s', '5c'] as CardString[],
  strongHand: ['Qh', 'Jh'] as CardString[],
  mediumHand: ['Tc', '9c'] as CardString[],
  weakHand: ['7d', '2s'] as CardString[],
};

export const BOARDS = {
  flop: ['Qs', 'Js', 'Ts'] as CardString[],
  turn: 'Kc' as CardString,
  river: '2d' as CardString,
  royalFlop: ['Qs', 'Js', 'Ts'] as CardString[],
  royalTurn: '3c' as CardString,
  royalRiver: '2d' as CardString,
  dramaticFlop: ['Ah', 'Kc', '8d'] as CardString[],
  dramaticTurn: '5s' as CardString,
  dramaticRiver: 'Ad' as CardString,
};
