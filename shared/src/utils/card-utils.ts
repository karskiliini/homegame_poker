import type { CardString, Suit, Rank } from '../types/card.js';
import { SUITS, RANKS, SUIT_SYMBOLS, RANK_NAMES } from '../types/card.js';

export function createDeck(): CardString[] {
  const deck: CardString[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}` as CardString);
    }
  }
  return deck;
}

export function shuffleDeck(deck: CardString[]): CardString[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function cardToDisplay(card: CardString): string {
  const rank = card[0] as Rank;
  const suit = card[1] as Suit;
  return `${RANK_NAMES[rank]}${SUIT_SYMBOLS[suit]}`;
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'h' || suit === 'd';
}
