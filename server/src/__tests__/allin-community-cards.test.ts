import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HandEngine } from '../game/HandEngine.js';
import type { HandEngineEvent } from '../game/HandEngine.js';
import type { GameConfig, CardString } from '@poker/shared';

/**
 * Bug #3: All-in board dealing timing
 *
 * During an all-in runout, HandEngine.dealRunout() deals ALL remaining
 * community cards synchronously. This means getCommunityCards() returns
 * all 5 cards immediately, even when only the flop street_dealt event
 * has been processed so far.
 *
 * When GameManager processes each street_dealt event and broadcasts
 * game state, it should only include the community cards revealed
 * UP TO that point — not cards from future streets.
 *
 * Expected behavior:
 * 1. Flop dealt → game state shows 3 community cards
 * 2. Turn dealt → game state shows 4 community cards
 * 3. River dealt (dramatic peel) → game state shows 5 community cards
 * 4. River card is NOT visible before its street_dealt event
 * 5. River is NOT "dealt again" after the peel animation
 */

function makeConfig(): GameConfig {
  return {
    gameType: 'NLHE',
    smallBlind: 1,
    bigBlind: 2,
    maxBuyIn: 200,
    actionTimeSeconds: 30,
    minPlayers: 2,
    maxPlayers: 10,
  };
}

function buildFullDeck(): CardString[] {
  const suits = ['h', 'd', 'c', 's'] as const;
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
  const cards: CardString[] = [];
  for (const s of suits) {
    for (const r of ranks) {
      cards.push(`${r}${s}` as CardString);
    }
  }
  return cards;
}

function buildDeck(holeCards: CardString[][], board: CardString[]): CardString[] {
  const deck: CardString[] = [];
  for (const hand of holeCards) {
    deck.push(...hand);
  }
  const specifiedCards = new Set<string>([...holeCards.flat(), ...board]);
  const allCards = buildFullDeck();
  const availableForBurn = allCards.filter(c => !specifiedCards.has(c));
  // Flop: burn + 3
  deck.push(availableForBurn[0]);
  deck.push(...board.slice(0, 3));
  // Turn: burn + 1
  deck.push(availableForBurn[1]);
  deck.push(board[3]);
  // River: burn + 1
  deck.push(availableForBurn[2]);
  deck.push(board[4]);
  const usedCards = new Set<string>(deck);
  for (const c of allCards) {
    if (!usedCards.has(c)) deck.push(c);
  }
  return deck;
}

describe('All-in runout: community cards should be revealed incrementally', () => {
  it('HandEngine.getCommunityCards() returns all 5 cards immediately after dealRunout (the problematic behavior that GameManager must compensate for)', () => {
    const events: HandEngineEvent[] = [];
    const streetDealEvents: Extract<HandEngineEvent, { type: 'street_dealt' }>[] = [];

    const deck = buildDeck(
      [['Ah', 'Kh'], ['Qd', 'Qc']],
      ['Jh', 'Th', '2c', '9s', '3d'],
    );

    const engine = new HandEngine(makeConfig(), (e) => {
      events.push(e);
      if (e.type === 'street_dealt') streetDealEvents.push(e);
      if (e.type === 'rit_eligible') engine.setRunItTwice(false);
    }, deck);

    engine.startHand(1, [
      { playerId: 'p0', seatIndex: 0, name: 'P0', stack: 100 },
      { playerId: 'p1', seatIndex: 1, name: 'P1', stack: 100 },
    ], 0);

    // Both players go all-in preflop
    engine.handleAction('p0', 'all_in');
    engine.handleAction('p1', 'call');

    // After all-in runout, the engine has dealt all cards synchronously
    expect(engine.getCommunityCards().length).toBe(5);

    // But the events were emitted in order: flop, turn, river
    expect(streetDealEvents.length).toBe(3);
    expect(streetDealEvents[0].street).toBe('flop');
    expect(streetDealEvents[0].cards.length).toBe(3);
    expect(streetDealEvents[1].street).toBe('turn');
    expect(streetDealEvents[1].cards.length).toBe(1);
    expect(streetDealEvents[2].street).toBe('river');
    expect(streetDealEvents[2].cards.length).toBe(1);
  });

  it('street_dealt events provide incremental cards that can be tracked separately from engine state', () => {
    const streetDealEvents: Extract<HandEngineEvent, { type: 'street_dealt' }>[] = [];

    const deck = buildDeck(
      [['Ah', 'Kh'], ['Qd', 'Qc']],
      ['Jh', 'Th', '2c', '9s', '3d'],
    );

    const engine = new HandEngine(makeConfig(), (e) => {
      if (e.type === 'street_dealt') streetDealEvents.push(e);
      if (e.type === 'rit_eligible') engine.setRunItTwice(false);
    }, deck);

    engine.startHand(1, [
      { playerId: 'p0', seatIndex: 0, name: 'P0', stack: 100 },
      { playerId: 'p1', seatIndex: 1, name: 'P1', stack: 100 },
    ], 0);

    engine.handleAction('p0', 'all_in');
    engine.handleAction('p1', 'call');

    // Simulate GameManager's incremental tracking:
    // After processing each street_dealt, the visible cards should grow incrementally
    const visibleCards: CardString[] = [];

    // After flop event processed:
    visibleCards.push(...streetDealEvents[0].cards);
    expect(visibleCards.length).toBe(3);

    // After turn event processed:
    visibleCards.push(...streetDealEvents[1].cards);
    expect(visibleCards.length).toBe(4);

    // After river event processed:
    visibleCards.push(...streetDealEvents[2].cards);
    expect(visibleCards.length).toBe(5);

    // The incrementally tracked cards should match the engine's final state
    expect(visibleCards).toEqual(engine.getCommunityCards());
  });

  it('dramatic river flag is set on the river street_dealt event during all-in runout', () => {
    const streetDealEvents: Extract<HandEngineEvent, { type: 'street_dealt' }>[] = [];

    // Create a deck where the river outcome is uncertain (dramatic)
    const deck = buildDeck(
      [['Ah', 'Kh'], ['Qd', 'Qc']],
      ['Jh', 'Th', '2c', '9s', '3d'],  // Player 0 has flush draw, player 1 has pair of queens
    );

    const engine = new HandEngine(makeConfig(), (e) => {
      if (e.type === 'street_dealt') streetDealEvents.push(e);
      if (e.type === 'rit_eligible') engine.setRunItTwice(false);
    }, deck);

    engine.startHand(1, [
      { playerId: 'p0', seatIndex: 0, name: 'P0', stack: 100 },
      { playerId: 'p1', seatIndex: 1, name: 'P1', stack: 100 },
    ], 0);

    engine.handleAction('p0', 'all_in');
    engine.handleAction('p1', 'call');

    const riverEvent = streetDealEvents.find(e => e.street === 'river');
    expect(riverEvent).toBeDefined();
    // The dramatic flag should be present (may or may not be true depending on equity)
    // What matters is the event has the property
    expect(riverEvent).toHaveProperty('dramatic');
  });
});

describe('GameManager community cards tracking (unit-level simulation)', () => {
  /**
   * This test simulates the fix: GameManager should track community cards
   * by appending from street_dealt events, NOT by reading from HandEngine.getCommunityCards().
   *
   * The fix ensures that getTableState().communityCards only contains cards
   * that have been "visually dealt" (i.e., their street_dealt event was processed).
   */
  it('incremental tracking prevents river card from leaking before its street_dealt event', () => {
    const events: HandEngineEvent[] = [];

    const deck = buildDeck(
      [['Ah', 'Kh'], ['Qd', 'Qc']],
      ['Jh', 'Th', '2c', '9s', '3d'],
    );

    const engine = new HandEngine(makeConfig(), (e) => {
      events.push(e);
      if (e.type === 'rit_eligible') engine.setRunItTwice(false);
    }, deck);

    engine.startHand(1, [
      { playerId: 'p0', seatIndex: 0, name: 'P0', stack: 100 },
      { playerId: 'p1', seatIndex: 1, name: 'P1', stack: 100 },
    ], 0);

    engine.handleAction('p0', 'all_in');
    engine.handleAction('p1', 'call');

    // Engine has all 5 cards
    expect(engine.getCommunityCards().length).toBe(5);

    // Simulate GameManager's corrected behavior:
    // Process events one by one, tracking community cards incrementally
    let visibleCommunityCards: CardString[] = [];
    const communityCardsAtEachStreetDeal: number[] = [];

    for (const event of events) {
      if (event.type === 'street_dealt') {
        visibleCommunityCards = [...visibleCommunityCards, ...event.cards];
        communityCardsAtEachStreetDeal.push(visibleCommunityCards.length);
      }
    }

    // After flop: 3 cards visible (NOT 5)
    expect(communityCardsAtEachStreetDeal[0]).toBe(3);
    // After turn: 4 cards visible (NOT 5)
    expect(communityCardsAtEachStreetDeal[1]).toBe(4);
    // After river: 5 cards visible
    expect(communityCardsAtEachStreetDeal[2]).toBe(5);
  });
});
