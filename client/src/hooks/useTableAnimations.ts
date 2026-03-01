import { useEffect, useRef, useState, type RefObject } from 'react';
import { S2C_TABLE, CHIP_TRICK_DURATION_MS, DELAY_SHOWDOWN_REVEAL_INTERVAL_MS } from '@poker/shared';
import { SHUFFLE_DURATION_MS } from '../views/table/DeckShuffleAnimation.js';
import type { GameState, SoundType, CardString, ChipTrickType } from '@poker/shared';
import { SEAT_POSITIONS, BET_POSITIONS } from '../views/table/PokerTable.js';
import type { BetChipAnimation, DealCardAnimation } from '../views/table/PokerTable.js';
import { tableSoundManager } from '../audio/SoundManager.js';

interface PotAward {
  potIndex: number;
  amount: number;
  winnerSeatIndex: number;
  winnerName: string;
  winningHand?: string;
  winningCards?: CardString[];
}

interface CollectingBet {
  seatIndex: number;
  amount: number;
}

interface UseTableAnimationsOptions {
  socket: { on: Function; off?: Function };
  containerRef: RefObject<HTMLDivElement | null>;
  setGameState: (state: GameState) => void;
  enableSound?: boolean;
  /** When set, positions are rotated so this seat appears at bottom */
  seatRotation?: number;
}

export interface BadBeatData {
  loserSeatIndex: number;
  loserHandName: string;
  loserHandDescription: string;
  winnerSeatIndex: number;
  winnerHandName: string;
  playerName: string;
}

export interface ChipTrickData {
  seatIndex: number;
  trickType: ChipTrickType;
}

interface UseTableAnimationsResult {
  potAwards: PotAward[] | undefined;
  winnerSeats: number[];
  winningCards: CardString[];
  awardingPotIndex: number | null;
  timerData: { seatIndex: number; secondsRemaining: number } | null;
  collectingBets: CollectingBet[] | null;
  potGrow: boolean;
  betChipAnimations: BetChipAnimation[];
  dealCardAnimations: DealCardAnimation[];
  equities: Record<number, number> | null;
  dramaticRiver: boolean;
  badBeat: BadBeatData | null;
  chipTrick: ChipTrickData | null;
  shuffling: boolean;
}

let animId = 0;

export function useTableAnimations({
  socket,
  containerRef,
  setGameState,
  enableSound = true,
  seatRotation,
}: UseTableAnimationsOptions): UseTableAnimationsResult {
  const gameStateRef = useRef<GameState | null>(null);
  const [potAwards, setPotAwards] = useState<PotAward[] | undefined>(undefined);
  const [winnerSeats, setWinnerSeats] = useState<number[]>([]);
  const [winningCards, setWinningCards] = useState<CardString[]>([]);
  const [awardingPotIndex, setAwardingPotIndex] = useState<number | null>(null);
  const [timerData, setTimerData] = useState<{ seatIndex: number; secondsRemaining: number } | null>(null);
  const [collectingBets, setCollectingBets] = useState<CollectingBet[] | null>(null);
  const [potGrow, setPotGrow] = useState(false);
  const [betChipAnimations, setBetChipAnimations] = useState<BetChipAnimation[]>([]);
  const [dealCardAnimations, setDealCardAnimations] = useState<DealCardAnimation[]>([]);
  const [equities, setEquities] = useState<Record<number, number> | null>(null);
  const [dramaticRiver, setDramaticRiver] = useState(false);
  const [badBeat, setBadBeat] = useState<BadBeatData | null>(null);
  const [chipTrick, setChipTrick] = useState<ChipTrickData | null>(null);
  const [shuffling, setShuffling] = useState(false);

  // Helper: resolve display position for a seat index (respects rotation)
  const getSeatPos = (seatIndex: number) => {
    if (seatRotation == null) return SEAT_POSITIONS[seatIndex];
    const displayIdx = (seatIndex - seatRotation + 10) % 10;
    return SEAT_POSITIONS[displayIdx];
  };

  const getBetPos = (seatIndex: number) => {
    if (seatRotation == null) return BET_POSITIONS[seatIndex];
    const displayIdx = (seatIndex - seatRotation + 10) % 10;
    return BET_POSITIONS[displayIdx];
  };

  // Keep ref in sync
  useEffect(() => {
    gameStateRef.current = null; // reset on socket change
  }, [socket]);

  useEffect(() => {
    const onGameState = (state: GameState) => {
      gameStateRef.current = state;
      setGameState(state);
    };

    const onSound = (data: { sound: SoundType }) => {
      if (enableSound) {
        tableSoundManager.play(data.sound);
      }
    };

    const onPotUpdate = () => {
      const current = gameStateRef.current;
      if (!current) return;

      const bets: CollectingBet[] = current.players
        .filter(p => p.currentBet > 0)
        .map(p => ({ seatIndex: p.seatIndex, amount: p.currentBet }));

      if (bets.length > 0) {
        setCollectingBets(bets);
        setTimeout(() => setPotGrow(true), 400);
        setTimeout(() => {
          setCollectingBets(null);
          setPotGrow(false);
        }, 700);
      }
    };

    const onPlayerAction = (data: {
      seatIndex: number;
      action: string;
      amount: number;
      playerName: string;
      isAllIn: boolean;
    }) => {
      if (['bet', 'call', 'raise', 'all_in'].includes(data.action) && data.amount > 0) {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const seatPos = getSeatPos(data.seatIndex);
        const betPos = getBetPos(data.seatIndex);
        const startX = ((seatPos.x - betPos.x) / 100) * rect.width;
        const startY = ((seatPos.y - betPos.y) / 100) * rect.height;

        const anim: BetChipAnimation = {
          id: animId++,
          startX,
          startY,
          seatIndex: data.seatIndex,
          amount: data.amount,
        };

        setBetChipAnimations(prev => [...prev, anim]);
        setTimeout(() => {
          setBetChipAnimations(prev => prev.filter(a => a.id !== anim.id));
        }, 550);
      }
    };

    const startDealAnimations = (data: {
      dealerSeatIndex: number;
      seatIndices: number[];
    }) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const dealerPos = getSeatPos(data.dealerSeatIndex);

      const current = gameStateRef.current;
      const isPLO = current?.config?.gameType === 'PLO';
      const rounds = isPLO ? 4 : 2;
      for (let round = 0; round < rounds; round++) {
        for (let i = 0; i < data.seatIndices.length; i++) {
          const seatIndex = data.seatIndices[i];
          const seatPos = getSeatPos(seatIndex);
          const startX = ((dealerPos.x - seatPos.x) / 100) * rect.width;
          const startY = ((dealerPos.y - seatPos.y) / 100) * rect.height;

          const cardIndex = round * data.seatIndices.length + i;
          const delay = cardIndex * 120;

          setTimeout(() => {
            const anim: DealCardAnimation = {
              id: animId++,
              seatIndex,
              startX,
              startY,
            };
            setDealCardAnimations(prev => [...prev, anim]);
            setTimeout(() => {
              setDealCardAnimations(prev => prev.filter(a => a.id !== anim.id));
            }, 400);
          }, delay);
        }
      }
    };

    const onCardsDealt = (data: {
      dealerSeatIndex: number;
      seatIndices: number[];
    }) => {
      // Show shuffle animation first, then deal cards after it finishes
      setShuffling(true);
      setTimeout(() => {
        setShuffling(false);
        startDealAnimations(data);
      }, SHUFFLE_DURATION_MS);
    };

    const onPotAward = (data: {
      awards: PotAward[];
      potIndex: number;
      isLastPot: boolean;
      totalPots: number;
      winningCards?: CardString[];
    }) => {
      const seats = [...new Set(data.awards.map(a => a.winnerSeatIndex))];
      setWinnerSeats(prev => [...new Set([...prev, ...seats])]);
      setPotAwards(data.awards);
      setAwardingPotIndex(data.potIndex);
      if (data.winningCards) {
        setWinningCards(data.winningCards);
      }

      setTimeout(() => {
        setPotAwards(undefined);
        setAwardingPotIndex(null);
        // Winner glow stays until onHandResult clears it
      }, 1500);
    };

    const onPlayerTimer = (data: { seatIndex: number; secondsRemaining: number }) => {
      setTimerData(data);
    };

    const onSecondBoardDealt = (data: { cards: CardString[] }) => {
      // Delay second board display so players can see board 1 first
      setTimeout(() => {
        const current = gameStateRef.current;
        if (current) {
          const updated = { ...current, secondBoard: data.cards };
          gameStateRef.current = updated;
          setGameState(updated);
        }
      }, 1500);
    };

    const onAllinShowdown = (data: { entries: { seatIndex: number; cards: CardString[] }[] }) => {
      const current = gameStateRef.current;
      if (current) {
        const updated = {
          ...current,
          players: current.players.map(p => {
            const entry = data.entries.find(e => e.seatIndex === p.seatIndex);
            return entry ? { ...p, holeCards: entry.cards } : p;
          }),
        };
        gameStateRef.current = updated;
        setGameState(updated);
      }
    };

    const onShowdown = (data: { reveals: { seatIndex: number; cards: CardString[]; handName: string; handDescription: string; action: 'show' | 'muck' }[] }) => {
      const current = gameStateRef.current;
      if (!current) return;

      // If cards are already visible (all-in showdown), skip sequential reveal
      const alreadyRevealed = current.players.some(p => p.holeCards && p.holeCards.length > 0);
      if (alreadyRevealed) return;

      data.reveals.forEach((entry, i) => {
        setTimeout(() => {
          const latest = gameStateRef.current;
          if (!latest) return;

          if (entry.action === 'show') {
            const updated = {
              ...latest,
              players: latest.players.map(p =>
                p.seatIndex === entry.seatIndex
                  ? { ...p, holeCards: entry.cards }
                  : p
              ),
            };
            gameStateRef.current = updated;
            setGameState(updated);
          } else {
            // Muck: remove cards (triggers fold exit animation via AnimatePresence)
            const updated = {
              ...latest,
              players: latest.players.map(p =>
                p.seatIndex === entry.seatIndex
                  ? { ...p, hasCards: false, holeCards: [] }
                  : p
              ),
            };
            gameStateRef.current = updated;
            setGameState(updated);
          }
        }, i * DELAY_SHOWDOWN_REVEAL_INTERVAL_MS);
      });
    };

    const onEquityUpdate = (data: { equities: Record<number, number> }) => {
      setEquities(data.equities);
    };

    const onStreetDeal = (data: { street: string; cards: CardString[]; dramatic?: boolean }) => {
      if (data.dramatic) {
        setDramaticRiver(true);
      }
    };

    const onBadBeat = (data: BadBeatData) => {
      setBadBeat(data);
      setTimeout(() => setBadBeat(null), 5000);
    };

    const onChipTrick = (data: ChipTrickData) => {
      setChipTrick(data);
      setTimeout(() => setChipTrick(null), CHIP_TRICK_DURATION_MS);
    };

    const onHandResult = () => {
      setEquities(null);
      setDramaticRiver(false);
      // Keep winner glow visible for 2s after hand result so players can see who won
      setTimeout(() => {
        setWinnerSeats([]);
        setWinningCards([]);
      }, 2000);
    };

    socket.on(S2C_TABLE.GAME_STATE, onGameState);
    socket.on(S2C_TABLE.SOUND, onSound);
    socket.on(S2C_TABLE.POT_UPDATE, onPotUpdate);
    socket.on(S2C_TABLE.PLAYER_ACTION, onPlayerAction);
    socket.on(S2C_TABLE.CARDS_DEALT, onCardsDealt);
    socket.on(S2C_TABLE.POT_AWARD, onPotAward);
    socket.on(S2C_TABLE.PLAYER_TIMER, onPlayerTimer);
    socket.on(S2C_TABLE.SECOND_BOARD_DEALT, onSecondBoardDealt);
    socket.on(S2C_TABLE.ALLIN_SHOWDOWN, onAllinShowdown);
    socket.on(S2C_TABLE.SHOWDOWN, onShowdown);
    socket.on(S2C_TABLE.EQUITY_UPDATE, onEquityUpdate);
    socket.on(S2C_TABLE.STREET_DEAL, onStreetDeal);
    socket.on(S2C_TABLE.BAD_BEAT, onBadBeat);
    socket.on(S2C_TABLE.CHIP_TRICK, onChipTrick);
    socket.on(S2C_TABLE.HAND_RESULT, onHandResult);

    return () => {
      socket.off?.(S2C_TABLE.GAME_STATE, onGameState);
      socket.off?.(S2C_TABLE.SOUND, onSound);
      socket.off?.(S2C_TABLE.POT_UPDATE, onPotUpdate);
      socket.off?.(S2C_TABLE.PLAYER_ACTION, onPlayerAction);
      socket.off?.(S2C_TABLE.CARDS_DEALT, onCardsDealt);
      socket.off?.(S2C_TABLE.POT_AWARD, onPotAward);
      socket.off?.(S2C_TABLE.PLAYER_TIMER, onPlayerTimer);
      socket.off?.(S2C_TABLE.SECOND_BOARD_DEALT, onSecondBoardDealt);
      socket.off?.(S2C_TABLE.ALLIN_SHOWDOWN, onAllinShowdown);
      socket.off?.(S2C_TABLE.SHOWDOWN, onShowdown);
      socket.off?.(S2C_TABLE.EQUITY_UPDATE, onEquityUpdate);
      socket.off?.(S2C_TABLE.STREET_DEAL, onStreetDeal);
      socket.off?.(S2C_TABLE.BAD_BEAT, onBadBeat);
      socket.off?.(S2C_TABLE.CHIP_TRICK, onChipTrick);
      socket.off?.(S2C_TABLE.HAND_RESULT, onHandResult);
    };
  }, [socket, enableSound, seatRotation]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    potAwards,
    winnerSeats,
    winningCards,
    awardingPotIndex,
    timerData,
    collectingBets,
    potGrow,
    betChipAnimations,
    dealCardAnimations,
    equities,
    dramaticRiver,
    badBeat,
    chipTrick,
    shuffling,
  };
}
