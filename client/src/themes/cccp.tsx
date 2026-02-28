import type { ThemeConfig } from './types.js';
import { basicTheme } from './basic.js';

// 5-pointed star: outer radius 45, inner radius 18, centered at (50,50)
const starPoints = '50,5 60.6,35.4 92.8,36.1 67.1,55.6 76.5,86.4 50,68 23.5,86.4 32.9,55.6 7.2,36.1 39.4,35.4';

const cccpWatermark = (
  <div className="animate-cccp-star-glow" style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points={starPoints}
        fill="#C9A84C"
        stroke="#A08030"
        strokeWidth="1.5"
      />
    </svg>
    <span
      style={{
        color: '#C9A84C',
        fontSize: 24,
        fontWeight: 900,
        letterSpacing: 8,
        userSelect: 'none' as const,
      }}
    >
      CCCP
    </span>
  </div>
);

export const cccpTheme: ThemeConfig = {
  ...basicTheme,
  id: 'cccp',
  name: 'CCCP',
  // Spread nested objects to ensure deep copy
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
    // Table — crimson/burgundy
    feltGreen: '#8B2020',
    feltGreenDark: '#6B1A1A',
    feltGreenLight: '#A03030',
    tableRail: '#4A1A1A',
    tableRailLight: '#6B2828',
    tableBorder: '#2A0A0A',
    // Cards — crimson + gold
    cardBack: '#8B1520',
    // Lobby — dark red
    bgLobby: '#4A1A1A',
    bgLobbyDark: '#2A0A0A',
    lobbyHeaderBg: '#4A1A1A',
    lobbyRowEven: '#F0E8E8',
    lobbyRowOdd: '#E0D0D0',
    lobbyRowSelected: '#D4B8B8',
    lobbyText: '#2A1A1A',
    lobbyBorder: '#B08080',
  },

  gradients: {
    ...basicTheme.gradients,
    // Backgrounds — dark red atmosphere
    tvBackground: 'radial-gradient(ellipse at 50% 80%, #1A0808, #120808, #0A0505, #050303)',
    loginBackground: 'linear-gradient(180deg, #2A0A0A, #4A1A1A)',
    phoneBackground: 'linear-gradient(180deg, #1A0808 0%, #200A0A 100%)',
    phoneRadialBackground: 'radial-gradient(ellipse at 50% 80%, #3A1414, #2A0A0A, #1A0808)',

    // Table — dark mahogany/burgundy rail, deep crimson felt
    tableRail: 'linear-gradient(180deg, #6B2828 0%, #4A1A1A 20%, #3A1212 60%, #2A0A0A 100%)',
    tableRailHighlight: 'linear-gradient(180deg, rgba(200,160,100,0.08) 0%, transparent 10%, transparent 100%)',
    tableRailEdge: 'linear-gradient(180deg, rgba(200,160,100,0.12), rgba(200,160,100,0.02))',
    tableFelt: 'radial-gradient(ellipse at 50% 45%, #8B2020 0%, #6B1A1A 40%, #4A1010 100%)',

    // Cards — crimson + gold pattern
    cardBack: 'linear-gradient(135deg, #8B1520, #5A0A10)',
    cardBackPattern: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(201,168,76,0.08) 4px, rgba(201,168,76,0.08) 8px)',

    // Empty seat — red-tinted
    emptySeatHover: 'linear-gradient(180deg, rgba(197, 34, 34, 0.35), rgba(163, 22, 22, 0.25))',
    emptySeatDefault: 'linear-gradient(180deg, rgba(74,26,26,0.3), rgba(42,10,10,0.3))',
  },

  assets: {
    avatarBasePath: '/themes/cccp/avatars',
    avatarCount: 54,
  },

  watermark: cccpWatermark,
};
