import { describe, it, expect } from 'vitest';
import { HandEngine } from '../game/HandEngine.js';
import type { HandEngineEvent, HandResult } from '../game/HandEngine.js';
import type { GameConfig, CardString, ActionType } from '@poker/shared';
import { isBadBeat, BAD_BEAT_MIN_HAND_CATEGORY } from '../evaluation/bad-beat.js';
import { evaluateHand } from '../evaluation/hand-rank.js';

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

/**
 * Build a predetermined deck for a multi-player hand.
 * @param holeCards Array of hole card arrays, one per player
 * @param board 5 community cards [flop0, flop1, flop2, turn, river]
 */
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
      // Decline RIT so runout proceeds immediately
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
// Unit tests for isBadBeat detection (hand-strength based)
// ============================================================================

describe('isBadBeat', () => {
  it('should return bad beat info when loser had two pair or better', () => {
    const communityCards: CardString[] = ['Ah', 'Kd', 'Jc', '7s', '2h'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['Ac', 'Ks'] as CardString[] },
      { playerId: 'p1', seatIndex: 1, holeCards: ['Jh', 'Jd'] as CardString[] },
    ];
    const winnerIds = ['p1'];

    const result = isBadBeat('NLHE', showdownPlayers, communityCards, winnerIds);
    expect(result).not.toBeNull();
    expect(result!.loserPlayerId).toBe('p0');
    expect(result!.loserSeatIndex).toBe(0);
    expect(result!.loserHandName).toBe('Two Pair');
  });

  it('should return bad beat when loser had full house but winner had quads', () => {
    const communityCards: CardString[] = ['Jh', 'Jd', '8h', '8d', '2c'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['Jc', '9s'] as CardString[] },
      { playerId: 'p1', seatIndex: 1, holeCards: ['8c', '8s'] as CardString[] },
    ];
    const winnerIds = ['p1'];

    const result = isBadBeat('NLHE', showdownPlayers, communityCards, winnerIds);
    expect(result).not.toBeNull();
    expect(result!.loserPlayerId).toBe('p0');
    expect(result!.loserHandName).toBe('Full House');
  });

  it('should NOT return bad beat when loser had only a pair', () => {
    const communityCards: CardString[] = ['Ah', '7d', '3c', '9s', '2h'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['7c', 'Qs'] as CardString[] },
      { playerId: 'p1', seatIndex: 1, holeCards: ['Ad', 'Kd'] as CardString[] },
    ];
    const winnerIds = ['p1'];

    const result = isBadBeat('NLHE', showdownPlayers, communityCards, winnerIds);
    expect(result).toBeNull();
  });

  it('should NOT return bad beat when loser had only high card', () => {
    const communityCards: CardString[] = ['2h', '5d', '8c', 'Ts', '3h'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['Jc', '9s'] as CardString[] },
      { playerId: 'p1', seatIndex: 1, holeCards: ['Ad', 'Kd'] as CardString[] },
    ];
    const winnerIds = ['p1'];

    const result = isBadBeat('NLHE', showdownPlayers, communityCards, winnerIds);
    expect(result).toBeNull();
  });

  it('should NOT return bad beat when there is no loser (single winner/no showdown)', () => {
    const communityCards: CardString[] = ['2h', '5d', '8c', 'Ts', '3h'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['Ad', 'Kd'] as CardString[] },
    ];
    const winnerIds = ['p0'];

    const result = isBadBeat('NLHE', showdownPlayers, communityCards, winnerIds);
    expect(result).toBeNull();
  });

  it('should pick the strongest losing hand as the bad beat victim', () => {
    const communityCards: CardString[] = ['Jh', 'Td', '9c', '3s', '2h'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['Jd', 'Jc'] as CardString[] },
      { playerId: 'p1', seatIndex: 1, holeCards: ['Th', '9h'] as CardString[] },
      { playerId: 'p2', seatIndex: 2, holeCards: ['Qh', '8h'] as CardString[] },
    ];
    const winnerIds = ['p2'];

    const result = isBadBeat('NLHE', showdownPlayers, communityCards, winnerIds);
    expect(result).not.toBeNull();
    expect(result!.loserPlayerId).toBe('p0');
    expect(result!.loserHandName).toBe('Three of a Kind');
  });

  it('should return bad beat when loser had trips', () => {
    const communityCards: CardString[] = ['7h', '7d', '3c', '9s', 'Ah'] as CardString[];
    const showdownPlayers = [
      { playerId: 'p0', seatIndex: 0, holeCards: ['7c', '5s'] as CardString[] },
      { playerId: 'p1', seatIndex: 1, holeCards: ['9d', '9c'] as CardString[] },
    ];
    const winnerIds = ['p1'];

    const result = isBadBeat('NLHE', showdownPlayers, communityCards, winnerIds);
    expect(result).not.toBeNull();
    expect(result!.loserPlayerId).toBe('p0');
    expect(result!.loserHandName).toBe('Three of a Kind');
  });
});

// ============================================================================
// Integration: HandEngine emits bad_beat event (hand-strength based)
// ============================================================================

describe('HandEngine bad beat event', () => {
  it('should emit bad_beat event when a two pair or better loses at showdown', () => {
    const harness = new HandTestHarness();
    const config = makeConfig();
    const players = makePlayers(2);

    const deck = buildDeck(
      [['Ac', 'Kh'] as CardString[], ['Jh', 'Jd'] as CardString[]],
      ['Ah', 'Kd', 'Jc', '7s', '2s'] as CardString[],
    );

    harness.start(config, players, 0, deck);
    harness.actCurrent('call');
    harness.actCurrent('check');
    for (let i = 0; i < 6; i++) harness.actCurrent('check');

    expect(harness.result).not.toBeNull();
    const badBeatEvent = harness.events.find(e => e.type === 'bad_beat');
    expect(badBeatEvent).toBeDefined();
    if (badBeatEvent!.type === 'bad_beat') {
      expect(badBeatEvent!.loserSeatIndex).toBe(0);
      expect(badBeatEvent!.loserHandName).toBe('Two Pair');
    }
  });

  it('should NOT emit bad_beat when loser had only a pair', () => {
    const harness = new HandTestHarness();
    const config = makeConfig();
    const players = makePlayers(2);

    const deck = buildDeck(
      [['7c', 'Qs'] as CardString[], ['Ad', 'Kd'] as CardString[]],
      ['Ah', '7d', '3c', '9s', '2h'] as CardString[],
    );

    harness.start(config, players, 0, deck);
    harness.actCurrent('call');
    harness.actCurrent('check');
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
    harness.actCurrent('fold');

    expect(harness.result).not.toBeNull();
    const badBeatEvent = harness.events.find(e => e.type === 'bad_beat');
    expect(badBeatEvent).toBeUndefined();
  });
});

// ============================================================================
// Integration: equity-based bad beat detection (all-in runout)
// ============================================================================

describe('Bad Beat Detection (equity-based)', () => {
  it('detects bad beat when turn equity >70% loser gets rivered', () => {
    const h = new HandTestHarness();
    const config = makeConfig();

    // AK makes top two pair on flop, 77 hits set on river
    const deck = buildDeck(
      [['Ac', 'Kc'] as CardString[], ['7s', '7h'] as CardString[]],
      ['As', 'Kd', '3h', '9c', '7d'] as CardString[],
    );

    h.start(config, makePlayers(2, 100), 0, deck);
    h.actCurrent('all_in');
    h.actCurrent('call');

    expect(h.result).not.toBeNull();
    expect(h.result!.pots[0].winners[0].playerId).toBe('player-1');
    expect(h.result!.badBeatPlayerIds).toBeDefined();
    expect(h.result!.badBeatPlayerIds).toContain('player-0');
  });

  it('does not flag bad beat when favorite wins (loser had low equity)', () => {
    const h = new HandTestHarness();
    const config = makeConfig();

    const deck = buildDeck(
      [['Ah', 'Ad'] as CardString[], ['7c', '2d'] as CardString[]],
      ['3s', '5d', '9h', 'Jc', '8h'] as CardString[],
    );

    h.start(config, makePlayers(2, 100), 0, deck);
    h.actCurrent('all_in');
    h.actCurrent('call');

    expect(h.result).not.toBeNull();
    expect(h.result!.pots[0].winners[0].playerId).toBe('player-0');
    expect(h.result!.badBeatPlayerIds).toBeUndefined();
  });

  it('does not flag bad beat for non-runout showdown (river all-in)', () => {
    const h = new HandTestHarness();
    const config = makeConfig();

    const deck = buildDeck(
      [['Ah', 'Ad'] as CardString[], ['Kh', 'Ks'] as CardString[]],
      ['2c', '5d', '8s', 'Jc', 'Kd'] as CardString[],
    );

    h.start(config, makePlayers(2, 100), 0, deck);
    h.actCurrent('call');
    h.actCurrent('check');
    h.actCurrent('check');
    h.actCurrent('check');
    h.actCurrent('check');
    h.actCurrent('check');
    h.actCurrent('all_in');
    h.actCurrent('call');

    expect(h.result).not.toBeNull();
    expect(h.result!.pots[0].winners[0].playerId).toBe('player-1');
    expect(h.result!.badBeatPlayerIds).toBeUndefined();
  });

  it('winner with high turn equity who wins is not flagged', () => {
    const h = new HandTestHarness();
    const config = makeConfig();

    const deck = buildDeck(
      [['Ah', 'Ad'] as CardString[], ['7c', '2d'] as CardString[]],
      ['3s', '5d', '9h', 'Jc', '8h'] as CardString[],
    );

    h.start(config, makePlayers(2, 100), 0, deck);
    h.actCurrent('all_in');
    h.actCurrent('call');

    expect(h.result).not.toBeNull();
    expect(h.result!.pots[0].winners[0].playerId).toBe('player-0');
    expect(h.result!.badBeatPlayerIds).toBeUndefined();
  });
});
