import { create } from 'zustand';
import type { GameState, PrivatePlayerState, TableInfo, StakeLevel } from '@poker/shared';
import type { AvatarId } from '@poker/shared';

interface LobbyPlayer {
  id: string;
  name: string;
  seatIndex: number;
  stack: number;
  isConnected: boolean;
}

interface LobbyState {
  players: LobbyPlayer[];
  phase: string;
  tableId?: string;
}

interface GameStore {
  // Connection
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Stake levels (from server)
  stakeLevels: StakeLevel[];
  setStakeLevels: (levels: StakeLevel[]) => void;

  // Player identity
  playerId: string | null;
  setPlayerId: (id: string) => void;
  playerName: string | null;
  setPlayerName: (name: string) => void;
  playerAvatar: AvatarId;
  setPlayerAvatar: (avatar: AvatarId) => void;

  // Table lobby
  tables: TableInfo[];
  setTables: (tables: TableInfo[]) => void;
  currentTableId: string | null;
  setCurrentTableId: (id: string | null) => void;

  // Per-table lobby state
  lobbyState: LobbyState | null;
  setLobbyState: (state: LobbyState) => void;

  // Table view state
  gameState: GameState | null;
  setGameState: (state: GameState) => void;

  // Player view state
  privateState: PrivatePlayerState | null;
  setPrivateState: (state: PrivatePlayerState) => void;

  // Watching state
  watchingTableId: string | null;
  setWatchingTableId: (id: string | null) => void;

  // UI state
  screen: 'login' | 'table_lobby' | 'watching' | 'lobby' | 'game';
  setScreen: (screen: 'login' | 'table_lobby' | 'watching' | 'lobby' | 'game') => void;
}

export const useGameStore = create<GameStore>((set) => ({
  isConnected: false,
  setConnected: (isConnected) => set({ isConnected }),

  stakeLevels: [],
  setStakeLevels: (stakeLevels) => set({ stakeLevels }),

  playerId: null,
  setPlayerId: (playerId) => set({ playerId }),
  playerName: null,
  setPlayerName: (playerName) => set({ playerName }),
  playerAvatar: 'ninja',
  setPlayerAvatar: (playerAvatar) => set({ playerAvatar }),

  tables: [],
  setTables: (tables) => set({ tables }),
  currentTableId: null,
  setCurrentTableId: (currentTableId) => set({ currentTableId }),

  lobbyState: null,
  setLobbyState: (lobbyState) => set({ lobbyState }),

  watchingTableId: null,
  setWatchingTableId: (watchingTableId) => set({ watchingTableId }),

  gameState: null,
  setGameState: (gameState) => set({ gameState }),

  privateState: null,
  setPrivateState: (privateState) => set({ privateState }),

  screen: 'login',
  setScreen: (screen) => set({ screen }),
}));
