export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const DEFAULT_ACTION_TIME_SECONDS = 30;
export const HAND_COMPLETE_PAUSE_MS = 5000;
export const RIT_TIMEOUT_MS = 10000;
export const SHOW_CARDS_TIMEOUT_MS = 10000;
export const REBUY_PROMPT_MS = 5000;
export const MAX_HAND_HISTORY = 100;

// Animation timing delays (server-side event pacing)
export const DELAY_AFTER_CARDS_DEALT_MS = 2000;
export const DELAY_AFTER_STREET_DEALT_MS = 1500;
export const DELAY_AFTER_PLAYER_ACTED_MS = 800;
export const DELAY_SHOWDOWN_TO_RESULT_MS = 3000;
export const DELAY_POT_AWARD_MS = 1500;

// Game start countdown (after min players ready)
export const START_COUNTDOWN_MS = 5000;

// All-in showdown timing
export const DELAY_AFTER_ALLIN_SHOWDOWN_MS = 2000;
export const DELAY_ALLIN_RUNOUT_STREET_MS = 2500; // Between streets during all-in runout (longer so players can see equity %)
export const DELAY_DRAMATIC_RIVER_MS = 3500;
export const DELAY_BAD_BEAT_TO_RESULT_MS = 3000; // Extra pause after bad beat animation before pot award
export const DELAY_BETWEEN_POT_AWARDS_MS = 2000; // Pause between sequential side pot awards

// Disconnect timeout: remove player from table after this duration
export const DISCONNECT_TIMEOUT_MS = 30_000;

// Chip trick animation
export const CHIP_TRICK_COOLDOWN_MS = 3000;
export const CHIP_TRICK_MIN_STACK = 100;
export const CHIP_TRICK_DURATION_MS = 2500;
export type ChipTrickType = 'riffle' | 'thumb_flip' | 'twirl' | 'knuckle_roll';
export const CHIP_TRICK_TYPES: ChipTrickType[] = ['riffle', 'thumb_flip', 'twirl', 'knuckle_roll'];
