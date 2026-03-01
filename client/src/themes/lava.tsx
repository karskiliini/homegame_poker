import type { ThemeConfig } from './types.js';
import { basicTheme } from './basic.js';

const lavaWatermark = (
  <div className="animate-lava-pulse" style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
    <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* Flame shape */}
      <path
        d="M50 8 C55 25 70 30 68 50 C66 65 58 68 55 75 C54 78 56 85 50 92 C44 85 46 78 45 75 C42 68 34 65 32 50 C30 30 45 25 50 8Z"
        fill="#D06030"
        stroke="#A04820"
        strokeWidth="1.5"
      />
      <path
        d="M50 30 C53 40 60 44 58 55 C57 62 54 64 52 68 C51 70 53 75 50 80 C47 75 49 70 48 68 C46 64 43 62 42 55 C40 44 47 40 50 30Z"
        fill="#E88040"
        opacity="0.6"
      />
    </svg>
    <span
      style={{
        color: '#D06030',
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: 6,
        userSelect: 'none' as const,
      }}
    >
      LAVA
    </span>
  </div>
);

export const lavaTheme: ThemeConfig = {
  ...basicTheme,
  id: 'lava',
  name: 'Lava',
  shuffleStyle: 'burst',
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
    // Table — volcanic orange/brown
    feltGreen: '#8B4420',
    feltGreenDark: '#6B3018',
    feltGreenLight: '#A85830',
    tableRail: '#3A1A0A',
    tableRailLight: '#5A2810',
    tableBorder: '#1A0A04',
    // Cards — volcanic orange
    cardBack: '#8B4420',
    // Lobby — dark volcanic
    bgLobby: '#3A1A0A',
    bgLobbyDark: '#1A0A04',
    lobbyHeaderBg: '#3A1A0A',
    lobbyRowEven: '#F0E8E0',
    lobbyRowOdd: '#E0D0C0',
    lobbyRowSelected: '#D4C0A8',
    lobbyText: '#1A0A04',
    lobbyBorder: '#B08060',
  },

  gradients: {
    ...basicTheme.gradients,
    // Backgrounds — dark volcanic atmosphere
    tvBackground: 'radial-gradient(ellipse at 50% 80%, #1A0C08, #140A06, #0A0604, #050302)',
    loginBackground: 'linear-gradient(180deg, #1A0A04, #3A1A0A)',
    phoneBackground: 'linear-gradient(180deg, #140A06 0%, #1A0C08 100%)',
    phoneRadialBackground: 'radial-gradient(ellipse at 50% 80%, #3A2010, #2A1408, #1A0C08)',

    // Table — dark volcanic rail, orange felt
    tableRail: 'linear-gradient(180deg, #5A2810 0%, #3A1A0A 20%, #2A1208 60%, #1A0A04 100%)',
    tableRailHighlight: 'linear-gradient(180deg, rgba(208,96,48,0.10) 0%, transparent 10%, transparent 100%)',
    tableRailEdge: 'linear-gradient(180deg, rgba(208,96,48,0.14), rgba(208,96,48,0.03))',
    tableFelt: 'radial-gradient(ellipse at 50% 45%, #A85830 0%, #8B4420 40%, #6B3018 100%)',

    // Cards — volcanic pattern
    cardBack: 'linear-gradient(135deg, #8B4420, #5A2810)',
    cardBackPattern: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(208,96,48,0.08) 4px, rgba(208,96,48,0.08) 8px)',

    // Empty seat — orange-tinted
    emptySeatHover: 'linear-gradient(180deg, rgba(139, 68, 32, 0.35), rgba(107, 48, 24, 0.25))',
    emptySeatDefault: 'linear-gradient(180deg, rgba(58,26,10,0.3), rgba(26,10,4,0.3))',
  },

  assets: {
    avatarBasePath: '/themes/basic/avatars',
    avatarCount: 54,
  },

  watermark: lavaWatermark,
};
