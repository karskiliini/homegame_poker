import type { CardString, Suit, Rank } from '@poker/shared';
import { SUIT_SYMBOLS } from '@poker/shared';

interface CardComponentProps {
  card: CardString;
  size?: 'sm' | 'md' | 'lg';
  isWinner?: boolean;
}

const SIZE_STYLES = {
  sm: { width: 36, height: 52, fontSize: 12, suitSize: 10, centerSuit: 20 },
  md: { width: 50, height: 72, fontSize: 14, suitSize: 12, centerSuit: 24 },
  lg: { width: 68, height: 96, fontSize: 18, suitSize: 16, centerSuit: 32 },
};

// FTP 4-color deck
const SUIT_COLORS: Record<Suit, string> = {
  s: '#1a1a1a', // Spades - black
  h: '#CC0000', // Hearts - red
  d: '#0066CC', // Diamonds - blue
  c: '#008800', // Clubs - green
};

export function CardComponent({ card, size = 'md', isWinner }: CardComponentProps) {
  const rank = card[0] as Rank;
  const suit = card[1] as Suit;
  const displayRank = rank === 'T' ? '10' : rank;
  const s = SIZE_STYLES[size];
  const color = SUIT_COLORS[suit];

  return (
    <div
      className={`relative select-none ${isWinner ? 'animate-winner-flash' : ''}`}
      style={{
        width: s.width,
        height: s.height,
        background: '#F5F5F0',
        border: '1px solid #CCCCCC',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15)',
        borderRadius: 4,
      }}
    >
      {/* Top-left rank + suit */}
      <div
        className="absolute font-black leading-none"
        style={{ top: 3, left: 4, color }}
      >
        <div style={{ fontSize: s.fontSize, fontWeight: 900 }}>{displayRank}</div>
        <div style={{ fontSize: s.suitSize, marginTop: -1 }}>{SUIT_SYMBOLS[suit]}</div>
      </div>

      {/* Center suit */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: s.centerSuit,
          color,
          opacity: 0.6,
        }}
      >
        {SUIT_SYMBOLS[suit]}
      </div>
    </div>
  );
}
