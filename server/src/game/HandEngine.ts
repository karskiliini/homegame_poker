import { v4 as uuidv4 } from 'uuid';
import type {
  CardString, GameConfig, GameType, Street, ActionType,
  HandPlayer, PlayerAction, Pot, StreetState,
} from '@poker/shared';
import { Deck } from './Deck.js';
import { collectBetsIntoPots } from './PotManager.js';
import { determineWinners, evaluateHand } from '../evaluation/hand-rank.js';
import type { EvaluationResult } from '../evaluation/hand-rank.js';
import { calculateEquity } from '../evaluation/equity.js';
import { isBadBeat } from '../evaluation/bad-beat.js';

export interface HandResult {
  handId: string;
  handNumber: number;
  players: HandPlayer[];
  communityCards: CardString[];
  secondBoard?: CardString[];
  pots: PotResult[];
  streets: StreetState[];
  showdownResults?: ShowdownEntry[];
  badBeatPlayerIds?: string[];
}

export interface PotResult {
  name: string;
  amount: number;
  winners: { playerId: string; playerName: string; amount: number }[];
  winningHand?: string;
}

export interface ShowdownEntry {
  playerId: string;
  seatIndex: number;
  holeCards: CardString[];
  handName: string;
  handDescription: string;
  shown: boolean;
}

export type HandEngineEvent =
  | { type: 'hand_started'; handId: string; handNumber: number; players: HandPlayer[]; dealerSeatIndex: number }
  | { type: 'cards_dealt'; playerCards: Map<string, CardString[]> }
  | { type: 'player_turn'; playerId: string; seatIndex: number; availableActions: ActionType[]; callAmount: number; minRaise: number; maxRaise: number }
  | { type: 'player_acted'; playerId: string; playerName: string; seatIndex: number; action: ActionType; amount: number; isAllIn: boolean }
  | { type: 'street_dealt'; street: Street; cards: CardString[]; dramatic?: boolean }
  | { type: 'pots_updated'; pots: Pot[] }
  | { type: 'all_in_runout'; remainingStreets: Street[] }
  | { type: 'allin_showdown'; entries: { playerId: string; seatIndex: number; holeCards: CardString[] }[] }
  | { type: 'equity_update'; equities: Map<string, number> }
  | { type: 'rit_eligible'; playerIds: string[] }
  | { type: 'second_board_dealt'; cards: CardString[] }
  | { type: 'showdown'; entries: ShowdownEntry[] }
  | { type: 'bad_beat'; loserPlayerId: string; loserSeatIndex: number; loserHandName: string; loserHandDescription: string; winnerPlayerId: string; winnerSeatIndex: number; winnerHandName: string }
  | { type: 'hand_complete'; result: HandResult };

type EventHandler = (event: HandEngineEvent) => void;

interface ActivePlayer {
  index: number;
  player: HandPlayer;
}

export class HandEngine {
  private handId: string = '';
  private handNumber: number = 0;
  private gameType: GameType;
  private config: GameConfig;
  private deck!: Deck;
  private players: HandPlayer[] = [];
  private communityCards: CardString[] = [];
  private secondBoard?: CardString[];
  private streets: StreetState[] = [];
  private currentStreet: Street = 'preflop';
  private pots: Pot[] = [];
  private currentActorIndex: number = -1;
  private lastAggressorIndex: number = -1;
  private currentBet: number = 0;
  private minRaiseSize: number = 0;
  private dealerIndex: number = -1; // index into this.players array
  private sbIndex: number = -1;
  private bbIndex: number = -1;
  private isComplete: boolean = false;
  private runItTwice: boolean = false;
  private pendingRunoutStreets?: Street[];
  private turnEquities: Map<string, number> = new Map();

  private onEvent: EventHandler;

  constructor(config: GameConfig, onEvent: EventHandler, predeterminedDeck?: CardString[]) {
    this.config = config;
    this.gameType = config.gameType;
    this.onEvent = onEvent;
    this.predeterminedDeck = predeterminedDeck;
  }

  private predeterminedDeck?: CardString[];

  startHand(
    handNumber: number,
    players: { playerId: string; seatIndex: number; name: string; stack: number }[],
    dealerSeatIndex: number,
  ) {
    this.handId = uuidv4();
    this.handNumber = handNumber;
    this.deck = new Deck(this.predeterminedDeck);
    this.communityCards = [];
    this.secondBoard = undefined;
    this.streets = [];
    this.pots = [];
    this.isComplete = false;
    this.runItTwice = false;
    this.turnEquities = new Map();
    this.currentBet = 0;

    // Create hand players sorted by seat index
    this.players = players
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .map(p => ({
        playerId: p.playerId,
        seatIndex: p.seatIndex,
        name: p.name,
        holeCards: [],
        startingStack: p.stack,
        currentStack: p.stack,
        currentBet: 0,
        totalInvested: 0,
        isFolded: false,
        isAllIn: false,
        hasActed: false,
      }));

    // Find dealer index in players array
    this.dealerIndex = this.players.findIndex(p => p.seatIndex === dealerSeatIndex);
    if (this.dealerIndex === -1) this.dealerIndex = 0;

    // Assign blinds
    if (this.players.length === 2) {
      // Heads-up: dealer is SB
      this.sbIndex = this.dealerIndex;
      this.bbIndex = (this.dealerIndex + 1) % this.players.length;
    } else {
      this.sbIndex = (this.dealerIndex + 1) % this.players.length;
      this.bbIndex = (this.dealerIndex + 2) % this.players.length;
    }

    this.onEvent({
      type: 'hand_started',
      handId: this.handId,
      handNumber: this.handNumber,
      players: this.players.map(p => ({ ...p })),
      dealerSeatIndex,
    });

    // Post blinds
    this.postBlind(this.sbIndex, this.config.smallBlind);
    this.postBlind(this.bbIndex, this.config.bigBlind);

    // Deal hole cards
    const holeCardCount = this.gameType === 'PLO' ? 4 : 2;
    const playerCards = new Map<string, CardString[]>();
    for (const player of this.players) {
      player.holeCards = this.deck.deal(holeCardCount);
      playerCards.set(player.playerId, [...player.holeCards]);
    }

    this.onEvent({ type: 'cards_dealt', playerCards });

    // Set up preflop betting
    this.currentStreet = 'preflop';
    this.streets.push({ street: 'preflop', cards: [], actions: [] });
    this.currentBet = this.config.bigBlind;
    this.minRaiseSize = this.config.bigBlind;

    // First actor preflop: left of BB (or dealer in heads-up)
    if (this.players.length === 2) {
      // Heads-up: SB (dealer) acts first preflop
      this.currentActorIndex = this.sbIndex;
    } else {
      this.currentActorIndex = (this.bbIndex + 1) % this.players.length;
    }
    this.lastAggressorIndex = this.bbIndex; // BB is considered the initial aggressor

    this.promptNextAction();
  }

  private postBlind(playerIndex: number, amount: number) {
    const player = this.players[playerIndex];
    const actualAmount = Math.min(amount, player.currentStack);
    player.currentStack -= actualAmount;
    player.currentBet = actualAmount;
    if (player.currentStack === 0) {
      player.isAllIn = true;
    }
  }

  handleAction(playerId: string, action: ActionType, amount?: number) {
    if (this.isComplete) return;

    const playerIndex = this.players.findIndex(p => p.playerId === playerId);
    if (playerIndex === -1) return;
    if (playerIndex !== this.currentActorIndex) return;

    const player = this.players[playerIndex];
    if (player.isFolded || player.isAllIn) return;

    const validActions = this.getAvailableActions(player);
    if (!validActions.includes(action)) {
      // Try to auto-correct
      if (action === 'raise' && validActions.includes('bet')) action = 'bet';
      else if (action === 'bet' && validActions.includes('raise')) action = 'raise';
      else if (action === 'all_in' && (validActions.includes('raise') || validActions.includes('bet') || validActions.includes('call'))) {
        // All-in is always valid if player can act
      } else {
        return; // Invalid action
      }
    }

    let actualAmount = 0;
    let isAllIn = false;

    switch (action) {
      case 'fold':
        player.isFolded = true;
        break;

      case 'check':
        // No chips moved
        break;

      case 'call': {
        const toCall = Math.min(this.currentBet - player.currentBet, player.currentStack);
        player.currentStack -= toCall;
        player.currentBet += toCall;
        actualAmount = player.currentBet;
        if (player.currentStack === 0) {
          player.isAllIn = true;
          isAllIn = true;
        }
        break;
      }

      case 'bet':
      case 'raise': {
        let targetBet = amount ?? this.currentBet + this.minRaiseSize;
        // Clamp to pot-limit max for PLO
        if (this.gameType === 'PLO') {
          const maxPL = this.getMaxRaise(player);
          targetBet = Math.min(targetBet, maxPL);
        }
        const toAdd = Math.min(targetBet - player.currentBet, player.currentStack);
        const newBet = player.currentBet + toAdd;
        const raiseBy = newBet - this.currentBet;

        player.currentStack -= toAdd;
        player.currentBet = newBet;
        actualAmount = newBet;

        if (raiseBy > 0 && raiseBy >= this.minRaiseSize) {
          this.minRaiseSize = raiseBy;
        }
        this.currentBet = newBet;
        this.lastAggressorIndex = playerIndex;

        if (player.currentStack === 0) {
          player.isAllIn = true;
          isAllIn = true;
        }

        // Reset hasActed for other active players (they need to act again)
        for (let i = 0; i < this.players.length; i++) {
          if (i !== playerIndex && !this.players[i].isFolded && !this.players[i].isAllIn) {
            this.players[i].hasActed = false;
          }
        }
        break;
      }

      case 'all_in': {
        let toAdd = player.currentStack;
        // In PLO, cap all-in to pot-limit max
        if (this.gameType === 'PLO') {
          const maxPL = this.getPotLimitMax(player);
          const maxAdd = maxPL - player.currentBet;
          toAdd = Math.min(toAdd, Math.max(0, maxAdd));
        }
        player.currentBet += toAdd;
        player.currentStack -= toAdd;
        if (player.currentStack === 0) {
          player.isAllIn = true;
          isAllIn = true;
        }
        actualAmount = player.currentBet;

        if (player.currentBet > this.currentBet) {
          const raiseBy = player.currentBet - this.currentBet;
          if (raiseBy >= this.minRaiseSize) {
            this.minRaiseSize = raiseBy;
          }
          this.currentBet = player.currentBet;
          this.lastAggressorIndex = playerIndex;

          // Reset hasActed for others
          for (let i = 0; i < this.players.length; i++) {
            if (i !== playerIndex && !this.players[i].isFolded && !this.players[i].isAllIn) {
              this.players[i].hasActed = false;
            }
          }
        }
        break;
      }
    }

    player.hasActed = true;

    // Record action
    const playerAction: PlayerAction = {
      playerId: player.playerId,
      playerName: player.name,
      action,
      amount: actualAmount,
      isAllIn,
      timestamp: Date.now(),
    };
    this.getCurrentStreet().actions.push(playerAction);

    this.onEvent({
      type: 'player_acted',
      playerId: player.playerId,
      playerName: player.name,
      seatIndex: player.seatIndex,
      action,
      amount: actualAmount,
      isAllIn,
    });

    this.advanceAction();
  }

  private advanceAction() {
    // Check if only 1 player remains
    const activePlayers = this.players.filter(p => !p.isFolded);
    if (activePlayers.length === 1) {
      this.endBettingRound();
      return;
    }

    // Find next player who needs to act
    const next = this.findNextActor();
    if (next) {
      this.currentActorIndex = next.index;
      this.promptNextAction();
    } else {
      this.endBettingRound();
    }
  }

  private findNextActor(): ActivePlayer | null {
    const n = this.players.length;
    let idx = (this.currentActorIndex + 1) % n;

    for (let i = 0; i < n; i++) {
      const p = this.players[idx];

      if (!p.isFolded && !p.isAllIn) {
        if (!p.hasActed) {
          return { index: idx, player: p };
        }
        // Player has acted but there's been a raise since
        if (p.currentBet < this.currentBet) {
          return { index: idx, player: p };
        }
      }

      idx = (idx + 1) % n;
    }
    return null;
  }

  private promptNextAction() {
    const player = this.players[this.currentActorIndex];
    const actions = this.getAvailableActions(player);
    const callAmount = Math.min(this.currentBet - player.currentBet, player.currentStack);
    const minRaise = this.getMinRaise(player);
    const maxRaise = this.getMaxRaise(player);

    this.onEvent({
      type: 'player_turn',
      playerId: player.playerId,
      seatIndex: player.seatIndex,
      availableActions: actions,
      callAmount,
      minRaise,
      maxRaise,
    });
  }

  private getAvailableActions(player: HandPlayer): ActionType[] {
    const actions: ActionType[] = ['fold'];
    const toCall = this.currentBet - player.currentBet;

    if (toCall <= 0) {
      actions.push('check');
      if (player.currentStack > 0) {
        // Preflop: BB's blind counts as a bet, so option to increase is 'raise'
        // Postflop: first voluntary wager is 'bet'
        actions.push(this.currentStreet === 'preflop' && this.currentBet > 0 ? 'raise' : 'bet');
      }
    } else {
      if (player.currentStack > 0) {
        actions.push('call');
      }
      if (player.currentStack > toCall) {
        actions.push('raise');
      }
    }

    return actions;
  }

  private getMinRaise(player: HandPlayer): number {
    const allInAmount = player.currentStack + player.currentBet;
    const minNLRaise = this.currentBet + this.minRaiseSize;
    if (this.gameType === 'PLO') {
      // Pot-limit: min raise is the same as NLHE, but capped by pot-limit max
      const maxPL = this.getPotLimitMax(player);
      return Math.min(minNLRaise, maxPL, allInAmount);
    }
    // NLHE: min raise = current bet + last raise size
    return Math.min(minNLRaise, allInAmount);
  }

  private getMaxRaise(player: HandPlayer): number {
    const allInAmount = player.currentStack + player.currentBet;
    if (this.gameType === 'PLO') {
      // Pot-limit: max raise is pot-limit, capped by stack
      const maxPL = this.getPotLimitMax(player);
      return Math.min(maxPL, allInAmount);
    }
    // NLHE: max raise is all-in
    return allInAmount;
  }

  /**
   * Calculate the pot-limit maximum bet/raise amount.
   * Formula: max total bet = myCurrentBet + callAmount + potAfterCall
   * Where potAfterCall = totalPot + callAmount
   */
  private getPotLimitMax(player: HandPlayer): number {
    const callAmount = Math.max(0, this.currentBet - player.currentBet);
    const potAfterCall = this.getTotalPot() + callAmount;
    return player.currentBet + callAmount + potAfterCall;
  }

  private getTotalPot(): number {
    let total = 0;
    for (const pot of this.pots) {
      total += pot.amount;
    }
    for (const p of this.players) {
      total += p.currentBet;
    }
    return total;
  }

  private endBettingRound() {
    // Collect bets into pots
    this.pots = collectBetsIntoPots(this.players, this.pots);
    this.onEvent({ type: 'pots_updated', pots: [...this.pots] });

    const activePlayers = this.players.filter(p => !p.isFolded);

    // Only 1 player remaining - award pot (no showdown)
    if (activePlayers.length === 1) {
      this.awardPotNoShowdown(activePlayers[0]);
      return;
    }

    // Check if all remaining players are all-in (or only 1 active + rest all-in)
    const nonAllIn = activePlayers.filter(p => !p.isAllIn);
    if (nonAllIn.length <= 1) {
      // All-in runout
      this.handleAllInRunout();
      return;
    }

    // Move to next street
    if (this.currentStreet === 'river') {
      this.showdown();
      return;
    }

    this.dealNextStreet();
  }

  private dealNextStreet() {
    let street: Street;
    let cardCount: number;

    switch (this.currentStreet) {
      case 'preflop':
        street = 'flop';
        cardCount = 3;
        break;
      case 'flop':
        street = 'turn';
        cardCount = 1;
        break;
      case 'turn':
        street = 'river';
        cardCount = 1;
        break;
      default:
        return;
    }

    // Burn and deal
    this.deck.deal(1); // burn card
    const cards = this.deck.deal(cardCount);
    this.communityCards.push(...cards);

    this.currentStreet = street;
    this.streets.push({ street, cards: [...cards], actions: [] });
    this.currentBet = 0;
    this.minRaiseSize = this.config.bigBlind;

    // Reset hasActed for all active players
    for (const p of this.players) {
      if (!p.isFolded && !p.isAllIn) {
        p.hasActed = false;
        p.currentBet = 0;
      }
    }

    this.onEvent({ type: 'street_dealt', street, cards: [...cards] });

    // First actor post-flop: first active player left of dealer
    this.currentActorIndex = this.findFirstPostflopActor();
    this.promptNextAction();
  }

  private findFirstPostflopActor(): number {
    const n = this.players.length;
    let idx = (this.dealerIndex + 1) % n;
    for (let i = 0; i < n; i++) {
      const p = this.players[idx];
      if (!p.isFolded && !p.isAllIn) {
        return idx;
      }
      idx = (idx + 1) % n;
    }
    return 0;
  }

  private handleAllInRunout() {
    // Deal remaining streets without player actions
    const remainingStreets: Street[] = [];
    let street = this.currentStreet;

    while (street !== 'river') {
      switch (street) {
        case 'preflop': street = 'flop'; break;
        case 'flop': street = 'turn'; break;
        case 'turn': street = 'river'; break;
      }
      remainingStreets.push(street);
    }

    this.onEvent({ type: 'all_in_runout', remainingStreets });

    // Check for RIT eligibility
    const allInPlayers = this.players.filter(p => !p.isFolded);
    if (remainingStreets.length > 0 && allInPlayers.length >= 2) {
      // Save remaining streets and wait for RIT decision
      this.pendingRunoutStreets = remainingStreets;
      this.onEvent({ type: 'rit_eligible', playerIds: allInPlayers.map(p => p.playerId) });
      // GameManager will call setRunItTwice() after players respond
      return;
    }

    // No RIT eligible - deal immediately
    this.dealRunout(remainingStreets);
  }

  private dealRunout(remainingStreets: Street[]) {
    const activePlayers = this.players.filter(p => !p.isFolded);
    const playerHands = activePlayers.map(p => ({ playerId: p.playerId, holeCards: p.holeCards }));

    // Emit allin_showdown before dealing runout cards (reveals hole cards)
    if (remainingStreets.length > 0) {
      this.onEvent({
        type: 'allin_showdown',
        entries: activePlayers.map(p => ({
          playerId: p.playerId,
          seatIndex: p.seatIndex,
          holeCards: [...p.holeCards],
        })),
      });

      // Emit initial equity before any runout cards
      const initialEquity = calculateEquity(this.gameType, playerHands, [...this.communityCards]);
      this.onEvent({ type: 'equity_update', equities: initialEquity });
    }

    // Deal remaining community cards (first board)
    for (let i = 0; i < remainingStreets.length; i++) {
      const s = remainingStreets[i];
      const cardCount = s === 'flop' ? 3 : 1;
      this.deck.deal(1); // burn
      const cards = this.deck.deal(cardCount);
      this.communityCards.push(...cards);
      this.streets.push({ street: s, cards: [...cards], actions: [] });

      // Check if this is the river and if it's dramatic (leader's equity < 100%)
      let dramatic: boolean | undefined;
      if (s === 'river') {
        // Check equity BEFORE this card was dealt (was the outcome uncertain?)
        const boardBeforeRiver = this.communityCards.slice(0, this.communityCards.length - 1);
        const preRiverEquity = calculateEquity(this.gameType, playerHands, boardBeforeRiver);
        const maxEquity = Math.max(...preRiverEquity.values());
        dramatic = maxEquity < 100;
      }

      this.onEvent({ type: 'street_dealt', street: s, cards: [...cards], dramatic });

      // Emit updated equity after each street
      const equity = calculateEquity(this.gameType, playerHands, [...this.communityCards]);
      this.onEvent({ type: 'equity_update', equities: equity });

      // Save turn equities for bad beat detection
      if (s === 'turn') {
        this.turnEquities = new Map(equity);
      }
    }

    this.currentStreet = 'river';

    // If RIT agreed, deal second board
    if (this.runItTwice && remainingStreets.length > 0) {
      this.secondBoard = [...this.communityCards.slice(0, this.communityCards.length - this.countRemainingCards(remainingStreets))];
      for (const s of remainingStreets) {
        const cardCount = s === 'flop' ? 3 : 1;
        this.deck.deal(1); // burn
        const cards = this.deck.deal(cardCount);
        this.secondBoard.push(...cards);
      }
      this.onEvent({ type: 'second_board_dealt', cards: [...this.secondBoard] });
    }

    this.showdown();
  }

  private countRemainingCards(streets: Street[]): number {
    return streets.reduce((sum, s) => sum + (s === 'flop' ? 3 : 1), 0);
  }

  setRunItTwice(agreed: boolean) {
    this.runItTwice = agreed;

    // Continue the pending runout now that RIT decision is made
    if (this.pendingRunoutStreets) {
      const streets = this.pendingRunoutStreets;
      this.pendingRunoutStreets = undefined;
      this.dealRunout(streets);
    }
  }

  private awardPotNoShowdown(winner: HandPlayer) {
    const totalPot = this.pots.reduce((sum, p) => sum + p.amount, 0);
    winner.currentStack += totalPot;

    const result: HandResult = {
      handId: this.handId,
      handNumber: this.handNumber,
      players: this.players.map(p => ({ ...p })),
      communityCards: [...this.communityCards],
      pots: [{
        name: 'Main Pot',
        amount: totalPot,
        winners: [{ playerId: winner.playerId, playerName: winner.name, amount: totalPot }],
      }],
      streets: this.streets.map(s => ({ ...s, actions: [...s.actions] })),
    };

    this.isComplete = true;
    this.onEvent({ type: 'hand_complete', result });
  }

  private showdown() {
    const activePlayers = this.players.filter(p => !p.isFolded);
    const showdownEntries: ShowdownEntry[] = [];
    const isRIT = this.secondBoard != null && this.secondBoard.length > 0;

    // Award each pot
    const potResults: PotResult[] = [];
    for (let i = 0; i < this.pots.length; i++) {
      const pot = this.pots[i];
      const potName = i === 0 ? 'Main Pot' : `Side Pot ${i}`;
      const eligible = activePlayers.filter(p => pot.eligiblePlayerIds.includes(p.playerId));

      if (eligible.length === 0) continue;

      // Single eligible player — no evaluation needed
      if (eligible.length === 1) {
        eligible[0].currentStack += pot.amount;
        potResults.push({
          name: potName,
          amount: pot.amount,
          winners: [{ playerId: eligible[0].playerId, playerName: eligible[0].name, amount: pot.amount }],
        });
        continue;
      }

      if (isRIT) {
        // RIT: split pot between two boards
        const firstHalf = pot.amount - Math.floor(pot.amount / 2); // odd chip to board 1
        const secondHalf = Math.floor(pot.amount / 2);

        const playerHands = eligible.map(p => ({ playerId: p.playerId, holeCards: p.holeCards }));

        // Board 1 winners
        const board1Winners = determineWinners(this.gameType, playerHands, this.communityCards);
        // Board 2 winners
        const board2Winners = determineWinners(this.gameType, playerHands, this.secondBoard!);

        // Distribute board 1 share
        const winnerAmounts = new Map<string, number>();
        const b1Share = Math.floor(firstHalf / board1Winners.length);
        const b1Remainder = firstHalf - b1Share * board1Winners.length;
        for (let w = 0; w < board1Winners.length; w++) {
          const amt = b1Share + (w === 0 ? b1Remainder : 0);
          winnerAmounts.set(board1Winners[w].playerId, (winnerAmounts.get(board1Winners[w].playerId) ?? 0) + amt);
        }

        // Distribute board 2 share
        const b2Share = Math.floor(secondHalf / board2Winners.length);
        const b2Remainder = secondHalf - b2Share * board2Winners.length;
        for (let w = 0; w < board2Winners.length; w++) {
          const amt = b2Share + (w === 0 ? b2Remainder : 0);
          winnerAmounts.set(board2Winners[w].playerId, (winnerAmounts.get(board2Winners[w].playerId) ?? 0) + amt);
        }

        // Credit stacks and build results
        const winnerResults: { playerId: string; playerName: string; amount: number }[] = [];
        for (const [playerId, amount] of winnerAmounts) {
          const player = this.players.find(p => p.playerId === playerId)!;
          player.currentStack += amount;
          winnerResults.push({ playerId, playerName: player.name, amount });
        }

        potResults.push({
          name: potName,
          amount: pot.amount,
          winners: winnerResults,
          winningHand: `Board 1: ${board1Winners[0].result.description}, Board 2: ${board2Winners[0].result.description}`,
        });

        // Build showdown entries from both boards
        for (const player of eligible) {
          if (!showdownEntries.find(e => e.playerId === player.playerId)) {
            const evalResult = evaluateHand(this.gameType, player.holeCards, this.communityCards);
            showdownEntries.push({
              playerId: player.playerId,
              seatIndex: player.seatIndex,
              holeCards: [...player.holeCards],
              handName: evalResult.handName,
              handDescription: evalResult.description,
              shown: true,
            });
          }
        }
      } else {
        // Normal (non-RIT) evaluation
        const winners = determineWinners(
          this.gameType,
          eligible.map(p => ({ playerId: p.playerId, holeCards: p.holeCards })),
          this.communityCards,
        );

        const share = Math.floor(pot.amount / winners.length);
        const remainder = pot.amount - share * winners.length;

        const winnerResults = winners.map((w, idx) => {
          const amount = share + (idx === 0 ? remainder : 0);
          const player = this.players.find(p => p.playerId === w.playerId)!;
          player.currentStack += amount;
          return { playerId: w.playerId, playerName: player.name, amount };
        });

        potResults.push({
          name: potName,
          amount: pot.amount,
          winners: winnerResults,
          winningHand: winners[0].result.description,
        });

        // Build showdown entries
        for (const player of eligible) {
          if (!showdownEntries.find(e => e.playerId === player.playerId)) {
            const evalResult = evaluateHand(this.gameType, player.holeCards, this.communityCards);
            showdownEntries.push({
              playerId: player.playerId,
              seatIndex: player.seatIndex,
              holeCards: [...player.holeCards],
              handName: evalResult.handName,
              handDescription: evalResult.description,
              shown: true,
            });
          }
        }
      }
    }

    this.onEvent({ type: 'showdown', entries: showdownEntries });

    // Check for bad beat: hand-strength detection + equity-based detection
    const allWinnerIds = [...new Set(potResults.flatMap(p => p.winners.map(w => w.playerId)))];
    const badBeatPlayerIds: string[] = [];

    // 1) Hand-strength: loser had two pair or better
    const showdownPlayerData = activePlayers.map(p => ({
      playerId: p.playerId,
      seatIndex: p.seatIndex,
      holeCards: p.holeCards,
    }));
    const handStrengthBadBeat = isBadBeat(this.gameType, showdownPlayerData, this.communityCards, allWinnerIds);
    if (handStrengthBadBeat) {
      badBeatPlayerIds.push(handStrengthBadBeat.loserPlayerId);
      this.onEvent({
        type: 'bad_beat',
        loserPlayerId: handStrengthBadBeat.loserPlayerId,
        loserSeatIndex: handStrengthBadBeat.loserSeatIndex,
        loserHandName: handStrengthBadBeat.loserHandName,
        loserHandDescription: handStrengthBadBeat.loserHandDescription,
        winnerPlayerId: handStrengthBadBeat.winnerPlayerId,
        winnerSeatIndex: handStrengthBadBeat.winnerSeatIndex,
        winnerHandName: handStrengthBadBeat.winnerHandName,
      });
    }

    // 2) Equity-based: turn equity >70% but lost in all-in runout
    if (this.turnEquities.size > 0) {
      for (const player of activePlayers) {
        if (!allWinnerIds.includes(player.playerId) && !badBeatPlayerIds.includes(player.playerId)) {
          const turnEq = this.turnEquities.get(player.playerId);
          if (turnEq != null && turnEq > 70) {
            badBeatPlayerIds.push(player.playerId);
            // Emit bad_beat event for equity-based detection too
            const evalResult = evaluateHand(this.gameType, player.holeCards, this.communityCards);
            const winner = activePlayers.find(p => allWinnerIds.includes(p.playerId));
            if (winner) {
              const winnerEval = evaluateHand(this.gameType, winner.holeCards, this.communityCards);
              this.onEvent({
                type: 'bad_beat',
                loserPlayerId: player.playerId,
                loserSeatIndex: player.seatIndex,
                loserHandName: evalResult.handName,
                loserHandDescription: evalResult.description,
                winnerPlayerId: winner.playerId,
                winnerSeatIndex: winner.seatIndex,
                winnerHandName: winnerEval.handName,
              });
            }
          }
        }
      }
    }

    const result: HandResult = {
      handId: this.handId,
      handNumber: this.handNumber,
      players: this.players.map(p => ({ ...p })),
      communityCards: [...this.communityCards],
      secondBoard: this.secondBoard ? [...this.secondBoard] : undefined,
      pots: potResults,
      streets: this.streets.map(s => ({ ...s, actions: [...s.actions] })),
      showdownResults: showdownEntries,
      badBeatPlayerIds: badBeatPlayerIds.length > 0 ? badBeatPlayerIds : undefined,
    };

    this.isComplete = true;
    this.onEvent({ type: 'hand_complete', result });
  }

  // Getters for external access
  getHandId(): string { return this.handId; }
  getCurrentStreet(): StreetState { return this.streets[this.streets.length - 1]; }
  getCommunityCards(): CardString[] { return [...this.communityCards]; }
  getPlayers(): HandPlayer[] { return this.players.map(p => ({ ...p })); }
  getPots(): Pot[] { return [...this.pots]; }
  getCurrentActorId(): string | null {
    if (this.currentActorIndex >= 0 && this.currentActorIndex < this.players.length) {
      return this.players[this.currentActorIndex].playerId;
    }
    return null;
  }
  getCurrentBet(): number { return this.currentBet; }
  isHandComplete(): boolean { return this.isComplete; }
  getCurrentStreetName(): Street { return this.currentStreet; }

  getCurrentTurnInfo(): { playerId: string; availableActions: ActionType[]; callAmount: number; minRaise: number; maxRaise: number } | null {
    if (this.isComplete) return null;
    if (this.currentActorIndex < 0 || this.currentActorIndex >= this.players.length) return null;
    const player = this.players[this.currentActorIndex];
    if (player.isFolded || player.isAllIn) return null;
    const actions = this.getAvailableActions(player);
    const callAmount = Math.min(this.currentBet - player.currentBet, player.currentStack);
    const minRaise = this.getMinRaise(player);
    const maxRaise = this.getMaxRaise(player);
    return { playerId: player.playerId, availableActions: actions, callAmount, minRaise, maxRaise };
  }
}
