import type { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type {
  GameConfig, GameState, Player, PublicPlayerState, PrivatePlayerState,
  ActionType, CardString, HandPlayer, SoundType, TablePlayerInfo,
} from '@poker/shared';
import {
  S2C_PLAYER, S2C_TABLE, HAND_COMPLETE_PAUSE_MS, RIT_TIMEOUT_MS,
  SHOW_CARDS_TIMEOUT_MS, DISCONNECT_TIMEOUT_MS, REBUY_PROMPT_MS,
  DELAY_AFTER_CARDS_DEALT_MS, DELAY_AFTER_STREET_DEALT_MS,
  DELAY_AFTER_PLAYER_ACTED_MS, DELAY_SHOWDOWN_TO_RESULT_MS,
  DELAY_POT_AWARD_MS, START_COUNTDOWN_MS,
  DELAY_AFTER_ALLIN_SHOWDOWN_MS, DELAY_DRAMATIC_RIVER_MS,
} from '@poker/shared';
import { HandEngine } from './HandEngine.js';
import type { HandEngineEvent, HandResult, ShowdownEntry } from './HandEngine.js';
import { ActionTimer } from './ActionTimer.js';
import type { HandRecord } from '@poker/shared';
import type { AvatarId } from '@poker/shared';

export class GameManager {
  private config: GameConfig;
  private io: Server;
  private tableId: string;
  private roomId: string;
  private onEmpty?: () => void;
  private players: Map<string, Player> = new Map();
  private seatMap: Map<number, string> = new Map();
  private socketMap: Map<string, Socket> = new Map();
  private playerIdToSocketId: Map<string, string> = new Map();
  private handNumber = 0;
  private dealerSeatIndex = -1;
  private phase: 'waiting_for_players' | 'hand_in_progress' | 'hand_complete' | 'paused' = 'waiting_for_players';

  private handEngine: HandEngine | null = null;
  private actionTimer: ActionTimer = new ActionTimer();
  private currentHandPlayers: Map<string, HandPlayer> = new Map();

  private handHistory: HandRecord[] = [];
  private readonly MAX_HISTORY = 100;

  private currentCommunityCards: CardString[] = [];
  private currentPlayerCards: Map<string, CardString[]> = new Map();
  private currentBets: Map<number, number> = new Map();
  private currentActorSeatIndex: number | null = null;
  private currentPots: { amount: number; eligible: string[] }[] = [];
  private currentShowdownEntries: ShowdownEntry[] = [];
  private currentSecondBoard: CardString[] = [];

  private pendingShowCards: Set<string> = new Set();
  private showCardsTimer: ReturnType<typeof setTimeout> | null = null;

  private ritResponses: Map<string, boolean> = new Map();
  private ritTimer: ReturnType<typeof setTimeout> | null = null;
  private ritPlayerIds: string[] = [];

  private eventQueue: HandEngineEvent[] = [];
  private isProcessingQueue = false;
  private lastProcessedEventType: string = '';
  private queueTimer: ReturnType<typeof setTimeout> | null = null;

  private pendingRebuyPrompts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pendingRemovals: Set<string> = new Set();
  private pendingSitOutNextHand: Set<string> = new Set();

  constructor(config: GameConfig, io: Server, tableId: string, onEmpty?: () => void) {
    this.config = config;
    this.io = io;
    this.tableId = tableId;
    this.roomId = `table:${tableId}`;
    this.onEmpty = onEmpty;
  }

  getConfig(): GameConfig { return this.config; }
  getTableId(): string { return this.tableId; }
  getRoomId(): string { return this.roomId; }
  getPhase(): string { return this.phase; }
  getPlayerCount(): number { return this.players.size; }

  getPlayerName(socketId: string): string | undefined {
    return this.players.get(socketId)?.name;
  }

  getPlayerInfoList(): TablePlayerInfo[] {
    return [...this.players.values()].map(p => ({
      name: p.name,
      stack: p.stack,
      seatIndex: p.seatIndex,
      avatarId: p.avatarId as AvatarId,
    }));
  }

  private emitToTableRoom(event: string, data?: any) {
    this.io.of('/table').to(this.roomId).emit(event, data);
  }

  private emitToPlayerRoom(event: string, data?: any) {
    this.io.of('/player').to(this.roomId).emit(event, data);
  }

  addPlayer(socket: Socket, name: string, buyIn: number, avatarId?: string): { playerId?: string; error?: string } {
    if (buyIn > this.config.maxBuyIn) return { error: `Maximum buy-in is ${this.config.maxBuyIn}` };
    if (buyIn <= 0) return { error: 'Buy-in must be positive' };
    if (!name.trim()) return { error: 'Name is required' };

    let seatIndex = -1;
    for (let i = 0; i < this.config.maxPlayers; i++) {
      if (!this.seatMap.has(i)) { seatIndex = i; break; }
    }
    if (seatIndex === -1) return { error: 'Table is full' };

    // First player at the table auto-sits-in, others sit out
    const isFirstPlayer = this.players.size === 0;
    const player: Player = {
      id: uuidv4(), name: name.trim(), seatIndex, stack: buyIn,
      status: isFirstPlayer ? 'waiting' : 'sitting_out',
      isConnected: true, isReady: isFirstPlayer,
      runItTwicePreference: 'ask', autoMuck: false, disconnectedAt: null,
      avatarId: avatarId || 'link',
    };

    this.players.set(socket.id, player);
    this.seatMap.set(seatIndex, socket.id);
    this.socketMap.set(socket.id, socket);
    this.playerIdToSocketId.set(player.id, socket.id);
    socket.join(this.roomId);

    // Send initial private state so client can render immediately
    const initialState: PrivatePlayerState = {
      id: player.id, name: player.name, seatIndex: player.seatIndex, stack: player.stack,
      status: player.status as any, holeCards: [], currentBet: 0, availableActions: [],
      minRaise: 0, maxRaise: 0, callAmount: 0, potTotal: 0, isMyTurn: false,
      showCardsOption: false, runItTwiceOffer: false, runItTwiceDeadline: 0,
      sitOutNextHand: false,
    };
    socket.emit(S2C_PLAYER.PRIVATE_STATE, initialState);

    console.log(`${player.name} joined at seat ${seatIndex} with ${buyIn} chips [${this.tableId}]`);
    return { playerId: player.id };
  }

  setPlayerReady(socketId: string) {
    const player = this.players.get(socketId);
    if (player) { player.isReady = true; console.log(`${player.name} is ready`); }
  }

  private startCountdownTimer: ReturnType<typeof setTimeout> | null = null;

  checkStartGame() {
    if (this.phase !== 'waiting_for_players') return;
    const connectedPlayers = [...this.players.values()].filter(p => p.isConnected && p.stack > 0);
    const readyPlayers = connectedPlayers.filter(p => p.isReady);
    if (readyPlayers.length >= this.config.minPlayers && readyPlayers.length === connectedPlayers.length) {
      if (this.startCountdownTimer) { clearTimeout(this.startCountdownTimer); this.startCountdownTimer = null; }
      this.startNewHand();
      return;
    }
    if (readyPlayers.length >= this.config.minPlayers && !this.startCountdownTimer) {
      this.startCountdownTimer = setTimeout(() => {
        this.startCountdownTimer = null;
        if (this.phase !== 'waiting_for_players') return;
        const ready = [...this.players.values()].filter(p => p.isReady && p.isConnected && p.stack > 0);
        if (ready.length >= this.config.minPlayers) this.startNewHand();
      }, START_COUNTDOWN_MS);
    }
  }

  private startNewHand() {
    this.phase = 'hand_in_progress';
    this.handNumber++;
    this.currentCommunityCards = [];
    this.currentPlayerCards.clear();
    this.currentBets.clear();
    this.currentActorSeatIndex = null;
    this.currentPots = [];
    this.currentShowdownEntries = [];
    this.currentSecondBoard = [];
    this.currentHandPlayers.clear();
    this.eventQueue = [];
    this.isProcessingQueue = false;
    this.lastProcessedEventType = '';
    if (this.queueTimer) { clearTimeout(this.queueTimer); this.queueTimer = null; }

    this.broadcastLobbyState();
    const eligiblePlayers = [...this.players.values()]
      .filter(p => p.isReady && p.isConnected && p.stack > 0)
      .sort((a, b) => a.seatIndex - b.seatIndex);
    this.advanceDealer(eligiblePlayers);
    for (const p of eligiblePlayers) p.status = 'active';

    console.log(`\n=== Hand #${this.handNumber} [${this.tableId}] ===`);
    console.log(`Dealer: Seat ${this.dealerSeatIndex}`);
    console.log(`Players: ${eligiblePlayers.map(p => `${p.name}(${p.stack})`).join(', ')}`);

    this.handEngine = new HandEngine(this.config, (event) => this.enqueueEvent(event));
    this.handEngine.startHand(this.handNumber,
      eligiblePlayers.map(p => ({ playerId: p.id, seatIndex: p.seatIndex, name: p.name, stack: p.stack })),
      this.dealerSeatIndex);
  }

  private advanceDealer(players: Player[]) {
    const seatIndices = players.map(p => p.seatIndex).sort((a, b) => a - b);
    if (this.dealerSeatIndex === -1) {
      this.dealerSeatIndex = seatIndices[Math.floor(Math.random() * seatIndices.length)];
    } else {
      let nextIndex = seatIndices.findIndex(s => s > this.dealerSeatIndex);
      if (nextIndex === -1) nextIndex = 0;
      this.dealerSeatIndex = seatIndices[nextIndex];
    }
  }

  private enqueueEvent(event: HandEngineEvent) {
    this.eventQueue.push(event);
    if (!this.isProcessingQueue) this.processEventQueue();
  }

  private processEventQueue() {
    this.isProcessingQueue = true;
    const event = this.eventQueue.shift();
    if (!event) { this.isProcessingQueue = false; return; }
    const delay = this.getEventDelay(event);
    if (delay > 0) {
      this.queueTimer = setTimeout(() => {
        this.queueTimer = null;
        this.processEvent(event);
        this.lastProcessedEventType = event.type;
        this.processEventQueue();
      }, delay);
    } else {
      this.processEvent(event);
      this.lastProcessedEventType = event.type;
      this.processEventQueue();
    }
  }

  private lastStreetWasDramatic = false;

  private getEventDelay(event: HandEngineEvent): number {
    if (event.type === 'player_turn') {
      switch (this.lastProcessedEventType) {
        case 'cards_dealt': return DELAY_AFTER_CARDS_DEALT_MS;
        case 'street_dealt': return DELAY_AFTER_STREET_DEALT_MS;
        case 'player_acted': return DELAY_AFTER_PLAYER_ACTED_MS;
        default: return 0;
      }
    }
    // All-in showdown: delay after equity_update so clients see the initial equity
    if (event.type === 'allin_showdown') return 0;
    // First street after allin_showdown: wait for card reveal
    if (event.type === 'equity_update' && this.lastProcessedEventType === 'allin_showdown') return DELAY_AFTER_ALLIN_SHOWDOWN_MS;
    // Street dealt during runout: use dramatic river delay if applicable
    if (event.type === 'street_dealt' && this.lastProcessedEventType === 'equity_update') {
      // Check if this street is a dramatic river
      if (event.type === 'street_dealt' && 'dramatic' in event && event.dramatic) {
        this.lastStreetWasDramatic = true;
        return DELAY_DRAMATIC_RIVER_MS;
      }
      return DELAY_AFTER_STREET_DEALT_MS;
    }
    if (event.type === 'street_dealt' && this.lastProcessedEventType === 'street_dealt') return DELAY_AFTER_STREET_DEALT_MS;
    if (event.type === 'second_board_dealt' && this.lastProcessedEventType === 'street_dealt') return DELAY_AFTER_STREET_DEALT_MS;
    // Showdown after equity_update (the final one): short delay
    if (event.type === 'showdown' && this.lastProcessedEventType === 'equity_update') {
      const delay = this.lastStreetWasDramatic ? DELAY_DRAMATIC_RIVER_MS : DELAY_AFTER_STREET_DEALT_MS;
      this.lastStreetWasDramatic = false;
      return delay;
    }
    if (event.type === 'showdown' && (this.lastProcessedEventType === 'street_dealt' || this.lastProcessedEventType === 'second_board_dealt')) return DELAY_AFTER_STREET_DEALT_MS;
    if (event.type === 'hand_complete' && this.lastProcessedEventType === 'showdown') return DELAY_SHOWDOWN_TO_RESULT_MS;
    return 0;
  }

  private processEvent(event: HandEngineEvent) {
    switch (event.type) {
      case 'hand_started':
        for (const p of event.players) this.currentHandPlayers.set(p.playerId, p);
        this.broadcastTableState();
        break;

      case 'cards_dealt':
        this.currentPlayerCards = event.playerCards;
        {
          const seatIndices = [...event.playerCards.keys()]
            .map(pid => { const sid = this.playerIdToSocketId.get(pid); return sid ? this.players.get(sid)?.seatIndex : undefined; })
            .filter((s): s is number => s !== undefined).sort((a, b) => a - b);
          this.emitToTableRoom(S2C_TABLE.CARDS_DEALT, { dealerSeatIndex: this.dealerSeatIndex, seatIndices });
        }
        for (const [playerId, cards] of event.playerCards) {
          const socketId = this.playerIdToSocketId.get(playerId);
          if (socketId) { const socket = this.socketMap.get(socketId); socket?.emit(S2C_PLAYER.HAND_START, { handNumber: this.handNumber, holeCards: cards }); }
        }
        this.emitSound('card_deal');
        this.broadcastTableState();
        this.sendPrivateStateToAll();
        break;

      case 'player_turn':
        this.actionTimer.cancel();
        this.currentActorSeatIndex = event.seatIndex;
        {
          const socketId = this.playerIdToSocketId.get(event.playerId);
          if (socketId) { const socket = this.socketMap.get(socketId); socket?.emit(S2C_PLAYER.YOUR_TURN, { availableActions: event.availableActions, callAmount: event.callAmount, minRaise: event.minRaise, maxRaise: event.maxRaise, timeLimit: this.config.actionTimeSeconds }); }
        }
        this.emitSoundToPlayer(event.playerId, 'your_turn');
        this.actionTimer.start(this.config.actionTimeSeconds,
          () => this.handleTimeout(event.playerId, event.availableActions),
          (remaining) => {
            this.emitToTableRoom(S2C_TABLE.PLAYER_TIMER, { seatIndex: event.seatIndex, secondsRemaining: remaining });
            if (remaining === 5) this.emitSound('timer_warning');
          });
        this.sendPrivateStateToAll();
        this.broadcastTableState();
        break;

      case 'player_acted':
        this.actionTimer.cancel();
        if (this.handEngine) {
          for (const p of this.handEngine.getPlayers()) { this.currentBets.set(p.seatIndex, p.currentBet); this.currentHandPlayers.set(p.playerId, p); }
        }
        this.emitToTableRoom(S2C_TABLE.PLAYER_ACTION, { seatIndex: event.seatIndex, action: event.action, amount: event.amount, playerName: event.playerName, isAllIn: event.isAllIn });
        if (event.isAllIn) this.emitSound('all_in');
        else if (event.action === 'fold') this.emitSound('fold');
        else if (event.action === 'check') this.emitSound('check');
        else this.emitSound('chip_bet');
        console.log(`${event.playerName}: ${event.action}${event.amount > 0 ? ' ' + event.amount : ''}${event.isAllIn ? ' (ALL-IN)' : ''}`);
        break;

      case 'allin_showdown':
        // Reveal hole cards for all active players on table view
        for (const entry of event.entries) {
          const existing = this.currentShowdownEntries.find(e => e.playerId === entry.playerId);
          if (!existing) {
            this.currentShowdownEntries.push({
              playerId: entry.playerId, seatIndex: entry.seatIndex,
              holeCards: entry.holeCards, handName: '', handDescription: '', shown: true,
            });
          }
        }
        this.emitToTableRoom(S2C_TABLE.ALLIN_SHOWDOWN, {
          entries: event.entries.map(e => ({ seatIndex: e.seatIndex, cards: e.holeCards })),
        });
        this.broadcastTableState();
        break;

      case 'equity_update': {
        const equityObj: Record<number, number> = {};
        for (const [playerId, eq] of event.equities) {
          const socketId = this.playerIdToSocketId.get(playerId);
          if (socketId) {
            const player = this.players.get(socketId);
            if (player) equityObj[player.seatIndex] = eq;
          }
        }
        this.emitToTableRoom(S2C_TABLE.EQUITY_UPDATE, { equities: equityObj });
        break;
      }

      case 'street_dealt':
        this.currentCommunityCards = this.handEngine?.getCommunityCards() ?? [];
        this.currentBets.clear();
        this.emitToTableRoom(S2C_TABLE.STREET_DEAL, { street: event.street, cards: event.cards, dramatic: event.dramatic });
        this.emitSound('card_flip');
        console.log(`--- ${event.street.toUpperCase()} --- [${event.cards.join(' ')}]${event.dramatic ? ' (DRAMATIC)' : ''}`);
        this.broadcastTableState();
        break;

      case 'pots_updated':
        this.currentPots = event.pots.map(p => ({ amount: p.amount, eligible: p.eligiblePlayerIds }));
        this.currentBets.clear();
        this.emitToTableRoom(S2C_TABLE.POT_UPDATE, this.currentPots);
        break;

      case 'second_board_dealt':
        this.currentSecondBoard = event.cards;
        this.emitToTableRoom(S2C_TABLE.SECOND_BOARD_DEALT, { cards: event.cards });
        this.emitSound('card_flip');
        this.broadcastTableState();
        break;

      case 'rit_eligible':
        this.handleRitOffer(event.playerIds);
        break;

      case 'showdown':
        this.currentShowdownEntries = event.entries;
        this.emitToTableRoom(S2C_TABLE.SHOWDOWN, { reveals: event.entries.map(e => ({ seatIndex: e.seatIndex, cards: e.holeCards, handName: e.handName, handDescription: e.handDescription })) });
        break;

      case 'hand_complete':
        this.handleHandComplete(event.result);
        break;
    }
  }

  private emitSound(sound: SoundType) {
    this.emitToTableRoom(S2C_TABLE.SOUND, { sound });
    this.emitToPlayerRoom(S2C_PLAYER.SOUND, { sound });
  }

  private emitSoundToPlayer(playerId: string, sound: SoundType) {
    const socketId = this.playerIdToSocketId.get(playerId);
    if (socketId) { const socket = this.socketMap.get(socketId); socket?.emit(S2C_PLAYER.SOUND, { sound }); }
  }

  private handleTimeout(playerId: string, availableActions: ActionType[]) {
    if (availableActions.includes('check')) this.handEngine?.handleAction(playerId, 'check');
    else this.handEngine?.handleAction(playerId, 'fold');
  }

  private handleRitOffer(playerIds: string[]) {
    this.ritPlayerIds = playerIds;
    this.ritResponses.clear();
    for (const pid of playerIds) {
      const socketId = this.playerIdToSocketId.get(pid);
      if (socketId) { const player = this.players.get(socketId); if (player?.runItTwicePreference === 'always_no') { this.handEngine?.setRunItTwice(false); return; } }
    }
    const deadline = Date.now() + RIT_TIMEOUT_MS;
    for (const pid of playerIds) {
      const socketId = this.playerIdToSocketId.get(pid);
      if (socketId) { const socket = this.socketMap.get(socketId); socket?.emit(S2C_PLAYER.RIT_OFFER, { deadline }); }
    }
    this.emitToTableRoom(S2C_TABLE.RIT_ACTIVE, { offered: true });
    this.ritTimer = setTimeout(() => this.resolveRit(), RIT_TIMEOUT_MS);
  }

  handleRitResponse(socketId: string, accept: boolean, alwaysNo: boolean) {
    const player = this.players.get(socketId);
    if (!player) return;
    if (alwaysNo) player.runItTwicePreference = 'always_no';
    this.ritResponses.set(player.id, accept);
    if (!accept) { this.resolveRit(); return; }
    if (this.ritResponses.size === this.ritPlayerIds.length) this.resolveRit();
  }

  private resolveRit() {
    if (this.ritTimer) { clearTimeout(this.ritTimer); this.ritTimer = null; }
    const allAccepted = this.ritPlayerIds.every(pid => this.ritResponses.get(pid) === true);

    // Dismiss RIT prompt on all eligible players' phones
    for (const pid of this.ritPlayerIds) {
      const socketId = this.playerIdToSocketId.get(pid);
      if (socketId) {
        const socket = this.socketMap.get(socketId);
        socket?.emit(S2C_PLAYER.RIT_RESOLVED, { accepted: allAccepted });
      }
    }

    console.log(`Run It Twice: ${allAccepted ? 'AGREED' : 'DECLINED'}`);

    if (allAccepted) {
      // Pause to let players see the table before dealing
      setTimeout(() => this.handEngine?.setRunItTwice(true), 1500);
    } else {
      this.handEngine?.setRunItTwice(false);
    }
  }

  private handleHandComplete(result: HandResult) {
    this.phase = 'hand_complete';
    this.actionTimer.cancel();
    this.currentActorSeatIndex = null;
    for (const hp of result.players) {
      const socketId = this.playerIdToSocketId.get(hp.playerId);
      if (socketId) { const player = this.players.get(socketId); if (player) { player.stack = hp.currentStack; player.status = hp.currentStack > 0 ? 'waiting' : 'busted'; } }
    }
    for (const pot of result.pots) { for (const w of pot.winners) console.log(`${w.playerName} wins ${w.amount} from ${pot.name}${pot.winningHand ? ' (' + pot.winningHand + ')' : ''}`); }
    this.storeHandHistory(result);
    const potAwards: { potIndex: number; amount: number; winnerSeatIndex: number; winnerName: string }[] = [];
    for (let i = 0; i < result.pots.length; i++) {
      const pot = result.pots[i];
      for (const winner of pot.winners) { const hp = result.players.find(p => p.playerId === winner.playerId); if (hp) potAwards.push({ potIndex: i, amount: winner.amount, winnerSeatIndex: hp.seatIndex, winnerName: winner.playerName }); }
    }
    this.emitToTableRoom(S2C_TABLE.POT_AWARD, { awards: potAwards });
    this.emitSound('chip_win');
    setTimeout(() => {
      this.emitToTableRoom(S2C_TABLE.HAND_RESULT, { pots: result.pots });
      for (const hp of result.players) {
        const socketId = this.playerIdToSocketId.get(hp.playerId);
        if (socketId) {
          const socket = this.socketMap.get(socketId);
          const player = this.players.get(socketId);
          if (socket && player) {
            socket.emit(S2C_PLAYER.HAND_RESULT, { pots: result.pots, netResult: hp.currentStack - hp.startingStack, finalStack: hp.currentStack });
            if (hp.currentStack <= 0) {
              const deadline = Date.now() + REBUY_PROMPT_MS;
              socket.emit(S2C_PLAYER.REBUY_PROMPT, { maxBuyIn: this.config.maxBuyIn, deadline });
              const timer = setTimeout(() => { this.pendingRebuyPrompts.delete(socketId); this.handleSitOut(socketId); }, REBUY_PROMPT_MS);
              this.pendingRebuyPrompts.set(socketId, timer);
            }
          }
        }
      }
      this.sendClearedPrivateStateToAll();
      this.offerShowCards(result);
      this.broadcastTableState();
      if (this.pendingShowCards.size === 0) this.scheduleNextHand();
    }, DELAY_POT_AWARD_MS);
  }

  private scheduleNextHand() {
    setTimeout(() => {
      if (this.phase === 'hand_complete') {
        this.phase = 'waiting_for_players';
        this.processPendingRemovals();
        // Process pending sit-out-next-hand requests
        for (const socketId of [...this.pendingSitOutNextHand]) {
          this.pendingSitOutNextHand.delete(socketId);
          this.handleSitOut(socketId);
        }
        for (const [, player] of this.players) {
          if (player.stack > 0 && player.isConnected && player.status !== 'busted' && player.status !== 'sitting_out') player.isReady = true;
        }
        this.broadcastLobbyState();
        this.checkStartGame();
      }
    }, HAND_COMPLETE_PAUSE_MS);
  }

  private sendClearedPrivateStateToAll() {
    for (const [socketId, player] of this.players) {
      const socket = this.socketMap.get(socketId);
      if (!socket || !player.isConnected) continue;
      const state: PrivatePlayerState = {
        id: player.id, name: player.name, seatIndex: player.seatIndex, stack: player.stack,
        status: player.status as any, holeCards: [], currentBet: 0, availableActions: [],
        minRaise: 0, maxRaise: 0, callAmount: 0, potTotal: 0, isMyTurn: false,
        showCardsOption: false, runItTwiceOffer: false, runItTwiceDeadline: 0,
        sitOutNextHand: this.pendingSitOutNextHand.has(socketId),
      };
      socket.emit(S2C_PLAYER.PRIVATE_STATE, state);
    }
  }

  private offerShowCards(result: HandResult) {
    if (result.showdownResults && result.showdownResults.length > 0) return;
    for (const pot of result.pots) {
      for (const winner of pot.winners) {
        const socketId = this.playerIdToSocketId.get(winner.playerId);
        if (socketId) { const player = this.players.get(socketId); if (player && !player.autoMuck) { const socket = this.socketMap.get(socketId); socket?.emit(S2C_PLAYER.SHOW_CARDS_OFFER, {}); this.pendingShowCards.add(winner.playerId); } }
      }
    }
    if (this.pendingShowCards.size > 0) {
      this.showCardsTimer = setTimeout(() => { this.pendingShowCards.clear(); this.scheduleNextHand(); }, SHOW_CARDS_TIMEOUT_MS);
    }
  }

  handleShowCards(socketId: string, show: boolean) {
    const player = this.players.get(socketId);
    if (!player || !this.pendingShowCards.has(player.id)) return;
    this.pendingShowCards.delete(player.id);
    if (show) {
      const cards = this.currentPlayerCards.get(player.id);
      if (cards) {
        this.currentShowdownEntries.push({ playerId: player.id, seatIndex: player.seatIndex, holeCards: cards, handName: 'Shown', handDescription: '', shown: true });
        this.broadcastTableState();
        // Send shown cards back to the player so their phone displays them
        const socket = this.socketMap.get(socketId);
        if (socket) {
          socket.emit(S2C_PLAYER.PRIVATE_STATE, {
            id: player.id, name: player.name, seatIndex: player.seatIndex, stack: player.stack,
            status: player.status as any, holeCards: cards, currentBet: 0, availableActions: [],
            minRaise: 0, maxRaise: 0, callAmount: 0, potTotal: 0, isMyTurn: false,
            showCardsOption: false, runItTwiceOffer: false, runItTwiceDeadline: 0,
            sitOutNextHand: this.pendingSitOutNextHand.has(socketId),
          });
        }
      }
    }
    if (this.pendingShowCards.size === 0) {
      if (this.showCardsTimer) { clearTimeout(this.showCardsTimer); this.showCardsTimer = null; }
      this.scheduleNextHand();
    }
  }

  private storeHandHistory(result: HandResult) {
    const record: HandRecord = {
      handId: result.handId, handNumber: result.handNumber, gameType: this.config.gameType,
      timestamp: Date.now(), blinds: { small: this.config.smallBlind, big: this.config.bigBlind },
      players: result.players.map(p => {
        const wasShown = result.showdownResults?.some(e => e.playerId === p.playerId && e.shown) ?? false;
        return { playerId: p.playerId, name: p.name, seatIndex: p.seatIndex, startingStack: p.startingStack, holeCards: p.holeCards, isDealer: p.seatIndex === this.dealerSeatIndex, isSmallBlind: false, isBigBlind: false, shownAtShowdown: wasShown };
      }),
      streets: result.streets.map(s => ({ street: s.street, boardCards: s.cards, actions: s.actions })),
      pots: result.pots, communityCards: result.communityCards, secondBoard: result.secondBoard,
      summary: { results: result.players.map(p => ({ playerId: p.playerId, playerName: p.name, netChips: p.currentStack - p.startingStack })) },
    };
    this.handHistory.push(record);
    if (this.handHistory.length > this.MAX_HISTORY) this.handHistory.shift();
  }

  handlePlayerAction(socketId: string, action: string, amount?: number) {
    if (!this.handEngine) return;
    const player = this.players.get(socketId);
    if (!player) return;
    this.handEngine.handleAction(player.id, action as ActionType, amount);
  }

  sendHandHistory(socket: Socket) {
    const socketId = [...this.socketMap.entries()].find(([, s]) => s === socket)?.[0];
    if (!socketId) return;
    const player = this.players.get(socketId);
    if (!player) return;
    socket.emit(S2C_PLAYER.HISTORY_LIST, this.handHistory.map(h => this.sanitizeHandRecord(h, player.id)));
  }

  sendHandDetail(socket: Socket, handId: string) {
    const socketId = [...this.socketMap.entries()].find(([, s]) => s === socket)?.[0];
    if (!socketId) return;
    const player = this.players.get(socketId);
    if (!player) return;
    const record = this.handHistory.find(h => h.handId === handId);
    if (!record) return;
    socket.emit(S2C_PLAYER.HAND_DETAIL, this.sanitizeHandRecord(record, player.id));
  }

  private sanitizeHandRecord(record: HandRecord, requestingPlayerId: string): HandRecord {
    return { ...record, players: record.players.map(p => {
      if (p.playerId === requestingPlayerId) return p;
      if (p.shownAtShowdown) return p;
      return { ...p, holeCards: undefined };
    }) };
  }

  private sanitizeHandRecordForTable(record: HandRecord): HandRecord {
    return { ...record, players: record.players.map(p => p.shownAtShowdown ? p : { ...p, holeCards: undefined }) };
  }

  sendTableHandHistory(socket: Socket) {
    socket.emit(S2C_TABLE.HISTORY_LIST, this.handHistory.map(h => this.sanitizeHandRecordForTable(h)));
  }

  sendTableHandDetail(socket: Socket, handId: string) {
    const record = this.handHistory.find(h => h.handId === handId);
    if (!record) return;
    socket.emit(S2C_TABLE.HAND_DETAIL, this.sanitizeHandRecordForTable(record));
  }

  rebuyPlayer(socketId: string, amount: number): { error?: string } {
    const player = this.players.get(socketId);
    if (!player) return { error: 'Player not found' };
    if (amount > this.config.maxBuyIn) return { error: `Maximum buy-in is ${this.config.maxBuyIn}` };
    if (amount <= 0) return { error: 'Amount must be positive' };
    if (player.status !== 'busted' && player.status !== 'sitting_out') return { error: 'You can only rebuy when busted or sitting out' };
    const rebuyTimer = this.pendingRebuyPrompts.get(socketId);
    if (rebuyTimer) { clearTimeout(rebuyTimer); this.pendingRebuyPrompts.delete(socketId); }
    player.stack = amount;
    player.status = 'waiting';
    player.isReady = true;
    return {};
  }

  handleSitOutNextHand(socketId: string) {
    const player = this.players.get(socketId);
    if (!player) return;
    // Toggle
    if (this.pendingSitOutNextHand.has(socketId)) {
      this.pendingSitOutNextHand.delete(socketId);
    } else {
      this.pendingSitOutNextHand.add(socketId);
      // If not in a hand, sit out immediately
      if (this.phase !== 'hand_in_progress') {
        this.pendingSitOutNextHand.delete(socketId);
        this.handleSitOut(socketId);
        return;
      }
    }
    // Broadcast updated private state
    this.sendPrivateStateForPlayer(socketId);
  }

  private sendPrivateStateForPlayer(socketId: string) {
    const player = this.players.get(socketId);
    if (!player) return;
    const socket = this.socketMap.get(socketId);
    if (!socket) return;

    // During a hand, delegate to full sendPrivateStateToAll to get accurate hand data
    if (this.phase === 'hand_in_progress' && this.handEngine) {
      this.sendPrivateStateToAll();
      return;
    }

    // Between hands, send a cleared state
    const state: PrivatePlayerState = {
      id: player.id, name: player.name, seatIndex: player.seatIndex, stack: player.stack,
      status: player.status as any, holeCards: [], currentBet: 0, availableActions: [],
      minRaise: 0, maxRaise: 0, callAmount: 0, potTotal: 0, isMyTurn: false,
      showCardsOption: false, runItTwiceOffer: false, runItTwiceDeadline: 0,
      sitOutNextHand: this.pendingSitOutNextHand.has(socketId),
    };
    socket.emit(S2C_PLAYER.PRIVATE_STATE, state);
  }

  handleSitOut(socketId: string) {
    const player = this.players.get(socketId);
    if (!player) return;
    this.pendingSitOutNextHand.delete(socketId);
    const timer = this.pendingRebuyPrompts.get(socketId);
    if (timer) { clearTimeout(timer); this.pendingRebuyPrompts.delete(socketId); }
    player.status = 'sitting_out';
    player.isReady = false;
    console.log(`${player.name} is sitting out`);
    this.broadcastLobbyState();
    this.broadcastTableState();
  }

  handleSitIn(socketId: string) {
    const player = this.players.get(socketId);
    if (!player) return;
    this.pendingSitOutNextHand.delete(socketId);
    if (player.status !== 'sitting_out') return;
    if (player.stack <= 0) return;
    player.status = 'waiting';
    player.isReady = true;
    console.log(`${player.name} sat in`);
    this.broadcastLobbyState();
    this.broadcastTableState();
  }

  handlePlayerDisconnect(socketId: string) {
    const player = this.players.get(socketId);
    if (player) {
      player.isConnected = false;
      player.disconnectedAt = Date.now();
      const rebuyTimer = this.pendingRebuyPrompts.get(socketId);
      if (rebuyTimer) { clearTimeout(rebuyTimer); this.pendingRebuyPrompts.delete(socketId); }
      this.startDisconnectTimer(socketId);
      console.log(`${player.name} disconnected`);
      this.broadcastLobbyState();
      this.broadcastTableState();
    }
  }

  handlePlayerReconnect(socketId: string) {
    const player = this.players.get(socketId);
    if (player) { player.disconnectedAt = null; this.cancelDisconnectTimer(socketId); }
  }

  reconnectPlayer(playerId: string, newSocket: Socket): { error?: string; playerName?: string } {
    const oldSocketId = this.playerIdToSocketId.get(playerId);
    if (!oldSocketId) return { error: 'Player not found' };
    const player = this.players.get(oldSocketId);
    if (!player) return { error: 'Player not found' };
    const newSocketId = newSocket.id;
    this.players.delete(oldSocketId);
    this.players.set(newSocketId, player);
    this.socketMap.delete(oldSocketId);
    this.socketMap.set(newSocketId, newSocket);
    this.playerIdToSocketId.set(playerId, newSocketId);
    this.seatMap.set(player.seatIndex, newSocketId);
    this.cancelDisconnectTimer(oldSocketId);
    this.pendingRemovals.delete(oldSocketId);
    if (this.pendingSitOutNextHand.has(oldSocketId)) {
      this.pendingSitOutNextHand.delete(oldSocketId);
      this.pendingSitOutNextHand.add(newSocketId);
    }
    const rebuyTimer = this.pendingRebuyPrompts.get(oldSocketId);
    if (rebuyTimer) { clearTimeout(rebuyTimer); this.pendingRebuyPrompts.delete(oldSocketId); }
    player.isConnected = true;
    player.disconnectedAt = null;
    newSocket.join(this.roomId);
    this.broadcastLobbyState();
    this.broadcastTableState();
    if (this.phase === 'hand_in_progress' && this.currentPlayerCards.has(playerId)) this.sendPrivateStateToAll();
    console.log(`${player.name} reconnected (${oldSocketId} → ${newSocketId})`);
    return { playerName: player.name };
  }

  private startDisconnectTimer(socketId: string) {
    this.cancelDisconnectTimer(socketId);
    const timer = setTimeout(() => { this.disconnectTimers.delete(socketId); this.handleDisconnectTimeout(socketId); }, DISCONNECT_TIMEOUT_MS);
    this.disconnectTimers.set(socketId, timer);
  }

  private cancelDisconnectTimer(socketId: string) {
    const timer = this.disconnectTimers.get(socketId);
    if (timer) { clearTimeout(timer); this.disconnectTimers.delete(socketId); }
    this.pendingRemovals.delete(socketId);
  }

  private handleDisconnectTimeout(socketId: string) {
    const player = this.players.get(socketId);
    if (!player || player.isConnected) return;
    if (this.phase === 'hand_in_progress') {
      this.pendingRemovals.add(socketId);
      console.log(`${player.name} disconnect timeout - pending removal after hand`);
    } else {
      this.removePlayer(socketId);
    }
  }

  removePlayer(socketId: string) {
    const player = this.players.get(socketId);
    if (!player) return;
    console.log(`${player.name} removed from table [${this.tableId}]`);
    this.seatMap.delete(player.seatIndex);
    this.playerIdToSocketId.delete(player.id);
    this.socketMap.delete(socketId);
    this.players.delete(socketId);
    this.pendingRemovals.delete(socketId);
    this.pendingSitOutNextHand.delete(socketId);
    this.emitToTableRoom(S2C_TABLE.PLAYER_LEFT, { playerId: player.id, seatIndex: player.seatIndex, playerName: player.name });
    this.broadcastLobbyState();
    this.broadcastTableState();
    if (this.players.size === 0 && this.onEmpty) this.onEmpty();
  }

  leaveTable(socketId: string) {
    const player = this.players.get(socketId);
    if (!player) return;
    if (this.phase === 'hand_in_progress') {
      const hp = [...this.currentHandPlayers.values()].find(h => h.playerId === player.id);
      if (hp && !hp.isFolded) { this.pendingRemovals.add(socketId); return; }
    }
    const socket = this.socketMap.get(socketId);
    if (socket) socket.leave(this.roomId);
    this.removePlayer(socketId);
  }

  hasPlayer(socketId: string): boolean { return this.players.has(socketId); }
  getPlayerBySocketId(socketId: string): Player | undefined { return this.players.get(socketId); }

  private processPendingRemovals() {
    for (const socketId of this.pendingRemovals) {
      const player = this.players.get(socketId);
      if (player && !player.isConnected) this.removePlayer(socketId);
    }
    this.pendingRemovals.clear();
  }

  private sendPrivateStateToAll() {
    if (!this.handEngine) return;
    const handPlayers = this.handEngine.getPlayers();
    const pots = this.handEngine.getPots();
    const turnInfo = this.handEngine.getCurrentTurnInfo();
    const totalPot = pots.reduce((sum, p) => sum + p.amount, 0) + handPlayers.reduce((sum, p) => sum + p.currentBet, 0);
    for (const hp of handPlayers) {
      const socketId = this.playerIdToSocketId.get(hp.playerId);
      if (!socketId) continue;
      const socket = this.socketMap.get(socketId);
      if (!socket) continue;
      const isMyTurn = turnInfo !== null && hp.playerId === turnInfo.playerId;
      const state: PrivatePlayerState = {
        id: hp.playerId, name: hp.name, seatIndex: hp.seatIndex, stack: hp.currentStack,
        status: hp.isFolded ? 'folded' : hp.isAllIn ? 'all_in' : 'active',
        holeCards: hp.holeCards, currentBet: hp.currentBet,
        availableActions: isMyTurn ? turnInfo!.availableActions : [],
        minRaise: isMyTurn ? turnInfo!.minRaise : 0,
        maxRaise: isMyTurn ? turnInfo!.maxRaise : hp.currentStack + hp.currentBet,
        callAmount: isMyTurn ? turnInfo!.callAmount : 0,
        potTotal: totalPot, isMyTurn,
        showCardsOption: false, runItTwiceOffer: false, runItTwiceDeadline: 0,
        sitOutNextHand: this.pendingSitOutNextHand.has(socketId),
      };
      socket.emit(S2C_PLAYER.PRIVATE_STATE, state);
    }
  }

  broadcastLobbyState() {
    const players = [...this.players.values()].map(p => ({
      id: p.id, name: p.name, seatIndex: p.seatIndex, stack: p.stack, isReady: p.isReady, isConnected: p.isConnected,
    }));
    const lobbyState = {
      players, readyCount: players.filter(p => p.isReady && p.isConnected).length,
      neededCount: this.config.minPlayers, phase: this.phase, tableId: this.tableId,
    };
    this.emitToPlayerRoom(S2C_PLAYER.LOBBY_STATE, lobbyState);
  }

  broadcastTableState() {
    const state = this.getTableState();
    this.emitToTableRoom(S2C_TABLE.GAME_STATE, state);
  }

  getTableState(): GameState {
    const handPlayers = this.handEngine?.getPlayers();
    const currentActorId = this.handEngine?.getCurrentActorId();
    const players: PublicPlayerState[] = [...this.players.values()].map(p => {
      const hp = handPlayers?.find(h => h.playerId === p.id);
      const shownEntry = this.currentShowdownEntries.find(e => e.playerId === p.id && e.shown);
      return {
        id: p.id, name: p.name, seatIndex: p.seatIndex,
        stack: hp?.currentStack ?? p.stack,
        status: hp ? (hp.isFolded ? 'folded' : hp.isAllIn ? 'all_in' : 'active') : p.status,
        isConnected: p.isConnected, disconnectedAt: p.disconnectedAt,
        currentBet: hp?.currentBet ?? 0, isDealer: p.seatIndex === this.dealerSeatIndex,
        isSmallBlind: false, isBigBlind: false, isCurrentActor: p.id === currentActorId,
        holeCards: shownEntry ? shownEntry.holeCards : null,
        hasCards: hp ? !hp.isFolded : false, avatarId: p.avatarId,
      };
    });
    return {
      phase: this.phase, config: this.config, handNumber: this.handNumber, players,
      communityCards: this.handEngine?.getCommunityCards() ?? [],
      secondBoard: this.currentSecondBoard.length > 0 ? this.currentSecondBoard : undefined,
      pots: this.currentPots, currentStreet: null, dealerSeatIndex: this.dealerSeatIndex,
      currentActorSeatIndex: this.currentActorSeatIndex, actionTimeRemaining: this.actionTimer.getRemaining(),
    };
  }
}
