import type { CardString } from './card.js';
import type { GameType } from './game.js';
import type { Street, PlayerAction } from './hand.js';

export interface HandRecord {
  handId: string;
  handNumber: number;
  gameType: GameType;
  timestamp: number;
  blinds: { small: number; big: number };
  players: HandRecordPlayer[];
  streets: HandRecordStreet[];
  pots: HandRecordPot[];
  communityCards: CardString[];
  secondBoard?: CardString[];
  summary: HandRecordSummary;
}

export interface HandRecordPlayer {
  playerId: string;
  name: string;
  seatIndex: number;
  startingStack: number;
  holeCards?: CardString[];
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  shownAtShowdown: boolean;
}

export interface HandRecordStreet {
  street: Street;
  boardCards: CardString[];
  actions: PlayerAction[];
}

export interface HandRecordPot {
  name: string;
  amount: number;
  winners: { playerId: string; playerName: string; amount: number }[];
  winningHand?: string;
}

export interface HandRecordSummary {
  results: { playerId: string; playerName: string; netChips: number }[];
}
