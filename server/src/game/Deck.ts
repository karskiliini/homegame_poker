import type { CardString } from '@poker/shared';
import { createDeck, shuffleDeck } from '@poker/shared';

export class Deck {
  private cards: CardString[];

  constructor(predeterminedCards?: CardString[]) {
    this.cards = predeterminedCards ? [...predeterminedCards] : shuffleDeck(createDeck());
  }

  deal(count: number): CardString[] {
    if (this.cards.length < count) {
      throw new Error(`Not enough cards in deck: need ${count}, have ${this.cards.length}`);
    }
    return this.cards.splice(0, count);
  }

  dealOne(): CardString {
    return this.deal(1)[0];
  }

  remaining(): number {
    return this.cards.length;
  }
}
