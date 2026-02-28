import { useRef, useEffect, useState } from 'react';
import type { CardString } from '@poker/shared';
import { CardComponent } from '../../components/Card.js';
import { CardBack } from '../../components/CardBack.js';

interface CommunityCardsProps {
  cards: CardString[];
  winningCards?: CardString[];
  /** Number of cards already visible (no deal animation) when component mounts. Used for RIT Board 2 shared cards. */
  initialCount?: number;
}

/** Single community card with slide-in + 3D flip animation */
function FlippingCard({ card, isNew, staggerIndex, isWinner }: {
  card: CardString;
  isNew: boolean;
  staggerIndex: number;
  isWinner: boolean;
}) {
  const [flipped, setFlipped] = useState(!isNew);

  useEffect(() => {
    if (isNew && !flipped) {
      // Flip starts 250ms after this card's stagger-delayed slide begins
      const delay = staggerIndex * 80 + 250;
      const timer = setTimeout(() => setFlipped(true), delay);
      return () => clearTimeout(timer);
    }
  }, [isNew, flipped, staggerIndex]);

  // Cards already on the board: just render normally
  if (!isNew) {
    return (
      <CardComponent card={card} size="md" isWinner={isWinner} />
    );
  }

  // New cards: slide in showing back, then 3D flip to reveal front
  return (
    <div
      className="animate-community-deal"
      style={{ animationDelay: `${staggerIndex * 80}ms` }}
    >
      <div style={{ perspective: 800 }}>
        <div
          style={{
            transition: 'transform 300ms ease-out',
            transform: flipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transformStyle: 'preserve-3d',
            position: 'relative',
          }}
        >
          {/* Front face (actual card) */}
          <div style={{ backfaceVisibility: 'hidden' }}>
            <CardComponent card={card} size="md" isWinner={isWinner} />
          </div>
          {/* Back face (card back) */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            <CardBack size="md" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommunityCards({ cards, winningCards = [], initialCount = 0 }: CommunityCardsProps) {
  const prevCountRef = useRef(initialCount);
  const animatedFromRef = useRef(initialCount);

  useEffect(() => {
    if (cards.length > prevCountRef.current) {
      animatedFromRef.current = prevCountRef.current;
    }
    prevCountRef.current = cards.length;
  }, [cards.length]);

  const animateFrom = animatedFromRef.current;

  return (
    <div className="flex gap-2">
      {cards.map((card, i) => {
        const isNew = i >= animateFrom;
        const staggerIndex = isNew ? i - animateFrom : 0;

        return (
          <FlippingCard
            key={`${card}-${i}`}
            card={card}
            isNew={isNew}
            staggerIndex={staggerIndex}
            isWinner={winningCards.includes(card)}
          />
        );
      })}
    </div>
  );
}
