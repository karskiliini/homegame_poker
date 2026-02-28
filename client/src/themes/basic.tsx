import type { ThemeConfig } from './types.js';

const basicWatermark = (
  <span
    style={{
      color: 'rgba(255,255,255,0.03)',
      fontSize: 36,
      fontWeight: 800,
      letterSpacing: 12,
      textTransform: 'uppercase' as const,
      userSelect: 'none' as const,
    }}
  >
    POKER NIGHT
  </span>
);

export const basicTheme: ThemeConfig = {
  id: 'basic',
  name: 'Basic',

  cssVars: {
    // Brand
    red: '#C41E2A',
    redLight: '#E8323E',
    redDark: '#8B1520',

    // Backgrounds
    bgPrimary: '#1C1C1C',
    bgSecondary: '#2A2A2A',
    bgTertiary: '#383838',

    // Table
    feltGreen: '#3A9D56',
    feltGreenDark: '#267A3C',
    feltGreenLight: '#52B86E',
    tableRail: '#5C3A1E',
    tableRailLight: '#7A4F2B',
    tableBorder: '#2E1A0B',

    // Accents
    gold: '#C9A84C',
    goldLight: '#E0C56A',
    goldDark: '#A08030',

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textMuted: '#707070',

    // Player panel
    panelBg: 'linear-gradient(180deg, #F0F0F0, #D8D8D8, #C8C8C8)',
    panelActive: 'linear-gradient(180deg, #FFFDE7, #FFF9C4, #FFF176)',
    panelBorder: 'rgba(0, 0, 0, 0.25)',
    panelActiveBorder: 'rgba(234, 179, 8, 0.8)',
    panelText: '#1A1A1A',
    panelTextSecondary: '#555555',
    panelTextActive: '#8B6914',

    // Action buttons
    btnFold: '#DC2626',
    btnFoldDark: '#B91C1C',
    btnFoldShadow: '#7F1D1D',
    btnCheck: '#2563EB',
    btnCheckDark: '#1D4ED8',
    btnCheckShadow: '#1E3A8A',
    btnCall: '#16A34A',
    btnCallDark: '#15803D',
    btnCallShadow: '#14532D',
    btnRaise: '#D97706',
    btnRaiseDark: '#B45309',
    btnRaiseShadow: '#78350F',

    // Cards
    cardBg: '#F5F5F0',
    cardBack: '#C41E2A',
    cardBorder: '#CCCCCC',
    suitSpade: '#000000',
    suitHeart: '#CC0000',
    suitDiamond: '#0066CC',
    suitClub: '#008800',

    // Timer
    timerSafe: '#33CC66',
    timerWarning: '#E6A817',
    timerCritical: '#CC3333',

    // Typography
    fontPrimary: "'Helvetica Neue', 'Arial', sans-serif",

    // Chips
    chipWhite: '#E0E0E0',
    chipRed: '#CC2222',
    chipGreen: '#228B22',
    chipBlack: '#222222',
    chipBlue: '#2244AA',

    // Lobby
    bgLobby: '#1E3A5F',
    bgLobbyDark: '#0F1E33',
    lobbyHeaderBg: '#1E3A5F',
    lobbyRowEven: '#F0F4F8',
    lobbyRowOdd: '#D6E4F0',
    lobbyRowSelected: '#B8D4F0',
    lobbyText: '#1A1A2E',
    lobbyBorder: '#A0B8D0',

    // Animation timings
    animCardDeal: '350ms',
    animCardDealStagger: '120ms',
    animCardFlip: '300ms',
    animChipBet: '500ms',
    animChipWin: '600ms',
    animFlopStagger: '80ms',
    animWinnerGlow: '800ms',
    animWinnerFlash: '600ms',
    animRiverPeel: '2500ms',
    animSeatJoin: '400ms',
    animSeatLeave: '300ms',
    animAllinPulse: '2000ms',
    animBtnHover: '100ms',
    animBtnClick: '50ms',

    // Easing
    easeDeal: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
    easeChipBet: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    easeChipWin: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeOvershoot: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  suitColors: {
    s: '#000000',
    h: '#CC0000',
    d: '#0066CC',
    c: '#008800',
  },

  chipColors: {
    white: { surface: '#E8E8E8', edge: '#C8C8C8', stripe: 'rgba(160,160,160,0.5)', edgeDark: '#A0A0A0' },
    red:   { surface: '#D42828', edge: '#AA1C1C', stripe: 'rgba(255,255,255,0.4)', edgeDark: '#881414' },
    green: { surface: '#2E9B2E', edge: '#1E7A1E', stripe: 'rgba(255,255,255,0.35)', edgeDark: '#155A15' },
    black: { surface: '#3A3A3A', edge: '#222222', stripe: 'rgba(255,255,255,0.2)', edgeDark: '#111111' },
    blue:  { surface: '#2850B8', edge: '#1C3C8C', stripe: 'rgba(255,255,255,0.3)', edgeDark: '#142A66' },
  },

  gradients: {
    // Backgrounds
    tvBackground: 'radial-gradient(ellipse at 50% 80%, #1A1208, #12100C, #0A0A0F, #050508)',
    loginBackground: 'linear-gradient(180deg, #0F1E33, #162D50)',
    phoneBackground: 'linear-gradient(180deg, #0D1526 0%, #0F1828 100%)',
    phoneRadialBackground: 'radial-gradient(ellipse at 50% 80%, #1A2744, #141E33, #0D1526)',

    // Table
    tableRail: 'linear-gradient(180deg, #7A4F2B 0%, #5C3A1E 20%, #4A2E16 60%, #3D2510 100%)',
    tableRailHighlight: 'linear-gradient(180deg, rgba(255,220,160,0.10) 0%, transparent 10%, transparent 100%)',
    tableRailEdge: 'linear-gradient(180deg, rgba(255,220,160,0.15), rgba(255,220,160,0.03))',
    tableFelt: 'radial-gradient(ellipse at 50% 45%, #52B86E 0%, #3A9D56 40%, #267A3C 100%)',

    // Cards
    cardBack: 'linear-gradient(135deg, #C41E2A, #8B1520)',
    cardBackPattern: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)',

    // Player seat
    namePlate: 'linear-gradient(180deg, #F0F0F0, #D8D8D8, #C8C8C8)',
    namePlateActive: 'linear-gradient(180deg, #FFFDE7, #FFF9C4, #FFF176)',
    dealerButton: 'linear-gradient(135deg, #FFFDE7, #FFD54F)',
    sbButton: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    bbButton: 'linear-gradient(135deg, #EF4444, #DC2626)',

    // Badges
    badgeAllIn: 'linear-gradient(135deg, #DC2626, #991B1B)',
    badgeBusted: 'linear-gradient(135deg, #7F1D1D, #991B1B)',
    badgeAway: 'linear-gradient(135deg, #6B7280, #4B5563)',

    // Empty seat
    emptySeatHover: 'linear-gradient(180deg, rgba(34, 197, 94, 0.35), rgba(22, 163, 74, 0.25))',
    emptySeatDefault: 'linear-gradient(180deg, rgba(30,58,95,0.3), rgba(15,30,51,0.3))',

    // Action buttons
    sliderTrack: 'linear-gradient(90deg, #374151, #D97706)',
    sliderThumb: 'radial-gradient(circle at 30% 30%, #FBBF24, #D97706)',
  },

  soundParams: {
    cardDeal: { duration: 0.12, filterFreq: 3000, filterQ: 1.5, gain: 0.35 },
    cardFlip: {
      snapDuration: 0.05, snapFilterFreq: 1500, snapGain: 0.3,
      thudFreqStart: 200, thudFreqEnd: 80, thudDuration: 0.12, thudGain: 0.15,
    },
    chipBet: { freqs: [4000, 3200, 2800], freqGap: 0.03, freqDuration: 0.06, freqGain: 0.2, bodyFreq: 300, bodyGain: 0.15 },
    chipWin: { notes: [523, 659, 784, 988, 1047], noteGap: 0.08, noteDuration: 0.15, noteGain: 0.2, overtoneMultiplier: 2.5, overtoneGain: 0.08 },
    check: { freqStart: 400, freqEnd: 200, duration: 0.08, gain: 0.25, bodyFreq: 150, bodyGain: 0.12 },
    fold: { duration: 0.15, filterStart: 2000, filterEnd: 400, gain: 0.3 },
    allIn: {
      sweepFreqStart: 150, sweepFreqEnd: 800, sweepDuration: 0.25, sweepGain: 0.15,
      impactFreqStart: 200, impactFreqEnd: 60, impactDuration: 0.25, impactGain: 0.25,
    },
    timerWarning: { freq: 1200, tickDuration: 0.04, tickGap: 0.08, gain: 0.2 },
    yourTurn: { notes: [660, 880], noteGap: 0.15, noteDuration: 0.12, gain: 0.2 },
  },

  assets: {
    avatarBasePath: '/themes/basic/avatars',
    avatarCount: 54,
  },

  watermark: basicWatermark,
};
