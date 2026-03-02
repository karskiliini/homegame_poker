/** Runtime-mutable animation timing config. Defaults match constants.ts. */
const defaults = {
  DELAY_AFTER_CARDS_DEALT_MS: 2000,
  DELAY_AFTER_STREET_DEALT_MS: 1500,
  DELAY_AFTER_PLAYER_ACTED_MS: 800,
  DELAY_SHOWDOWN_TO_RESULT_MS: 3000,
  DELAY_POT_AWARD_MS: 1500,
  DELAY_SHOWDOWN_REVEAL_INTERVAL_MS: 500,
  DELAY_AFTER_ALLIN_SHOWDOWN_MS: 2000,
  DELAY_ALLIN_RUNOUT_STREET_MS: 2500,
  DELAY_DRAMATIC_RIVER_MS: 3500,
  DELAY_BAD_BEAT_TO_RESULT_MS: 3000,
  DELAY_BETWEEN_POT_AWARDS_MS: 2000,
} as const;

export type AnimationConfigKey = keyof typeof defaults;

const overrides: Partial<Record<AnimationConfigKey, number>> = {};

export function getAnimDelay(key: AnimationConfigKey): number {
  return overrides[key] ?? defaults[key];
}

export function setAnimDelays(updates: Partial<Record<AnimationConfigKey, number>>) {
  for (const [key, val] of Object.entries(updates)) {
    if (key in defaults && typeof val === 'number') {
      overrides[key as AnimationConfigKey] = val;
    }
  }
}

export function resetAnimDelays() {
  for (const key of Object.keys(overrides)) {
    delete overrides[key as AnimationConfigKey];
  }
}

export function getAnimConfig(): Record<AnimationConfigKey, number> {
  return { ...defaults, ...overrides };
}
