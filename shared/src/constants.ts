export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const DEFAULT_ACTION_TIME_SECONDS = 30;
export const HAND_COMPLETE_PAUSE_MS = 5000;
export const RIT_TIMEOUT_MS = 10000;
export const SHOW_CARDS_TIMEOUT_MS = 10000;
export const MAX_HAND_HISTORY = 100;

// Animation timing delays (server-side event pacing)
export const DELAY_AFTER_CARDS_DEALT_MS = 2000;
export const DELAY_AFTER_STREET_DEALT_MS = 1500;
export const DELAY_AFTER_PLAYER_ACTED_MS = 800;
export const DELAY_SHOWDOWN_TO_RESULT_MS = 3000;
export const DELAY_POT_AWARD_MS = 1500;

// Disconnect timeout: remove player from table after this duration
export const DISCONNECT_TIMEOUT_MS = 180_000;
