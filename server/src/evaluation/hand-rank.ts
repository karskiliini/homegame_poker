// Custom hand evaluator since pokersolver may not have proper TypeScript support
// This evaluates standard 5-card poker hands

import type { CardString, Rank, Suit } from '@poker/shared';

export interface EvaluationResult {
  rank: number;       // Higher = better (0-9 category, then sub-ranking)
  handName: string;   // "Royal Flush", "Full House", etc.
  description: string; // "Full House, Aces full of Kings"
  bestCards: CardString[];
}

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

const HAND_CATEGORIES = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9,
};

const RANK_DISPLAY: Record<Rank, string> = {
  '2': 'Twos', '3': 'Threes', '4': 'Fours', '5': 'Fives', '6': 'Sixes',
  '7': 'Sevens', '8': 'Eights', '9': 'Nines', 'T': 'Tens', 'J': 'Jacks',
  'Q': 'Queens', 'K': 'Kings', 'A': 'Aces',
};

const RANK_SINGLE: Record<Rank, string> = {
  '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five', '6': 'Six',
  '7': 'Seven', '8': 'Eight', '9': 'Nine', 'T': 'Ten', 'J': 'Jack',
  'Q': 'Queen', 'K': 'King', 'A': 'Ace',
};

interface ParsedCard {
  rank: Rank;
  suit: Suit;
  value: number;
  original: CardString;
}

function parseCard(card: CardString): ParsedCard {
  const rank = card[0] as Rank;
  const suit = card[1] as Suit;
  return { rank, suit, value: RANK_VALUES[rank], original: card };
}

function evaluate5(cards: CardString[]): EvaluationResult {
  const parsed = cards.map(parseCard).sort((a, b) => b.value - a.value);
  const values = parsed.map(c => c.value);
  const suits = parsed.map(c => c.suit);
  const ranks = parsed.map(c => c.rank);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight (including A-2-3-4-5 wheel)
  let isStraight = false;
  let straightHigh = 0;
  if (values[0] - values[4] === 4 && new Set(values).size === 5) {
    isStraight = true;
    straightHigh = values[0];
  }
  // Wheel: A-2-3-4-5
  if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
    isStraight = true;
    straightHigh = 5; // 5-high straight
  }

  // Count ranks
  const rankCounts = new Map<number, number>();
  for (const v of values) {
    rankCounts.set(v, (rankCounts.get(v) || 0) + 1);
  }
  const counts = [...rankCounts.entries()].sort((a, b) => {
    // Sort by count desc, then by value desc
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const bestCards = parsed.map(c => c.original);

  // Royal Flush
  if (isFlush && isStraight && straightHigh === 14) {
    return {
      rank: HAND_CATEGORIES.ROYAL_FLUSH * 100000000,
      handName: 'Royal Flush',
      description: 'Royal Flush',
      bestCards,
    };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return {
      rank: HAND_CATEGORIES.STRAIGHT_FLUSH * 100000000 + straightHigh,
      handName: 'Straight Flush',
      description: `Straight Flush, ${RANK_SINGLE[ranks[isStraightWheel(values) ? 1 : 0]]}-high`,
      bestCards,
    };
  }

  // Four of a Kind
  if (counts[0][1] === 4) {
    const quadRank = counts[0][0];
    const kicker = counts[1][0];
    return {
      rank: HAND_CATEGORIES.FOUR_OF_KIND * 100000000 + quadRank * 100 + kicker,
      handName: 'Four of a Kind',
      description: `Four of a Kind, ${RANK_DISPLAY[valueToRank(quadRank)]}`,
      bestCards,
    };
  }

  // Full House
  if (counts[0][1] === 3 && counts[1][1] === 2) {
    const tripRank = counts[0][0];
    const pairRank = counts[1][0];
    return {
      rank: HAND_CATEGORIES.FULL_HOUSE * 100000000 + tripRank * 100 + pairRank,
      handName: 'Full House',
      description: `Full House, ${RANK_DISPLAY[valueToRank(tripRank)]} full of ${RANK_DISPLAY[valueToRank(pairRank)]}`,
      bestCards,
    };
  }

  // Flush
  if (isFlush) {
    const rankVal = values[0] * 10000 + values[1] * 1000 + values[2] * 100 + values[3] * 10 + values[4];
    return {
      rank: HAND_CATEGORIES.FLUSH * 100000000 + rankVal,
      handName: 'Flush',
      description: `Flush, ${RANK_SINGLE[ranks[0]]}-high`,
      bestCards,
    };
  }

  // Straight
  if (isStraight) {
    return {
      rank: HAND_CATEGORIES.STRAIGHT * 100000000 + straightHigh,
      handName: 'Straight',
      description: `Straight, ${RANK_SINGLE[valueToRank(straightHigh)]}-high`,
      bestCards,
    };
  }

  // Three of a Kind
  if (counts[0][1] === 3) {
    const tripRank = counts[0][0];
    const kickers = counts.filter(c => c[1] === 1).map(c => c[0]);
    return {
      rank: HAND_CATEGORIES.THREE_OF_KIND * 100000000 + tripRank * 10000 + kickers[0] * 100 + (kickers[1] || 0),
      handName: 'Three of a Kind',
      description: `Three of a Kind, ${RANK_DISPLAY[valueToRank(tripRank)]}`,
      bestCards,
    };
  }

  // Two Pair
  if (counts[0][1] === 2 && counts[1][1] === 2) {
    const highPair = Math.max(counts[0][0], counts[1][0]);
    const lowPair = Math.min(counts[0][0], counts[1][0]);
    const kicker = counts[2][0];
    return {
      rank: HAND_CATEGORIES.TWO_PAIR * 100000000 + highPair * 10000 + lowPair * 100 + kicker,
      handName: 'Two Pair',
      description: `Two Pair, ${RANK_DISPLAY[valueToRank(highPair)]} and ${RANK_DISPLAY[valueToRank(lowPair)]}`,
      bestCards,
    };
  }

  // Pair
  if (counts[0][1] === 2) {
    const pairRank = counts[0][0];
    const kickers = counts.filter(c => c[1] === 1).map(c => c[0]);
    return {
      rank: HAND_CATEGORIES.PAIR * 100000000 + pairRank * 1000000 + kickers[0] * 10000 + kickers[1] * 100 + kickers[2],
      handName: 'Pair',
      description: `Pair of ${RANK_DISPLAY[valueToRank(pairRank)]}`,
      bestCards,
    };
  }

  // High Card
  const rankVal = values[0] * 10000 + values[1] * 1000 + values[2] * 100 + values[3] * 10 + values[4];
  return {
    rank: HAND_CATEGORIES.HIGH_CARD * 100000000 + rankVal,
    handName: 'High Card',
    description: `${RANK_SINGLE[ranks[0]]}-high`,
    bestCards,
  };
}

function isStraightWheel(values: number[]): boolean {
  return values[0] === 14 && values[1] === 5;
}

function valueToRank(value: number): Rank {
  for (const [rank, val] of Object.entries(RANK_VALUES)) {
    if (val === value) return rank as Rank;
  }
  return '2';
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

export function evaluateNLHE(holeCards: CardString[], communityCards: CardString[]): EvaluationResult {
  const allCards = [...holeCards, ...communityCards];
  // Find best 5-card hand from all available cards
  const combos = combinations(allCards, 5);
  let best: EvaluationResult | null = null;
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || result.rank > best.rank) {
      best = result;
    }
  }
  return best!;
}

export function evaluatePLO(holeCards: CardString[], communityCards: CardString[]): EvaluationResult {
  // PLO: must use EXACTLY 2 hole cards and EXACTLY 3 community cards
  const holeCombos = combinations(holeCards, 2);
  const boardCombos = combinations(communityCards, 3);

  let best: EvaluationResult | null = null;
  for (const hole2 of holeCombos) {
    for (const board3 of boardCombos) {
      const fiveCards = [...hole2, ...board3];
      const result = evaluate5(fiveCards);
      if (!best || result.rank > best.rank) {
        best = result;
      }
    }
  }
  return best!;
}

export function evaluateHand(
  gameType: 'NLHE' | 'PLO',
  holeCards: CardString[],
  communityCards: CardString[],
): EvaluationResult {
  return gameType === 'NLHE'
    ? evaluateNLHE(holeCards, communityCards)
    : evaluatePLO(holeCards, communityCards);
}

export function determineWinners(
  gameType: 'NLHE' | 'PLO',
  players: { playerId: string; holeCards: CardString[] }[],
  communityCards: CardString[],
): { playerId: string; result: EvaluationResult }[] {
  const evaluated = players.map(p => ({
    playerId: p.playerId,
    result: evaluateHand(gameType, p.holeCards, communityCards),
  }));

  evaluated.sort((a, b) => b.result.rank - a.result.rank);

  const bestRank = evaluated[0].result.rank;
  return evaluated.filter(e => e.result.rank === bestRank);
}
