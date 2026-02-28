import type { GameType } from './game.js';
import { DEFAULT_ACTION_TIME_SECONDS, MIN_PLAYERS, MAX_PLAYERS } from '../constants.js';

export interface StakeLevel {
  id: string;
  gameType: GameType;
  smallBlind: number;
  bigBlind: number;
  maxBuyIn: number;
  label: string;
}

export const STAKE_LEVELS: StakeLevel[] = [
  { id: 'nlhe-010-020', gameType: 'NLHE', smallBlind: 0.10, bigBlind: 0.20, maxBuyIn: 20, label: '0.10/0.20' },
  { id: 'nlhe-025-050', gameType: 'NLHE', smallBlind: 0.25, bigBlind: 0.50, maxBuyIn: 50, label: '0.25/0.50' },
  { id: 'nlhe-050-1', gameType: 'NLHE', smallBlind: 0.50, bigBlind: 1, maxBuyIn: 100, label: '0.50/1' },
  { id: 'nlhe-1-2', gameType: 'NLHE', smallBlind: 1, bigBlind: 2, maxBuyIn: 200, label: '1/2' },
  { id: 'nlhe-2-5', gameType: 'NLHE', smallBlind: 2, bigBlind: 5, maxBuyIn: 500, label: '2/5' },
  { id: 'nlhe-5-10', gameType: 'NLHE', smallBlind: 5, bigBlind: 10, maxBuyIn: 1000, label: '5/10' },
  { id: 'nlhe-10-20', gameType: 'NLHE', smallBlind: 10, bigBlind: 20, maxBuyIn: 2000, label: '10/20' },
  { id: 'plo-010-020', gameType: 'PLO', smallBlind: 0.10, bigBlind: 0.20, maxBuyIn: 20, label: '0.10/0.20' },
  { id: 'plo-025-050', gameType: 'PLO', smallBlind: 0.25, bigBlind: 0.50, maxBuyIn: 50, label: '0.25/0.50' },
  { id: 'plo-050-1', gameType: 'PLO', smallBlind: 0.50, bigBlind: 1, maxBuyIn: 100, label: '0.50/1' },
  { id: 'plo-1-2', gameType: 'PLO', smallBlind: 1, bigBlind: 2, maxBuyIn: 200, label: '1/2' },
  { id: 'plo-2-5', gameType: 'PLO', smallBlind: 2, bigBlind: 5, maxBuyIn: 500, label: '2/5' },
  { id: 'plo-5-10', gameType: 'PLO', smallBlind: 5, bigBlind: 10, maxBuyIn: 1000, label: '5/10' },
  { id: 'plo-10-20', gameType: 'PLO', smallBlind: 10, bigBlind: 20, maxBuyIn: 2000, label: '10/20' },
];

export interface TablePlayerInfo {
  name: string;
  stack: number;
  seatIndex: number;
  avatarId: string;
}

export interface TableInfo {
  tableId: string;
  name: string;
  stakeLevel: StakeLevel;
  playerCount: number;
  maxPlayers: number;
  players: TablePlayerInfo[];
  phase: string;
}

export function getStakeLevelById(id: string): StakeLevel | undefined {
  return STAKE_LEVELS.find(s => s.id === id);
}

export function stakeLevelToGameConfig(stakeLevel: StakeLevel) {
  return {
    gameType: stakeLevel.gameType,
    smallBlind: stakeLevel.smallBlind,
    bigBlind: stakeLevel.bigBlind,
    maxBuyIn: stakeLevel.maxBuyIn,
    actionTimeSeconds: DEFAULT_ACTION_TIME_SECONDS,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  };
}
