import type { GameState, PublicPlayerState } from '@poker/shared';
import { PlayerSeat } from './PlayerSeat.js';
import { CommunityCards } from './CommunityCards.js';
import { PotDisplay } from './PotDisplay.js';

// Seat positions around an oval table (percentage-based, for 10 seats)
const SEAT_POSITIONS: { x: number; y: number }[] = [
  { x: 50, y: 92 },   // 0: bottom center
  { x: 20, y: 85 },   // 1: bottom left
  { x: 4, y: 58 },    // 2: left
  { x: 4, y: 32 },    // 3: upper left
  { x: 20, y: 10 },   // 4: top left
  { x: 50, y: 4 },    // 5: top center
  { x: 80, y: 10 },   // 6: top right
  { x: 96, y: 32 },   // 7: upper right
  { x: 96, y: 58 },   // 8: right
  { x: 80, y: 85 },   // 9: bottom right
];

interface PokerTableProps {
  gameState: GameState;
}

export function PokerTable({ gameState }: PokerTableProps) {
  const { players, communityCards, pots, phase, handNumber, config } = gameState;

  return (
    <div className="relative w-full h-full max-w-[1400px] max-h-[900px]">
      {/* Table felt */}
      <div className="absolute inset-[8%] rounded-[50%] bg-gradient-to-b from-[#1a6b30] to-[#145524] border-[12px] border-[#5c3a0e] shadow-[inset_0_0_80px_rgba(0,0,0,0.4),0_0_40px_rgba(0,0,0,0.6)]" />

      {/* Table rail */}
      <div className="absolute inset-[6.5%] rounded-[50%] border-[3px] border-[#8b6914]/30 pointer-events-none" />

      {/* Game info */}
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 text-center">
        <div className="text-[#c4a634] text-sm font-medium tracking-wider">
          {config.gameType} {config.smallBlind}/{config.bigBlind}
          {handNumber > 0 && <span className="ml-4 text-gray-400">Hand #{handNumber}</span>}
        </div>
      </div>

      {/* Community cards */}
      {communityCards.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <CommunityCards cards={communityCards} />
        </div>
      )}

      {/* Pots */}
      {pots.length > 0 && (
        <div className="absolute top-[60%] left-1/2 -translate-x-1/2">
          <PotDisplay pots={pots} />
        </div>
      )}

      {/* Waiting message */}
      {phase === 'waiting_for_players' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/60 text-xl">
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
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            {player ? (
              <PlayerSeat player={player} />
            ) : (
              <div className="w-24 h-16 rounded-lg border border-white/10 bg-black/20 flex items-center justify-center text-white/20 text-xs">
                Seat {seatIndex + 1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
