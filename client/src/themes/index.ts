import type { ThemeConfig, ThemeId } from './types.js';
import { basicTheme } from './basic.js';
import { cccpTheme } from './cccp.js';

export type { ThemeConfig, ThemeId } from './types.js';

const themes: Record<ThemeId, ThemeConfig> = {
  basic: basicTheme,
  cccp: cccpTheme,
};

export const THEME_IDS = Object.keys(themes) as ThemeId[];

export function getTheme(id: ThemeId): ThemeConfig {
  return themes[id];
}

export const DEFAULT_THEME: ThemeId = 'cccp';
