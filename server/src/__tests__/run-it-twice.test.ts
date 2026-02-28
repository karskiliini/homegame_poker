import { describe, it, expect, beforeEach } from 'vitest';
import { HandEngine } from '../game/HandEngine.js';
import type { HandEngineEvent, HandResult } from '../game/HandEngine.js';
import type { GameConfig, CardString, ActionType } from '@poker/shared';

// ============================================================================
// Test harness (RIT variant — accepts RIT by default)
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

/**
 * Build a predetermined deck for an NLHE hand with Run It Twice.
 *
 * HandEngine deck consumption order:
 * 1. Hole cards: [player0 cards], [player1 cards], ...
 * 2. Board 1: burn, flop1(3), burn, turn1(1), burn, river1(1)
 * 3. Board 2 (RIT): burn, flop2(3), burn, turn2(1), burn, river2(1)
 *
 * If only some streets remain (e.g. all-in on flop), the "remaining" streets
 * are dealt. Cards already dealt before all-in are part of communityCards,
 * so board1Remaining and board2Remaining contain only the NEW cards.
 *
 * The `preAllInBoard` param contains community cards dealt before the all-in
 * (e.g. flop cards if all-in happens on the flop).
 */
function buildDeckRIT(
  holeCards: CardString[][],
  preAllInBoard: CardString[],  // community cards already dealt before all-in
  board1Remaining: CardString[],  // remaining streets for board 1
  board2Remaining: CardString[],  // remaining streets for board 2
): CardString[] {
  const deck: CardString[] = [];

  // Hole cards
  for (const hand of holeCards) {
    deck.push(...hand);
  }

  const specifiedCards = new Set<string>([
    ...holeCards.flat(),
    ...preAllInBoard,
    ...board1Remaining,
    ...board2Remaining,
  ]);
  const allCards = buildFullDeck();
  const availableForBurn = allCards.filter(c => !specifiedCards.has(c));
  let burnIdx = 0;

  // Pre-all-in board cards (dealt as normal streets before the all-in)
  // Flop if present
  if (preAllInBoard.length >= 3) {
    deck.push(availableForBurn[burnIdx++]); // burn
    deck.push(...preAllInBoard.slice(0, 3)); // flop
  }
  // Turn if present
  if (preAllInBoard.length >= 4) {
    deck.push(availableForBurn[burnIdx++]); // burn
    deck.push(preAllInBoard[3]); // turn
  }
  // River if present
  if (preAllInBoard.length >= 5) {
    deck.push(availableForBurn[burnIdx++]); // burn
    deck.push(preAllInBoard[4]); // river
  }

  // Board 1 remaining streets (dealt in dealRunout)
  // Figure out what streets are remaining based on card count
  const remaining1 = [...board1Remaining];
  const remaining2 = [...board2Remaining];

  // Determine remaining streets from pre-all-in board length
  const streetsDealt = preAllInBoard.length >= 5 ? 3 : preAllInBoard.length >= 4 ? 2 : preAllInBoard.length >= 3 ? 1 : 0;
  // Streets: 0 = none dealt (preflop all-in), 1 = flop dealt, 2 = flop+turn dealt
  const remainingStreetNames: ('flop' | 'turn' | 'river')[] = [];
  if (streetsDealt === 0) remainingStreetNames.push('flop', 'turn', 'river');
  else if (streetsDealt === 1) remainingStreetNames.push('turn', 'river');
  else if (streetsDealt === 2) remainingStreetNames.push('river');

  // Board 1 remaining
  let cardIdx = 0;
  for (const street of remainingStreetNames) {
    const count = street === 'flop' ? 3 : 1;
    deck.push(availableForBurn[burnIdx++]); // burn
    deck.push(...remaining1.slice(cardIdx, cardIdx + count));
    cardIdx += count;
  }

  // Board 2 remaining
  cardIdx = 0;
  for (const street of remainingStreetNames) {
    const count = street === 'flop' ? 3 : 1;
    deck.push(availableForBurn[burnIdx++]); // burn
    deck.push(...remaining2.slice(cardIdx, cardIdx + count));
    cardIdx += count;
  }

  // Fill remaining deck
  const usedCards = new Set<string>(deck);
  for (const c of allCards) {
    if (!usedCards.has(c)) deck.push(c);
  }

  return deck;
}

class RITTestHarness {
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
      // Accept RIT when offered (key difference from regular harness)
      if (e.type === 'rit_eligible') this.engine.setRunItTwice(true);
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
    if (this.result) {
      const rp = this.result.players.find(pp => pp.playerId === playerId);
      if (rp) return rp.currentStack;
    }
    const p = this.engine.getPlayers().find(pp => pp.playerId === playerId);
    if (!p) throw new Error(`Player ${playerId} not found`);
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

describe('Run It Twice', () => {
  let h: RITTestHarness;
  const config = makeConfig();

  beforeEach(() => {
    h = new RITTestHarness();
  });

  it('different winners per board: pot split 50/50', () => {
    // Player 0: Ah Kh (will make flush on board 1)
    // Player 1: As Ks (will make flush on board 2)
    // Preflop all-in → all 5 community cards dealt via runout
    // Board 1: 2h 5h 9h 3d 4d → Player 0 wins (heart flush)
    // Board 2: 2s 5s 9s 3c 4c → Player 1 wins (spade flush)
    const players = makePlayers(2, 100);
    const deck = buildDeckRIT(
      [['Ah', 'Kh'], ['As', 'Ks']],
      [],  // no pre-all-in board
      ['2h', '5h', '9h', '3d', '4d'],  // board 1
      ['2s', '5s', '9s', '3c', '4c'],  // board 2
    );
    h.start(config, players, 0, deck);

    // SB all-in, BB calls
    h.actCurrent('all_in');
    h.actCurrent('call');

    expect(h.isComplete()).toBe(true);
    expect(h.result).not.toBeNull();

    // Pot is 200 (100+100). Each board winner gets 100.
    const p0 = h.result!.players.find(p => p.playerId === 'player-0')!;
    const p1 = h.result!.players.find(p => p.playerId === 'player-1')!;
    expect(p0.currentStack).toBe(100); // wins board 1 half
    expect(p1.currentStack).toBe(100); // wins board 2 half

    h.assertTotalChipsConserved(players);
  });

  it('same winner both boards: gets full pot', () => {
    // Player 0: Ah Kh (nut hand on both boards)
    // Player 1: 7d 2c (garbage)
    // Board 1: Qh Jh Th 3d 4d → Player 0 royal flush
    // Board 2: Qd Jd Td 3c 4c → Player 0 A-high straight (still beats 7-high)
    const players = makePlayers(2, 100);
    const deck = buildDeckRIT(
      [['Ah', 'Kh'], ['7d', '2c']],
      [],
      ['Qh', 'Jh', 'Th', '3d', '4d'],
      ['Qs', 'Js', 'Ts', '3c', '4c'],
    );
    h.start(config, players, 0, deck);

    h.actCurrent('all_in');
    h.actCurrent('call');

    expect(h.isComplete()).toBe(true);

    const p0 = h.result!.players.find(p => p.playerId === 'player-0')!;
    const p1 = h.result!.players.find(p => p.playerId === 'player-1')!;
    expect(p0.currentStack).toBe(200);
    expect(p1.currentStack).toBe(0);

    h.assertTotalChipsConserved(players);
  });

  it('odd chip goes to board 1 winner', () => {
    // Create a pot of 5 (odd). Player 0 wins board 1, Player 1 wins board 2.
    // Board 1 gets ceil(5/2) = 3, Board 2 gets floor(5/2) = 2.
    // Use stacks: SB=1 stack=2 (posts 1), BB=2 stack=3 (posts 2), so SB all-in for 2 → pot = 2 + 2 = 4 … no
    // Let's use: SB posts 1, BB posts 2, SB raises to 3 (all-in with 3 chips), BB calls 1 more → pot = 3+3 = 6 (even)
    // Actually: let's do player0 has 3 chips, player1 has 100.
    // HU: seat0 = dealer = SB, posts 1. Seat1 = BB, posts 2.
    // SB all-in for 3 total. BB calls 1 more. Pot = 3 + 3 = 6 (even).
    // We need an odd pot. Player0 stack=3, Player1 stack=100.
    // SB posts 1, BB posts 2. SB raises all-in to 3. BB calls (adds 1 to their 2, now 3). Pot=6 even.
    // Try: player0 stack=5. SB posts 1, BB posts 2. SB raises all-in to 5. BB calls (adds 3). Pot=10 even.
    // For odd: player0 stack=50, player1 stack=50. SB=1, BB=2. SB raises to 5. BB raises to 12. SB raises all-in 50. BB calls → pot 100.
    // Hmm, hard to get odd pot with equal stacks and standard blinds.
    // Easiest: 3 players, one folds leaving money. P0=50, P1=50, P2=50.
    // Dealer=P0, SB=P1(1), BB=P2(2). P0 raises to 5. P1 folds (contributed 1). P2 goes all-in (50). P0 calls.
    // Pot = 1 + 50 + 50 = 101 (odd!).
    const players = [
      { playerId: 'player-0', seatIndex: 0, name: 'Player0', stack: 50 },
      { playerId: 'player-1', seatIndex: 1, name: 'Player1', stack: 50 },
      { playerId: 'player-2', seatIndex: 2, name: 'Player2', stack: 50 },
    ];
    // Player 0 wins board 1, Player 2 wins board 2
    const deck = buildDeckRIT(
      [['Ah', 'Kh'], ['7c', '2c'], ['As', 'Ks']],
      [],
      ['2h', '5h', '9h', '3d', '4d'],  // board 1: Player 0 heart flush
      ['2s', '5s', '9s', '3c', '4c'],  // board 2: Player 2 spade flush
    );
    h.start(config, players, 0, deck);

    // 3-player: Dealer=seat0, SB=seat1, BB=seat2
    // Preflop first actor: UTG = seat0 (left of BB in 3-handed = dealer)
    expect(h.getCurrentTurn()!.playerId).toBe('player-0');
    h.actCurrent('raise', 5); // P0 raises to 5

    expect(h.getCurrentTurn()!.playerId).toBe('player-1');
    h.actCurrent('fold'); // P1 folds (contributed 1 from SB)

    expect(h.getCurrentTurn()!.playerId).toBe('player-2');
    h.actCurrent('all_in'); // P2 all-in for 50

    expect(h.getCurrentTurn()!.playerId).toBe('player-0');
    h.actCurrent('call'); // P0 calls to 50

    expect(h.isComplete()).toBe(true);

    // Pot = 1 (P1 folded SB) + 50 (P0) + 50 (P2) = 101
    // Board 1 gets ceil: 101 - floor(101/2) = 101 - 50 = 51
    // Board 2 gets floor: floor(101/2) = 50
    const p0 = h.result!.players.find(p => p.playerId === 'player-0')!;
    const p2 = h.result!.players.find(p => p.playerId === 'player-2')!;
    expect(p0.currentStack).toBe(51); // board 1 winner gets odd chip
    expect(p2.currentStack).toBe(50); // board 2 winner

    h.assertTotalChipsConserved(players);
  });

  it('side pots + RIT: each side pot split independently', () => {
    // 3 players with different stacks
    // Short(30), Medium(80), Deep(200)
    // All go all-in preflop
    // Main pot: 30*3 = 90 (all 3 eligible)
    // Side pot: 50*2 = 100 (Medium + Deep eligible)
    const players = [
      { playerId: 'short', seatIndex: 0, name: 'Short', stack: 30 },
      { playerId: 'medium', seatIndex: 1, name: 'Medium', stack: 80 },
      { playerId: 'deep', seatIndex: 2, name: 'Deep', stack: 200 },
    ];

    // Short wins board 1, Deep wins board 2 for all pots
    const deck = buildDeckRIT(
      [['Ah', 'Kh'], ['7c', '8c'], ['Ad', 'Kd']],
      [],
      ['2h', '5h', '9h', '3c', '4c'],  // board 1: Short wins (heart flush)
      ['2d', '5d', '9d', '3s', '4s'],  // board 2: Deep wins (diamond flush)
    );
    h.start(config, players, 0, deck);

    // 3-player: D=seat0, SB=seat1, BB=seat2
    // UTG(seat0) all-in
    h.actCurrent('all_in'); // Short all-in 30
    h.actCurrent('all_in'); // Medium all-in 80
    h.actCurrent('call');   // Deep calls 80

    expect(h.isComplete()).toBe(true);

    // Main pot (90): Short wins board 1 → 45, Deep wins board 2 → 45
    // Side pot (100): Medium vs Deep.
    //   Board 1: Medium has 7c 8c, board is 2h 5h 9h 3c 4c → no flush, 8-high → Deep has Ad Kd, A-high → Deep wins board 1 side pot
    //   Board 2: Deep has Ad Kd, board is 2d 5d 9d 3s 4s → diamond flush → Deep wins board 2 side pot too
    // Actually wait - for the side pot on board 1: Medium(7c 8c) vs Deep(Ad Kd) with board 2h 5h 9h 3c 4c
    //   Medium: 8-high (7c 8c 9h 5h 4c)
    //   Deep: A-high (Ad Kd 9h 5h 4c)
    //   Deep wins side pot board 1 too.
    // So: Short gets 45, Deep gets 45 + 100 = 145. Deep started with 200, invested 80 → 200-80+145 = 265? No.
    // Deep invested 80 → stack left = 120. Wins: main pot board 2 half (45) + side pot full (100) = 145. Final: 120 + 145 = 265.
    // Short invested 30 → stack left = 0. Wins: main pot board 1 half (45). Final: 45.
    // Medium invested 80 → stack left = 0. Wins: nothing. Final: 0.
    // Total: 45 + 0 + 265 = 310. Initial: 30 + 80 + 200 = 310. ✓

    const shortP = h.result!.players.find(p => p.playerId === 'short')!;
    const mediumP = h.result!.players.find(p => p.playerId === 'medium')!;
    const deepP = h.result!.players.find(p => p.playerId === 'deep')!;

    expect(shortP.currentStack).toBe(45);  // half main pot
    expect(mediumP.currentStack).toBe(0);  // loses everything
    expect(deepP.currentStack).toBe(265);  // 120 remaining + 45 main pot + 100 side pot

    h.assertTotalChipsConserved(players);
  });

  it('single-eligible pot not split: full amount to sole eligible player', () => {
    // Short stack goes all-in, 2 others continue. Short creates a main pot,
    // the other 2 create a side pot. One of them folds → sole eligible for side pot.
    const players = [
      { playerId: 'short', seatIndex: 0, name: 'Short', stack: 20 },
      { playerId: 'p1', seatIndex: 1, name: 'P1', stack: 200 },
      { playerId: 'p2', seatIndex: 2, name: 'P2', stack: 200 },
    ];

    // Short wins both boards of main pot
    const deck = buildDeckRIT(
      [['Ah', 'Kh'], ['7c', '2d'], ['8c', '3d']],
      [],
      ['Qh', 'Jh', 'Th', '4c', '5c'],  // board 1: Short royal flush
      ['Qs', 'Js', 'Ts', '4d', '5d'],   // board 2: Short straight
    );
    h.start(config, players, 0, deck);

    // D=seat0, SB=seat1, BB=seat2. UTG=seat0.
    h.actCurrent('all_in'); // Short all-in 20
    h.actCurrent('raise', 40); // P1 raises to 40
    h.actCurrent('fold');   // P2 folds (contributed 2 from BB)

    // P1 is sole remaining with stack in side pot, so side pot goes to P1 without eval
    expect(h.isComplete()).toBe(true);

    // Main pot: 20 (Short) + 20 (P1, capped) + 2 (P2 BB, capped at 20 but P2 only put 2) = Short's 20 + min(40,20)=20 from P1 + min(2,20)=2 from P2 = 42
    // Side pot: P1's excess = 40-20 = 20, sole eligible → P1 gets 20 back (no split needed)
    const shortP = h.result!.players.find(p => p.playerId === 'short')!;
    const p1 = h.result!.players.find(p => p.playerId === 'p1')!;

    // Short wins main pot (42) → stack = 0 + 42 = 42
    expect(shortP.currentStack).toBe(42);
    // P1 gets side pot back (20) → stack = 200 - 40 + 20 = 180
    expect(p1.currentStack).toBe(180);

    h.assertTotalChipsConserved(players);
  });

  it('second_board_dealt event emitted with correct cards', () => {
    const players = makePlayers(2, 100);
    const deck = buildDeckRIT(
      [['Ah', 'Kh'], ['As', 'Ks']],
      [],
      ['2h', '5h', '9h', '3d', '4d'],
      ['2s', '5s', '9s', '3c', '4c'],
    );
    h.start(config, players, 0, deck);

    h.actCurrent('all_in');
    h.actCurrent('call');

    expect(h.isComplete()).toBe(true);

    // Should have a second_board_dealt event
    const secondBoardEvents = h.events.filter(e => e.type === 'second_board_dealt') as
      { type: 'second_board_dealt'; cards: CardString[] }[];
    expect(secondBoardEvents.length).toBe(1);
    expect(secondBoardEvents[0].cards).toHaveLength(5);
    expect(secondBoardEvents[0].cards).toEqual(['2s', '5s', '9s', '3c', '4c']);
  });

  it('chip conservation across many random RIT hands', { timeout: 60_000 }, () => {
    const initialStack = 200;

    for (let hand = 0; hand < 500; hand++) {
      let stack0 = initialStack;
      let stack1 = initialStack;

      const hh = new RITTestHarness();
      const players: TestPlayer[] = [
        { playerId: 'p0', seatIndex: 0, name: 'P0', stack: stack0 },
        { playerId: 'p1', seatIndex: 1, name: 'P1', stack: stack1 },
      ];
      hh.start(config, players, hand % 2 === 0 ? 0 : 1);

      let maxActions = 50;
      while (!hh.isComplete() && maxActions > 0) {
        const turn = hh.getCurrentTurn();
        if (!turn) break;

        const actions = turn.availableActions;
        const rand = Math.random();
        // Bias toward all-in to trigger RIT more often
        if (rand < 0.3 && actions.includes('fold')) {
          hh.actCurrent('fold');
        } else if (rand < 0.5) {
          hh.actCurrent('all_in');
        } else if (actions.includes('call')) {
          hh.actCurrent('call');
        } else if (actions.includes('check')) {
          hh.actCurrent('check');
        } else if (actions.includes('fold')) {
          hh.actCurrent('fold');
        }
        maxActions--;
      }

      if (hh.result) {
        const total = hh.result.players.reduce((s, p) => s + p.currentStack, 0);
        expect(total).toBe(initialStack * 2);
      }
    }
  });

  it('RIT with all-in on the flop: only turn and river are dealt twice', () => {
    // Players see a flop, then go all-in on flop → only turn+river remain
    const players = makePlayers(2, 100);
    const deck = buildDeckRIT(
      [['Ah', 'Kh'], ['As', 'Ks']],
      ['Qh', 'Jh', '9c'],  // pre-all-in: flop dealt
      ['Th', '4d'],          // board 1 remaining: turn + river
      ['Ts', '4c'],          // board 2 remaining: turn + river
    );
    h.start(config, players, 0, deck);

    // Preflop: SB calls, BB checks
    h.actCurrent('call');
    h.actCurrent('check');

    // Flop: BB checks, SB goes all-in, BB calls
    h.actCurrent('check');
    h.actCurrent('all_in');
    h.actCurrent('call');

    expect(h.isComplete()).toBe(true);

    // Board 1: Qh Jh 9c Th 4d → Player 0 has Ah Kh → straight AKQJT + flush draw → royal flush? Qh Jh Th Kh Ah = royal flush!
    // Board 2: Qh Jh 9c Ts 4c → Player 0: A-high straight (AKQJT). Player 1: As Ks → also AKQJT straight → split board 2
    // Actually board 2 = shared flop (Qh Jh 9c) + Ts + 4c
    // P0: Ah Kh + Qh Jh 9c Ts 4c → straight AKQJT
    // P1: As Ks + Qh Jh 9c Ts 4c → straight AKQJT
    // Board 2 splits!
    // Pot = 200. Board 1: P0 gets 100. Board 2: split 50/50.
    // P0 total: 100 + 50 = 150. P1 total: 50.
    const p0 = h.result!.players.find(p => p.playerId === 'player-0')!;
    const p1 = h.result!.players.find(p => p.playerId === 'player-1')!;
    expect(p0.currentStack).toBe(150);
    expect(p1.currentStack).toBe(50);

    // Second board should have 5 cards total (shared flop + 2 new)
    expect(h.result!.secondBoard).toHaveLength(5);
    // The shared flop cards should be the same
    expect(h.result!.secondBoard![0]).toBe('Qh');
    expect(h.result!.secondBoard![1]).toBe('Jh');
    expect(h.result!.secondBoard![2]).toBe('9c');

    h.assertTotalChipsConserved(players);
  });
});
