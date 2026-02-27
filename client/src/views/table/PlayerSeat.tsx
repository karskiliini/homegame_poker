import type { PublicPlayerState } from '@poker/shared';
import { CardComponent } from '../../components/Card.js';
import { CardBack } from '../../components/CardBack.js';

const AVATAR_COLORS = [
  'from-red-500 to-red-700',
  'from-blue-500 to-blue-700',
  'from-green-500 to-green-700',
  'from-purple-500 to-purple-700',
  'from-orange-500 to-orange-700',
  'from-pink-500 to-pink-700',
  'from-teal-500 to-teal-700',
  'from-indigo-500 to-indigo-700',
  'from-amber-500 to-amber-700',
  'from-cyan-500 to-cyan-700',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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
}

export function PlayerSeat({ player }: PlayerSeatProps) {
  const isActive = player.isCurrentActor;
  const isFolded = player.status === 'folded';
  const isDisconnected = !player.isConnected;
  const colorClass = getAvatarColor(player.name);
  const initials = getInitials(player.name);

  return (
    <div className={`relative flex flex-col items-center ${isFolded ? 'opacity-40' : ''}`}>
      {/* Cards */}
      <div className="flex gap-0.5 mb-1 h-10">
        {player.holeCards ? (
          player.holeCards.map((card, i) => (
            <CardComponent key={i} card={card} size="sm" />
          ))
        ) : player.hasCards ? (
          <>
            <CardBack size="sm" />
            <CardBack size="sm" />
          </>
        ) : null}
      </div>

      {/* Avatar + info box */}
      <div className={`
        flex items-center gap-2 min-w-[120px] rounded-lg px-2 py-1.5
        ${isActive
          ? 'bg-yellow-500/90 text-black ring-2 ring-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.5)]'
          : 'bg-gray-800/90 text-white'
        }
        ${isDisconnected ? 'border border-red-500/50' : ''}
      `}>
        {/* Avatar circle */}
        <div className={`
          w-9 h-9 rounded-full bg-gradient-to-br ${colorClass}
          flex items-center justify-center text-white text-sm font-bold
          shadow-inner shrink-0
          ${isActive ? 'ring-2 ring-yellow-200' : ''}
        `}>
          {initials}
        </div>

        {/* Name + stack */}
        <div className="min-w-0">
          <div className="text-sm font-bold truncate max-w-[80px]">
            {player.name}
            {isDisconnected && <span className="text-red-400 ml-1">DC</span>}
          </div>
          <div className="text-xs font-mono">
            {player.stack.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Dealer button */}
      {player.isDealer && (
        <div className="absolute -top-1 -right-2 w-6 h-6 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center shadow-md">
          D
        </div>
      )}

      {/* Blind indicators */}
      {player.isSmallBlind && (
        <div className="absolute -top-1 -left-2 w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
          SB
        </div>
      )}
      {player.isBigBlind && (
        <div className="absolute -top-1 -left-2 w-6 h-6 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
          BB
        </div>
      )}

      {/* Current bet */}
      {player.currentBet > 0 && (
        <div className="mt-1 text-xs text-yellow-400 font-mono">
          {player.currentBet.toLocaleString()}
        </div>
      )}
    </div>
  );
}
