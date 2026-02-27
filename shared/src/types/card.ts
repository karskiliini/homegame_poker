export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type CardString = `${Rank}${Suit}`;

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const SUITS: Suit[] = ['h', 'd', 'c', 's'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const SUIT_NAMES: Record<Suit, string> = { h: 'Hearts', d: 'Diamonds', c: 'Clubs', s: 'Spades' };
export const RANK_NAMES: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  'T': '10', 'J': 'Jack', 'Q': 'Queen', 'K': 'King', 'A': 'Ace',
};

export const SUIT_SYMBOLS: Record<Suit, string> = { h: '\u2665', d: '\u2666', c: '\u2663', s: '\u2660' };
