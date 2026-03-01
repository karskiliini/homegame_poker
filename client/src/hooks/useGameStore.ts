import { create } from 'zustand';
import type { GameState, PrivatePlayerState, TableInfo, StakeLevel, ChatMessage } from '@poker/shared';
import type { Language } from '../i18n/translations.js';
import { detectLanguage } from '../i18n/translations.js';
import type { ThemeId } from '../themes/types.js';
import { DEFAULT_THEME } from '../themes/index.js';

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
  serverVersion: string | null;
  setServerVersion: (version: string) => void;

  // Stake levels (from server)
  stakeLevels: StakeLevel[];
  setStakeLevels: (levels: StakeLevel[]) => void;

  // Player identity
  playerId: string | null;
  setPlayerId: (id: string) => void;
  playerName: string | null;
  setPlayerName: (name: string) => void;
  playerAvatar: string;
  setPlayerAvatar: (avatar: string) => void;

  // Auth
  authState: 'idle' | 'checking' | 'needs_password' | 'needs_register' | 'authenticated';
  setAuthState: (state: 'idle' | 'checking' | 'needs_password' | 'needs_register' | 'authenticated') => void;
  authError: string | null;
  setAuthError: (error: string | null) => void;
  accountBalance: number;
  setAccountBalance: (balance: number) => void;
  persistentPlayerId: string | null;
  setPersistentPlayerId: (id: string | null) => void;

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
  reconnecting: boolean;
  setReconnecting: (reconnecting: boolean) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Theme
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  isConnected: false,
  setConnected: (isConnected) => set({ isConnected }),
  serverVersion: null,
  setServerVersion: (serverVersion) => set({ serverVersion }),

  stakeLevels: [],
  setStakeLevels: (stakeLevels) => set({ stakeLevels }),

  playerId: null,
  setPlayerId: (playerId) => set({ playerId }),
  playerName: null,
  setPlayerName: (playerName) => set({ playerName }),
  playerAvatar: '1',
  setPlayerAvatar: (playerAvatar) => set({ playerAvatar }),

  authState: 'idle',
  setAuthState: (authState) => set({ authState }),
  authError: null,
  setAuthError: (authError) => set({ authError }),
  accountBalance: 0,
  setAccountBalance: (accountBalance) => set({ accountBalance }),
  persistentPlayerId: null,
  setPersistentPlayerId: (persistentPlayerId) => set({ persistentPlayerId }),

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
  reconnecting: false,
  setReconnecting: (reconnecting) => set({ reconnecting }),

  chatMessages: [],
  addChatMessage: (msg) => set((state) => ({
    chatMessages: [...state.chatMessages.slice(-49), msg],
  })),
  clearChat: () => set({ chatMessages: [] }),

  language: detectLanguage(),
  setLanguage: (language) => {
    localStorage.setItem('ftp-language', language);
    set({ language });
  },

  theme: (localStorage.getItem('ftp-theme') as ThemeId) || DEFAULT_THEME,
  setTheme: (theme) => {
    localStorage.setItem('ftp-theme', theme);
    set({ theme });
  },
}));
