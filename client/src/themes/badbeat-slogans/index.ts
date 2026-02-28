import { basicSlogans } from './basic.js';
import { cccpSlogans } from './cccp.js';
import type { ThemeId } from '../types.js';

const slogans: Record<ThemeId, string[]> = {
  basic: basicSlogans,
  cccp: cccpSlogans,
  midnight: basicSlogans,
  vegas: basicSlogans,
  arctic: basicSlogans,
  lava: basicSlogans,
};

export function getBadBeatSlogan(themeId: ThemeId): string {
  const list = slogans[themeId];
  return list[Math.floor(Math.random() * list.length)];
}
