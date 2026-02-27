import type { CardString } from '@poker/shared';
import { CardComponent } from '../../components/Card.js';

interface CommunityCardsProps {
  cards: CardString[];
  label?: string;
}

export function CommunityCards({ cards, label }: CommunityCardsProps) {
  return (
    <div className="flex flex-col items-center">
      {label && (
        <div className="text-white/50 text-xs mb-1">{label}</div>
      )}
      <div className="flex gap-2">
        {cards.map((card, i) => (
          <CardComponent key={i} card={card} size="md" />
        ))}
      </div>
    </div>
  );
}
