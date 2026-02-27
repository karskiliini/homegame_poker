import type { CardString } from '@poker/shared';
import { CardComponent } from '../../components/Card.js';

interface CommunityCardsProps {
  cards: CardString[];
  winningCards?: CardString[];
}

export function CommunityCards({ cards, winningCards = [] }: CommunityCardsProps) {
  return (
    <div className="flex gap-2">
      {cards.map((card, i) => (
        <div
          key={`${card}-${i}`}
          className="animate-card-flip"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <CardComponent
            card={card}
            size="md"
            isWinner={winningCards.includes(card)}
          />
        </div>
      ))}
    </div>
  );
}
