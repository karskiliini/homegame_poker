import type { ThemeConfig } from './types.js';
import { basicTheme } from './basic.js';

const vegasWatermark = (
  <div className="animate-vegas-sparkle" style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
    <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="50,8 61,38 94,38 67,58 78,90 50,70 22,90 33,58 6,38 39,38"
        fill="none"
        stroke="#D4A830"
        strokeWidth="2"
      />
      <polygon
        points="50,22 56,42 78,42 60,54 68,76 50,62 32,76 40,54 22,42 44,42"
        fill="#D4A830"
        stroke="#A08020"
        strokeWidth="1"
      />
    </svg>
    <span
      style={{
        color: '#D4A830',
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: 8,
        userSelect: 'none' as const,
      }}
    >
      VEGAS
    </span>
  </div>
);

export const vegasTheme: ThemeConfig = {
  ...basicTheme,
  id: 'vegas',
  name: 'Vegas',
  shuffleStyle: 'speed',
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
    // Table — gold/champagne
    feltGreen: '#8B7840',
    feltGreenDark: '#6B5C30',
    feltGreenLight: '#A89050',
    tableRail: '#4A3A1A',
    tableRailLight: '#6B5528',
    tableBorder: '#2A1E0A',
    // Cards — rich gold
    cardBack: '#8B7840',
    // Lobby — warm gold
    bgLobby: '#4A3A1A',
    bgLobbyDark: '#2A1E0A',
    lobbyHeaderBg: '#4A3A1A',
    lobbyRowEven: '#F0EDE0',
    lobbyRowOdd: '#E0D8C0',
    lobbyRowSelected: '#D4C8A8',
    lobbyText: '#2A1E0A',
    lobbyBorder: '#B0A070',
  },

  gradients: {
    ...basicTheme.gradients,
    // Backgrounds — warm gold atmosphere
    tvBackground: 'radial-gradient(ellipse at 50% 80%, #1A1408, #14100A, #0A0808, #050404)',
    loginBackground: 'linear-gradient(180deg, #2A1E0A, #4A3A1A)',
    phoneBackground: 'linear-gradient(180deg, #14100A 0%, #1A1408 100%)',
    phoneRadialBackground: 'radial-gradient(ellipse at 50% 80%, #3A2E14, #2A1E0A, #14100A)',

    // Table — dark gold/mahogany rail, champagne felt
    tableRail: 'linear-gradient(180deg, #6B5528 0%, #4A3A1A 20%, #3A2E14 60%, #2A1E0A 100%)',
    tableRailHighlight: 'linear-gradient(180deg, rgba(212,168,48,0.10) 0%, transparent 10%, transparent 100%)',
    tableRailEdge: 'linear-gradient(180deg, rgba(212,168,48,0.14), rgba(212,168,48,0.03))',
    tableFelt: 'radial-gradient(ellipse at 50% 45%, #A89050 0%, #8B7840 40%, #6B5C30 100%)',

    // Cards — gold pattern
    cardBack: 'linear-gradient(135deg, #8B7840, #5A4E28)',
    cardBackPattern: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(212,168,48,0.08) 4px, rgba(212,168,48,0.08) 8px)',

    // Empty seat — gold-tinted
    emptySeatHover: 'linear-gradient(180deg, rgba(168, 144, 80, 0.35), rgba(139, 120, 64, 0.25))',
    emptySeatDefault: 'linear-gradient(180deg, rgba(74,58,26,0.3), rgba(42,30,10,0.3))',
  },

  assets: {
    avatarBasePath: '/themes/basic/avatars',
    avatarCount: 54,
  },

  watermark: vegasWatermark,
};
