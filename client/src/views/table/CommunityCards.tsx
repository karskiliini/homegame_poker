import { useRef, useEffect, useState } from 'react';
import type { CardString } from '@poker/shared';
import { CardComponent } from '../../components/Card.js';
import { CardBack } from '../../components/CardBack.js';

interface CommunityCardsProps {
  cards: CardString[];
  winningCards?: CardString[];
  dramaticRiver?: boolean;
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

/** Dramatic river card: slow peel from left to right revealing the card underneath */
function DramaticRiverCard({ card, isWinner }: {
  card: CardString;
  isWinner: boolean;
}) {
  const [phase, setPhase] = useState<'peel' | 'done'>('peel');

  useEffect(() => {
    // Total animation: 2500ms
    const timer = setTimeout(() => setPhase('done'), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (phase === 'done') {
    return <CardComponent card={card} size="md" isWinner={isWinner} />;
  }

  return (
    <div className="animate-community-deal" style={{ position: 'relative' }}>
      {/* The actual card underneath */}
      <CardComponent card={card} size="md" isWinner={isWinner} />

      {/* Card back overlay that peels away */}
      <div
        className="animate-river-peel"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <CardBack size="md" />
      </div>
    </div>
  );
}

export function CommunityCards({ cards, winningCards = [], dramaticRiver }: CommunityCardsProps) {
  const prevCountRef = useRef(0);
  const animatedFromRef = useRef(0);

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

        // Use dramatic river animation for the 5th card (index 4) when dramatic
        if (dramaticRiver && i === 4 && isNew) {
          return (
            <DramaticRiverCard
              key={`${card}-${i}`}
              card={card}
              isWinner={winningCards.includes(card)}
            />
          );
        }

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
