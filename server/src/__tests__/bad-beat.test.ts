import { describe, it, expect, beforeEach } from 'vitest';
import { HandEngine } from '../game/HandEngine.js';
import type { HandEngineEvent, HandResult } from '../game/HandEngine.js';
import type { GameConfig, CardString, ActionType } from '@poker/shared';
import { isBadBeat, BAD_BEAT_MIN_HAND_CATEGORY } from '../evaluation/bad-beat.js';
import { evaluateHand } from '../evaluation/hand-rank.js';

// ============================================================================
// Test harness (same as hand-engine.test.ts)
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

function buildDeck(
  holeCards: CardString[][],
  board: CardString[],
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
}

// ============================================================================
// Unit tests for isBadBeat detection
// ============================================================================

describe('isBadBeat', () => {
  it('should return bad beat info when loser had two pair or better', () => {
    // Player 0 has two pair (Aces and Kings), Player 1 has trips (three Jacks)
    // Player 0 loses with two pair => bad beat
    const gameType = 'NLHE' as const;
    const communityCards: CardString[] = ['Ah', 'Kd', 'Jc', '7s', '2h'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['Ac', 'Ks'] as CardString[] },
      { playerId: 'p1', seatIndex: 1, holeCards: ['Jh', 'Jd'] as CardString[] },
    ];
    const winnerIds = ['p1']; // p1 wins with trips

    const result = isBadBeat(gameType, showdownPlayers, communityCards, winnerIds);
    expect(result).not.toBeNull();
    expect(result!.loserPlayerId).toBe('p0');
    expect(result!.loserSeatIndex).toBe(0);
    expect(result!.loserHandName).toBe('Two Pair');
  });

  it('should return bad beat when loser had full house but winner had quads', () => {
    // Board: Ah Kh Kd 3h 3d
    // p0: Kc 3c => KKK 33 = Full house (Kings full of Threes)
    // p1: Ac As => AAA KK = nah, need quads. Let me set up properly:
    // Board: Jh Jd 8h 8d 2c
    // p0: Jc 9s => JJJ 88 = Full house (Jacks full of Eights)
    // p1: 8c 8s => 8888 J = Four of a kind (Eights)
    const communityCards: CardString[] = ['Jh', 'Jd', '8h', '8d', '2c'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['Jc', '9s'] as CardString[] },  // Full house JJJ 88
      { playerId: 'p1', seatIndex: 1, holeCards: ['8c', '8s'] as CardString[] },  // Four of a kind 8888
    ];
    const winnerIds = ['p1'];

    const result = isBadBeat('NLHE', showdownPlayers, communityCards, winnerIds);
    expect(result).not.toBeNull();
    expect(result!.loserPlayerId).toBe('p0');
    expect(result!.loserHandName).toBe('Full House');
  });

  it('should NOT return bad beat when loser had only a pair', () => {
    const gameType = 'NLHE' as const;
    const communityCards: CardString[] = ['Ah', '7d', '3c', '9s', '2h'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['7c', 'Qs'] as CardString[] }, // Pair of 7s
      { playerId: 'p1', seatIndex: 1, holeCards: ['Ad', 'Kd'] as CardString[] }, // Pair of Aces
    ];
    const winnerIds = ['p1'];

    const result = isBadBeat(gameType, showdownPlayers, communityCards, winnerIds);
    expect(result).toBeNull();
  });

  it('should NOT return bad beat when loser had only high card', () => {
    const gameType = 'NLHE' as const;
    const communityCards: CardString[] = ['2h', '5d', '8c', 'Ts', '3h'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['Jc', '9s'] as CardString[] }, // High card J
      { playerId: 'p1', seatIndex: 1, holeCards: ['Ad', 'Kd'] as CardString[] }, // High card A
    ];
    const winnerIds = ['p1'];

    const result = isBadBeat(gameType, showdownPlayers, communityCards, winnerIds);
    expect(result).toBeNull();
  });

  it('should NOT return bad beat when there is no loser (single winner/no showdown)', () => {
    const gameType = 'NLHE' as const;
    const communityCards: CardString[] = ['2h', '5d', '8c', 'Ts', '3h'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['Ad', 'Kd'] as CardString[] },
    ];
    const winnerIds = ['p0'];

    const result = isBadBeat(gameType, showdownPlayers, communityCards, winnerIds);
    expect(result).toBeNull();
  });

  it('should pick the strongest losing hand as the bad beat victim', () => {
    // Three players: p0 has trips, p1 has two pair, p2 has straight (wins)
    // p0 (trips) is the "worst" bad beat = strongest loser
    const gameType = 'NLHE' as const;
    const communityCards: CardString[] = ['Jh', 'Td', '9c', '3s', '2h'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['Jd', 'Jc'] as CardString[] },  // Three jacks
      { playerId: 'p1', seatIndex: 1, holeCards: ['Th', '9h'] as CardString[] },   // Two pair T and 9
      { playerId: 'p2', seatIndex: 2, holeCards: ['Qh', '8h'] as CardString[] },   // Straight Q-high (Q-J-T-9-8)
    ];
    const winnerIds = ['p2'];

    const result = isBadBeat(gameType, showdownPlayers, communityCards, winnerIds);
    expect(result).not.toBeNull();
    expect(result!.loserPlayerId).toBe('p0');
    expect(result!.loserHandName).toBe('Three of a Kind');
  });

  it('should return bad beat when loser had trips', () => {
    const gameType = 'NLHE' as const;
    const communityCards: CardString[] = ['7h', '7d', '3c', '9s', 'Ah'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['7c', '5s'] as CardString[] },  // Trip 7s
      { playerId: 'p1', seatIndex: 1, holeCards: ['9d', '9c'] as CardString[] },   // Full house 9s full of 7s
    ];
    const winnerIds = ['p1'];

    const result = isBadBeat(gameType, showdownPlayers, communityCards, winnerIds);
    expect(result).not.toBeNull();
    expect(result!.loserPlayerId).toBe('p0');
    expect(result!.loserHandName).toBe('Three of a Kind');
  });
});

// ============================================================================
// Integration test: HandEngine emits bad_beat event during showdown
// ============================================================================

describe('HandEngine bad beat event', () => {
  it('should emit bad_beat event when a two pair or better loses at showdown', () => {
    const harness = new HandTestHarness();
    const config = makeConfig();
    const players = makePlayers(2);

    // Player 0 (SB/dealer in HU): Ac Kh → two pair
    // Player 1 (BB): Jh Jd → three jacks
    // Board: Ah Kd Jc 7s 2s
    const deck = buildDeck(
      [['Ac', 'Kh'] as CardString[], ['Jh', 'Jd'] as CardString[]],
      ['Ah', 'Kd', 'Jc', '7s', '2s'] as CardString[],
    );

    harness.start(config, players, 0, deck);

    // Preflop: SB calls, BB checks
    harness.actCurrent('call');  // p0 (SB/dealer) calls
    harness.actCurrent('check'); // p1 (BB) checks

    // Flop: p1 checks, p0 checks
    harness.actCurrent('check'); // p1
    harness.actCurrent('check'); // p0

    // Turn: p1 checks, p0 checks
    harness.actCurrent('check'); // p1
    harness.actCurrent('check'); // p0

    // River: p1 checks, p0 checks
    harness.actCurrent('check'); // p1
    harness.actCurrent('check'); // p0

    // Hand should be complete
    expect(harness.result).not.toBeNull();

    // Check that bad_beat event was emitted
    const badBeatEvent = harness.events.find(e => e.type === 'bad_beat');
    expect(badBeatEvent).toBeDefined();
    expect(badBeatEvent!.type).toBe('bad_beat');
    if (badBeatEvent!.type === 'bad_beat') {
      expect(badBeatEvent!.loserSeatIndex).toBe(0); // Player 0 lost with two pair
      expect(badBeatEvent!.loserHandName).toBe('Two Pair');
    }
  });

  it('should NOT emit bad_beat when loser had only a pair', () => {
    const harness = new HandTestHarness();
    const config = makeConfig();
    const players = makePlayers(2);

    // Player 0: 7c Qs → pair of 7s on board
    // Player 1: Ad Kd → pair of Aces on board
    // Board: Ah 7d 3c 9s 2h
    const deck = buildDeck(
      [['7c', 'Qs'] as CardString[], ['Ad', 'Kd'] as CardString[]],
      ['Ah', '7d', '3c', '9s', '2h'] as CardString[],
    );

    harness.start(config, players, 0, deck);

    // Preflop: SB calls, BB checks
    harness.actCurrent('call');
    harness.actCurrent('check');

    // Flop through river: all checks
    for (let i = 0; i < 6; i++) harness.actCurrent('check');

    expect(harness.result).not.toBeNull();
    const badBeatEvent = harness.events.find(e => e.type === 'bad_beat');
    expect(badBeatEvent).toBeUndefined();
  });

  it('should NOT emit bad_beat when hand ends by fold (no showdown)', () => {
    const harness = new HandTestHarness();
    const config = makeConfig();
    const players = makePlayers(2);

    harness.start(config, players, 0);

    // Preflop: SB folds
    harness.actCurrent('fold');

    expect(harness.result).not.toBeNull();
    const badBeatEvent = harness.events.find(e => e.type === 'bad_beat');
    expect(badBeatEvent).toBeUndefined();
  });
});
