import { create } from 'zustand';
import type { GameState, GameConfig, PrivatePlayerState } from '@poker/shared';

interface LobbyPlayer {
  id: string;
  name: string;
  seatIndex: number;
  stack: number;
  isReady: boolean;
  isConnected: boolean;
}

interface LobbyState {
  players: LobbyPlayer[];
  readyCount: number;
  neededCount: number;
  phase: string;
}

interface GameStore {
  // Connection
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Config
  config: GameConfig | null;
  setConfig: (config: GameConfig) => void;

  // Player identity
  playerId: string | null;
  setPlayerId: (id: string) => void;
  playerName: string | null;
  setPlayerName: (name: string) => void;

  // Lobby state
  lobbyState: LobbyState | null;
  setLobbyState: (state: LobbyState) => void;

  // Table view state
  gameState: GameState | null;
  setGameState: (state: GameState) => void;

  // Player view state
  privateState: PrivatePlayerState | null;
  setPrivateState: (state: PrivatePlayerState) => void;

  // UI state
  screen: 'login' | 'lobby' | 'game' | 'busted';
  setScreen: (screen: 'login' | 'lobby' | 'game' | 'busted') => void;

  // Busted state (pre-fill)
  previousName: string;
  previousBuyIn: number;
  setPreviousInfo: (name: string, buyIn: number) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  isConnected: false,
  setConnected: (isConnected) => set({ isConnected }),

  config: null,
  setConfig: (config) => set({ config }),

  playerId: null,
  setPlayerId: (playerId) => set({ playerId }),
  playerName: null,
  setPlayerName: (playerName) => set({ playerName }),

  lobbyState: null,
  setLobbyState: (lobbyState) => set({ lobbyState }),

  gameState: null,
  setGameState: (gameState) => set({ gameState }),

  privateState: null,
  setPrivateState: (privateState) => set({ privateState }),

  screen: 'login',
  setScreen: (screen) => set({ screen }),

  previousName: '',
  previousBuyIn: 0,
  setPreviousInfo: (previousName, previousBuyIn) => set({ previousName, previousBuyIn }),
}));
