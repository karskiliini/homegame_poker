import type { PublicPlayerState } from '@poker/shared';
import { CardComponent } from '../../components/Card.js';
import { CardBack } from '../../components/CardBack.js';

const AVATAR_COLORS = [
  ['#DC2626', '#991B1B'],
  ['#2563EB', '#1E40AF'],
  ['#16A34A', '#15803D'],
  ['#9333EA', '#7E22CE'],
  ['#EA580C', '#C2410C'],
  ['#DB2777', '#BE185D'],
  ['#0D9488', '#0F766E'],
  ['#4F46E5', '#4338CA'],
  ['#D97706', '#B45309'],
  ['#0891B2', '#0E7490'],
];

function getAvatarColors(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] as [string, string];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface PlayerSeatProps {
  player: PublicPlayerState;
  isWinner?: boolean;
  timerSeconds?: number;
  timerMax?: number;
}

export function PlayerSeat({ player, isWinner, timerSeconds, timerMax = 30 }: PlayerSeatProps) {
  const isActive = player.isCurrentActor;
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all_in';
  const isDisconnected = !player.isConnected;
  const [color1, color2] = getAvatarColors(player.name);
  const initials = getInitials(player.name);

  // Timer bar color
  const timerPercent = timerSeconds != null && timerMax > 0 ? (timerSeconds / timerMax) * 100 : 0;
  const timerColor = timerPercent > 60 ? 'var(--ftp-timer-safe)' :
    timerPercent > 25 ? 'var(--ftp-timer-warning)' : 'var(--ftp-timer-critical)';

  return (
    <div className={`relative flex flex-col items-center ${isFolded ? 'opacity-40' : ''}`}>
      {/* Cards above the panel */}
      <div className="flex gap-0.5 mb-1" style={{ minHeight: 52 }}>
        {player.holeCards ? (
          player.holeCards.map((card, i) => (
            <div key={i} className="animate-card-flip">
              <CardComponent card={card} size="sm" isWinner={isWinner} />
            </div>
          ))
        ) : player.hasCards ? (
          <>
            <CardBack size="sm" />
            <CardBack size="sm" />
          </>
        ) : null}
      </div>

      {/* Player panel */}
      <div
        className={`
          relative flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-all duration-200
          ${isWinner ? 'animate-winner-glow' : ''}
          ${isAllIn ? 'animate-allin-pulse' : ''}
        `}
        style={{
          minWidth: 120,
          background: isActive ? 'var(--ftp-panel-active)' : 'var(--ftp-panel-bg)',
          border: `1px solid ${isActive ? 'var(--ftp-panel-active-border)' : 'var(--ftp-panel-border)'}`,
          borderRadius: 6,
          boxShadow: isActive
            ? '0 0 15px 5px rgba(234, 179, 8, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Avatar */}
        <div
          className="flex items-center justify-center text-white font-bold shrink-0"
          style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            background: `linear-gradient(135deg, ${color1}, ${color2})`,
            fontSize: 14,
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.2)',
            border: isActive ? '2px solid rgba(234, 179, 8, 0.6)' : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {initials}
        </div>

        {/* Name + Stack */}
        <div className="min-w-0">
          <div
            className="font-semibold truncate"
            style={{
              fontSize: 13,
              maxWidth: 80,
              color: isActive ? '#1a1a1a' : '#FFFFFF',
            }}
          >
            {player.name}
            {isDisconnected && <span style={{ color: '#EF4444', marginLeft: 4, fontSize: 10 }}>DC</span>}
          </div>
          <div
            className="font-mono tabular-nums"
            style={{
              fontSize: 12,
              color: isActive ? '#1a1a1a' : 'var(--ftp-text-secondary)',
              fontWeight: 600,
            }}
          >
            {player.stack.toLocaleString()}
          </div>
        </div>

        {/* All-in badge */}
        {isAllIn && (
          <div
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-white font-bold uppercase tracking-wider"
            style={{
              fontSize: 9,
              background: 'linear-gradient(180deg, #D97706, #B45309)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            ALL IN
          </div>
        )}

        {/* Timer bar */}
        {isActive && timerSeconds != null && (
          <div
            className="absolute bottom-0 left-0 right-0 overflow-hidden"
            style={{ height: 3, borderRadius: '0 0 6px 6px' }}
          >
            <div
              style={{
                height: '100%',
                width: `${timerPercent}%`,
                background: timerColor,
                transition: 'width 1s linear, background-color 0.5s ease',
              }}
            />
          </div>
        )}
      </div>

      {/* Dealer button */}
      {player.isDealer && (
        <div
          className="absolute -top-1 -right-3 flex items-center justify-center font-bold"
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #FFFFFF, #E0E0E0)',
            border: '2px solid #999',
            color: '#333',
            fontSize: 11,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          D
        </div>
      )}

      {/* Blind indicators */}
      {player.isSmallBlind && !player.isDealer && (
        <div
          className="absolute -top-1 -left-3 flex items-center justify-center font-bold text-white"
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
            fontSize: 9,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          SB
        </div>
      )}
      {player.isBigBlind && (
        <div
          className="absolute -top-1 -left-3 flex items-center justify-center font-bold text-white"
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            fontSize: 9,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          BB
        </div>
      )}

      {/* Current bet */}
      {player.currentBet > 0 && (
        <div
          className="mt-1 font-mono font-bold tabular-nums animate-fade-in-up"
          style={{
            fontSize: 12,
            color: '#EAB308',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {player.currentBet.toLocaleString()}
        </div>
      )}
    </div>
  );
}
