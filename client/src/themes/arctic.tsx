import type { ThemeConfig } from './types.js';
import { basicTheme } from './basic.js';

const arcticWatermark = (
  <div className="animate-arctic-shimmer" style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
    <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* Snowflake: 6 arms with branches */}
      <g stroke="#70B8D8" strokeWidth="2" strokeLinecap="round" fill="none">
        {/* Vertical arm */}
        <line x1="50" y1="10" x2="50" y2="90" />
        <line x1="50" y1="25" x2="40" y2="15" />
        <line x1="50" y1="25" x2="60" y2="15" />
        <line x1="50" y1="75" x2="40" y2="85" />
        <line x1="50" y1="75" x2="60" y2="85" />
        {/* Top-right arm */}
        <line x1="50" y1="50" x2="84.6" y2="30" />
        <line x1="72" y1="37" x2="78" y2="26" />
        <line x1="72" y1="37" x2="82" y2="42" />
        {/* Bottom-right arm */}
        <line x1="50" y1="50" x2="84.6" y2="70" />
        <line x1="72" y1="63" x2="82" y2="58" />
        <line x1="72" y1="63" x2="78" y2="74" />
        {/* Bottom-left arm */}
        <line x1="50" y1="50" x2="15.4" y2="70" />
        <line x1="28" y1="63" x2="18" y2="58" />
        <line x1="28" y1="63" x2="22" y2="74" />
        {/* Top-left arm */}
        <line x1="50" y1="50" x2="15.4" y2="30" />
        <line x1="28" y1="37" x2="22" y2="26" />
        <line x1="28" y1="37" x2="18" y2="42" />
      </g>
      <circle cx="50" cy="50" r="4" fill="#70B8D8" />
    </svg>
    <span
      style={{
        color: '#70B8D8',
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: 6,
        userSelect: 'none' as const,
      }}
    >
      ARCTIC
    </span>
  </div>
);

export const arcticTheme: ThemeConfig = {
  ...basicTheme,
  id: 'arctic',
  shuffleStyle: 'slide',
  name: 'Arctic',
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
    // Table — icy blue
    feltGreen: '#6890A8',
    feltGreenDark: '#507890',
    feltGreenLight: '#80A8C0',
    tableRail: '#384858',
    tableRailLight: '#506878',
    tableBorder: '#1A2830',
    // Cards — icy blue
    cardBack: '#507890',
    // Lobby — cool blue
    bgLobby: '#384858',
    bgLobbyDark: '#1A2830',
    lobbyHeaderBg: '#384858',
    lobbyRowEven: '#E8F0F4',
    lobbyRowOdd: '#D0E0E8',
    lobbyRowSelected: '#B0D0E0',
    lobbyText: '#1A2830',
    lobbyBorder: '#80A0B8',
  },

  gradients: {
    ...basicTheme.gradients,
    // Backgrounds — cold blue atmosphere
    tvBackground: 'radial-gradient(ellipse at 50% 80%, #0C1820, #0A1418, #060C10, #030608)',
    loginBackground: 'linear-gradient(180deg, #1A2830, #384858)',
    phoneBackground: 'linear-gradient(180deg, #0A1418 0%, #0C1820 100%)',
    phoneRadialBackground: 'radial-gradient(ellipse at 50% 80%, #2A4050, #1A2830, #0C1820)',

    // Table — steel blue rail, icy felt
    tableRail: 'linear-gradient(180deg, #506878 0%, #384858 20%, #283840 60%, #1A2830 100%)',
    tableRailHighlight: 'linear-gradient(180deg, rgba(112,184,216,0.08) 0%, transparent 10%, transparent 100%)',
    tableRailEdge: 'linear-gradient(180deg, rgba(112,184,216,0.12), rgba(112,184,216,0.02))',
    tableFelt: 'radial-gradient(ellipse at 50% 45%, #80A8C0 0%, #6890A8 40%, #507890 100%)',

    // Cards — icy pattern
    cardBack: 'linear-gradient(135deg, #507890, #384858)',
    cardBackPattern: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(112,184,216,0.06) 4px, rgba(112,184,216,0.06) 8px)',

    // Empty seat — ice-tinted
    emptySeatHover: 'linear-gradient(180deg, rgba(104, 144, 168, 0.35), rgba(80, 120, 144, 0.25))',
    emptySeatDefault: 'linear-gradient(180deg, rgba(56,72,88,0.3), rgba(26,40,48,0.3))',
  },

  assets: {
    avatarBasePath: '/themes/basic/avatars',
    avatarCount: 54,
  },

  watermark: arcticWatermark,
};
