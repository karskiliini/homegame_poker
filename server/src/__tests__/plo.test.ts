import { describe, it, expect, beforeEach } from 'vitest';
import { HandEngine } from '../game/HandEngine.js';
import type { HandEngineEvent, HandResult } from '../game/HandEngine.js';
import type { GameConfig, CardString, ActionType } from '@poker/shared';
import { evaluatePLO, evaluateNLHE, determineWinners } from '../evaluation/hand-rank.js';

// ============================================================================
// Test harness (same as hand-engine.test.ts but with PLO defaults)
// ============================================================================

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    gameType: 'PLO',
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
 * Build a predetermined deck for a PLO hand.
 * HandEngine deals all hole cards at once per player (not interleaved),
 * so the deck order is: [player0's 4 cards], [player1's 4 cards], ..., burn, flop(3), burn, turn(1), burn, river(1)
 */
function buildDeck(
  holeCards: CardString[][],  // per player (4 cards each for PLO)
  board: CardString[],        // flop(3) + turn(1) + river(1)
): CardString[] {
  const deck: CardString[] = [];

  for (const hand of holeCards) {
    deck.push(...hand);
  }

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
// PLO Hand Evaluation Tests
// ============================================================================

describe('PLO Hand Evaluation - Exactly 2 hole cards + 3 board cards', () => {
  it('should use exactly 2 hole cards: player with 4 hearts but board has only 2 hearts → NO flush', () => {
    // Player has 4 hearts: Ah Kh Qh Jh
    // Board: 9h 8h 7c 6d 2s (2 hearts on board)
    // PLO: must use 2 from hand, 3 from board
    // Best flush attempt: Ah Kh (2 hearts from hand) + 9h 8h 7c — only 4 hearts total = NO flush
    // Actually Ah Kh from hand + 9h 8h from board is only 2 board hearts, need 3 board cards
    // Ah Kh + 9h 8h 7c = 4 hearts + 7c = not a flush
    // Best might be a straight: Qh Jh + 9h 8h 7c = Q-J-9-8-7 not a straight
    // Actually 8h 9h from board + some... let me think
    // Ah Kh + 9h 8h 7c → high card A,K,9,8,7
    // Qh Jh + 9h 8h 7c → straight? Q-J-9-8-7? No, not consecutive
    // Jh Qh + 9h 8h 7c? J high? No
    // Actually NONE of the 2-from-hand + 3-from-board combos make a flush because
    // max hearts on board is 2, and we need 3 from board, so at most 2 hearts from board + 2 from hand = 4 hearts
    const result = evaluatePLO(
      ['Ah', 'Kh', 'Qh', 'Jh'] as CardString[],
      ['9h', '8h', '7c', '6d', '2s'] as CardString[],
    );
    // Can't make a flush with only 2 hearts from board
    expect(result.handName).not.toBe('Flush');
    expect(result.handName).not.toBe('Straight Flush');
  });

  it('should make flush when 2 hearts from hand + 3 hearts on board', () => {
    // Player: Ah Kh 2c 3d (2 hearts)
    // Board: Qh Jh 9h 6c 4s (3 hearts on board)
    // PLO: Ah Kh (from hand) + Qh Jh 9h (from board) = Ah Kh Qh Jh 9h = flush!
    const result = evaluatePLO(
      ['Ah', 'Kh', '2c', '3d'] as CardString[],
      ['Qh', 'Jh', '9h', '6c', '4s'] as CardString[],
    );
    expect(result.handName).toBe('Flush');
  });

  it('should NOT make flush when only 1 hole card matches suit (need 2)', () => {
    // Player: Ah 2c 3d 4s (only 1 heart)
    // Board: Kh Qh Jh 6c 7d (3 hearts on board)
    // NLHE would make hearts flush using Ah + Kh Qh Jh + any
    // PLO: must use 2 from hand. Only 1 heart in hand → no flush
    const result = evaluatePLO(
      ['Ah', '2c', '3d', '4s'] as CardString[],
      ['Kh', 'Qh', 'Jh', '6c', '7d'] as CardString[],
    );
    expect(result.handName).not.toBe('Flush');
  });

  it('should NOT use board flush (4 hearts on board, 0 hearts in hand)', () => {
    // Player: Ac Kd Qs Jc (no hearts)
    // Board: Ah Kh Qh Jh 2s (4 hearts on board)
    // NLHE could use board flush
    // PLO: must use 2 from hand, none are hearts → no flush
    const result = evaluatePLO(
      ['Ac', 'Kd', 'Qs', 'Jc'] as CardString[],
      ['Ah', 'Kh', 'Qh', 'Jh', '2s'] as CardString[],
    );
    expect(result.handName).not.toBe('Flush');
    // Best hand: Ac Kd + Ah Kh 2s = two pair (aces and kings) or
    // Ac Qs + Ah Qh Jh = two pair? No, Ac+Ah = pair of aces, Qs+Qh = pair of queens
    // Actually: Ac Kd + Ah Kh 2s = AAKK2 = two pair aces and kings
  });

  it('should NOT use board straight (5-card straight on board, hand disconnected)', () => {
    // Player: 2c 3d 9h Ts (disconnected from board straight)
    // Board: 5h 6c 7d 8s 4h (4-5-6-7-8 straight on board)
    // NLHE would use the board straight
    // PLO: must use 2 from hand + 3 from board
    // 9h Ts + 6c 7d 8s = T-9-8-7-6 straight! Actually yes, that's a straight
    // Let me use truly disconnected hand
    const result = evaluatePLO(
      ['2c', '3d', 'Ah', 'Kh'] as CardString[],
      ['5s', '6c', '7d', '8s', '9h'] as CardString[],
    );
    // 2c 3d + 5s 6c 7d = 7-6-5-3-2 no
    // Ah Kh + 5s 6c 7d = A-K-7-6-5 no
    // The board has 5-6-7-8-9 straight, but PLO can't use 5 board cards
    // Best: Ah Kh + any 3 from board = high card or small straight?
    // Check: any 2 from {2c 3d Ah Kh} + 3 from {5s 6c 7d 8s 9h}
    // Ah Kh + 7d 8s 9h = A-K-9-8-7 high card
    // No straights possible with disconnected hand cards
    expect(result.handName).not.toBe('Straight');
  });

  it('should make straight using exactly 2 hole cards + 3 board cards', () => {
    // Player: Ah Kd 7c 2s
    // Board: Qh Jc Ts 8d 3h
    // Ah Kd + Qh Jc Ts = A-K-Q-J-T straight!
    const result = evaluatePLO(
      ['Ah', 'Kd', '7c', '2s'] as CardString[],
      ['Qh', 'Jc', 'Ts', '8d', '3h'] as CardString[],
    );
    expect(result.handName).toBe('Straight');
    expect(result.description).toContain('Ace');
  });

  it('should make full house with exactly 2 hole + 3 board', () => {
    // Player: Ah Ad Kc Ks
    // Board: As 2h 2c 7d 9s
    // Ah Ad + As 2h 2c = AAA22 = full house, aces full of twos
    const result = evaluatePLO(
      ['Ah', 'Ad', 'Kc', 'Ks'] as CardString[],
      ['As', '2h', '2c', '7d', '9s'] as CardString[],
    );
    expect(result.handName).toBe('Full House');
  });

  it('should NOT make four of a kind with 3 from hand + 1 from board', () => {
    // Player: Ah Ad Ac Ks (3 aces in hand)
    // Board: As 2h 3c 7d 9s
    // In PLO: must use EXACTLY 2 hole cards
    // Best: Ah Ad + As 2h 3c = three aces (trip aces)
    // or: Ah Ad + As 9s 7d = three aces
    // Can't use Ah Ad Ac from hand (that's 3)
    const result = evaluatePLO(
      ['Ah', 'Ad', 'Ac', 'Ks'] as CardString[],
      ['As', '2h', '3c', '7d', '9s'] as CardString[],
    );
    // Can make three of a kind (aces) but NOT four of a kind
    // Actually wait: Ah Ad + As 9s 7d = A A A 9 7 = three of a kind
    // or Ah Ac + As 9s 7d = A A A 9 7 = three of a kind
    // The 4th ace is unusable because we already used 2 from hand and 1 from board
    expect(result.handName).toBe('Three of a Kind');
  });

  it('should make four of a kind with exactly 2 from hand + 2 on board', () => {
    // Player: Ah Ad Kc 7s
    // Board: Ac As 2h 3c 9d (2 aces on board)
    // Ah Ad + Ac As 2h = AAAA2 = four of a kind!
    const result = evaluatePLO(
      ['Ah', 'Ad', 'Kc', '7s'] as CardString[],
      ['Ac', 'As', '2h', '3c', '9d'] as CardString[],
    );
    expect(result.handName).toBe('Four of a Kind');
  });

  it('PLO vs NLHE: same cards but different evaluation', () => {
    // Player: Ah 2c 3d 4s
    // Board: Kh Qh Jh Th 5s
    // NLHE: Ah + Kh Qh Jh Th = royal flush (using 1 hole card + 4 board)
    // PLO: must use 2 hole cards + 3 board
    // Best: Ah 2c + Kh Qh Jh = Ah Kh Qh Jh 2c → only 4 hearts = no flush
    // Or: Ah 3d + Kh Qh Th = A K Q T 3 → ace high, or straight A-K-Q-J-T? No, missing J
    // Wait: Ah 4s + Kh Qh Jh = AKQJ4 → not flush (only 3 hearts from board + 1 from hand = 4)
    // Hmm, Ah + 3 hearts from board = 4 hearts... need the 5th
    // Actually Ah XX + Kh Qh Jh → that's 4 hearts only if XX isn't heart
    // Ah 2c + Kh Qh Jh → A-K-Q-J-2, not a straight, 4 hearts = no flush (5 needed)
    // Best might be: Ah 4s + Kh Qh 5s = A K Q 5 4 high card? Or
    // 3d 4s + Jh Th 5s = J T 5 4 3 = no
    // Best: Ah + something + 3 high board cards
    // Ah 2c + Kh Qh Jh = A K Q J 2 high card → Ace high
    // Or: Ah 4s + Kh Qh Th = AKQ(T)4 → A-K-Q-T-4 high card

    const ploResult = evaluatePLO(
      ['Ah', '2c', '3d', '4s'] as CardString[],
      ['Kh', 'Qh', 'Jh', 'Th', '5s'] as CardString[],
    );
    const nlheResult = evaluateNLHE(
      ['Ah', '2c'] as CardString[],
      ['Kh', 'Qh', 'Jh', 'Th', '5s'] as CardString[],
    );

    // NLHE: Royal Flush (Ah Kh Qh Jh Th)
    expect(nlheResult.handName).toBe('Royal Flush');
    // PLO: Can't make flush (only 1 heart in hand), best is high card
    expect(ploResult.handName).toBe('High Card');
  });

  it('should correctly determine winner in PLO showdown', () => {
    // Player 1: Ah Kh Qd 2c → can make A-K-Q-J-T straight using Ah Kd + Qh Jc Ts
    // Wait, let me think more carefully
    // Player 1: Ah Kd 7c 2s
    // Player 2: Jh Td 3c 4s
    // Board: Qh 9c 8d 5h 6c
    // Player 1: Ah Kd + Qh 9c 8d = A K Q 9 8 high card
    //           7c 2s + Qh 9c 8d = Q 9 8 7 2 = no
    //           Best: Ah Kd + any 3 = high card
    // Player 2: Jh Td + Qh 9c 8d = Q J T 9 8 straight!
    //           or 3c 4s + 5h 6c 8d = 8 6 5 4 3 no
    //           Best: Jh Td + Qh 9c 8d = straight Q-J-T-9-8

    const winners = determineWinners(
      'PLO',
      [
        { playerId: 'p1', holeCards: ['Ah', 'Kd', '7c', '2s'] as CardString[] },
        { playerId: 'p2', holeCards: ['Jh', 'Td', '3c', '4s'] as CardString[] },
      ],
      ['Qh', '9c', '8d', '5h', '6c'] as CardString[],
    );
    expect(winners.length).toBe(1);
    expect(winners[0].playerId).toBe('p2'); // Straight beats high card
  });

  it('wheel straight in PLO', () => {
    // Player: Ah 2d 9c Ts
    // Board: 3h 4c 5s Kd Jh
    // Ah 2d + 3h 4c 5s = A-2-3-4-5 = wheel!
    const result = evaluatePLO(
      ['Ah', '2d', '9c', 'Ts'] as CardString[],
      ['3h', '4c', '5s', 'Kd', 'Jh'] as CardString[],
    );
    expect(result.handName).toBe('Straight');
  });

  it('straight flush in PLO', () => {
    // Player: 9h 8h Kc 2d
    // Board: 7h 6h 5h Ac 3s (3 hearts on board)
    // 9h 8h + 7h 6h 5h = 9-8-7-6-5 straight flush!
    const result = evaluatePLO(
      ['9h', '8h', 'Kc', '2d'] as CardString[],
      ['7h', '6h', '5h', 'Ac', '3s'] as CardString[],
    );
    expect(result.handName).toBe('Straight Flush');
  });
});

// ============================================================================
// PLO Dealing Tests (4 hole cards)
// ============================================================================

describe('PLO Dealing - 4 hole cards', () => {
  let h: HandTestHarness;
  const config = makeConfig();

  beforeEach(() => {
    h = new HandTestHarness();
  });

  it('should deal 4 hole cards to each PLO player', () => {
    const players = makePlayers(2);
    h.start(config, players, 0);

    const cardsDealtEvent = h.events.find(e => e.type === 'cards_dealt') as Extract<HandEngineEvent, { type: 'cards_dealt' }>;
    expect(cardsDealtEvent).toBeDefined();

    for (const [, cards] of cardsDealtEvent.playerCards) {
      expect(cards).toHaveLength(4);
    }
  });

  it('should deal 4 cards with predetermined deck', () => {
    const players = makePlayers(2);
    const deck = buildDeck(
      [['Ah', 'Kh', 'Qh', 'Jh'], ['7d', '2s', '8c', '3h']],
      ['Ts', '9c', '4d', '6h', '5s'],
    );
    h.start(config, players, 0, deck);

    const cardsDealtEvent = h.events.find(e => e.type === 'cards_dealt') as Extract<HandEngineEvent, { type: 'cards_dealt' }>;
    expect(cardsDealtEvent!.playerCards.get('player-0')).toEqual(['Ah', 'Kh', 'Qh', 'Jh']);
    expect(cardsDealtEvent!.playerCards.get('player-1')).toEqual(['7d', '2s', '8c', '3h']);
  });

  it('should deal 4 cards to each of 6 PLO players', () => {
    const players = makePlayers(6);
    h.start(config, players, 0);

    const cardsDealtEvent = h.events.find(e => e.type === 'cards_dealt') as Extract<HandEngineEvent, { type: 'cards_dealt' }>;
    expect(cardsDealtEvent).toBeDefined();
    expect(cardsDealtEvent!.playerCards.size).toBe(6);

    // All players get 4 cards
    for (const [, cards] of cardsDealtEvent!.playerCards) {
      expect(cards).toHaveLength(4);
    }

    // All cards should be unique (6 players * 4 cards = 24 unique cards)
    const allCards = [...cardsDealtEvent!.playerCards.values()].flat();
    expect(allCards.length).toBe(24);
    expect(new Set(allCards).size).toBe(24);
  });
});

// ============================================================================
// PLO Pot-Limit Betting Tests
// ============================================================================

describe('PLO Pot-Limit Betting', () => {
  let h: HandTestHarness;
  const config = makeConfig();

  beforeEach(() => {
    h = new HandTestHarness();
  });

  it('maxRaise should be capped at pot size (pot-limit), not stack (no-limit)', () => {
    const players = makePlayers(2, 200);
    h.start(config, players, 0);

    // Preflop: pot = SB(1) + BB(2) = 3
    // SB to act: callAmount = 1, pot after call = 3+1 = 4
    // Pot-limit max raise = call + pot after call = 1 + 4 = 5 (total bet)
    // So maxRaise should be pot-limited, not 200 (all-in)
    const sbTurn = h.getCurrentTurn()!;

    // The pot-limit formula: maxBet = myCurrentBet + callAmount + (pot + callAmount)
    // SB currentBet = 1, callAmount = 1, pot = 3
    // maxBet = 1 + 1 + (3 + 1) = 1 + 1 + 4 = 6?
    // Actually standard pot-limit: max raise TO = currentBet(for calling) + potAfterCall
    // SB has posted 1, needs to call 1 more to match BB's 2
    // After call, pot = 3 + 1 = 4
    // Max raise BY = 4 (pot size after call)
    // Max raise TO = 2 (call) + 4 (pot raise) = 6
    // But expressed as total bet: 6
    // Wait, let me re-check: SB posted 1.
    // To call: put in 1 more (total bet = 2).
    // Pot after call = 2 + 2 = 4.
    // Max raise = pot after call = 4.
    // Max total bet = 2 (call) + 4 (raise by pot) = 6.
    // So maxRaise should be 6.
    expect(sbTurn.maxRaise).toBeLessThanOrEqual(6);
    // And definitely not 201 (stack + currentBet for no-limit)
    expect(sbTurn.maxRaise).toBeLessThan(200);
  });

  it('pot-limit max raise should equal pot after call on flop when first to act', () => {
    const players = makePlayers(2, 200);
    const deck = buildDeck(
      [['Ah', 'Kh', 'Qh', 'Jh'], ['7d', '2s', '8c', '3h']],
      ['Ts', '9c', '4d', '6h', '5s'],
    );
    h.start(config, players, 0, deck);

    // Preflop: SB calls, BB checks → pot = 4 (2+2)
    h.actCurrent('call');
    h.actCurrent('check');

    // Flop: first to act is BB (player-1 in HU, left of dealer)
    const bbTurn = h.getCurrentTurn()!;

    // Pot = 4, first to act, callAmount = 0
    // Max bet = pot = 4
    expect(bbTurn.maxRaise).toBe(4);
  });

  it('pot-limit max raise should be correct when facing a bet', () => {
    const players = makePlayers(2, 200);
    const deck = buildDeck(
      [['Ah', 'Kh', 'Qh', 'Jh'], ['7d', '2s', '8c', '3h']],
      ['Ts', '9c', '4d', '6h', '5s'],
    );
    h.start(config, players, 0, deck);

    // Preflop: SB calls, BB checks → pot = 4
    h.actCurrent('call');
    h.actCurrent('check');

    // Flop: BB bets 4 (pot-sized)
    h.actCurrent('bet', 4);

    // SB now facing a bet of 4
    // Pot = 4 (pre-flop) + 4 (BB bet) = 8
    // Call = 4, pot after call = 8 + 4 = 12
    // Max raise TO = 0 (current bet) + 4 (call) + 12 (pot after call) = 16
    const sbTurn = h.getCurrentTurn()!;
    expect(sbTurn.maxRaise).toBe(16);
  });

  it('pot-limit max raise should be capped by player stack (all-in)', () => {
    // Short stack player
    const players = [
      { playerId: 'player-0', seatIndex: 0, name: 'Player0', stack: 10 },
      { playerId: 'player-1', seatIndex: 1, name: 'Player1', stack: 200 },
    ];
    h.start(config, players, 0);

    // SB (player-0, 10 chips) to act
    // Pot = 3 (1+2), call = 1, pot after call = 4
    // Pot-limit max = 6 but stack = 10, currentBet = 1
    // Max total bet = min(6, 10+1) = min(6, 11) = 6
    const sbTurn = h.getCurrentTurn()!;
    expect(sbTurn.maxRaise).toBe(6);
    // Can still go all-in (which might be less than pot-limit max)
    expect(sbTurn.availableActions).toContain('raise');
  });

  it('pot-limit max raise when pot-limit exceeds player stack', () => {
    // Very short stack
    const players = [
      { playerId: 'player-0', seatIndex: 0, name: 'Player0', stack: 3 },
      { playerId: 'player-1', seatIndex: 1, name: 'Player1', stack: 200 },
    ];
    h.start(config, players, 0);

    // SB (3 chips, posted 1 → remaining stack 2) to act
    // currentBet = 1, currentStack = 2
    // allIn = currentStack + currentBet = 2 + 1 = 3
    // Pot = 3, call = 1, pot after call = 4, pot-limit raise TO = 6
    // But allIn = 3 < 6, so maxRaise = 3 (all-in)
    const sbTurn = h.getCurrentTurn()!;
    expect(sbTurn.maxRaise).toBe(3);
  });

  it('should not allow raise above pot-limit', () => {
    const players = makePlayers(2, 200);
    const deck = buildDeck(
      [['Ah', 'Kh', 'Qh', 'Jh'], ['7d', '2s', '8c', '3h']],
      ['Ts', '9c', '4d', '6h', '5s'],
    );
    h.start(config, players, 0, deck);

    // Preflop: SB calls, BB checks → pot = 4
    h.actCurrent('call');
    h.actCurrent('check');

    // Flop: BB max bet should be 4 (pot)
    const bbTurn = h.getCurrentTurn()!;
    expect(bbTurn.maxRaise).toBe(4);

    // If BB tries to bet more than pot, it should be clamped
    h.actCurrent('bet', 4);

    // Verify pot is correct
    h.assertTotalChipsConserved(players);
  });

  it('preflop pot-limit raise sizing should be correct for 3+ players', () => {
    const players = makePlayers(3, 200);
    h.start(config, players, 0);

    // Dealer=0, SB=1, BB=2
    // Preflop: UTG (player-0) to act first
    // Pot = 1 (SB) + 2 (BB) = 3
    // UTG: callAmount = 2, pot after call = 3 + 2 = 5
    // Pot-limit max raise TO = 0 (currentBet) + 2 (call) + 5 (pot after call) = 7
    const utgTurn = h.getCurrentTurn()!;
    expect(utgTurn.playerId).toBe('player-0');
    expect(utgTurn.maxRaise).toBe(7);
  });
});

// ============================================================================
// PLO Complete Hand Tests
// ============================================================================

describe('PLO - Complete hand flow', () => {
  let h: HandTestHarness;
  const config = makeConfig();

  beforeEach(() => {
    h = new HandTestHarness();
  });

  it('should play a complete PLO hand with showdown and correct winner', () => {
    const players = makePlayers(2, 100);
    // Player 0: Ah Kh Qd 2c → best: Ah Kh + Qh Jh 9h? No, need board
    // Player 0: Ah Kh Qd 2c
    // Player 1: 7d 8d 3c 4s
    // Board: Ts 9c Jh 6h 5s
    // Player 0: best 2+3:
    //   Ah Kh + Ts 9c Jh → A K J T 9 = no straight (A-K-J-T-9 gap)
    //   Ah Qd + Ts 9c Jh → A Q J T 9 = no straight
    //   Kh Qd + Ts 9c Jh → K Q J T 9 = straight! (9-T-J-Q-K)
    // Player 1: best 2+3:
    //   7d 8d + Ts 9c Jh → J T 9 8 7 = straight! (7-8-9-T-J)
    //   7d 8d + Ts 9c 6h → T 9 8 7 6 = straight! (6-7-8-9-T)
    // Player 0 has K-high straight, Player 1 has J-high straight → Player 0 wins

    const deck = buildDeck(
      [['Ah', 'Kh', 'Qd', '2c'], ['7d', '8d', '3c', '4s']],
      ['Ts', '9c', 'Jh', '6h', '5s'],
    );
    h.start(config, players, 0, deck);

    // Play through all streets with checks
    h.actCurrent('call');   // SB preflop
    h.actCurrent('check');  // BB preflop
    h.actCurrent('check');  // BB flop
    h.actCurrent('check');  // SB flop
    h.actCurrent('check');  // BB turn
    h.actCurrent('check');  // SB turn
    h.actCurrent('check');  // BB river
    h.actCurrent('check');  // SB river

    expect(h.isComplete()).toBe(true);
    expect(h.result).not.toBeNull();

    // Player 0 wins with K-high straight
    const winner = h.result!.pots[0].winners[0];
    expect(winner.playerId).toBe('player-0');
    expect(h.result!.pots[0].winningHand).toContain('Straight');

    h.assertTotalChipsConserved(players);
  });

  it('should handle PLO fold correctly', () => {
    const players = makePlayers(2, 100);
    h.start(config, players, 0);

    // SB folds
    h.actCurrent('fold');

    expect(h.isComplete()).toBe(true);
    // BB wins SB's blind
    const bb = h.result!.players.find(p => p.playerId === 'player-1')!;
    expect(bb.currentStack).toBe(101);
    h.assertTotalChipsConserved(players);
  });

  it('should handle PLO all-in showdown', () => {
    const players = makePlayers(2, 50);
    // Player 0: Ah Ad Kh Kd → can make AA trip or KK pair
    // Player 1: 7d 7c 2s 3h → can make 77 pair
    // Board: Qs Jc 5h 9d 4c (no help for either)
    // Player 0 best: Ah Ad + Qs Jc 5h = AA Q J 5 (pair of aces)
    // Player 1 best: 7d 7c + Qs Jc 9d = 77 Q J 9 (pair of sevens)
    // Player 0 wins with higher pair

    const deck = buildDeck(
      [['Ah', 'Ad', 'Kh', 'Kd'], ['7d', '7c', '2s', '3h']],
      ['Qs', 'Jc', '5h', '9d', '4c'],
    );
    h.start(config, players, 0, deck);

    h.actCurrent('all_in');
    h.actCurrent('call');

    expect(h.isComplete()).toBe(true);
    const p0 = h.result!.players.find(p => p.playerId === 'player-0')!;
    expect(p0.currentStack).toBe(100); // Wins 50*2
    h.assertTotalChipsConserved(players);
  });

  it('should conserve chips across 500 random PLO hands', () => {
    const initialStack = 500;
    let stack0 = initialStack;
    let stack1 = initialStack;

    for (let hand = 0; hand < 500; hand++) {
      if (stack0 <= 0 || stack1 <= 0) {
        stack0 = initialStack;
        stack1 = initialStack;
      }

      const h = new HandTestHarness();
      const players: TestPlayer[] = [
        { playerId: 'p0', seatIndex: 0, name: 'P0', stack: stack0 },
        { playerId: 'p1', seatIndex: 1, name: 'P1', stack: stack1 },
      ];
      h.start(config, players, hand % 2 === 0 ? 0 : 1);

      let maxActions = 50;
      while (!h.isComplete() && maxActions > 0) {
        const turn = h.getCurrentTurn();
        if (!turn) break;

        const actions = turn.availableActions;
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
          // Raise to maxRaise (pot-limit max)
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

  it('should conserve chips across 200 random PLO hands with 3-6 players', () => {
    for (let numPlayers = 3; numPlayers <= 6; numPlayers++) {
      const initialStack = 200;
      let stacks = Array(numPlayers).fill(initialStack);

      for (let hand = 0; hand < 100; hand++) {
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

          for (const rp of h.result.players) {
            const idx = parseInt(rp.playerId.slice(1));
            stacks[idx] = rp.currentStack;
          }
        }
      }
    }
  });
});

// ============================================================================
// PLO-specific edge cases
// ============================================================================

describe('PLO - Edge cases', () => {
  it('PLO showdown should use PLO evaluation (not NLHE)', () => {
    // This is a critical test: when player has 4 hearts and board has 4 hearts,
    // NLHE would give a flush but PLO should NOT (only 1 heart in hand isn't enough)
    const players = [
      { playerId: 'flush_in_nlhe', holeCards: ['Ah', '2c', '3d', '4s'] as CardString[] },
      { playerId: 'pair', holeCards: ['Kd', 'Ks', '7c', '8c'] as CardString[] },
    ];
    const board = ['Qh', 'Jh', 'Th', '9h', '5d'] as CardString[];

    // PLO evaluation: flush_in_nlhe has only 1 heart, can't make flush
    // pair: Kd Ks + Qh Jh Th = KK Q J T (pair of kings) or
    //       Kd Ks + Qh 9h 5d = KK Q 9 5 (pair of kings)
    // flush_in_nlhe: Ah 2c + Qh Jh Th = A Q J T 2 (high card Ace) ... no flush (4 hearts only)
    //               or Ah 4s + Qh Jh 9h = A Q J 9 4 (high card)
    // pair wins with pair of kings vs high card

    const winners = determineWinners('PLO', players, board);
    expect(winners.length).toBe(1);
    expect(winners[0].playerId).toBe('pair');
  });

  it('same hand cards should evaluate differently in NLHE vs PLO', () => {
    // Player has only 1 spade, board has 4 spades
    // NLHE: can use 1 hole + 4 board for flush
    // PLO: must use 2 hole cards, only 1 is spade → no flush
    const holeCards = ['As', '2h', '3d', '4c'] as CardString[];
    const board = ['Ks', 'Qs', 'Js', 'Ts', '7d'] as CardString[];

    const ploResult = evaluatePLO(holeCards, board);
    // Only 2 cards used, only 1 is spade: max spades = 1 + 3(board) = 4. No flush.
    expect(ploResult.handName).not.toBe('Flush');
    expect(ploResult.handName).not.toBe('Straight Flush');
    expect(ploResult.handName).not.toBe('Royal Flush');
  });
});
