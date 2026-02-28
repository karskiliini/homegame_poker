import type { CardString, GameType } from '@poker/shared';
import { evaluateHand } from './hand-rank.js';

/**
 * Minimum hand category for a loss to qualify as a "bad beat".
 * TWO_PAIR = 2 (from HAND_CATEGORIES in hand-rank.ts)
 * Categories: HIGH_CARD=0, PAIR=1, TWO_PAIR=2, THREE_OF_KIND=3, ...
 */
export const BAD_BEAT_MIN_HAND_CATEGORY = 2; // TWO_PAIR

export interface BadBeatResult {
  loserPlayerId: string;
  loserSeatIndex: number;
  loserHandName: string;
  loserHandDescription: string;
  winnerPlayerId: string;
  winnerSeatIndex: number;
  winnerHandName: string;
}

interface ShowdownPlayer {
  playerId: string;
  seatIndex: number;
  holeCards: CardString[];
}

/**
 * Detect if a bad beat occurred at showdown.
 * A bad beat is when a player loses with TWO_PAIR or better.
 * Returns info about the strongest losing hand if it qualifies, or null.
 */
export function isBadBeat(
  gameType: GameType,
  showdownPlayers: ShowdownPlayer[],
  communityCards: CardString[],
  winnerPlayerIds: string[],
): BadBeatResult | null {
  if (showdownPlayers.length < 2) return null;
  if (winnerPlayerIds.length === 0) return null;

  // Evaluate all hands
  const evaluated = showdownPlayers.map(p => ({
    ...p,
    eval: evaluateHand(gameType === 'PLO' ? 'PLO' : 'NLHE', p.holeCards, communityCards),
  }));

  // Find losers (not in winner set)
  const losers = evaluated.filter(p => !winnerPlayerIds.includes(p.playerId));
  if (losers.length === 0) return null;

  // Find the strongest loser
  const strongestLoser = losers.reduce((best, curr) =>
    curr.eval.rank > best.eval.rank ? curr : best
  );

  // Check if the loser's hand category is >= TWO_PAIR
  // The hand category is encoded as Math.floor(rank / 100000000)
  const handCategory = Math.floor(strongestLoser.eval.rank / 100000000);
  if (handCategory < BAD_BEAT_MIN_HAND_CATEGORY) return null;

  // Find the winner for context
  const winner = evaluated.find(p => winnerPlayerIds.includes(p.playerId));
  if (!winner) return null;

  return {
    loserPlayerId: strongestLoser.playerId,
    loserSeatIndex: strongestLoser.seatIndex,
    loserHandName: strongestLoser.eval.handName,
    loserHandDescription: strongestLoser.eval.description,
    winnerPlayerId: winner.playerId,
    winnerSeatIndex: winner.seatIndex,
    winnerHandName: winner.eval.handName,
  };
}
