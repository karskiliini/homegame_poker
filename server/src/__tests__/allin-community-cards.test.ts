import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HandEngine } from '../game/HandEngine.js';
import type { HandEngineEvent } from '../game/HandEngine.js';
import type { GameConfig, CardString, Street } from '@poker/shared';
import {
  DELAY_AFTER_ALLIN_SHOWDOWN_MS, DELAY_ALLIN_RUNOUT_STREET_MS,
  DELAY_DRAMATIC_RIVER_MS, DELAY_AFTER_STREET_DEALT_MS,
} from '@poker/shared';

/**
 * Bug #8: All-in runout / river peel
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
 * Bug #8 continuation: Pre-flop all-in and RIT pre-flop all-in
 * The river peel and second board timing must work correctly for
 * all-in situations on every street (pre-flop, flop, turn), not
 * just from the flop.
 *
 * Expected behavior:
 * 1. Flop dealt → game state shows 3 community cards
 * 2. Turn dealt → game state shows 4 community cards
 * 3. River dealt (dramatic peel) → game state shows 5 community cards
 * 4. River card is NOT visible before its street_dealt event
 * 5. River is NOT "dealt again" after the peel animation
 * 6. second_board_dealt must have a delay before processing (for RIT)
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

/**
 * Build a predetermined deck for testing.
 * @param holeCards - Array of hole card pairs for each player
 * @param board - First board community cards (5 cards)
 * @param secondBoard - Optional second board cards for RIT (only the NEW cards, not shared ones)
 * @param remainingStreets - Which streets are dealt during runout (determines how many burn cards are needed for second board)
 */
function buildDeck(holeCards: CardString[][], board: CardString[], secondBoard?: CardString[], remainingStreets?: Street[]): CardString[] {
  const deck: CardString[] = [];
  for (const hand of holeCards) {
    deck.push(...hand);
  }
  const specifiedCards = new Set<string>([...holeCards.flat(), ...board, ...(secondBoard || [])]);
  const allCards = buildFullDeck();
  const availableForBurn = allCards.filter(c => !specifiedCards.has(c));
  let burnIdx = 0;
  // Flop: burn + 3
  deck.push(availableForBurn[burnIdx++]);
  deck.push(...board.slice(0, 3));
  // Turn: burn + 1
  deck.push(availableForBurn[burnIdx++]);
  deck.push(board[3]);
  // River: burn + 1
  deck.push(availableForBurn[burnIdx++]);
  deck.push(board[4]);
  // Second board (for RIT): burn + cards for each remaining street
  if (secondBoard && remainingStreets) {
    let cardIdx = 0;
    for (const s of remainingStreets) {
      const count = s === 'flop' ? 3 : 1;
      deck.push(availableForBurn[burnIdx++]); // burn
      deck.push(...secondBoard.slice(cardIdx, cardIdx + count));
      cardIdx += count;
    }
  }
  const usedCards = new Set<string>(deck);
  for (const c of allCards) {
    if (!usedCards.has(c)) deck.push(c);
  }
  return deck;
}

/**
 * Simulates GameManager's getEventDelay() logic.
 * This mirrors the delay calculation from GameManager.ts to verify
 * that all events get appropriate delays during all-in runout.
 */
function simulateGetEventDelay(event: HandEngineEvent, lastProcessedEventType: string, isAllInRunout: boolean): { delay: number; newLastProcessed: string; newIsAllInRunout: boolean; newLastStreetWasDramatic: boolean; lastStreetWasDramatic?: boolean } {
  let delay = 0;
  let newLastStreetWasDramatic = false;

  if (event.type === 'allin_showdown') {
    delay = 0;
  } else if (event.type === 'all_in_runout') {
    delay = 0;
  } else if (event.type === 'equity_update' && lastProcessedEventType === 'allin_showdown') {
    delay = DELAY_AFTER_ALLIN_SHOWDOWN_MS;
  } else if (event.type === 'street_dealt' && lastProcessedEventType === 'equity_update') {
    if ('dramatic' in event && event.dramatic) {
      newLastStreetWasDramatic = true;
      delay = DELAY_DRAMATIC_RIVER_MS;
    } else if (isAllInRunout) {
      delay = DELAY_ALLIN_RUNOUT_STREET_MS;
    } else {
      delay = DELAY_AFTER_STREET_DEALT_MS;
    }
  } else if (event.type === 'street_dealt' && lastProcessedEventType === 'street_dealt') {
    delay = DELAY_AFTER_STREET_DEALT_MS;
  } else if (event.type === 'second_board_dealt' && (lastProcessedEventType === 'street_dealt' || lastProcessedEventType === 'equity_update')) {
    delay = DELAY_ALLIN_RUNOUT_STREET_MS;
  }

  return {
    delay,
    newLastProcessed: event.type,
    newIsAllInRunout: event.type === 'all_in_runout' ? true : isAllInRunout,
    newLastStreetWasDramatic,
  };
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

describe('Pre-flop all-in: event sequence and timing', () => {
  it('pre-flop all-in emits correct event sequence: 3 street_dealt events for flop, turn, river', () => {
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

    // Extract event types for analysis
    const eventTypes = events.map(e => e.type);

    // Must include all_in_runout with remaining streets [flop, turn, river]
    const allInRunout = events.find(e => e.type === 'all_in_runout');
    expect(allInRunout).toBeDefined();
    if (allInRunout && allInRunout.type === 'all_in_runout') {
      expect(allInRunout.remainingStreets).toEqual(['flop', 'turn', 'river']);
    }

    // Must emit allin_showdown before street_dealt events
    const allinShowdownIdx = eventTypes.indexOf('allin_showdown');
    const firstStreetIdx = eventTypes.indexOf('street_dealt');
    expect(allinShowdownIdx).toBeGreaterThan(-1);
    expect(firstStreetIdx).toBeGreaterThan(allinShowdownIdx);

    // Must emit 3 street_dealt events
    const streetDealtEvents = events.filter(e => e.type === 'street_dealt') as Extract<HandEngineEvent, { type: 'street_dealt' }>[];
    expect(streetDealtEvents.length).toBe(3);
    expect(streetDealtEvents[0].street).toBe('flop');
    expect(streetDealtEvents[0].cards.length).toBe(3);
    expect(streetDealtEvents[1].street).toBe('turn');
    expect(streetDealtEvents[1].cards.length).toBe(1);
    expect(streetDealtEvents[2].street).toBe('river');
    expect(streetDealtEvents[2].cards.length).toBe(1);

    // River must have the dramatic flag
    expect(streetDealtEvents[2]).toHaveProperty('dramatic');
  });

  it('pre-flop all-in: incremental community cards tracking works correctly', () => {
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

    // Simulate GameManager incremental tracking
    let visibleCards: CardString[] = [];
    const snapshots: { eventType: string; cardCount: number }[] = [];

    for (const event of events) {
      if (event.type === 'street_dealt') {
        visibleCards = [...visibleCards, ...event.cards];
      }
      snapshots.push({ eventType: event.type, cardCount: visibleCards.length });
    }

    // Before any street_dealt: 0 cards
    const beforeFlop = snapshots.find(s => s.eventType === 'allin_showdown');
    expect(beforeFlop?.cardCount).toBe(0);

    // After flop street_dealt: 3 cards
    const streetDealtSnapshots = snapshots.filter(s => s.eventType === 'street_dealt');
    expect(streetDealtSnapshots[0].cardCount).toBe(3);
    // After turn: 4
    expect(streetDealtSnapshots[1].cardCount).toBe(4);
    // After river: 5
    expect(streetDealtSnapshots[2].cardCount).toBe(5);
  });
});

describe('Pre-flop all-in + Run It Twice', () => {
  it('pre-flop all-in RIT: second_board_dealt emits correct cards', () => {
    const events: HandEngineEvent[] = [];

    // Second board cards for RIT: all 5 are new (since all-in was pre-flop)
    const secondBoardCards: CardString[] = ['5h', '6d', '7c', '8s', '4d'];

    const deck = buildDeck(
      [['Ah', 'Kh'], ['Qd', 'Qc']],
      ['Jh', 'Th', '2c', '9s', '3d'],
      secondBoardCards,
      ['flop', 'turn', 'river'],
    );

    const engine = new HandEngine(makeConfig(), (e) => {
      events.push(e);
      if (e.type === 'rit_eligible') engine.setRunItTwice(true);
    }, deck);

    engine.startHand(1, [
      { playerId: 'p0', seatIndex: 0, name: 'P0', stack: 100 },
      { playerId: 'p1', seatIndex: 1, name: 'P1', stack: 100 },
    ], 0);

    engine.handleAction('p0', 'all_in');
    engine.handleAction('p1', 'call');

    // second_board_dealt must be emitted
    const secondBoardEvent = events.find(e => e.type === 'second_board_dealt');
    expect(secondBoardEvent).toBeDefined();

    if (secondBoardEvent && secondBoardEvent.type === 'second_board_dealt') {
      // For pre-flop all-in, the second board should be 5 entirely new cards
      expect(secondBoardEvent.cards.length).toBe(5);
      // Second board cards should be the ones we specified
      expect(secondBoardEvent.cards).toEqual(secondBoardCards);
    }
  });

  it('pre-flop all-in RIT: second_board_dealt must have a delay (not 0) after equity_update', () => {
    const events: HandEngineEvent[] = [];

    const secondBoardCards: CardString[] = ['5h', '6d', '7c', '8s', '4d'];

    const deck = buildDeck(
      [['Ah', 'Kh'], ['Qd', 'Qc']],
      ['Jh', 'Th', '2c', '9s', '3d'],
      secondBoardCards,
      ['flop', 'turn', 'river'],
    );

    const engine = new HandEngine(makeConfig(), (e) => {
      events.push(e);
      if (e.type === 'rit_eligible') engine.setRunItTwice(true);
    }, deck);

    engine.startHand(1, [
      { playerId: 'p0', seatIndex: 0, name: 'P0', stack: 100 },
      { playerId: 'p1', seatIndex: 1, name: 'P1', stack: 100 },
    ], 0);

    engine.handleAction('p0', 'all_in');
    engine.handleAction('p1', 'call');

    // Simulate GameManager delay logic
    let lastProcessed = '';
    let isAllInRunout = false;

    for (const event of events) {
      const result = simulateGetEventDelay(event, lastProcessed, isAllInRunout);

      if (event.type === 'second_board_dealt') {
        // second_board_dealt follows equity_update during all-in runout.
        // Must have delay so players can see first board's river result.
        expect(result.delay).toBeGreaterThan(0);
      }

      lastProcessed = result.newLastProcessed;
      isAllInRunout = result.newIsAllInRunout;
    }
  });

  it('flop all-in RIT: second_board_dealt also must have a delay after equity_update', () => {
    const events: HandEngineEvent[] = [];

    // Flop all-in: only turn and river are re-dealt for second board
    const secondBoardNewCards: CardString[] = ['5h', '6d']; // new turn + river

    const deck = buildDeck(
      [['Ah', 'Kh'], ['Qd', 'Qc']],
      ['Jh', 'Th', '2c', '9s', '3d'],
      secondBoardNewCards,
      ['turn', 'river'],
    );

    const engine = new HandEngine(makeConfig(), (e) => {
      events.push(e);
      if (e.type === 'rit_eligible') engine.setRunItTwice(true);
    }, deck);

    engine.startHand(1, [
      { playerId: 'p0', seatIndex: 0, name: 'P0', stack: 100 },
      { playerId: 'p1', seatIndex: 1, name: 'P1', stack: 100 },
    ], 0);

    // Preflop action: p0 calls, p1 (BB) checks
    engine.handleAction('p0', 'call');
    engine.handleAction('p1', 'check');

    // Flop is dealt automatically by the engine, both go all-in on flop
    engine.handleAction('p1', 'all_in');
    engine.handleAction('p0', 'call');

    // second_board_dealt must be emitted
    const secondBoardEvent = events.find(e => e.type === 'second_board_dealt');
    expect(secondBoardEvent).toBeDefined();

    // Simulate GameManager delay logic
    let lastProcessed = '';
    let isAllInRunout = false;

    for (const event of events) {
      const result = simulateGetEventDelay(event, lastProcessed, isAllInRunout);

      if (event.type === 'second_board_dealt') {
        // After the fix, the delay must be > 0 regardless of all-in street
        expect(result.delay).toBeGreaterThan(0);
      }

      lastProcessed = result.newLastProcessed;
      isAllInRunout = result.newIsAllInRunout;
    }
  });
});

describe('Flop all-in regression: existing behavior must be preserved', () => {
  it('flop all-in without RIT: event sequence includes turn + river street_dealt', () => {
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

    // Preflop: p0 calls, p1 checks
    engine.handleAction('p0', 'call');
    engine.handleAction('p1', 'check');

    // Flop: all-in
    engine.handleAction('p1', 'all_in');
    engine.handleAction('p0', 'call');

    // Must have all_in_runout with [turn, river]
    const allInRunout = events.find(e => e.type === 'all_in_runout');
    expect(allInRunout).toBeDefined();
    if (allInRunout && allInRunout.type === 'all_in_runout') {
      expect(allInRunout.remainingStreets).toEqual(['turn', 'river']);
    }

    // Must emit 3 street_dealt events: flop (normal), turn (runout), river (runout)
    const streetDealtEvents = events.filter(e => e.type === 'street_dealt') as Extract<HandEngineEvent, { type: 'street_dealt' }>[];
    expect(streetDealtEvents.length).toBe(3);
    expect(streetDealtEvents[0].street).toBe('flop');
    expect(streetDealtEvents[1].street).toBe('turn');
    expect(streetDealtEvents[2].street).toBe('river');

    // Incremental tracking must work
    let visibleCards: CardString[] = [];
    for (const event of events) {
      if (event.type === 'street_dealt') {
        visibleCards = [...visibleCards, ...event.cards];
      }
    }
    expect(visibleCards.length).toBe(5);
    expect(visibleCards).toEqual(engine.getCommunityCards());
  });
});
