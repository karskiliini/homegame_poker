import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { GameState, CardString } from '@poker/shared';
import { breakdownChips } from '@poker/shared';
import { PlayerSeat } from './PlayerSeat.js';
import { CommunityCards } from './CommunityCards.js';
import { PotDisplay } from './PotDisplay.js';
import { BetChip } from './BetChip.js';
import { CardBack } from '../../components/CardBack.js';
import { CardComponent } from '../../components/Card.js';
import { ChipStack } from '../../components/ChipStack.js';
import { useT } from '../../hooks/useT.js';

// Virtual table dimensions — defines the fixed aspect ratio (18:11)
// Both TV and phone views use these to scale the table via CSS transform
export const TABLE_VIRTUAL_W = 900;
export const TABLE_VIRTUAL_H = 550;

// Seat positions around an oval table (percentage-based, for 10 seats)
export const SEAT_POSITIONS: { x: number; y: number }[] = [
  { x: 50, y: 92 },   // 0: bottom center
  { x: 18, y: 82 },   // 1: bottom left
  { x: 3, y: 55 },    // 2: left
  { x: 3, y: 30 },    // 3: upper left
  { x: 18, y: 12 },   // 4: top left
  { x: 50, y: 8 },    // 5: top center
  { x: 82, y: 12 },   // 6: top right
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
  { x: 31, y: 27 },   // 4
  { x: 50, y: 25 },   // 5
  { x: 69, y: 27 },   // 6
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
  awardingPotIndex?: number | null;
  timerData?: { seatIndex: number; secondsRemaining: number } | null;
  collectingBets?: CollectingBet[] | null;
  potGrow?: boolean;
  betChipAnimations?: BetChipAnimation[];
  dealCardAnimations?: DealCardAnimation[];
  /** Rotate seats so this seat appears at bottom center */
  mySeatIndex?: number;
  /** Player ID for card injection */
  myPlayerId?: string;
  /** Hole cards to show face-up for myPlayerId's seat */
  myHoleCards?: CardString[];
  /** Highlight own seat with accent border */
  highlightMySeat?: boolean;
  /** Equity percentages per seat index (from all-in showdown) */
  equities?: Record<number, number> | null;
  /** Whether the river card should use dramatic peel animation */
  dramaticRiver?: boolean;
  /** Called when an empty seat is clicked (for seat selection) */
  onSeatClick?: (seatIndex: number) => void;
}

// Table center in percentage coordinates
const TABLE_CENTER = { x: 50, y: 50 };

let chipAnimId = 0;

function EmptySeat({ seatIndex, onClick }: { seatIndex: number; onClick?: (seatIndex: number) => void }) {
  const [hovered, setHovered] = useState(false);
  const t = useT();
  const isClickable = !!onClick;

  return (
    <div
      className={`flex items-center justify-center${isClickable ? '' : ' pointer-events-none'}`}
      style={{
        width: 140,
        height: 56,
        borderRadius: 6,
        border: hovered
          ? '1px solid rgba(74, 222, 128, 0.5)'
          : '1px solid rgba(255,255,255,0.08)',
        background: hovered
          ? 'linear-gradient(180deg, rgba(34, 197, 94, 0.35), rgba(22, 163, 74, 0.25))'
          : 'linear-gradient(180deg, rgba(30,58,95,0.3), rgba(15,30,51,0.3))',
        color: hovered ? '#4ADE80' : 'rgba(255,255,255,0.2)',
        fontSize: hovered ? 14 : 11,
        fontWeight: hovered ? 700 : 400,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        textTransform: hovered ? 'uppercase' : 'none',
        letterSpacing: hovered ? 2 : 0,
        ...(hovered ? {
          boxShadow: '0 0 16px rgba(74, 222, 128, 0.25), inset 0 0 12px rgba(74, 222, 128, 0.1)',
        } : {}),
      }}
      onMouseEnter={() => isClickable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => isClickable && setHovered(true)}
      onTouchEnd={() => { setHovered(false); if (isClickable) onClick(seatIndex); }}
      onClick={() => isClickable && onClick(seatIndex)}
    >
      <span className={hovered ? 'animate-sit-in-pulse' : ''}>
        {hovered ? t('table_sit_in') : `${t('table_seat')} ${seatIndex + 1}`}
      </span>
    </div>
  );
}

export function PokerTable({
  gameState, potAwards, winnerSeats = [], awardingPotIndex,
  timerData, collectingBets, potGrow,
  betChipAnimations = [], dealCardAnimations = [],
  mySeatIndex, myPlayerId, myHoleCards, highlightMySeat,
  equities, dramaticRiver, onSeatClick,
}: PokerTableProps) {
  const { players, communityCards, secondBoard, pots, phase, handNumber, config } = gameState;
  const numHoleCards = config.gameType === 'PLO' ? 4 : 2;
  const [chipAnimations, setChipAnimations] = useState<ChipAnimation[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);
  const t = useT();

  // Position lookup that respects seat rotation
  const getDisplaySeatPos = useCallback((physicalSeatIndex: number) => {
    if (mySeatIndex == null) return SEAT_POSITIONS[physicalSeatIndex];
    const displayIdx = (physicalSeatIndex - mySeatIndex + 10) % 10;
    return SEAT_POSITIONS[displayIdx];
  }, [mySeatIndex]);

  const getDisplayBetPos = useCallback((physicalSeatIndex: number) => {
    if (mySeatIndex == null) return BET_POSITIONS[physicalSeatIndex];
    const displayIdx = (physicalSeatIndex - mySeatIndex + 10) % 10;
    return BET_POSITIONS[displayIdx];
  }, [mySeatIndex]);

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
      const seatPos = getDisplaySeatPos(award.winnerSeatIndex);
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

    const timer = setTimeout(() => {
      setChipAnimations([]);
    }, 800);

    return () => clearTimeout(timer);
  }, [potAwards, getDisplaySeatPos]);

  // Calculate fold direction vectors (from display seat toward table center)
  const getFoldDirection = useCallback((physicalSeatIndex: number) => {
    const seat = getDisplaySeatPos(physicalSeatIndex);
    const dx = TABLE_CENTER.x - seat.x;
    const dy = TABLE_CENTER.y - seat.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: -40 };
    const scale = 80;
    return { x: (dx / len) * scale, y: (dy / len) * scale };
  }, [getDisplaySeatPos]);

  return (
    <div
      ref={tableRef}
      className="relative"
      style={{ width: TABLE_VIRTUAL_W, height: TABLE_VIRTUAL_H, aspectRatio: '900 / 550' }}
    >
      {/* Table rail (outer border) — red padded leather */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: '5.5%',
          borderRadius: '50%',
          background: 'linear-gradient(180deg, #7A4F2B 0%, #5C3A1E 20%, #4A2E16 60%, #3D2510 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 3px 8px rgba(255,220,160,0.15), inset 0 -3px 6px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.25)',
        }}
      />

      {/* Chrome accent — light reflection on rail top */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: '5.5%',
          borderRadius: '50%',
          background: 'linear-gradient(180deg, rgba(255,220,160,0.10) 0%, transparent 10%, transparent 100%)',
        }}
      />

      {/* Chrome ornament — left (9 o'clock) */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '4.5%',
          top: '46%',
          width: 6,
          height: 40,
          borderRadius: 3,
          background: 'linear-gradient(180deg, rgba(255,220,160,0.15), rgba(255,220,160,0.03))',
        }}
      />

      {/* Chrome ornament — right (3 o'clock) */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: '4.5%',
          top: '46%',
          width: 6,
          height: 40,
          borderRadius: 3,
          background: 'linear-gradient(180deg, rgba(255,220,160,0.15), rgba(255,220,160,0.03))',
        }}
      />

      {/* Table felt */}
      <div
        className="absolute"
        style={{
          inset: '7%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 45%, #52B86E 0%, #3A9D56 40%, #267A3C 100%)',
          boxShadow: 'inset 0 2px 25px rgba(0,0,0,0.35)',
        }}
      />

      {/* Felt watermark */}
      <div
        className="absolute pointer-events-none flex items-center justify-center"
        style={{
          inset: '7%',
          borderRadius: '50%',
        }}
      >
        <span
          style={{
            color: 'rgba(255,255,255,0.03)',
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: 12,
            textTransform: 'uppercase',
            userSelect: 'none',
          }}
        >
          POKER NIGHT
        </span>
      </div>

      {/* Inner line on felt */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: '10%',
          borderRadius: '50%',
          border: '1px solid rgba(220,200,120,0.15)',
        }}
      />

      {/* Game info */}
      <div className="absolute top-[13%] left-1/2 -translate-x-1/2 text-center">
        <div
          className="tracking-wider"
          style={{
            color: 'var(--ftp-gold)',
            fontSize: 14,
            fontWeight: 700,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          {config.gameType} {config.smallBlind}/{config.bigBlind}
        </div>
        {handNumber > 0 && (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
            Hand #{handNumber}
          </div>
        )}
      </div>

      {/* Community cards */}
      {communityCards.length > 0 && (() => {
        const hasRIT = secondBoard && secondBoard.length > 0;

        if (!hasRIT) {
          // Single board — render normally
          return (
            <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2">
              <CommunityCards
                cards={communityCards}
                winningCards={winnerSeats.length > 0 ? communityCards : undefined}
                dramaticRiver={dramaticRiver}
              />
            </div>
          );
        }

        // RIT: find shared (pre-all-in) cards
        let sharedCount = 0;
        while (sharedCount < communityCards.length && sharedCount < secondBoard.length
               && communityCards[sharedCount] === secondBoard[sharedCount]) {
          sharedCount++;
        }

        const sharedCards = communityCards.slice(0, sharedCount);
        const board1Extra = communityCards.slice(sharedCount);
        const board2Extra = secondBoard.slice(sharedCount);
        const isWinner = winnerSeats.length > 0;

        return (
          <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex gap-2 items-center">
              {/* Shared pre-all-in cards — centered */}
              {sharedCards.map((card) => (
                <CardComponent key={`shared-${card}`} card={card} size="md" isWinner={isWinner} />
              ))}

              {/* Board 1 & 2 split: fork above/below the shared card row */}
              {board1Extra.length > 0 && (
                <div style={{
                  position: 'relative',
                  width: board1Extra.length * 58 - 8,
                  height: 72,
                }}>
                  {/* Board 1 — half card height above, 3px gap */}
                  <div style={{ position: 'absolute', left: 0, bottom: 39 }}>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 600, marginBottom: 1 }}>
                      Board 1
                    </div>
                    <CommunityCards
                      cards={board1Extra}
                      winningCards={isWinner ? board1Extra : undefined}
                      initialCount={board1Extra.length}
                    />
                  </div>
                  {/* Board 2 — half card height below, animated deal */}
                  <div style={{ position: 'absolute', left: 0, top: 39 }}>
                    <CommunityCards
                      cards={board2Extra}
                      winningCards={isWinner ? board2Extra : undefined}
                    />
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 600, marginTop: 1 }}>
                      Board 2
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Pots */}
      {pots.length > 0 && (
        <div className="absolute top-[58%] left-1/2 -translate-x-1/2">
          <PotDisplay pots={pots} bigBlind={config.bigBlind} playerNames={playerNames} potGrow={potGrow} awardingPotIndex={awardingPotIndex} />
        </div>
      )}

      {/* Bet chips on the table */}
      {!collectingBets && players
        .filter(p => p.currentBet > 0)
        .map(p => {
          const betPos = getDisplayBetPos(p.seatIndex);
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
              <BetChip amount={p.currentBet} bigBlind={config.bigBlind} />
            </div>
          );
        })}

      {/* Collecting bet chips animation */}
      {collectingBets && tableRef.current && collectingBets.map(bet => {
        const betPos = getDisplayBetPos(bet.seatIndex);
        const rect = tableRef.current!.getBoundingClientRect();
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
              bigBlind={config.bigBlind}
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
        const seatPos = getDisplaySeatPos(anim.seatIndex);
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
        const betPos = getDisplayBetPos(anim.seatIndex);
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
                <ChipStack breakdown={breakdownChips(anim.amount, config.bigBlind)} size="sm" />
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
            <ChipStack breakdown={breakdownChips(anim.amount, config.bigBlind)} size="sm" />
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
          {t('table_waiting')}
        </div>
      )}

      {/* Player seats */}
      {Array.from({ length: 10 }, (_, seatIndex) => {
        const pos = getDisplaySeatPos(seatIndex);
        const player = players.find(p => p.seatIndex === seatIndex);
        // Inject own hole cards face-up when myPlayerId + myHoleCards are provided
        const displayPlayer = player && myPlayerId && myHoleCards && player.id === myPlayerId
          ? { ...player, holeCards: myHoleCards, hasCards: true }
          : player;
        const isMyHighlightedSeat = highlightMySeat && player && player.id === myPlayerId;
        return (
          <div
            key={seatIndex}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              zIndex: 10,
              ...(isMyHighlightedSeat ? {
                filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))',
              } : {}),
            }}
          >
            {displayPlayer ? (
              <PlayerSeat
                player={displayPlayer}
                isWinner={winnerSeats.includes(seatIndex)}
                timerSeconds={timerData?.seatIndex === seatIndex ? timerData.secondsRemaining : undefined}
                timerMax={config.actionTimeSeconds}
                foldDirection={getFoldDirection(seatIndex)}
                equity={equities?.[seatIndex]}
                numHoleCards={numHoleCards}
              />
            ) : (
              <EmptySeat
                seatIndex={seatIndex}
                onClick={onSeatClick}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
