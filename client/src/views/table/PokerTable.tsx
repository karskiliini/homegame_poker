import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState } from '@poker/shared';
import { PlayerSeat } from './PlayerSeat.js';
import { CommunityCards } from './CommunityCards.js';
import { PotDisplay } from './PotDisplay.js';

// Seat positions around an oval table (percentage-based, for 10 seats)
const SEAT_POSITIONS: { x: number; y: number }[] = [
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

interface PotAward {
  potIndex: number;
  amount: number;
  winnerSeatIndex: number;
  winnerName: string;
}

interface ChipAnimation {
  id: number;
  targetX: number;
  targetY: number;
  amount: number;
}

interface PokerTableProps {
  gameState: GameState;
  potAwards?: PotAward[];
  winnerSeats?: number[];
  timerData?: { seatIndex: number; secondsRemaining: number } | null;
}

let chipAnimId = 0;

export function PokerTable({ gameState, potAwards, winnerSeats = [], timerData }: PokerTableProps) {
  const { players, communityCards, pots, phase, handNumber, config } = gameState;
  const [chipAnimations, setChipAnimations] = useState<ChipAnimation[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

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
          <CommunityCards cards={communityCards} />
        </div>
      )}

      {/* Pots */}
      {pots.length > 0 && (
        <div className="absolute top-[58%] left-1/2 -translate-x-1/2">
          <PotDisplay pots={pots} />
        </div>
      )}

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
