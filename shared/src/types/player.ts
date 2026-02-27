import type { CardString } from './card.js';
import type { ActionType } from './hand.js';

export type PlayerStatus =
  | 'sitting_out'
  | 'waiting'
  | 'active'
  | 'folded'
  | 'all_in'
  | 'busted';

export interface Player {
  id: string;
  name: string;
  seatIndex: number;
  stack: number;
  status: PlayerStatus;
  isConnected: boolean;
  isReady: boolean;
  runItTwicePreference: 'ask' | 'always_no';
  autoMuck: boolean;
}

export interface PublicPlayerState {
  id: string;
  name: string;
  seatIndex: number;
  stack: number;
  status: PlayerStatus;
  isConnected: boolean;
  currentBet: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isCurrentActor: boolean;
  holeCards: CardString[] | null;
  hasCards: boolean;
}

export interface PrivatePlayerState {
  id: string;
  name: string;
  seatIndex: number;
  stack: number;
  status: PlayerStatus;
  holeCards: CardString[];
  currentBet: number;
  availableActions: ActionType[];
  minRaise: number;
  maxRaise: number;
  callAmount: number;
  potTotal: number;
  isMyTurn: boolean;
  showCardsOption: boolean;
  runItTwiceOffer: boolean;
  runItTwiceDeadline: number;
}
