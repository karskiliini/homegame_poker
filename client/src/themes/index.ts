import type { ThemeConfig, ThemeId } from './types.js';
import { basicTheme } from './basic.js';
import { cccpTheme } from './cccp.js';
import { midnightTheme } from './midnight.js';
import { vegasTheme } from './vegas.js';
import { arcticTheme } from './arctic.js';
import { lavaTheme } from './lava.js';

export type { ThemeConfig, ThemeId } from './types.js';

const themes: Record<ThemeId, ThemeConfig> = {
  basic: basicTheme,
  cccp: cccpTheme,
  midnight: midnightTheme,
  vegas: vegasTheme,
  arctic: arcticTheme,
  lava: lavaTheme,
};

export const THEME_IDS = Object.keys(themes) as ThemeId[];

export function getTheme(id: ThemeId): ThemeConfig {
  return themes[id];
}

export const DEFAULT_THEME: ThemeId = 'cccp';
