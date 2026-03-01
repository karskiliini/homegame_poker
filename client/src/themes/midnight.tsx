import type { ThemeConfig } from './types.js';
import { basicTheme } from './basic.js';

const midnightWatermark = (
  <div className="animate-midnight-glow" style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
    <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M50 10 C30 10 15 30 15 50 C15 70 30 90 50 90 C35 80 28 65 28 50 C28 35 35 20 50 10Z"
        fill="#C0C8D4"
        stroke="#8890A0"
        strokeWidth="1.5"
      />
    </svg>
    <span
      style={{
        color: '#C0C8D4',
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: 6,
        userSelect: 'none' as const,
      }}
    >
      MIDNIGHT
    </span>
  </div>
);

export const midnightTheme: ThemeConfig = {
  ...basicTheme,
  id: 'midnight',
  name: 'Midnight',
  shuffleStyle: 'fan',
  suitColors: { ...basicTheme.suitColors },
  chipColors: {
    white: { ...basicTheme.chipColors.white },
    red: { ...basicTheme.chipColors.red },
    green: { ...basicTheme.chipColors.green },
    black: { ...basicTheme.chipColors.black },
    blue: { ...basicTheme.chipColors.blue },
  },
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

  cssVars: {
    ...basicTheme.cssVars,
    // Table — dark navy
    feltGreen: '#1A2744',
    feltGreenDark: '#121C33',
    feltGreenLight: '#243460',
    tableRail: '#1A1A2E',
    tableRailLight: '#2A2A44',
    tableBorder: '#0A0A18',
    // Cards — navy + silver
    cardBack: '#1A2744',
    // Lobby — deep navy
    bgLobby: '#1A1A2E',
    bgLobbyDark: '#0A0A18',
    lobbyHeaderBg: '#1A1A2E',
    lobbyRowEven: '#E8EAF0',
    lobbyRowOdd: '#D0D4E0',
    lobbyRowSelected: '#B8C0D4',
    lobbyText: '#1A1A2E',
    lobbyBorder: '#8890A8',
  },

  gradients: {
    ...basicTheme.gradients,
    // Backgrounds — deep navy atmosphere
    tvBackground: 'radial-gradient(ellipse at 50% 80%, #0D1526, #0A1020, #060A14, #030508)',
    loginBackground: 'linear-gradient(180deg, #0A0A18, #1A1A2E)',
    phoneBackground: 'linear-gradient(180deg, #080C18 0%, #0D1220 100%)',
    phoneRadialBackground: 'radial-gradient(ellipse at 50% 80%, #1A2744, #121C33, #0D1526)',

    // Table — dark steel/navy rail, deep navy felt
    tableRail: 'linear-gradient(180deg, #2A2A44 0%, #1A1A2E 20%, #141428 60%, #0A0A18 100%)',
    tableRailHighlight: 'linear-gradient(180deg, rgba(192,200,212,0.08) 0%, transparent 10%, transparent 100%)',
    tableRailEdge: 'linear-gradient(180deg, rgba(192,200,212,0.12), rgba(192,200,212,0.02))',
    tableFelt: 'radial-gradient(ellipse at 50% 45%, #243460 0%, #1A2744 40%, #121C33 100%)',

    // Cards — navy + silver pattern
    cardBack: 'linear-gradient(135deg, #1A2744, #0D1526)',
    cardBackPattern: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(192,200,212,0.06) 4px, rgba(192,200,212,0.06) 8px)',

    // Empty seat — navy-tinted
    emptySeatHover: 'linear-gradient(180deg, rgba(36, 52, 96, 0.35), rgba(26, 39, 68, 0.25))',
    emptySeatDefault: 'linear-gradient(180deg, rgba(26,26,46,0.3), rgba(10,10,24,0.3))',
  },

  assets: {
    avatarBasePath: '/themes/basic/avatars',
    avatarCount: 54,
  },

  watermark: midnightWatermark,
};
