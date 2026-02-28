import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PublicPlayerState, CardString } from '@poker/shared';
import { DISCONNECT_TIMEOUT_MS } from '@poker/shared';
import { avatarImageFile } from '../../utils/avatarImageFile.js';
import { CardComponent } from '../../components/Card.js';
import { CardBack } from '../../components/CardBack.js';
import { useTheme } from '../../themes/useTheme.js';

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
  foldDirection?: { x: number; y: number };
  equity?: number;
  /** Number of hole cards (2 for NLHE, 4 for PLO). Defaults to 2. */
  numHoleCards?: number;
  /** Render cards below the avatar (for top-half seats, so cards stay on the felt). */
  cardsBelow?: boolean;
  /** Called when this player's avatar is clicked (for avatar change). */
  onAvatarClick?: () => void;
  /** Called when stack area is clicked (chip trick trigger) */
  onChipTrickClick?: () => void;
  /** The 5 cards that make up the winning hand (for glow/dim logic) */
  winningCards?: CardString[];
  /** Whether a showdown is active (winners are being displayed) */
  showdownActive?: boolean;
}

function useDcCountdown(disconnectedAt: number | null): string | null {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (disconnectedAt == null) {
      setRemaining(null);
      return;
    }

    const update = () => {
      const left = disconnectedAt + DISCONNECT_TIMEOUT_MS - Date.now();
      if (left <= 0) {
        setRemaining('0:00');
        return;
      }
      const mins = Math.floor(left / 60000);
      const secs = Math.floor((left % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [disconnectedAt]);

  return remaining;
}

export function PlayerSeat({ player, isWinner, timerSeconds, timerMax = 30, foldDirection, equity, numHoleCards = 2, cardsBelow, onAvatarClick, onChipTrickClick, winningCards, showdownActive }: PlayerSeatProps) {
  const { gradients, assets } = useTheme();
  const isActive = player.isCurrentActor;
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all_in';
  const isSittingOut = player.status === 'sitting_out';
  const isBusted = player.status === 'busted';
  const isInactive = isSittingOut || isBusted;
  const isDisconnected = !player.isConnected;
  const dcCountdown = useDcCountdown(player.disconnectedAt);
  const avatarImage = player.avatarId ? `${assets.avatarBasePath}/${avatarImageFile(player.avatarId, assets.avatarNames)}` : null;
  const initials = getInitials(player.name);

  // Timer bar color
  const timerPercent = timerSeconds != null && timerMax > 0 ? (timerSeconds / timerMax) * 100 : 0;
  const timerColor = timerPercent > 60 ? 'var(--ftp-timer-safe)' :
    timerPercent > 25 ? 'var(--ftp-timer-warning)' : 'var(--ftp-timer-critical)';

  // Show card backs when player has cards but they're not revealed
  const showCardBacks = player.hasCards && !player.holeCards && !isFolded;

  const cardsElement = (
    <div className={`flex ${cardsBelow ? 'mt-1' : 'mb-1'}`} style={{ minHeight: 52, gap: numHoleCards > 2 ? 0 : 2 }}>
      {player.holeCards ? (
        player.holeCards.map((card, i) => {
          const cardIsWinning = isWinner && winningCards?.includes(card);
          const cardIsDimmed = showdownActive && !isWinner;
          return (
            <div
              key={i}
              className="animate-card-flip"
              style={numHoleCards > 2 && i > 0 ? { marginLeft: -8 } : undefined}
            >
              <CardComponent card={card} size="sm" isWinner={cardIsWinning} isDimmed={cardIsDimmed} />
            </div>
          );
        })
      ) : (
        <AnimatePresence>
          {showCardBacks && Array.from({ length: numHoleCards }, (_, i) => (
            <motion.div
              key={`cardback-${i}`}
              initial={false}
              exit={{
                x: [0, (i === 0 ? -20 : 20), (foldDirection?.x ?? 0) + (i === 0 ? -30 : 30)],
                y: [0, -35, foldDirection?.y ?? -40],
                scale: [1, 1.1, 0.15],
                rotate: [0, i === 0 ? -360 : 270, i === 0 ? -720 : 540],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 0.6,
                delay: i * 0.1,
                ease: [0.4, 0, 0.2, 1],
                opacity: { times: [0, 0.7, 1] },
              }}
              style={numHoleCards > 2 && i > 0 ? { marginLeft: -8 } : i > 0 ? { marginLeft: 2 } : undefined}
            >
              <CardBack size="sm" />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );

  return (
    <div
      className={`relative flex flex-col items-center ${isFolded || isInactive ? 'opacity-40' : ''}`}
      style={isInactive ? { filter: 'grayscale(0.6)' } : undefined}
    >
      {/* Cards above avatar for bottom-half seats */}
      {!cardsBelow && cardsElement}

      {/* Large avatar (Full Tilt style) */}
      <div
        className={`
          flex items-center justify-center text-white font-bold shrink-0
          ${isWinner ? 'animate-winner-glow' : ''}
        `}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#2C3E50',
          boxShadow: isActive
            ? '0 0 14px 4px rgba(234, 179, 8, 0.45), 0 3px 8px rgba(0,0,0,0.5)'
            : '0 3px 8px rgba(0,0,0,0.5)',
          border: isActive
            ? '3px solid rgba(234, 179, 8, 0.8)'
            : '3px solid rgba(255,255,255,0.25)',
          fontSize: 22,
          cursor: onAvatarClick ? 'pointer' : undefined,
        }}
        onClick={onAvatarClick}
      >
        {avatarImage ? (
          <img
            src={avatarImage}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          initials
        )}
      </div>

      {/* Name plate below avatar */}
      <div
        className={`
          relative px-3 py-1 -mt-2 transition-all duration-200
          ${isAllIn ? 'animate-allin-pulse' : ''}
        `}
        style={{
          minWidth: 90,
          textAlign: 'center',
          background: isActive
            ? gradients.namePlateActive
            : gradients.namePlate,
          border: isAllIn
            ? '2px solid #EAB308'
            : `1px solid ${isActive ? 'rgba(234, 179, 8, 0.8)' : 'rgba(0,0,0,0.3)'}`,
          borderRadius: 4,
          boxShadow: isActive
            ? '0 0 12px 4px rgba(234, 179, 8, 0.4), inset 0 1px 0 rgba(255,255,255,0.5)'
            : '0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6)',
          zIndex: 1,
        }}
      >
        {/* Name */}
        <div
          className="font-semibold truncate"
          style={{
            fontSize: 12,
            maxWidth: 80,
            color: isActive ? '#8B6914' : '#1A1A1A',
            margin: '0 auto',
          }}
        >
          {player.name}
          {isDisconnected && (
            <span style={{ color: '#DC2626', marginLeft: 4, fontSize: 10 }}>
              DC{dcCountdown ? ` ${dcCountdown}` : ''}
            </span>
          )}
        </div>

        {/* Stack */}
        <div
          className="font-mono tabular-nums"
          onClick={onChipTrickClick}
          style={{
            fontSize: 12,
            color: isActive ? '#8B6914' : '#555555',
            fontWeight: 600,
            cursor: onChipTrickClick ? 'pointer' : 'default',
          }}
        >
          {player.stack.toLocaleString()}
        </div>

        {/* All-in badge */}
        {isAllIn && (
          <div
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 animate-allin-label px-2 py-0.5 rounded text-white font-bold uppercase tracking-wider"
            style={{
              fontSize: 11,
              background: gradients.badgeAllIn,
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            ALL IN
          </div>
        )}

        {/* Busted badge */}
        {isBusted && (
          <div
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-white font-bold uppercase tracking-wider"
            style={{
              fontSize: 11,
              background: gradients.badgeBusted,
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            BUSTED
          </div>
        )}

        {/* Away badge */}
        {isSittingOut && !isBusted && (
          <div
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-white font-bold uppercase tracking-wider"
            style={{
              fontSize: 11,
              background: gradients.badgeAway,
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            AWAY
          </div>
        )}

        {/* Timer bar */}
        {isActive && timerSeconds != null && (
          <div
            className="absolute bottom-0 left-0 right-0 overflow-hidden"
            style={{ height: 4, borderRadius: '0 0 4px 4px', background: 'rgba(0,0,0,0.15)' }}
          >
            <div
              style={{
                height: '100%',
                width: '100%',
                background: timerColor,
                transform: `scaleX(${timerPercent / 100})`,
                transformOrigin: 'left',
                transition: 'transform 1s linear, background-color 0.5s ease',
              }}
            />
          </div>
        )}
      </div>

      {/* Blind indicators */}
      {player.isSmallBlind && !player.isDealer && (
        <div
          className="absolute flex items-center justify-center font-bold text-white"
          style={{
            top: 52,
            left: -14,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: gradients.sbButton,
            fontSize: 9,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            zIndex: 2,
          }}
        >
          SB
        </div>
      )}
      {player.isBigBlind && (
        <div
          className="absolute flex items-center justify-center font-bold text-white"
          style={{
            top: 52,
            left: -14,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: gradients.bbButton,
            fontSize: 9,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            zIndex: 2,
          }}
        >
          BB
        </div>
      )}

      {/* Cards below avatar for top-half seats */}
      {cardsBelow && cardsElement}

      {/* Equity percentage */}
      {equity != null && (
        <div
          className="font-mono font-bold mt-1 px-2 py-0.5 rounded animate-fade-in-up"
          style={{
            fontSize: 14,
            color: '#FFFFFF',
            background: 'rgba(0,0,0,0.7)',
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {equity}%
        </div>
      )}

    </div>
  );
}
