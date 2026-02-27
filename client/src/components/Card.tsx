import type { CardString, Suit, Rank } from '@poker/shared';
import { SUIT_SYMBOLS, RANK_NAMES } from '@poker/shared';

interface CardComponentProps {
  card: CardString;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-8 h-11 text-xs',
  md: 'w-12 h-17 text-base',
  lg: 'w-16 h-22 text-lg',
};

export function CardComponent({ card, size = 'md' }: CardComponentProps) {
  const rank = card[0] as Rank;
  const suit = card[1] as Suit;
  const isRed = suit === 'h' || suit === 'd';
  const displayRank = rank === 'T' ? '10' : rank;

  return (
    <div className={`
      ${SIZE_CLASSES[size]}
      rounded-md bg-white shadow-md
      flex flex-col items-center justify-center
      font-bold leading-none select-none
      ${isRed ? 'text-red-600' : 'text-gray-900'}
    `}>
      <span>{displayRank}</span>
      <span className="text-[0.7em]">{SUIT_SYMBOLS[suit]}</span>
    </div>
  );
}
