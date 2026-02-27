import { describe, it, expect } from 'vitest';
import { HandEngine } from '../game/HandEngine.js';
import type { HandEngineEvent, HandResult } from '../game/HandEngine.js';
import type { GameConfig, CardString, ActionType, Street } from '@poker/shared';

// ============================================================================
// Integration test: 3 players, 50 hands, full verification
// ============================================================================

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

interface PlayerState {
  playerId: string;
  seatIndex: number;
  name: string;
  stack: number;
}

class FullGameHarness {
  config: GameConfig;
  players: PlayerState[];
  handResults: HandResult[] = [];
  dealerSeat: number = 0;
  handNumber: number = 0;
  errors: string[] = [];

  constructor(config: GameConfig, players: PlayerState[]) {
    this.config = config;
    this.players = players.map(p => ({ ...p }));
  }

  playHand(): HandResult | null {
    // Filter out busted players
    const activePlayers = this.players.filter(p => p.stack > 0);
    if (activePlayers.length < 2) return null;

    this.handNumber++;
    const events: HandEngineEvent[] = [];
    let result: HandResult | null = null;
    const turnEvents: Extract<HandEngineEvent, { type: 'player_turn' }>[] = [];
    const streetEvents: Extract<HandEngineEvent, { type: 'street_dealt' }>[] = [];
    const actEvents: Extract<HandEngineEvent, { type: 'player_acted' }>[] = [];

    const engine = new HandEngine(this.config, (e) => {
      events.push(e);
      if (e.type === 'hand_complete') result = e.result;
      if (e.type === 'player_turn') turnEvents.push(e);
      if (e.type === 'street_dealt') streetEvents.push(e);
      if (e.type === 'player_acted') actEvents.push(e);
      if (e.type === 'rit_eligible') engine.setRunItTwice(false);
    });

    // Rotate dealer
    const dealerPlayer = activePlayers[this.handNumber % activePlayers.length];
    this.dealerSeat = dealerPlayer.seatIndex;

    const initialTotal = activePlayers.reduce((s, p) => s + p.stack, 0);

    engine.startHand(
      this.handNumber,
      activePlayers.map(p => ({
        playerId: p.playerId,
        seatIndex: p.seatIndex,
        name: p.name,
        stack: p.stack,
      })),
      this.dealerSeat,
    );

    // Verify hand_started event
    const startEvent = events.find(e => e.type === 'hand_started');
    if (!startEvent) {
      this.errors.push(`Hand ${this.handNumber}: no hand_started event`);
      return null;
    }

    // Verify cards_dealt event
    const cardsEvent = events.find(e => e.type === 'cards_dealt') as Extract<HandEngineEvent, { type: 'cards_dealt' }> | undefined;
    if (!cardsEvent) {
      this.errors.push(`Hand ${this.handNumber}: no cards_dealt event`);
      return null;
    }
    for (const p of activePlayers) {
      const cards = cardsEvent.playerCards.get(p.playerId);
      if (!cards || cards.length !== 2) {
        this.errors.push(`Hand ${this.handNumber}: player ${p.name} didn't get 2 cards`);
      }
    }

    // Verify first turn event exists
    if (turnEvents.length === 0) {
      this.errors.push(`Hand ${this.handNumber}: no player_turn event after start`);
      return null;
    }

    // Play the hand with a mixed strategy
    let actionCount = 0;
    const maxActions = 200;

    while (!engine.isHandComplete() && actionCount < maxActions) {
      const turnInfo = engine.getCurrentTurnInfo();
      if (!turnInfo) {
        // Hand might have completed via all-in runout
        break;
      }

      const { playerId, availableActions, minRaise, callAmount } = turnInfo;

      // Verify actions are non-empty
      if (availableActions.length === 0) {
        this.errors.push(`Hand ${this.handNumber}, action ${actionCount}: empty availableActions for ${playerId}`);
        break;
      }

      // Verify fold is always an option
      if (!availableActions.includes('fold')) {
        this.errors.push(`Hand ${this.handNumber}, action ${actionCount}: fold not available for ${playerId}`);
      }

      // Simple LCG pseudo-random for varied but reproducible actions
      const seed = ((this.handNumber * 7919 + actionCount * 104729 + 12345) >>> 0) % 100;
      let action: ActionType;
      let amount: number | undefined;

      if (seed < 10 && availableActions.includes('fold') && actionCount > 0) {
        action = 'fold';
      } else if (seed < 30 && availableActions.includes('check')) {
        action = 'check';
      } else if (seed >= 80 && (availableActions.includes('raise') || availableActions.includes('bet'))) {
        action = availableActions.includes('raise') ? 'raise' : 'bet';
        amount = minRaise;
      } else if (availableActions.includes('call')) {
        action = 'call';
      } else if (availableActions.includes('check')) {
        action = 'check';
      } else if (availableActions.includes('raise')) {
        action = 'raise';
        amount = minRaise;
      } else if (availableActions.includes('bet')) {
        action = 'bet';
        amount = minRaise;
      } else {
        action = 'fold';
      }

      // Verify mid-hand chip conservation (stacks + pots + bets = initial total)
      const midPlayers = engine.getPlayers();
      const midPots = engine.getPots();
      const midTotal = midPlayers.reduce((s, p) => s + p.currentStack + p.currentBet, 0)
        + midPots.reduce((s, p) => s + p.amount, 0);
      if (midTotal !== initialTotal) {
        this.errors.push(
          `Hand ${this.handNumber}, action ${actionCount}: chip leak! ` +
          `Expected ${initialTotal}, got ${midTotal} ` +
          `(stacks=${midPlayers.reduce((s, p) => s + p.currentStack, 0)}, ` +
          `bets=${midPlayers.reduce((s, p) => s + p.currentBet, 0)}, ` +
          `pots=${midPots.reduce((s, p) => s + p.amount, 0)})`
        );
      }

      engine.handleAction(playerId, action, amount);
      actionCount++;
    }

    if (actionCount >= maxActions) {
      this.errors.push(`Hand ${this.handNumber}: exceeded max actions (${maxActions})`);
      return null;
    }

    if (!result) {
      this.errors.push(`Hand ${this.handNumber}: hand didn't complete`);
      return null;
    }

    // Verify final chip conservation
    const finalTotal = result.players.reduce((s, p) => s + p.currentStack, 0);
    if (finalTotal !== initialTotal) {
      this.errors.push(
        `Hand ${this.handNumber}: final chip mismatch! Expected ${initialTotal}, got ${finalTotal}`
      );
    }

    // Verify showdown or no-showdown happened
    if (result.pots.length === 0) {
      this.errors.push(`Hand ${this.handNumber}: no pots in result`);
    }

    // Verify each pot has winners
    for (const pot of result.pots) {
      if (pot.winners.length === 0) {
        this.errors.push(`Hand ${this.handNumber}: pot "${pot.name}" has no winners`);
      }
      const potWinnings = pot.winners.reduce((s, w) => s + w.amount, 0);
      if (potWinnings !== pot.amount) {
        this.errors.push(
          `Hand ${this.handNumber}: pot "${pot.name}" amount ${pot.amount} != winner amounts ${potWinnings}`
        );
      }
    }

    // Verify street progression
    const streets = result.streets.map(s => s.street);
    if (streets[0] !== 'preflop') {
      this.errors.push(`Hand ${this.handNumber}: first street not preflop`);
    }
    const validOrder: Street[] = ['preflop', 'flop', 'turn', 'river'];
    for (let i = 1; i < streets.length; i++) {
      const prevIdx = validOrder.indexOf(streets[i - 1]);
      const currIdx = validOrder.indexOf(streets[i]);
      if (currIdx <= prevIdx) {
        this.errors.push(`Hand ${this.handNumber}: invalid street order ${streets.join(' -> ')}`);
      }
    }

    // Verify community cards count matches streets
    const expectedCards = streets.reduce((sum, s) => {
      if (s === 'flop') return sum + 3;
      if (s === 'turn' || s === 'river') return sum + 1;
      return sum;
    }, 0);
    if (result.communityCards.length !== expectedCards) {
      this.errors.push(
        `Hand ${this.handNumber}: expected ${expectedCards} community cards, got ${result.communityCards.length}`
      );
    }

    // Update player stacks
    for (const rp of result.players) {
      const player = this.players.find(p => p.playerId === rp.playerId);
      if (player) {
        player.stack = rp.currentStack;
      }
    }

    this.handResults.push(result);
    return result;
  }
}

describe('Integration: 3 players, 50 hands', () => {
  it('should play 50 hands without errors, conserving chips at every step', () => {
    const config = makeConfig();
    const players: PlayerState[] = [
      { playerId: 'alice', seatIndex: 0, name: 'Alice', stack: 200 },
      { playerId: 'bob', seatIndex: 1, name: 'Bob', stack: 200 },
      { playerId: 'charlie', seatIndex: 2, name: 'Charlie', stack: 200 },
    ];

    const harness = new FullGameHarness(config, players);
    const TOTAL_CHIPS = 600;

    for (let hand = 0; hand < 50; hand++) {
      // Rebuy busted players
      for (const p of harness.players) {
        if (p.stack <= 0) p.stack = 200;
      }

      const result = harness.playHand();
      expect(result).not.toBeNull();

      // Global chip conservation
      const totalChips = harness.players.reduce((s, p) => s + p.stack, 0);
      if (totalChips !== TOTAL_CHIPS) {
        // With rebuys, total may differ - just verify hand-level conservation
        // which is checked inside playHand()
      }
    }

    // Report any errors
    if (harness.errors.length > 0) {
      console.error('ERRORS:', harness.errors);
    }
    expect(harness.errors).toEqual([]);
    expect(harness.handResults.length).toBe(50);
  });

  it('should play 50 hands with varying player counts (2-6)', () => {
    const config = makeConfig();

    for (let numPlayers = 2; numPlayers <= 6; numPlayers++) {
      const players: PlayerState[] = Array.from({ length: numPlayers }, (_, i) => ({
        playerId: `p${i}`,
        seatIndex: i,
        name: `Player${i}`,
        stack: 200,
      }));

      const harness = new FullGameHarness(config, players);

      for (let hand = 0; hand < 50; hand++) {
        for (const p of harness.players) {
          if (p.stack <= 0) p.stack = 200;
        }
        const result = harness.playHand();
        expect(result).not.toBeNull();
      }

      if (harness.errors.length > 0) {
        console.error(`ERRORS (${numPlayers} players):`, harness.errors);
      }
      expect(harness.errors).toEqual([]);
      expect(harness.handResults.length).toBe(50);
    }
  });

  it('should handle all-in scenarios correctly across 50 hands', () => {
    const config = makeConfig();
    // Give players very different stacks to force all-in / side pot scenarios
    const players: PlayerState[] = [
      { playerId: 'short', seatIndex: 0, name: 'ShortStack', stack: 20 },
      { playerId: 'medium', seatIndex: 1, name: 'MedStack', stack: 100 },
      { playerId: 'deep', seatIndex: 2, name: 'DeepStack', stack: 500 },
    ];

    const harness = new FullGameHarness(config, players);
    let allInHands = 0;

    for (let hand = 0; hand < 50; hand++) {
      // Rebuy busted players at original amounts
      if (harness.players[0].stack <= 0) harness.players[0].stack = 20;
      if (harness.players[1].stack <= 0) harness.players[1].stack = 100;
      if (harness.players[2].stack <= 0) harness.players[2].stack = 500;

      const result = harness.playHand();
      expect(result).not.toBeNull();

      // Check if any player went all-in
      if (result!.players.some(p => p.isAllIn)) {
        allInHands++;
      }

      // Verify side pots when there are all-ins
      if (result!.pots.length > 1) {
        // Verify pot amounts are positive
        for (const pot of result!.pots) {
          expect(pot.amount).toBeGreaterThan(0);
        }
      }
    }

    if (harness.errors.length > 0) {
      console.error('ALL-IN ERRORS:', harness.errors);
    }
    expect(harness.errors).toEqual([]);
    // With a 20-chip short stack and 1/2 blinds, we should see some all-ins
    expect(allInHands).toBeGreaterThan(0);
  });
});
