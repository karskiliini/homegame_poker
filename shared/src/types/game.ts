import type { CardString } from './card.js';
import type { Street } from './hand.js';
import type { PublicPlayerState } from './player.js';

export type GameType = 'NLHE' | 'PLO';

export interface GameConfig {
  gameType: GameType;
  smallBlind: number;
  bigBlind: number;
  maxBuyIn: number;
  actionTimeSeconds: number;
  minPlayers: number;
  maxPlayers: number;
}

export type GamePhase =
  | 'waiting_for_players'
  | 'hand_in_progress'
  | 'hand_complete'
  | 'paused';

export interface PotDisplay {
  amount: number;
  eligible: string[];
}

export interface GameState {
  phase: GamePhase;
  config: GameConfig;
  handNumber: number;
  players: PublicPlayerState[];
  communityCards: CardString[];
  secondBoard?: CardString[];
  pots: PotDisplay[];
  currentStreet: Street | null;
  dealerSeatIndex: number;
  currentActorSeatIndex: number | null;
  actionTimeRemaining: number;
}
