import type { ReactNode } from 'react';
import type { Suit, ChipDenomination } from '@poker/shared';

export type ThemeId = 'basic' | 'cccp';

/** All --ftp-* CSS custom properties that ThemeApplier writes to :root */
export interface ThemeCSSVars {
  // Brand
  red: string;
  redLight: string;
  redDark: string;

  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;

  // Table
  feltGreen: string;
  feltGreenDark: string;
  feltGreenLight: string;
  tableRail: string;
  tableRailLight: string;
  tableBorder: string;

  // Accents
  gold: string;
  goldLight: string;
  goldDark: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Player panel
  panelBg: string;
  panelActive: string;
  panelBorder: string;
  panelActiveBorder: string;
  panelText: string;
  panelTextSecondary: string;
  panelTextActive: string;

  // Action buttons
  btnFold: string;
  btnFoldDark: string;
  btnFoldShadow: string;
  btnCheck: string;
  btnCheckDark: string;
  btnCheckShadow: string;
  btnCall: string;
  btnCallDark: string;
  btnCallShadow: string;
  btnRaise: string;
  btnRaiseDark: string;
  btnRaiseShadow: string;

  // Cards
  cardBg: string;
  cardBack: string;
  cardBorder: string;
  suitSpade: string;
  suitHeart: string;
  suitDiamond: string;
  suitClub: string;

  // Timer
  timerSafe: string;
  timerWarning: string;
  timerCritical: string;

  // Typography
  fontPrimary: string;

  // Chips
  chipWhite: string;
  chipRed: string;
  chipGreen: string;
  chipBlack: string;
  chipBlue: string;

  // Lobby
  bgLobby: string;
  bgLobbyDark: string;
  lobbyHeaderBg: string;
  lobbyRowEven: string;
  lobbyRowOdd: string;
  lobbyRowSelected: string;
  lobbyText: string;
  lobbyBorder: string;

  // Animation timings
  animCardDeal: string;
  animCardDealStagger: string;
  animCardFlip: string;
  animChipBet: string;
  animChipWin: string;
  animFlopStagger: string;
  animWinnerGlow: string;
  animWinnerFlash: string;
  animRiverPeel: string;
  animSeatJoin: string;
  animSeatLeave: string;
  animAllinPulse: string;
  animBtnHover: string;
  animBtnClick: string;

  // Easing
  easeDeal: string;
  easeChipBet: string;
  easeChipWin: string;
  easeOvershoot: string;
}

/** JS-level suit colors (can't be pure CSS vars since keyed by suit char) */
export type ThemeSuitColors = Record<Suit, string>;

/** JS-level chip colors with surface/edge/stripe/edgeDark */
export interface ChipColorSet {
  surface: string;
  edge: string;
  stripe: string;
  edgeDark: string;
}
export type ThemeChipColors = Record<ChipDenomination, ChipColorSet>;

/** Gradient strings used inline in component styles */
export interface ThemeGradients {
  // Backgrounds
  tvBackground: string;
  loginBackground: string;
  phoneBackground: string;
  phoneRadialBackground: string;

  // Table
  tableRail: string;
  tableRailHighlight: string;
  tableRailEdge: string;
  tableFelt: string;

  // Cards
  cardBack: string;
  cardBackPattern: string;

  // Player seat
  namePlate: string;
  namePlateActive: string;
  dealerButton: string;
  sbButton: string;
  bbButton: string;

  // Badges
  badgeAllIn: string;
  badgeBusted: string;
  badgeAway: string;

  // Empty seat
  emptySeatHover: string;
  emptySeatDefault: string;

  // Action buttons
  sliderTrack: string;
  sliderThumb: string;
}

/** Sound synthesis parameters per sound type */
export interface SoundParams {
  cardDeal: { duration: number; filterFreq: number; filterQ: number; gain: number };
  cardFlip: {
    snapDuration: number; snapFilterFreq: number; snapGain: number;
    thudFreqStart: number; thudFreqEnd: number; thudDuration: number; thudGain: number;
  };
  chipBet: { freqs: number[]; freqGap: number; freqDuration: number; freqGain: number; bodyFreq: number; bodyGain: number };
  chipWin: { notes: number[]; noteGap: number; noteDuration: number; noteGain: number; overtoneMultiplier: number; overtoneGain: number };
  check: { freqStart: number; freqEnd: number; duration: number; gain: number; bodyFreq: number; bodyGain: number };
  fold: { duration: number; filterStart: number; filterEnd: number; gain: number };
  allIn: {
    sweepFreqStart: number; sweepFreqEnd: number; sweepDuration: number; sweepGain: number;
    impactFreqStart: number; impactFreqEnd: number; impactDuration: number; impactGain: number;
  };
  timerWarning: { freq: number; tickDuration: number; tickGap: number; gain: number };
  yourTurn: { notes: number[]; noteGap: number; noteDuration: number; gain: number };
}

/** Theme asset paths */
export interface ThemeAssets {
  /** Base path for avatar images, e.g. '/themes/basic/avatars' */
  avatarBasePath: string;
  /** Number of avatar images available in this theme */
  avatarCount: number;
}

/** Complete theme configuration */
export interface ThemeConfig {
  id: ThemeId;
  name: string;
  cssVars: ThemeCSSVars;
  suitColors: ThemeSuitColors;
  chipColors: ThemeChipColors;
  gradients: ThemeGradients;
  soundParams: SoundParams;
  assets: ThemeAssets;
  watermark: ReactNode;
}
