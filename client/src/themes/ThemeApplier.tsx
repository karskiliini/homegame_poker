import { useEffect } from 'react';
import { useGameStore } from '../hooks/useGameStore.js';
import { getTheme } from './index.js';
import type { ThemeCSSVars } from './types.js';
import { tableSoundManager, playerSoundManager } from '../audio/SoundManager.js';

/** Maps ThemeCSSVars keys to --ftp-* CSS custom property names */
const CSS_VAR_MAP: Record<keyof ThemeCSSVars, string> = {
  red: '--ftp-red',
  redLight: '--ftp-red-light',
  redDark: '--ftp-red-dark',
  bgPrimary: '--ftp-bg-primary',
  bgSecondary: '--ftp-bg-secondary',
  bgTertiary: '--ftp-bg-tertiary',
  feltGreen: '--ftp-felt-green',
  feltGreenDark: '--ftp-felt-green-dark',
  feltGreenLight: '--ftp-felt-green-light',
  tableRail: '--ftp-table-rail',
  tableRailLight: '--ftp-table-rail-light',
  tableBorder: '--ftp-table-border',
  gold: '--ftp-gold',
  goldLight: '--ftp-gold-light',
  goldDark: '--ftp-gold-dark',
  textPrimary: '--ftp-text-primary',
  textSecondary: '--ftp-text-secondary',
  textMuted: '--ftp-text-muted',
  panelBg: '--ftp-panel-bg',
  panelActive: '--ftp-panel-active',
  panelBorder: '--ftp-panel-border',
  panelActiveBorder: '--ftp-panel-active-border',
  panelText: '--ftp-panel-text',
  panelTextSecondary: '--ftp-panel-text-secondary',
  panelTextActive: '--ftp-panel-text-active',
  btnFold: '--ftp-btn-fold',
  btnFoldDark: '--ftp-btn-fold-dark',
  btnFoldShadow: '--ftp-btn-fold-shadow',
  btnCheck: '--ftp-btn-check',
  btnCheckDark: '--ftp-btn-check-dark',
  btnCheckShadow: '--ftp-btn-check-shadow',
  btnCall: '--ftp-btn-call',
  btnCallDark: '--ftp-btn-call-dark',
  btnCallShadow: '--ftp-btn-call-shadow',
  btnRaise: '--ftp-btn-raise',
  btnRaiseDark: '--ftp-btn-raise-dark',
  btnRaiseShadow: '--ftp-btn-raise-shadow',
  cardBg: '--ftp-card-bg',
  cardBack: '--ftp-card-back',
  cardBorder: '--ftp-card-border',
  suitSpade: '--ftp-suit-spade',
  suitHeart: '--ftp-suit-heart',
  suitDiamond: '--ftp-suit-diamond',
  suitClub: '--ftp-suit-club',
  timerSafe: '--ftp-timer-safe',
  timerWarning: '--ftp-timer-warning',
  timerCritical: '--ftp-timer-critical',
  fontPrimary: '--ftp-font-primary',
  chipWhite: '--ftp-chip-white',
  chipRed: '--ftp-chip-red',
  chipGreen: '--ftp-chip-green',
  chipBlack: '--ftp-chip-black',
  chipBlue: '--ftp-chip-blue',
  bgLobby: '--ftp-bg-lobby',
  bgLobbyDark: '--ftp-bg-lobby-dark',
  lobbyHeaderBg: '--ftp-lobby-header-bg',
  lobbyRowEven: '--ftp-lobby-row-even',
  lobbyRowOdd: '--ftp-lobby-row-odd',
  lobbyRowSelected: '--ftp-lobby-row-selected',
  lobbyText: '--ftp-lobby-text',
  lobbyBorder: '--ftp-lobby-border',
  animCardDeal: '--ftp-anim-card-deal',
  animCardDealStagger: '--ftp-anim-card-deal-stagger',
  animCardFlip: '--ftp-anim-card-flip',
  animChipBet: '--ftp-anim-chip-bet',
  animChipWin: '--ftp-anim-chip-win',
  animFlopStagger: '--ftp-anim-flop-stagger',
  animWinnerGlow: '--ftp-anim-winner-glow',
  animWinnerFlash: '--ftp-anim-winner-flash',
  animRiverPeel: '--ftp-anim-river-peel',
  animSeatJoin: '--ftp-anim-seat-join',
  animSeatLeave: '--ftp-anim-seat-leave',
  animAllinPulse: '--ftp-anim-allin-pulse',
  animBtnHover: '--ftp-anim-btn-hover',
  animBtnClick: '--ftp-anim-btn-click',
  easeDeal: '--ftp-ease-deal',
  easeChipBet: '--ftp-ease-chip-bet',
  easeChipWin: '--ftp-ease-chip-win',
  easeOvershoot: '--ftp-ease-overshoot',
};

export function ThemeApplier() {
  const themeId = useGameStore(s => s.theme);

  useEffect(() => {
    const theme = getTheme(themeId);
    const root = document.documentElement;

    // Apply all CSS custom properties
    for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
      root.style.setProperty(cssVar, theme.cssVars[key as keyof ThemeCSSVars]);
    }

    // Update sound managers
    tableSoundManager.setParams(theme.soundParams);
    playerSoundManager.setParams(theme.soundParams);
  }, [themeId]);

  return null;
}
