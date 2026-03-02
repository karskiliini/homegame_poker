import { S2C_TABLE } from '@poker/shared';
import {
  DELAY_AFTER_CARDS_DEALT_MS,
  DELAY_AFTER_STREET_DEALT_MS,
  DELAY_AFTER_PLAYER_ACTED_MS,
  DELAY_SHOWDOWN_TO_RESULT_MS,
  DELAY_POT_AWARD_MS,
  DELAY_AFTER_ALLIN_SHOWDOWN_MS,
  DELAY_ALLIN_RUNOUT_STREET_MS,
  DELAY_DRAMATIC_RIVER_MS,
  DELAY_BAD_BEAT_TO_RESULT_MS,
  DELAY_BETWEEN_POT_AWARDS_MS,
} from '@poker/shared';
import type { Scenario, ScenarioStep } from './types.js';
import { mockGameState, mockPlayer, HANDS, BOARDS } from './mockData.js';
import type { CardString } from '@poker/shared';

// Helper to build steps concisely
function step(name: string, event: string, data: any, delayAfterMs: number, delayKey?: string): ScenarioStep {
  return { name, event, data, delayAfterMs, delayKey };
}

// ─── 1. Basic Hand ───────────────────────────────────────────────────────────
const basicHand: Scenario = {
  id: 'basic-hand',
  name: 'Basic Hand',
  description: 'Full hand lifecycle: shuffle, deal, streets, showdown, pot award',
  steps: [
    step('Setup Table', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'preflop',
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 198, currentBet: 0 }),
        mockPlayer({ seatIndex: 2, isSmallBlind: true, stack: 199, currentBet: 1 }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 198, currentBet: 2 }),
        mockPlayer({ seatIndex: 6, stack: 200 }),
      ],
      pots: [{ amount: 3, eligible: ['player-0', 'player-2', 'player-4', 'player-6'] }],
    }), 500),

    step('Deal Cards', S2C_TABLE.CARDS_DEALT, {
      dealerSeatIndex: 0,
      seatIndices: [0, 2, 4, 6],
    }, DELAY_AFTER_CARDS_DEALT_MS, 'DELAY_AFTER_CARDS_DEALT_MS'),

    step('UTG Calls', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 6, action: 'call', amount: 2, playerName: 'Frank', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Dealer Calls', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 0, action: 'call', amount: 2, playerName: 'Alice', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('SB Calls', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 2, action: 'call', amount: 1, playerName: 'Bob', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Collect Bets', S2C_TABLE.POT_UPDATE, {}, 300),

    step('Update State (Flop)', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'flop',
      communityCards: BOARDS.flop,
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 192, holeCards: HANDS.suitedConnectors }),
        mockPlayer({ seatIndex: 2, isSmallBlind: true, stack: 192, holeCards: HANDS.strongHand }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 192, holeCards: HANDS.lowPair }),
        mockPlayer({ seatIndex: 6, stack: 192, holeCards: HANDS.mediumHand }),
      ],
      pots: [{ amount: 8, eligible: ['player-0', 'player-2', 'player-4', 'player-6'] }],
    }), 200),

    step('Flop', S2C_TABLE.STREET_DEAL, {
      street: 'flop', cards: BOARDS.flop,
    }, DELAY_AFTER_STREET_DEALT_MS, 'DELAY_AFTER_STREET_DEALT_MS'),

    step('BB Bets', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 4, action: 'bet', amount: 4, playerName: 'Diana', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('UTG Folds', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 6, action: 'fold', amount: 0, playerName: 'Frank', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Dealer Calls', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 0, action: 'call', amount: 4, playerName: 'Alice', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('SB Folds', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 2, action: 'fold', amount: 0, playerName: 'Bob', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Collect Bets', S2C_TABLE.POT_UPDATE, {}, 300),

    step('Update State (Turn)', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'turn',
      communityCards: [...BOARDS.flop, BOARDS.turn],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 188 }),
        mockPlayer({ seatIndex: 2, stack: 192, status: 'folded', hasCards: false }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 188 }),
        mockPlayer({ seatIndex: 6, stack: 192, status: 'folded', hasCards: false }),
      ],
      pots: [{ amount: 16, eligible: ['player-0', 'player-4'] }],
    }), 200),

    step('Turn', S2C_TABLE.STREET_DEAL, {
      street: 'turn', cards: [...BOARDS.flop, BOARDS.turn],
    }, DELAY_AFTER_STREET_DEALT_MS, 'DELAY_AFTER_STREET_DEALT_MS'),

    step('BB Checks', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 4, action: 'check', amount: 0, playerName: 'Diana', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Dealer Checks', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 0, action: 'check', amount: 0, playerName: 'Alice', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Update State (River)', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'river',
      communityCards: [...BOARDS.flop, BOARDS.turn, BOARDS.river],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 188 }),
        mockPlayer({ seatIndex: 2, stack: 192, status: 'folded', hasCards: false }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 188 }),
        mockPlayer({ seatIndex: 6, stack: 192, status: 'folded', hasCards: false }),
      ],
      pots: [{ amount: 16, eligible: ['player-0', 'player-4'] }],
    }), 200),

    step('River', S2C_TABLE.STREET_DEAL, {
      street: 'river', cards: [...BOARDS.flop, BOARDS.turn, BOARDS.river],
    }, DELAY_AFTER_STREET_DEALT_MS, 'DELAY_AFTER_STREET_DEALT_MS'),

    step('Showdown', S2C_TABLE.SHOWDOWN, {
      reveals: [
        { seatIndex: 4, cards: HANDS.lowPair, handName: 'Pair', handDescription: 'Pair of Fives', action: 'show' as const },
        { seatIndex: 0, cards: HANDS.suitedConnectors, handName: 'Straight', handDescription: '8-high Straight', action: 'show' as const },
      ],
    }, DELAY_SHOWDOWN_TO_RESULT_MS, 'DELAY_SHOWDOWN_TO_RESULT_MS'),

    step('Pot Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 0, amount: 16, winnerSeatIndex: 0, winnerName: 'Alice', winningHand: '8-high Straight' }],
      potIndex: 0,
      isLastPot: true,
      totalPots: 1,
      winningCards: ['9h', '8h', 'Qs', 'Js', 'Ts'] as CardString[],
      handRank: 'straight',
      handName: 'Straight',
      isNuts: false,
    }, DELAY_POT_AWARD_MS, 'DELAY_POT_AWARD_MS'),

    step('Hand Complete', S2C_TABLE.HAND_RESULT, {}, 0),
  ],
};

// ─── 2. Dramatic River ──────────────────────────────────────────────────────
const dramaticRiver: Scenario = {
  id: 'dramatic-river',
  name: 'Dramatic River',
  description: 'All-in on flop with dramatic river peel animation',
  steps: [
    step('Setup Table', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'preflop',
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 200 }),
        mockPlayer({ seatIndex: 2, isSmallBlind: true, stack: 200 }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 200 }),
      ],
      pots: [{ amount: 3, eligible: ['player-0', 'player-2', 'player-4'] }],
    }), 500),

    step('Deal Cards', S2C_TABLE.CARDS_DEALT, {
      dealerSeatIndex: 0,
      seatIndices: [0, 2, 4],
    }, DELAY_AFTER_CARDS_DEALT_MS, 'DELAY_AFTER_CARDS_DEALT_MS'),

    step('Dealer Raises', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 0, action: 'raise', amount: 6, playerName: 'Alice', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('SB All-In', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 2, action: 'raise', amount: 200, playerName: 'Bob', isAllIn: true,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('BB Folds', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 4, action: 'fold', amount: 0, playerName: 'Diana', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Dealer Calls', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 0, action: 'call', amount: 194, playerName: 'Alice', isAllIn: true,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Collect Bets', S2C_TABLE.POT_UPDATE, {}, 300),

    step('All-In Showdown', S2C_TABLE.ALLIN_SHOWDOWN, {
      entries: [
        { seatIndex: 0, cards: HANDS.pocketAces },
        { seatIndex: 2, cards: HANDS.pocketKings },
      ],
    }, DELAY_AFTER_ALLIN_SHOWDOWN_MS, 'DELAY_AFTER_ALLIN_SHOWDOWN_MS'),

    step('Equity Update', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 82, 2: 18 },
    }, 500),

    step('Flop', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'flop',
      communityCards: BOARDS.dramaticFlop,
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 2, isSmallBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
        mockPlayer({ seatIndex: 4, status: 'folded', hasCards: false }),
      ],
      pots: [{ amount: 402, eligible: ['player-0', 'player-2'] }],
    }), 200),

    step('Flop Deal', S2C_TABLE.STREET_DEAL, {
      street: 'flop', cards: BOARDS.dramaticFlop,
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('Equity After Flop', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 91, 2: 9 },
    }, 500),

    step('Turn', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'turn',
      communityCards: [...BOARDS.dramaticFlop, BOARDS.dramaticTurn],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 2, isSmallBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
        mockPlayer({ seatIndex: 4, status: 'folded', hasCards: false }),
      ],
      pots: [{ amount: 402, eligible: ['player-0', 'player-2'] }],
    }), 200),

    step('Turn Deal', S2C_TABLE.STREET_DEAL, {
      street: 'turn', cards: [...BOARDS.dramaticFlop, BOARDS.dramaticTurn],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('Equity After Turn', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 95, 2: 5 },
    }, 500),

    step('River (Dramatic!)', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'river',
      communityCards: [...BOARDS.dramaticFlop, BOARDS.dramaticTurn, BOARDS.dramaticRiver],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 2, isSmallBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
        mockPlayer({ seatIndex: 4, status: 'folded', hasCards: false }),
      ],
      pots: [{ amount: 402, eligible: ['player-0', 'player-2'] }],
    }), 200),

    step('River Deal (Dramatic)', S2C_TABLE.STREET_DEAL, {
      street: 'river',
      cards: [...BOARDS.dramaticFlop, BOARDS.dramaticTurn, BOARDS.dramaticRiver],
      dramatic: true,
    }, DELAY_DRAMATIC_RIVER_MS, 'DELAY_DRAMATIC_RIVER_MS'),

    step('Pot Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 0, amount: 402, winnerSeatIndex: 0, winnerName: 'Alice', winningHand: 'Three of a Kind, Aces' }],
      potIndex: 0,
      isLastPot: true,
      totalPots: 1,
      winningCards: ['Ah', 'Ad', 'Ah', 'Kc', '8d'] as CardString[],
      handRank: 'three_of_a_kind',
      handName: 'Three of a Kind',
      isNuts: false,
    }, DELAY_POT_AWARD_MS, 'DELAY_POT_AWARD_MS'),

    step('Hand Complete', S2C_TABLE.HAND_RESULT, {}, 0),
  ],
};

// ─── 3. All-In Showdown ─────────────────────────────────────────────────────
const allInShowdown: Scenario = {
  id: 'allin-showdown',
  name: 'All-In Showdown',
  description: 'Preflop all-in with spotlight, equity display, and full runout',
  steps: [
    step('Setup Table', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'preflop',
    }), 500),

    step('Deal Cards', S2C_TABLE.CARDS_DEALT, {
      dealerSeatIndex: 0,
      seatIndices: [0, 2, 4, 6],
    }, DELAY_AFTER_CARDS_DEALT_MS, 'DELAY_AFTER_CARDS_DEALT_MS'),

    step('UTG All-In', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 6, action: 'raise', amount: 200, playerName: 'Frank', isAllIn: true,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Dealer Calls', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 0, action: 'call', amount: 200, playerName: 'Alice', isAllIn: true,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('SB Folds', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 2, action: 'fold', amount: 0, playerName: 'Bob', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('BB Folds', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 4, action: 'fold', amount: 0, playerName: 'Diana', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Collect Bets', S2C_TABLE.POT_UPDATE, {}, 300),

    step('All-In Showdown', S2C_TABLE.ALLIN_SHOWDOWN, {
      entries: [
        { seatIndex: 0, cards: HANDS.pocketKings },
        { seatIndex: 6, cards: HANDS.pocketAces },
      ],
    }, DELAY_AFTER_ALLIN_SHOWDOWN_MS, 'DELAY_AFTER_ALLIN_SHOWDOWN_MS'),

    step('Equity', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 18, 6: 82 },
    }, 500),

    step('Flop State', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'flop',
      communityCards: ['Kh', '7c', '3d'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
        mockPlayer({ seatIndex: 2, status: 'folded', hasCards: false }),
        mockPlayer({ seatIndex: 4, status: 'folded', hasCards: false }),
        mockPlayer({ seatIndex: 6, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
      ],
      pots: [{ amount: 403, eligible: ['player-0', 'player-6'] }],
    }), 200),

    step('Flop', S2C_TABLE.STREET_DEAL, {
      street: 'flop', cards: ['Kh', '7c', '3d'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('Equity After Flop', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 70, 6: 30 },
    }, 500),

    step('Turn State', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'turn',
      communityCards: ['Kh', '7c', '3d', '9s'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
        mockPlayer({ seatIndex: 2, status: 'folded', hasCards: false }),
        mockPlayer({ seatIndex: 4, status: 'folded', hasCards: false }),
        mockPlayer({ seatIndex: 6, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
      ],
      pots: [{ amount: 403, eligible: ['player-0', 'player-6'] }],
    }), 200),

    step('Turn', S2C_TABLE.STREET_DEAL, {
      street: 'turn', cards: ['Kh', '7c', '3d', '9s'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('Equity After Turn', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 73, 6: 27 },
    }, 500),

    step('River State', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'river',
      communityCards: ['Kh', '7c', '3d', '9s', 'Ac'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
        mockPlayer({ seatIndex: 2, status: 'folded', hasCards: false }),
        mockPlayer({ seatIndex: 4, status: 'folded', hasCards: false }),
        mockPlayer({ seatIndex: 6, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
      ],
      pots: [{ amount: 403, eligible: ['player-0', 'player-6'] }],
    }), 200),

    step('River', S2C_TABLE.STREET_DEAL, {
      street: 'river', cards: ['Kh', '7c', '3d', '9s', 'Ac'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('Pot Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 0, amount: 403, winnerSeatIndex: 6, winnerName: 'Frank', winningHand: 'Three of a Kind, Aces' }],
      potIndex: 0,
      isLastPot: true,
      totalPots: 1,
      winningCards: ['Ah', 'Ad', 'Ac', 'Kh', '9s'] as CardString[],
      handRank: 'three_of_a_kind',
      handName: 'Three of a Kind',
      isNuts: false,
    }, DELAY_POT_AWARD_MS, 'DELAY_POT_AWARD_MS'),

    step('Hand Complete', S2C_TABLE.HAND_RESULT, {}, 0),
  ],
};

// ─── 4. Multi-Pot ────────────────────────────────────────────────────────────
const multiPot: Scenario = {
  id: 'multi-pot',
  name: 'Multi-Pot',
  description: '3 players all-in with different stacks, main pot + side pot',
  steps: [
    step('Setup Table', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'preflop',
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 100 }),
        mockPlayer({ seatIndex: 2, isSmallBlind: true, stack: 200 }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 50 }),
      ],
      pots: [{ amount: 3, eligible: ['player-0', 'player-2', 'player-4'] }],
    }), 500),

    step('Deal Cards', S2C_TABLE.CARDS_DEALT, {
      dealerSeatIndex: 0,
      seatIndices: [0, 2, 4],
    }, DELAY_AFTER_CARDS_DEALT_MS, 'DELAY_AFTER_CARDS_DEALT_MS'),

    step('Dealer All-In 100', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 0, action: 'raise', amount: 100, playerName: 'Alice', isAllIn: true,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('SB All-In 200', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 2, action: 'raise', amount: 200, playerName: 'Bob', isAllIn: true,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('BB All-In 50', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 4, action: 'call', amount: 48, playerName: 'Diana', isAllIn: true,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Collect Bets', S2C_TABLE.POT_UPDATE, {}, 300),

    step('All-In Showdown', S2C_TABLE.ALLIN_SHOWDOWN, {
      entries: [
        { seatIndex: 0, cards: HANDS.pocketKings },
        { seatIndex: 2, cards: HANDS.suitedConnectors },
        { seatIndex: 4, cards: HANDS.pocketAces },
      ],
    }, DELAY_AFTER_ALLIN_SHOWDOWN_MS, 'DELAY_AFTER_ALLIN_SHOWDOWN_MS'),

    step('Equity', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 18, 2: 10, 4: 72 },
    }, 500),

    step('Runout State', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'river',
      communityCards: ['2c', '7h', 'Ks', 'Td', '4c'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
        mockPlayer({ seatIndex: 2, isSmallBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.suitedConnectors }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
      ],
      pots: [
        { amount: 150, eligible: ['player-0', 'player-2', 'player-4'] },
        { amount: 100, eligible: ['player-0', 'player-2'] },
      ],
    }), 200),

    step('Flop', S2C_TABLE.STREET_DEAL, {
      street: 'flop', cards: ['2c', '7h', 'Ks'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('Turn', S2C_TABLE.STREET_DEAL, {
      street: 'turn', cards: ['2c', '7h', 'Ks', 'Td'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('River', S2C_TABLE.STREET_DEAL, {
      street: 'river', cards: ['2c', '7h', 'Ks', 'Td', '4c'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('Main Pot Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 0, amount: 150, winnerSeatIndex: 0, winnerName: 'Alice', winningHand: 'Three Kings' }],
      potIndex: 0,
      isLastPot: false,
      totalPots: 2,
      winningCards: ['Kh', 'Kd', 'Ks'] as CardString[],
      handRank: 'three_of_a_kind',
      handName: 'Three of a Kind',
      isNuts: false,
    }, DELAY_BETWEEN_POT_AWARDS_MS, 'DELAY_BETWEEN_POT_AWARDS_MS'),

    step('Side Pot Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 1, amount: 100, winnerSeatIndex: 0, winnerName: 'Alice', winningHand: 'Three Kings' }],
      potIndex: 1,
      isLastPot: true,
      totalPots: 2,
      winningCards: ['Kh', 'Kd', 'Ks'] as CardString[],
      handRank: 'three_of_a_kind',
      handName: 'Three of a Kind',
      isNuts: false,
    }, DELAY_POT_AWARD_MS, 'DELAY_POT_AWARD_MS'),

    step('Hand Complete', S2C_TABLE.HAND_RESULT, {}, 0),
  ],
};

// ─── 5. Run It Twice ─────────────────────────────────────────────────────────
const runItTwice: Scenario = {
  id: 'run-it-twice',
  name: 'Run It Twice',
  description: 'All-in with two boards dealt sequentially',
  steps: [
    step('Setup Table', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'flop',
      communityCards: ['9c', '4d', '2h'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 500),

    step('All-In Showdown', S2C_TABLE.ALLIN_SHOWDOWN, {
      entries: [
        { seatIndex: 0, cards: HANDS.pocketAces },
        { seatIndex: 4, cards: HANDS.pocketKings },
      ],
    }, DELAY_AFTER_ALLIN_SHOWDOWN_MS, 'DELAY_AFTER_ALLIN_SHOWDOWN_MS'),

    step('Equity', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 88, 4: 12 },
    }, 500),

    step('Board 1 Turn', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'turn',
      communityCards: ['9c', '4d', '2h', 'Js'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 200),

    step('Board 1 Turn Deal', S2C_TABLE.STREET_DEAL, {
      street: 'turn', cards: ['9c', '4d', '2h', 'Js'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('Board 1 River', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'river',
      communityCards: ['9c', '4d', '2h', 'Js', '5c'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 200),

    step('Board 1 River Deal', S2C_TABLE.STREET_DEAL, {
      street: 'river', cards: ['9c', '4d', '2h', 'Js', '5c'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('Board 1 Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 0, amount: 200, winnerSeatIndex: 0, winnerName: 'Alice', winningHand: 'Pair of Aces' }],
      potIndex: 0,
      isLastPot: false,
      totalPots: 2,
      handRank: 'pair',
      handName: 'Pair',
      isNuts: false,
    }, DELAY_BETWEEN_POT_AWARDS_MS, 'DELAY_BETWEEN_POT_AWARDS_MS'),

    step('Second Board', S2C_TABLE.SECOND_BOARD_DEALT, {
      cards: ['9c', '4d', '2h', 'Kc', 'Qd'] as CardString[],
    }, 2500),

    step('Board 2 Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 1, amount: 200, winnerSeatIndex: 4, winnerName: 'Diana', winningHand: 'Three Kings' }],
      potIndex: 1,
      isLastPot: true,
      totalPots: 2,
      handRank: 'three_of_a_kind',
      handName: 'Three of a Kind',
      isNuts: false,
    }, DELAY_POT_AWARD_MS, 'DELAY_POT_AWARD_MS'),

    step('Hand Complete', S2C_TABLE.HAND_RESULT, {}, 0),
  ],
};

// ─── 6. Bad Beat ─────────────────────────────────────────────────────────────
const badBeat: Scenario = {
  id: 'bad-beat',
  name: 'Bad Beat',
  description: 'Showdown with bad beat explosion animation before pot award',
  steps: [
    step('Setup Table', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'river',
      communityCards: ['Ah', '8c', '8d', '3s', '8h'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in' }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in' }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 500),

    step('Showdown', S2C_TABLE.SHOWDOWN, {
      reveals: [
        { seatIndex: 0, cards: ['As', 'Ac'] as CardString[], handName: 'Full House', handDescription: 'Aces full of Eights', action: 'show' as const },
        { seatIndex: 4, cards: ['8s', 'Ks'] as CardString[], handName: 'Four of a Kind', handDescription: 'Quad Eights', action: 'show' as const },
      ],
    }, DELAY_SHOWDOWN_TO_RESULT_MS, 'DELAY_SHOWDOWN_TO_RESULT_MS'),

    step('Bad Beat!', S2C_TABLE.BAD_BEAT, {
      loserSeatIndex: 0,
      loserHandName: 'Full House',
      loserHandDescription: 'Aces full of Eights',
      winnerSeatIndex: 4,
      winnerHandName: 'Four of a Kind',
      playerName: 'Alice',
    }, DELAY_BAD_BEAT_TO_RESULT_MS, 'DELAY_BAD_BEAT_TO_RESULT_MS'),

    step('Pot Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 0, amount: 400, winnerSeatIndex: 4, winnerName: 'Diana', winningHand: 'Quad Eights' }],
      potIndex: 0,
      isLastPot: true,
      totalPots: 1,
      winningCards: ['8s', '8c', '8d', '8h', 'Ah'] as CardString[],
      handRank: 'four_of_a_kind',
      handName: 'Four of a Kind',
      isNuts: false,
    }, DELAY_POT_AWARD_MS, 'DELAY_POT_AWARD_MS'),

    step('Hand Complete', S2C_TABLE.HAND_RESULT, {}, 0),
  ],
};

// ─── 7. Royal Flush ──────────────────────────────────────────────────────────
const royalFlush: Scenario = {
  id: 'royal-flush',
  name: 'Royal Flush',
  description: 'Showdown with royal flush celebration + confetti',
  steps: [
    step('Setup Table', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'river',
      communityCards: ['Qs', 'Js', 'Ts', '3c', '7d'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in' }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in' }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 500),

    step('Showdown', S2C_TABLE.SHOWDOWN, {
      reveals: [
        { seatIndex: 0, cards: HANDS.royalFlush, handName: 'Royal Flush', handDescription: 'Royal Flush (Spades)', action: 'show' as const },
        { seatIndex: 4, cards: HANDS.lowPair, handName: 'Pair', handDescription: 'Pair of Fives', action: 'show' as const },
      ],
    }, DELAY_SHOWDOWN_TO_RESULT_MS, 'DELAY_SHOWDOWN_TO_RESULT_MS'),

    step('Pot Award + Celebration', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 0, amount: 400, winnerSeatIndex: 0, winnerName: 'Alice', winningHand: 'Royal Flush (Spades)' }],
      potIndex: 0,
      isLastPot: true,
      totalPots: 1,
      winningCards: ['As', 'Ks', 'Qs', 'Js', 'Ts'] as CardString[],
      handRank: 'royal_flush',
      handName: 'Royal Flush',
      isNuts: true,
    }, 5000),

    step('Hand Complete', S2C_TABLE.HAND_RESULT, {}, 0),
  ],
};

// ─── 8. Chip Movements ──────────────────────────────────────────────────────
const chipMovements: Scenario = {
  id: 'chip-movements',
  name: 'Chip Movements',
  description: 'Multiple bet/raise/call actions showing chip flight animations',
  steps: [
    step('Setup Table', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'flop',
      communityCards: ['Jh', '8c', '3d'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 200 }),
        mockPlayer({ seatIndex: 2, isSmallBlind: true, stack: 200 }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 200 }),
        mockPlayer({ seatIndex: 6, stack: 200 }),
      ],
      pots: [{ amount: 8, eligible: ['player-0', 'player-2', 'player-4', 'player-6'] }],
    }), 500),

    step('BB Bets 6', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 4, action: 'bet', amount: 6, playerName: 'Diana', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('UTG Raises 18', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 6, action: 'raise', amount: 18, playerName: 'Frank', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Dealer Calls 18', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 0, action: 'call', amount: 18, playerName: 'Alice', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('SB Folds', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 2, action: 'fold', amount: 0, playerName: 'Bob', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('BB 3-Bets 54', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 4, action: 'raise', amount: 54, playerName: 'Diana', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('UTG Folds', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 6, action: 'fold', amount: 0, playerName: 'Frank', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Dealer Calls 54', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 0, action: 'call', amount: 36, playerName: 'Alice', isAllIn: false,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Collect Bets', S2C_TABLE.POT_UPDATE, {}, 300),

    step('Update State (Turn)', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'turn',
      communityCards: ['Jh', '8c', '3d', 'Qc'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 146 }),
        mockPlayer({ seatIndex: 2, status: 'folded', hasCards: false }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 146 }),
        mockPlayer({ seatIndex: 6, status: 'folded', hasCards: false }),
      ],
      pots: [{ amount: 134, eligible: ['player-0', 'player-4'] }],
    }), 200),

    step('Turn', S2C_TABLE.STREET_DEAL, {
      street: 'turn', cards: ['Jh', '8c', '3d', 'Qc'] as CardString[],
    }, DELAY_AFTER_STREET_DEALT_MS, 'DELAY_AFTER_STREET_DEALT_MS'),

    step('BB All-In', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 4, action: 'bet', amount: 146, playerName: 'Diana', isAllIn: true,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Dealer Calls All-In', S2C_TABLE.PLAYER_ACTION, {
      seatIndex: 0, action: 'call', amount: 146, playerName: 'Alice', isAllIn: true,
    }, DELAY_AFTER_PLAYER_ACTED_MS, 'DELAY_AFTER_PLAYER_ACTED_MS'),

    step('Collect Bets', S2C_TABLE.POT_UPDATE, {}, 300),

    step('All-In Showdown', S2C_TABLE.ALLIN_SHOWDOWN, {
      entries: [
        { seatIndex: 0, cards: HANDS.suitedConnectors },
        { seatIndex: 4, cards: HANDS.strongHand },
      ],
    }, DELAY_AFTER_ALLIN_SHOWDOWN_MS, 'DELAY_AFTER_ALLIN_SHOWDOWN_MS'),

    step('Pot Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 0, amount: 426, winnerSeatIndex: 4, winnerName: 'Diana', winningHand: 'Two Pair' }],
      potIndex: 0,
      isLastPot: true,
      totalPots: 1,
      handRank: 'two_pair',
      handName: 'Two Pair',
      isNuts: false,
    }, DELAY_POT_AWARD_MS, 'DELAY_POT_AWARD_MS'),

    step('Hand Complete', S2C_TABLE.HAND_RESULT, {}, 0),
  ],
};

// ─── 9. Board 1 Peels ──────────────────────────────────────────────────────
// Isolated community card reveal animations: flop (3 cards), turn, river, dramatic river
const boardPeels: Scenario = {
  id: 'board-peels',
  name: 'Board 1 Peels',
  description: 'Isolated community card deal animations: flop, turn, river, dramatic river peel',
  steps: [
    step('Setup (Preflop)', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'preflop',
      communityCards: [],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 500),

    step('All-In Showdown', S2C_TABLE.ALLIN_SHOWDOWN, {
      entries: [
        { seatIndex: 0, cards: HANDS.pocketAces },
        { seatIndex: 4, cards: HANDS.pocketKings },
      ],
    }, DELAY_AFTER_ALLIN_SHOWDOWN_MS, 'DELAY_AFTER_ALLIN_SHOWDOWN_MS'),

    step('Equity', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 82, 4: 18 },
    }, 500),

    // ── Flop peel: 0→3 cards ──
    step('Flop State', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'flop',
      communityCards: ['Qs', 'Js', 'Ts'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 200),

    step('Flop Deal', S2C_TABLE.STREET_DEAL, {
      street: 'flop', cards: ['Qs', 'Js', 'Ts'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('Equity After Flop', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 55, 4: 45 },
    }, 500),

    // ── Turn peel: 3→4 cards ──
    step('Turn State', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'turn',
      communityCards: ['Qs', 'Js', 'Ts', 'Kc'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 200),

    step('Turn Deal', S2C_TABLE.STREET_DEAL, {
      street: 'turn', cards: ['Qs', 'Js', 'Ts', 'Kc'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    step('Equity After Turn', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 30, 4: 70 },
    }, 500),

    // ── River peel (dramatic!): 4→5 cards ──
    step('River State', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'river',
      communityCards: ['Qs', 'Js', 'Ts', 'Kc', '2d'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 200),

    step('River Deal (Dramatic Peel)', S2C_TABLE.STREET_DEAL, {
      street: 'river',
      cards: ['Qs', 'Js', 'Ts', 'Kc', '2d'] as CardString[],
      dramatic: true,
    }, DELAY_DRAMATIC_RIVER_MS, 'DELAY_DRAMATIC_RIVER_MS'),

    step('Pot Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 0, amount: 400, winnerSeatIndex: 4, winnerName: 'Diana', winningHand: 'Straight, Ace to Ten' }],
      potIndex: 0,
      isLastPot: true,
      totalPots: 1,
      winningCards: ['Kh', 'Kd', 'Qs', 'Js', 'Ts'] as CardString[],
      handRank: 'straight',
      handName: 'Straight',
      isNuts: false,
    }, DELAY_POT_AWARD_MS, 'DELAY_POT_AWARD_MS'),

    step('Hand Complete', S2C_TABLE.HAND_RESULT, {}, 0),
  ],
};

// ─── 10. Board 2 Peel (Run It Twice) ────────────────────────────────────────
// Focused on the second board appearing after board 1 completes
const board2Peel: Scenario = {
  id: 'board2-peel',
  name: 'Board 2 Peel',
  description: 'Run It Twice: board 1 runout, then second board appears with peel animation',
  steps: [
    step('Setup (Flop)', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'flop',
      communityCards: ['9c', '4d', '2h'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 500),

    step('All-In Showdown', S2C_TABLE.ALLIN_SHOWDOWN, {
      entries: [
        { seatIndex: 0, cards: HANDS.pocketAces },
        { seatIndex: 4, cards: HANDS.pocketKings },
      ],
    }, DELAY_AFTER_ALLIN_SHOWDOWN_MS, 'DELAY_AFTER_ALLIN_SHOWDOWN_MS'),

    step('Equity', S2C_TABLE.EQUITY_UPDATE, {
      equities: { 0: 88, 4: 12 },
    }, 500),

    // Board 1: turn peel
    step('Board 1 Turn State', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'turn',
      communityCards: ['9c', '4d', '2h', 'Js'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 200),

    step('Board 1 Turn Deal', S2C_TABLE.STREET_DEAL, {
      street: 'turn', cards: ['9c', '4d', '2h', 'Js'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    // Board 1: river peel
    step('Board 1 River State', S2C_TABLE.GAME_STATE, mockGameState({
      currentStreet: 'river',
      communityCards: ['9c', '4d', '2h', 'Js', '5c'] as CardString[],
      players: [
        mockPlayer({ seatIndex: 0, isDealer: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketAces }),
        mockPlayer({ seatIndex: 4, isBigBlind: true, stack: 0, status: 'all_in', holeCards: HANDS.pocketKings }),
      ],
      pots: [{ amount: 400, eligible: ['player-0', 'player-4'] }],
    }), 200),

    step('Board 1 River Deal', S2C_TABLE.STREET_DEAL, {
      street: 'river', cards: ['9c', '4d', '2h', 'Js', '5c'] as CardString[],
    }, DELAY_ALLIN_RUNOUT_STREET_MS, 'DELAY_ALLIN_RUNOUT_STREET_MS'),

    // Board 1 award
    step('Board 1 Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 0, amount: 200, winnerSeatIndex: 0, winnerName: 'Alice', winningHand: 'Pair of Aces' }],
      potIndex: 0,
      isLastPot: false,
      totalPots: 2,
      handRank: 'pair',
      handName: 'Pair',
      isNuts: false,
    }, DELAY_BETWEEN_POT_AWARDS_MS, 'DELAY_BETWEEN_POT_AWARDS_MS'),

    // Board 2: second board peel — this is the key animation
    step('Board 2 Dealt', S2C_TABLE.SECOND_BOARD_DEALT, {
      cards: ['9c', '4d', '2h', 'Kc', 'Qd'] as CardString[],
    }, 2500),

    // Board 2 award
    step('Board 2 Award', S2C_TABLE.POT_AWARD, {
      awards: [{ potIndex: 1, amount: 200, winnerSeatIndex: 4, winnerName: 'Diana', winningHand: 'Three Kings' }],
      potIndex: 1,
      isLastPot: true,
      totalPots: 2,
      winningCards: ['Kh', 'Kd', 'Kc'] as CardString[],
      handRank: 'three_of_a_kind',
      handName: 'Three of a Kind',
      isNuts: false,
    }, DELAY_POT_AWARD_MS, 'DELAY_POT_AWARD_MS'),

    step('Hand Complete', S2C_TABLE.HAND_RESULT, {}, 0),
  ],
};

export const SCENARIOS: Scenario[] = [
  basicHand,
  dramaticRiver,
  allInShowdown,
  multiPot,
  runItTwice,
  badBeat,
  royalFlush,
  chipMovements,
  boardPeels,
  board2Peel,
];
