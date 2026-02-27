import type { CardString } from './card.js';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';

export interface PlayerAction {
  playerId: string;
  playerName: string;
  action: ActionType;
  amount: number;
  isAllIn: boolean;
  timestamp: number;
}

export interface StreetState {
  street: Street;
  cards: CardString[];
  actions: PlayerAction[];
}

export interface HandPlayer {
  playerId: string;
  seatIndex: number;
  name: string;
  holeCards: CardString[];
  startingStack: number;
  currentStack: number;
  currentBet: number;
  totalInvested: number;
  isFolded: boolean;
  isAllIn: boolean;
  hasActed: boolean;
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
  winners?: string[];
  winAmount?: number;
}
