import { useState, useEffect, useRef, useMemo } from 'react';
import type { GameState } from '@poker/shared';
import { PlayerSeat } from './PlayerSeat.js';
import { CommunityCards } from './CommunityCards.js';
import { PotDisplay } from './PotDisplay.js';
import { BetChip } from './BetChip.js';
import { CardBack } from '../../components/CardBack.js';

// Seat positions around an oval table (percentage-based, for 10 seats)
export const SEAT_POSITIONS: { x: number; y: number }[] = [
  { x: 50, y: 92 },   // 0: bottom center
  { x: 18, y: 82 },   // 1: bottom left
  { x: 3, y: 55 },    // 2: left
  { x: 3, y: 30 },    // 3: upper left
  { x: 18, y: 10 },   // 4: top left
  { x: 50, y: 3 },    // 5: top center
  { x: 82, y: 10 },   // 6: top right
  { x: 97, y: 30 },   // 7: upper right
  { x: 97, y: 55 },   // 8: right
  { x: 82, y: 82 },   // 9: bottom right
];

// Bet chip positions: 40% of the way from seat to center (50%, 50%)
export const BET_POSITIONS: { x: number; y: number }[] = [
  { x: 50, y: 75 },   // 0
  { x: 31, y: 69 },   // 1
  { x: 22, y: 53 },   // 2
  { x: 22, y: 38 },   // 3
  { x: 31, y: 26 },   // 4
  { x: 50, y: 22 },   // 5
  { x: 69, y: 26 },   // 6
  { x: 78, y: 38 },   // 7
  { x: 78, y: 53 },   // 8
  { x: 69, y: 69 },   // 9
];

// Pot center position (percentage)
const POT_CENTER = { x: 50, y: 58 };

interface PotAward {
  potIndex: number;
  amount: number;
  winnerSeatIndex: number;
  winnerName: string;
}

interface CollectingBet {
  seatIndex: number;
  amount: number;
}

interface ChipAnimation {
  id: number;
  targetX: number;
  targetY: number;
  amount: number;
}

export interface BetChipAnimation {
  id: number;
  startX: number;
  startY: number;
  seatIndex: number;
  amount: number;
}

export interface DealCardAnimation {
  id: number;
  seatIndex: number;
  startX: number;
  startY: number;
}

interface PokerTableProps {
  gameState: GameState;
  potAwards?: PotAward[];
  winnerSeats?: number[];
  timerData?: { seatIndex: number; secondsRemaining: number } | null;
  collectingBets?: CollectingBet[] | null;
  potGrow?: boolean;
  betChipAnimations?: BetChipAnimation[];
  dealCardAnimations?: DealCardAnimation[];
}

// Table center in percentage coordinates
const TABLE_CENTER = { x: 50, y: 50 };

let chipAnimId = 0;

export function PokerTable({
  gameState, potAwards, winnerSeats = [], timerData,
  collectingBets, potGrow,
  betChipAnimations = [], dealCardAnimations = [],
}: PokerTableProps) {
  const { players, communityCards, pots, phase, handNumber, config } = gameState;
  const [chipAnimations, setChipAnimations] = useState<ChipAnimation[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  // Build player name map for PotDisplay
  const playerNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of players) {
      map[p.id] = p.name;
    }
    return map;
  }, [players]);

  // Animate chips flying to winner when potAwards arrive
  useEffect(() => {
    if (!potAwards || potAwards.length === 0 || !tableRef.current) return;

    const rect = tableRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height * 0.58;

    const newAnims: ChipAnimation[] = potAwards.map(award => {
      const seatPos = SEAT_POSITIONS[award.winnerSeatIndex];
      const targetX = (seatPos.x / 100) * rect.width - centerX;
      const targetY = (seatPos.y / 100) * rect.height - centerY;

      return {
        id: chipAnimId++,
        targetX,
        targetY,
        amount: award.amount,
      };
    });

    setChipAnimations(newAnims);

    // Clear animations after they complete
    const timer = setTimeout(() => {
      setChipAnimations([]);
    }, 800);

    return () => clearTimeout(timer);
  }, [potAwards]);

  // Calculate fold direction vectors (from seat toward table center)
  const getFoldDirection = (seatIndex: number) => {
    const seat = SEAT_POSITIONS[seatIndex];
    const dx = TABLE_CENTER.x - seat.x;
    const dy = TABLE_CENTER.y - seat.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: -40 };
    const scale = 80;
    return { x: (dx / len) * scale, y: (dy / len) * scale };
  };

  return (
    <div ref={tableRef} className="relative w-full h-full max-w-[1400px] max-h-[900px]">
      {/* Table rail (outer border) */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: '5.5%',
          borderRadius: '50%',
          background: 'linear-gradient(180deg, #8B6914 0%, #5C3A1E 30%, #3A2510 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)',
        }}
      />

      {/* Table felt */}
      <div
        className="absolute"
        style={{
          inset: '7%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 45%, #3A8050 0%, #2D6B3F 40%, #1A5C32 100%)',
          boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.3)',
        }}
      />

      {/* Inner line on felt */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: '10%',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      />

      {/* Game info */}
      <div className="absolute top-[13%] left-1/2 -translate-x-1/2 text-center">
        <div
          className="font-semibold tracking-wider"
          style={{
            color: 'var(--ftp-gold)',
            fontSize: 13,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          {config.gameType} {config.smallBlind}/{config.bigBlind}
          {handNumber > 0 && (
            <span style={{ marginLeft: 16, color: 'rgba(255,255,255,0.4)' }}>
              Hand #{handNumber}
            </span>
          )}
        </div>
      </div>

      {/* Community cards */}
      {communityCards.length > 0 && (
        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2">
          <CommunityCards
            cards={communityCards}
            winningCards={winnerSeats.length > 0 ? communityCards : undefined}
          />
        </div>
      )}

      {/* Pots */}
      {pots.length > 0 && (
        <div className="absolute top-[58%] left-1/2 -translate-x-1/2">
          <PotDisplay pots={pots} playerNames={playerNames} potGrow={potGrow} />
        </div>
      )}

      {/* Bet chips on the table */}
      {!collectingBets && players
        .filter(p => p.currentBet > 0)
        .map(p => {
          const betPos = BET_POSITIONS[p.seatIndex];
          return (
            <div
              key={`bet-${p.seatIndex}`}
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${betPos.x}%`,
                top: `${betPos.y}%`,
                zIndex: 20,
              }}
            >
              <BetChip amount={p.currentBet} />
            </div>
          );
        })}

      {/* Collecting bet chips animation */}
      {collectingBets && tableRef.current && collectingBets.map(bet => {
        const betPos = BET_POSITIONS[bet.seatIndex];
        const rect = tableRef.current!.getBoundingClientRect();
        // Calculate pixel offset from bet position to pot center
        const startX = 0;
        const startY = 0;
        const endX = ((POT_CENTER.x - betPos.x) / 100) * rect.width;
        const endY = ((POT_CENTER.y - betPos.y) / 100) * rect.height;

        return (
          <div
            key={`collect-${bet.seatIndex}`}
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${betPos.x}%`,
              top: `${betPos.y}%`,
              zIndex: 20,
            }}
          >
            <BetChip
              amount={bet.amount}
              collecting
              style={{
                '--start-x': `${startX}px`,
                '--start-y': `${startY}px`,
                '--end-x': `${endX}px`,
                '--end-y': `${endY}px`,
              } as React.CSSProperties}
            />
          </div>
        );
      })}

      {/* Deal card animations (flying from dealer to seats) */}
      {dealCardAnimations.map(anim => {
        const seatPos = SEAT_POSITIONS[anim.seatIndex];
        return (
          <div
            key={anim.id}
            className="absolute pointer-events-none"
            style={{
              left: `${seatPos.x}%`,
              top: `${seatPos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 45,
            }}
          >
            <div
              className="animate-card-deal-fly"
              style={{
                '--deal-start-x': `${anim.startX}px`,
                '--deal-start-y': `${anim.startY}px`,
              } as React.CSSProperties}
            >
              <CardBack size="sm" />
            </div>
          </div>
        );
      })}

      {/* Bet chip fly animations (from seat to bet position) */}
      {betChipAnimations.map(anim => {
        const betPos = BET_POSITIONS[anim.seatIndex];
        return (
          <div
            key={anim.id}
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${betPos.x}%`,
              top: `${betPos.y}%`,
              zIndex: 48,
            }}
          >
            <div
              className="animate-chip-bet-fly"
              style={{
                '--start-x': `${anim.startX}px`,
                '--start-y': `${anim.startY}px`,
                '--end-x': '0px',
                '--end-y': '0px',
              } as React.CSSProperties}
            >
              <div className="flex items-center gap-1">
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #FBBF24, #D97706)',
                    border: '2px dashed rgba(255,255,255,0.4)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    flexShrink: 0,
                  }}
                />
                <span
                  className="font-mono font-bold tabular-nums"
                  style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {anim.amount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Chip fly animations */}
      {chipAnimations.map(anim => (
        <div
          key={anim.id}
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: '58%',
            zIndex: 50,
          }}
        >
          {/* Chip icon */}
          <div
            className="animate-chip-fly"
            style={{
              '--end-x': `${anim.targetX}px`,
              '--end-y': `${anim.targetY}px`,
              '--start-x': '0px',
              '--start-y': '0px',
            } as React.CSSProperties}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #FBBF24, #D97706)',
                border: '2px dashed rgba(255,255,255,0.4)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            />
          </div>
          {/* Amount label */}
          <div
            className="animate-chip-fly absolute font-mono font-bold tabular-nums"
            style={{
              '--end-x': `${anim.targetX}px`,
              '--end-y': `${anim.targetY - 20}px`,
              '--start-x': '0px',
              '--start-y': '-20px',
              color: '#EAB308',
              fontSize: 14,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
              top: 0,
              left: 0,
            } as React.CSSProperties}
          >
            +{anim.amount.toLocaleString()}
          </div>
        </div>
      ))}

      {/* Waiting message */}
      {phase === 'waiting_for_players' && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }}
        >
          Waiting for players...
        </div>
      )}

      {/* Player seats */}
      {SEAT_POSITIONS.map((pos, seatIndex) => {
        const player = players.find(p => p.seatIndex === seatIndex);
        return (
          <div
            key={seatIndex}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 10 }}
          >
            {player ? (
              <PlayerSeat
                player={player}
                isWinner={winnerSeats.includes(seatIndex)}
                timerSeconds={timerData?.seatIndex === seatIndex ? timerData.secondsRemaining : undefined}
                timerMax={config.actionTimeSeconds}
                foldDirection={getFoldDirection(seatIndex)}
              />
            ) : (
              <div
                className="flex items-center justify-center"
                style={{
                  width: 100,
                  height: 56,
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(0,0,0,0.15)',
                  color: 'rgba(255,255,255,0.15)',
                  fontSize: 11,
                }}
              >
                Seat {seatIndex + 1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
