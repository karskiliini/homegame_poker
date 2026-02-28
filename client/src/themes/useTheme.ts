import { useGameStore } from '../hooks/useGameStore.js';
import { getTheme } from './index.js';
import type { ThemeConfig } from './types.js';

export function useTheme(): ThemeConfig {
  const themeId = useGameStore(s => s.theme);
  return getTheme(themeId);
}
