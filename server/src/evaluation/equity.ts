import type { CardString, GameType } from '@poker/shared';
import { RANKS, SUITS } from '@poker/shared';
import { determineWinners } from './hand-rank.js';

const FULL_DECK: CardString[] = [];
for (const r of RANKS) {
  for (const s of SUITS) {
    FULL_DECK.push(`${r}${s}` as CardString);
  }
}

const MONTE_CARLO_THRESHOLD = 50_000;
const MONTE_CARLO_SAMPLES = 2_000;

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: T[][] = [];
  function helper(start: number, combo: T[]) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return result;
}

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function nCr(n: number, r: number): number {
  if (r > n) return 0;
  return factorial(n) / (factorial(r) * factorial(n - r));
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function calculateEquity(
  gameType: GameType,
  players: { playerId: string; holeCards: CardString[] }[],
  communityCards: CardString[],
): Map<string, number> {
  const result = new Map<string, number>();
  const cardsNeeded = 5 - communityCards.length;

  // All cards in play
  const usedCards = new Set<CardString>([
    ...communityCards,
    ...players.flatMap(p => p.holeCards),
  ]);

  const remainingDeck = FULL_DECK.filter(c => !usedCards.has(c));

  if (cardsNeeded === 0) {
    // Board is complete — deterministic evaluation
    const winners = determineWinners(gameType, players, communityCards);
    const winnerIds = new Set(winners.map(w => w.playerId));
    const share = 100 / winnerIds.size;
    for (const p of players) {
      result.set(p.playerId, winnerIds.has(p.playerId) ? Math.round(share) : 0);
    }
    return result;
  }

  const totalCombinations = nCr(remainingDeck.length, cardsNeeded);
  const useMonteCarlo = totalCombinations > MONTE_CARLO_THRESHOLD;

  // Track wins (including fractional for ties)
  const wins = new Map<string, number>();
  for (const p of players) {
    wins.set(p.playerId, 0);
  }

  let totalSamples = 0;

  if (useMonteCarlo) {
    // Monte Carlo sampling
    for (let i = 0; i < MONTE_CARLO_SAMPLES; i++) {
      shuffleArray(remainingDeck);
      const board = [...communityCards, ...remainingDeck.slice(0, cardsNeeded)];
      const winners = determineWinners(gameType, players, board);
      const share = 1 / winners.length;
      for (const w of winners) {
        wins.set(w.playerId, wins.get(w.playerId)! + share);
      }
      totalSamples++;
    }
  } else {
    // Exhaustive enumeration
    const boardCombos = combinations(remainingDeck, cardsNeeded);
    for (const combo of boardCombos) {
      const board = [...communityCards, ...combo];
      const winners = determineWinners(gameType, players, board);
      const share = 1 / winners.length;
      for (const w of winners) {
        wins.set(w.playerId, wins.get(w.playerId)! + share);
      }
      totalSamples++;
    }
  }

  // Convert to percentages
  for (const p of players) {
    const eq = (wins.get(p.playerId)! / totalSamples) * 100;
    result.set(p.playerId, Math.round(eq));
  }

  return result;
}
