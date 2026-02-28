import type { ThemeConfig } from './types.js';
import { basicTheme } from './basic.js';

export const cccpTheme: ThemeConfig = {
  ...basicTheme,
  id: 'cccp',
  name: 'CCCP',
  // Spread nested objects to ensure deep copy
  cssVars: { ...basicTheme.cssVars },
  suitColors: { ...basicTheme.suitColors },
  chipColors: {
    white: { ...basicTheme.chipColors.white },
    red: { ...basicTheme.chipColors.red },
    green: { ...basicTheme.chipColors.green },
    black: { ...basicTheme.chipColors.black },
    blue: { ...basicTheme.chipColors.blue },
  },
  gradients: { ...basicTheme.gradients },
  soundParams: {
    cardDeal: { ...basicTheme.soundParams.cardDeal },
    cardFlip: { ...basicTheme.soundParams.cardFlip },
    chipBet: { ...basicTheme.soundParams.chipBet },
    chipWin: { ...basicTheme.soundParams.chipWin },
    check: { ...basicTheme.soundParams.check },
    fold: { ...basicTheme.soundParams.fold },
    allIn: { ...basicTheme.soundParams.allIn },
    timerWarning: { ...basicTheme.soundParams.timerWarning },
    yourTurn: { ...basicTheme.soundParams.yourTurn },
  },
  assets: {
    avatarBasePath: '/themes/cccp/avatars',
    avatarCount: 54,
  },
};
