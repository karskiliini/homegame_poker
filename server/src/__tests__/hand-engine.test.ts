import { describe, it, expect, beforeEach } from 'vitest';
import { HandEngine } from '../game/HandEngine.js';
import type { HandEngineEvent, HandResult } from '../game/HandEngine.js';
import type { GameConfig, CardString, ActionType } from '@poker/shared';

// ============================================================================
// Test harness
// ============================================================================

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    gameType: 'NLHE',
    smallBlind: 1,
    bigBlind: 2,
    maxBuyIn: 200,
    actionTimeSeconds: 30,
    minPlayers: 2,
    maxPlayers: 10,
    ...overrides,
  };
}

interface TestPlayer {
  playerId: string;
  seatIndex: number;
  name: string;
  stack: number;
}

function makePlayers(count: number, stack = 200): TestPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `player-${i}`,
    seatIndex: i,
    name: `Player${i}`,
    stack,
  }));
}

/**
 * Build a predetermined deck for an NLHE hand.
 * HandEngine deals all cards at once per player (not interleaved),
 * so the deck order is: [player0 cards], [player1 cards], ..., burn, flop(3), burn, turn(1), burn, river(1)
 */
function buildDeck(
  holeCards: CardString[][],  // per player
  board: CardString[],        // flop(3) + turn(1) + river(1)
): CardString[] {
  const deck: CardString[] = [];

  // Cards dealt sequentially per player (HandEngine deals all cards to each player at once)
  for (const hand of holeCards) {
    deck.push(...hand);
  }

  // Pick burn cards that don't conflict with hole cards or board
  const specifiedCards = new Set<string>([...holeCards.flat(), ...board]);
  const allCards = buildFullDeck();
  const availableForBurn = allCards.filter(c => !specifiedCards.has(c));

  // Flop: burn + 3 cards
  deck.push(availableForBurn[0]);
  deck.push(...board.slice(0, 3));
  // Turn: burn + 1 card
  deck.push(availableForBurn[1]);
  deck.push(board[3]);
  // River: burn + 1 card
  deck.push(availableForBurn[2]);
  deck.push(board[4]);

  // Fill remaining deck
  const usedCards = new Set<string>(deck);
  for (const c of allCards) {
    if (!usedCards.has(c)) deck.push(c);
  }

  return deck;
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

class HandTestHarness {
  engine!: HandEngine;
  events: HandEngineEvent[] = [];
  result: HandResult | null = null;
  turnEvents: Extract<HandEngineEvent, { type: 'player_turn' }>[] = [];

  start(config: GameConfig, players: TestPlayer[], dealerSeat: number, deck?: CardString[]) {
    this.events = [];
    this.result = null;
    this.turnEvents = [];
    this.engine = new HandEngine(config, (e) => {
      this.events.push(e);
      if (e.type === 'hand_complete') this.result = e.result;
      if (e.type === 'player_turn') this.turnEvents.push(e);
      if (e.type === 'rit_eligible') this.engine.setRunItTwice(false);
    }, deck);
    this.engine.startHand(1, players, dealerSeat);
  }

  getCurrentTurn() {
    return this.turnEvents[this.turnEvents.length - 1] ?? null;
  }

  act(playerId: string, action: ActionType, amount?: number) {
    this.engine.handleAction(playerId, action, amount);
  }

  actCurrent(action: ActionType, amount?: number) {
    const turn = this.getCurrentTurn();
    if (!turn) throw new Error('No current turn');
    this.engine.handleAction(turn.playerId, action, amount);
  }

  getPlayerStack(playerId: string): number {
    const p = this.engine.getPlayers().find(pp => pp.playerId === playerId);
    if (!p) {
      // Check result
      if (this.result) {
        const rp = this.result.players.find(pp => pp.playerId === playerId);
        if (rp) return rp.currentStack;
      }
      throw new Error(`Player ${playerId} not found`);
    }
    return p.currentStack;
  }

  isComplete(): boolean {
    return this.engine.isHandComplete();
  }

  assertTotalChipsConserved(players: TestPlayer[]) {
    const initialTotal = players.reduce((sum, p) => sum + p.stack, 0);
    let currentTotal = 0;
    if (this.result) {
      currentTotal = this.result.players.reduce((sum, p) => sum + p.currentStack, 0);
    } else {
      const handPlayers = this.engine.getPlayers();
      currentTotal = handPlayers.reduce((sum, p) => sum + p.currentStack, 0);
      const pots = this.engine.getPots();
      currentTotal += pots.reduce((sum, p) => sum + p.amount, 0);
      currentTotal += handPlayers.reduce((sum, p) => sum + p.currentBet, 0);
    }
    expect(currentTotal).toBe(initialTotal);
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('HandEngine - Basic 2-player hands', () => {
  let h: HandTestHarness;
  const config = makeConfig();

  beforeEach(() => {
    h = new HandTestHarness();
  });

  it('should start a hand and prompt the correct first actor', () => {
    const players = makePlayers(2);
    // Heads-up: dealer(seat 0) = SB, acts first preflop
    h.start(config, players, 0);

    const turn = h.getCurrentTurn();
    expect(turn).not.toBeNull();
    // Heads-up: SB (dealer, seat 0) acts first preflop
    expect(turn!.playerId).toBe('player-0');
    expect(turn!.availableActions).toContain('fold');
    expect(turn!.availableActions).toContain('call');
    expect(turn!.availableActions).toContain('raise');
    expect(turn!.callAmount).toBe(1); // SB posted 1, BB posted 2, so call 1 more
  });

  it('should handle fold and award pot to remaining player', () => {
    const players = makePlayers(2, 100);
    h.start(config, players, 0);

    // SB folds
    h.actCurrent('fold');

    expect(h.isComplete()).toBe(true);
    expect(h.result).not.toBeNull();
    // BB wins SB's blind (1)
    expect(h.result!.players.find(p => p.playerId === 'player-1')!.currentStack).toBe(101);
    expect(h.result!.players.find(p => p.playerId === 'player-0')!.currentStack).toBe(99);
    h.assertTotalChipsConserved(players);
  });

  it('should handle call and proceed to flop', () => {
    const players = makePlayers(2, 100);
    const deck = buildDeck(
      [['Ah', 'Kh'], ['7d', '2s']],
      ['Qh', 'Jh', 'Th', '3d', '4d'],
    );
    h.start(config, players, 0, deck);

    // SB calls (posts 1 more to match BB's 2)
    expect(h.getCurrentTurn()!.playerId).toBe('player-0');
    h.actCurrent('call');

    // BB can check or raise
    expect(h.getCurrentTurn()!.playerId).toBe('player-1');
    expect(h.getCurrentTurn()!.availableActions).toContain('check');
    expect(h.getCurrentTurn()!.availableActions).toContain('raise');

    h.actCurrent('check');

    // Flop should be dealt - verify community cards
    const streetEvents = h.events.filter(e => e.type === 'street_dealt');
    expect(streetEvents.length).toBe(1);
    const flopEvent = streetEvents[0] as { type: 'street_dealt'; street: string; cards: CardString[] };
    expect(flopEvent.street).toBe('flop');
    expect(flopEvent.cards).toHaveLength(3);

    h.assertTotalChipsConserved(players);
  });

  it('should play a complete hand through all streets with predetermined cards', () => {
    const players = makePlayers(2, 100);
    // Player 0: Ah Kh (royal flush draw)
    // Player 1: 7d 2s (garbage)
    // Board: Qh Jh Th 3d 4d (Player 0 makes royal flush)
    const deck = buildDeck(
      [['Ah', 'Kh'], ['7d', '2s']],
      ['Qh', 'Jh', 'Th', '3d', '4d'],
    );
    h.start(config, players, 0, deck);

    // Preflop: SB calls, BB checks
    h.actCurrent('call');
    h.actCurrent('check');

    // Flop: BB checks, SB checks
    expect(h.getCurrentTurn()!.playerId).toBe('player-1'); // BB acts first post-flop
    h.actCurrent('check');
    h.actCurrent('check');

    // Turn: BB checks, SB checks
    h.actCurrent('check');
    h.actCurrent('check');

    // River: BB checks, SB checks
    h.actCurrent('check');
    h.actCurrent('check');

    // Hand should be complete - showdown
    expect(h.isComplete()).toBe(true);
    expect(h.result).not.toBeNull();

    // Player 0 should win (royal flush vs high card)
    const winner = h.result!.pots[0].winners[0];
    expect(winner.playerId).toBe('player-0');
    expect(winner.amount).toBe(4); // 2+2 blinds

    expect(h.result!.players.find(p => p.playerId === 'player-0')!.currentStack).toBe(102);
    expect(h.result!.players.find(p => p.playerId === 'player-1')!.currentStack).toBe(98);
    h.assertTotalChipsConserved(players);
  });

  it('should handle raise and re-raise', () => {
    const players = makePlayers(2, 100);
    h.start(config, players, 0);

    // SB raises to 6
    h.actCurrent('raise', 6);

    // BB should be able to fold, call 6, or re-raise
    const turn = h.getCurrentTurn()!;
    expect(turn.playerId).toBe('player-1');
    expect(turn.availableActions).toContain('fold');
    expect(turn.availableActions).toContain('call');
    expect(turn.availableActions).toContain('raise');
    expect(turn.callAmount).toBe(4); // needs to call 4 more (already posted 2)

    h.assertTotalChipsConserved(players);
  });

  it('should handle all-in and showdown', () => {
    const players = makePlayers(2, 50);
    // Player 0: Ah Kh, Player 1: Ad Kd
    // Board: Qh Jh Th 3d 4d → Player 0 royal flush
    const deck = buildDeck(
      [['Ah', 'Kh'], ['Ad', 'Kd']],
      ['Qh', 'Jh', 'Th', '3d', '4d'],
    );
    h.start(config, players, 0, deck);

    // SB goes all-in
    h.actCurrent('all_in');
    // BB calls
    h.actCurrent('call');

    // Should complete with showdown
    expect(h.isComplete()).toBe(true);

    // Player 0 wins with royal flush
    const p0 = h.result!.players.find(p => p.playerId === 'player-0')!;
    const p1 = h.result!.players.find(p => p.playerId === 'player-1')!;
    expect(p0.currentStack).toBe(100);
    expect(p1.currentStack).toBe(0);
    h.assertTotalChipsConserved(players);
  });
});

describe('HandEngine - 3+ player hands', () => {
  let h: HandTestHarness;
  const config = makeConfig();

  beforeEach(() => {
    h = new HandTestHarness();
  });

  it('should handle 3-player hand with correct blind/turn order', () => {
    const players = makePlayers(3, 100);
    // 3 players: seat 0 (dealer), seat 1 (SB), seat 2 (BB)
    h.start(config, players, 0);

    // Preflop order: UTG/dealer (seat 0) first, then SB (seat 1), then BB (seat 2)
    // Wait - with 3 players: dealer=seat0, SB=seat1, BB=seat2
    // Preflop first actor = left of BB = seat 0 (dealer, which is UTG in 3-handed)
    expect(h.getCurrentTurn()!.playerId).toBe('player-0');

    h.actCurrent('call'); // seat 0 calls
    expect(h.getCurrentTurn()!.playerId).toBe('player-1'); // SB
    h.actCurrent('call'); // seat 1 (SB) calls
    expect(h.getCurrentTurn()!.playerId).toBe('player-2'); // BB
    h.actCurrent('check'); // seat 2 (BB) checks

    // Flop - first actor is left of dealer (seat 1, SB)
    expect(h.getCurrentTurn()!.playerId).toBe('player-1');

    h.assertTotalChipsConserved(players);
  });

  it('should handle fold leaving 2 players', () => {
    const players = makePlayers(3, 100);
    h.start(config, players, 0);

    // UTG folds
    h.actCurrent('fold');
    // SB folds
    h.actCurrent('fold');

    // BB wins
    expect(h.isComplete()).toBe(true);
    const bb = h.result!.players.find(p => p.playerId === 'player-2')!;
    expect(bb.currentStack).toBe(101); // Won SB (1)
    h.assertTotalChipsConserved(players);
  });

  it('should handle 6-player hand', () => {
    const players = makePlayers(6, 100);
    // Dealer=seat0, SB=seat1, BB=seat2
    // Preflop order: seat3(UTG), seat4, seat5, seat0(dealer), seat1(SB), seat2(BB)
    h.start(config, players, 0);

    expect(h.getCurrentTurn()!.playerId).toBe('player-3'); // UTG

    // Everyone folds to BB
    h.actCurrent('fold'); // seat 3
    h.actCurrent('fold'); // seat 4
    h.actCurrent('fold'); // seat 5
    h.actCurrent('fold'); // seat 0 (dealer)
    h.actCurrent('fold'); // seat 1 (SB)

    // BB wins
    expect(h.isComplete()).toBe(true);
    const bb = h.result!.players.find(p => p.playerId === 'player-2')!;
    expect(bb.currentStack).toBe(101);
    h.assertTotalChipsConserved(players);
  });
});

describe('HandEngine - Side pots', () => {
  let h: HandTestHarness;
  const config = makeConfig();

  beforeEach(() => {
    h = new HandTestHarness();
  });

  it('should create side pots when players have different stacks', () => {
    // Player 0: 50 chips, Player 1: 100 chips, Player 2: 200 chips
    const players = [
      { playerId: 'short', seatIndex: 0, name: 'Short', stack: 50 },
      { playerId: 'medium', seatIndex: 1, name: 'Medium', stack: 100 },
      { playerId: 'deep', seatIndex: 2, name: 'Deep', stack: 200 },
    ];
    // Short stack has best hand
    // Board gives short stack a flush
    const deck = buildDeck(
      [['Ah', 'Kh'], ['As', 'Ks'], ['7d', '2d']],
      ['Qh', 'Jh', 'Th', '3c', '4c'],
    );
    h.start(config, players, 0, deck);

    // Preflop: UTG (seat 0 - dealer in 3-handed) goes all-in (50)
    expect(h.getCurrentTurn()!.playerId).toBe('short');
    h.actCurrent('all_in');

    // SB (seat 1) goes all-in (100)
    expect(h.getCurrentTurn()!.playerId).toBe('medium');
    h.actCurrent('all_in');

    // BB (seat 2) calls (100)
    expect(h.getCurrentTurn()!.playerId).toBe('deep');
    h.actCurrent('call');

    // Hand should complete (all-in runout)
    expect(h.isComplete()).toBe(true);

    // Short stack should win main pot (50*3=150 with royal flush)
    const shortResult = h.result!.players.find(p => p.playerId === 'short')!;
    // Main pot: 50*3 = 150 (all three contributed 50)
    // Side pot: 50*2 = 100 (medium and deep contributed 50 extra each)
    // Short wins main pot with royal flush
    // Medium wins side pot with straight flush (As Ks + Qh Jh Th)
    // Actually medium has As Ks, which with Qh Jh Th makes A-high straight but NOT flush
    // Short has Ah Kh → royal flush
    // Medium has As Ks → straight A-K-Q-J-T but not flush
    // Deep has 7d 2d → nothing special
    expect(shortResult.currentStack).toBeGreaterThanOrEqual(150);

    // Total chips conserved
    const total = h.result!.players.reduce((sum, p) => sum + p.currentStack, 0);
    expect(total).toBe(350); // 50+100+200
  });

  it('should handle all-in with 2 players, short stack wins', () => {
    const players = [
      { playerId: 'short', seatIndex: 0, name: 'Short', stack: 30 },
      { playerId: 'big', seatIndex: 1, name: 'Big', stack: 200 },
    ];
    // Short stack has aces, big stack has kings
    // Board is disconnected - no straight or flush possible
    const deck = buildDeck(
      [['Ah', 'Ad'], ['Kh', 'Kd']],
      ['7c', '9s', 'Jd', '3h', '5c'],
    );
    h.start(config, players, 0, deck);

    // SB (dealer, short) all-in 30
    h.actCurrent('all_in');
    // BB calls
    h.actCurrent('call');

    expect(h.isComplete()).toBe(true);
    const shortP = h.result!.players.find(p => p.playerId === 'short')!;
    const bigP = h.result!.players.find(p => p.playerId === 'big')!;

    // Short wins (pair of aces vs pair of kings)
    expect(shortP.currentStack).toBe(60); // 30*2
    expect(bigP.currentStack).toBe(170); // 200-30

    const total = h.result!.players.reduce((sum, p) => sum + p.currentStack, 0);
    expect(total).toBe(230);
  });
});

describe('HandEngine - Action validation', () => {
  let h: HandTestHarness;
  const config = makeConfig();

  beforeEach(() => {
    h = new HandTestHarness();
  });

  it('should not allow acting out of turn', () => {
    const players = makePlayers(2, 100);
    h.start(config, players, 0);

    // It's player-0's turn (SB in heads-up)
    expect(h.getCurrentTurn()!.playerId).toBe('player-0');

    // Player 1 tries to act - should be ignored
    h.act('player-1', 'fold');

    // Still player-0's turn
    expect(h.getCurrentTurn()!.playerId).toBe('player-0');
    expect(h.isComplete()).toBe(false);
  });

  it('should provide correct available actions', () => {
    const players = makePlayers(2, 100);
    h.start(config, players, 0);

    // SB can fold, call, or raise (facing BB's 2)
    const sbTurn = h.getCurrentTurn()!;
    expect(sbTurn.availableActions).toContain('fold');
    expect(sbTurn.availableActions).toContain('call');
    expect(sbTurn.availableActions).toContain('raise');
    expect(sbTurn.availableActions).not.toContain('check'); // can't check facing a bet

    // SB calls
    h.actCurrent('call');

    // BB can check or raise (no bet to call since SB matched)
    const bbTurn = h.getCurrentTurn()!;
    expect(bbTurn.availableActions).toContain('check');
    expect(bbTurn.availableActions).not.toContain('call');
    expect(bbTurn.availableActions).toContain('raise');
  });

  it('should enforce minimum raise size', () => {
    const players = makePlayers(2, 100);
    h.start(config, players, 0);

    // SB raises to 6 (min raise from 2 is 2+2=4, but total bet = 4)
    // Actually: currentBet = 2 (BB), minRaiseSize = 2 (BB size)
    // Min raise TO = 2 + 2 = 4
    const sbTurn = h.getCurrentTurn()!;
    expect(sbTurn.minRaise).toBe(4); // min raise TO 4

    h.assertTotalChipsConserved(players);
  });
});

describe('HandEngine - Community cards visibility', () => {
  let h: HandTestHarness;
  const config = makeConfig();

  beforeEach(() => {
    h = new HandTestHarness();
  });

  it('should emit street_dealt events for flop, turn, and river', () => {
    const players = makePlayers(2, 100);
    const deck = buildDeck(
      [['Ah', 'Kh'], ['7d', '2s']],
      ['Qh', 'Jh', 'Th', '3d', '4d'],
    );
    h.start(config, players, 0, deck);

    // Play through all streets with checks
    h.actCurrent('call'); // SB calls
    h.actCurrent('check'); // BB checks

    // Flop should be dealt
    let streetEvents = h.events.filter(e => e.type === 'street_dealt') as any[];
    expect(streetEvents.length).toBe(1);
    expect(streetEvents[0].street).toBe('flop');
    expect(streetEvents[0].cards).toEqual(['Qh', 'Jh', 'Th']);
    expect(h.engine.getCommunityCards()).toEqual(['Qh', 'Jh', 'Th']);

    h.actCurrent('check'); // BB checks
    h.actCurrent('check'); // SB checks

    // Turn
    streetEvents = h.events.filter(e => e.type === 'street_dealt') as any[];
    expect(streetEvents.length).toBe(2);
    expect(streetEvents[1].street).toBe('turn');
    expect(streetEvents[1].cards).toEqual(['3d']);
    expect(h.engine.getCommunityCards()).toEqual(['Qh', 'Jh', 'Th', '3d']);

    h.actCurrent('check'); h.actCurrent('check');

    // River
    streetEvents = h.events.filter(e => e.type === 'street_dealt') as any[];
    expect(streetEvents.length).toBe(3);
    expect(streetEvents[2].street).toBe('river');
    expect(streetEvents[2].cards).toEqual(['4d']);
    expect(h.engine.getCommunityCards()).toEqual(['Qh', 'Jh', 'Th', '3d', '4d']);
  });

  it('should show community cards in getTableState-compatible format', () => {
    const players = makePlayers(2, 100);
    const deck = buildDeck(
      [['Ah', 'Kh'], ['7d', '2s']],
      ['Qh', 'Jh', 'Th', '3d', '4d'],
    );
    h.start(config, players, 0, deck);

    h.actCurrent('call');
    h.actCurrent('check');

    // After flop dealt
    const cards = h.engine.getCommunityCards();
    expect(cards).toHaveLength(3);
    expect(cards[0]).toBe('Qh');
    expect(cards[1]).toBe('Jh');
    expect(cards[2]).toBe('Th');
  });
});

describe('HandEngine - Chip conservation across many hands', () => {
  it('should conserve chips across 1000 random hands with 2 players', () => {
    const initialStack = 500;
    let stack0 = initialStack;
    let stack1 = initialStack;
    const config = makeConfig();

    for (let hand = 0; hand < 1000; hand++) {
      if (stack0 <= 0 || stack1 <= 0) {
        // Reset stacks if someone busts
        stack0 = initialStack;
        stack1 = initialStack;
      }

      const h = new HandTestHarness();
      const players: TestPlayer[] = [
        { playerId: 'p0', seatIndex: 0, name: 'P0', stack: stack0 },
        { playerId: 'p1', seatIndex: 1, name: 'P1', stack: stack1 },
      ];
      h.start(config, players, hand % 2 === 0 ? 0 : 1);

      // Play randomly but validly
      let maxActions = 50;
      while (!h.isComplete() && maxActions > 0) {
        const turn = h.getCurrentTurn();
        if (!turn) break;

        const actions = turn.availableActions;
        // Pick a random action
        const rand = Math.random();
        if (rand < 0.3 && actions.includes('fold')) {
          h.actCurrent('fold');
        } else if (rand < 0.6 && actions.includes('check')) {
          h.actCurrent('check');
        } else if (actions.includes('call')) {
          h.actCurrent('call');
        } else if (actions.includes('check')) {
          h.actCurrent('check');
        } else if (actions.includes('raise')) {
          h.actCurrent('raise', turn.minRaise);
        } else if (actions.includes('bet')) {
          h.actCurrent('bet', turn.minRaise);
        } else if (actions.includes('fold')) {
          h.actCurrent('fold');
        }
        maxActions--;
      }

      if (h.result) {
        stack0 = h.result.players.find(p => p.playerId === 'p0')!.currentStack;
        stack1 = h.result.players.find(p => p.playerId === 'p1')!.currentStack;
        expect(stack0 + stack1).toBe(initialStack * 2);
      }
    }
  });

  it('should conserve chips across 500 random hands with 3-6 players', () => {
    const config = makeConfig();

    for (let numPlayers = 3; numPlayers <= 6; numPlayers++) {
      const initialStack = 200;
      let stacks = Array(numPlayers).fill(initialStack);

      for (let hand = 0; hand < 200; hand++) {
        // Only include players with chips
        const activePlayers = stacks
          .map((stack, i) => ({ playerId: `p${i}`, seatIndex: i, name: `P${i}`, stack }))
          .filter(p => p.stack > 0);

        if (activePlayers.length < 2) {
          stacks = Array(numPlayers).fill(initialStack);
          continue;
        }

        const h = new HandTestHarness();
        h.start(config, activePlayers, activePlayers[hand % activePlayers.length].seatIndex);

        let maxActions = 100;
        while (!h.isComplete() && maxActions > 0) {
          const turn = h.getCurrentTurn();
          if (!turn) break;

          const actions = turn.availableActions;
          const rand = Math.random();
          if (rand < 0.4 && actions.includes('fold')) {
            h.actCurrent('fold');
          } else if (actions.includes('call')) {
            h.actCurrent('call');
          } else if (actions.includes('check')) {
            h.actCurrent('check');
          } else if (actions.includes('fold')) {
            h.actCurrent('fold');
          }
          maxActions--;
        }

        if (h.result) {
          const totalBefore = activePlayers.reduce((s, p) => s + p.stack, 0);
          const totalAfter = h.result.players.reduce((s, p) => s + p.currentStack, 0);
          expect(totalAfter).toBe(totalBefore);

          // Update stacks
          for (const rp of h.result.players) {
            const idx = parseInt(rp.playerId.slice(1));
            stacks[idx] = rp.currentStack;
          }
        }
      }
    }
  });
});

describe('HandEngine - Player turn events include actions', () => {
  it('should provide available actions in every player_turn event', () => {
    const config = makeConfig();
    const h = new HandTestHarness();
    const players = makePlayers(2, 100);
    h.start(config, players, 0);

    // Every turn event should have non-empty actions
    for (const turn of h.turnEvents) {
      expect(turn.availableActions.length).toBeGreaterThan(0);
    }

    // Play through a few actions
    h.actCurrent('call');
    for (const turn of h.turnEvents) {
      expect(turn.availableActions.length).toBeGreaterThan(0);
    }

    h.actCurrent('check');
    // After flop dealt, new turn events
    const postFlopTurns = h.turnEvents.filter(t => {
      // Find turns after the first two (preflop)
      return h.turnEvents.indexOf(t) >= 2;
    });
    for (const turn of postFlopTurns) {
      expect(turn.availableActions.length).toBeGreaterThan(0);
    }
  });

  it('getCurrentTurnInfo should match player_turn event data', () => {
    const config = makeConfig();
    const h = new HandTestHarness();
    const players = makePlayers(2, 100);
    h.start(config, players, 0);

    const turnEvent = h.getCurrentTurn()!;
    const turnInfo = h.engine.getCurrentTurnInfo()!;

    expect(turnInfo.playerId).toBe(turnEvent.playerId);
    expect(turnInfo.availableActions).toEqual(turnEvent.availableActions);
    expect(turnInfo.callAmount).toBe(turnEvent.callAmount);
  });
});

describe('HandEngine - Bet/raise with specific amounts', () => {
  it('should handle bet on flop', () => {
    const config = makeConfig();
    const h = new HandTestHarness();
    const players = makePlayers(2, 100);
    h.start(config, players, 0);

    // Preflop: call, check
    h.actCurrent('call');
    h.actCurrent('check');

    // Flop: BB acts first
    const turn = h.getCurrentTurn()!;
    expect(turn.availableActions).toContain('check');
    expect(turn.availableActions).toContain('bet');

    // BB bets 4
    h.actCurrent('bet', 4);

    // SB should now need to call 4 or raise
    const sbTurn = h.getCurrentTurn()!;
    expect(sbTurn.callAmount).toBe(4);
    expect(sbTurn.availableActions).toContain('call');
    expect(sbTurn.availableActions).toContain('raise');

    h.assertTotalChipsConserved(players);
  });
});
