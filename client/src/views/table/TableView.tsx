import { useEffect, useRef, useState, useCallback } from 'react';
import { S2C_TABLE } from '@poker/shared';
import type { GameState, SoundType } from '@poker/shared';
import { createTableSocket } from '../../socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { PokerTable, SEAT_POSITIONS, BET_POSITIONS } from './PokerTable.js';
import type { BetChipAnimation, DealCardAnimation } from './PokerTable.js';
import { tableSoundManager } from '../../audio/SoundManager.js';
import { SoundToggle } from '../../components/SoundToggle.js';

interface PotAward {
  potIndex: number;
  amount: number;
  winnerSeatIndex: number;
  winnerName: string;
}

interface CollectingBet {
  seatIndex: number;
  amount: number;
}

let animId = 0;

export function TableView() {
  const socketRef = useRef(createTableSocket());
  const { gameState, setGameState } = useGameStore();
  const gameStateRef = useRef<GameState | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(tableSoundManager.enabled);
  const [potAwards, setPotAwards] = useState<PotAward[] | undefined>(undefined);
  const [winnerSeats, setWinnerSeats] = useState<number[]>([]);
  const [timerData, setTimerData] = useState<{ seatIndex: number; secondsRemaining: number } | null>(null);
  const [collectingBets, setCollectingBets] = useState<CollectingBet[] | null>(null);
  const [potGrow, setPotGrow] = useState(false);
  const [betChipAnimations, setBetChipAnimations] = useState<BetChipAnimation[]>([]);
  const [dealCardAnimations, setDealCardAnimations] = useState<DealCardAnimation[]>([]);

  // Keep ref in sync with latest gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const toggleSound = useCallback(() => {
    const next = !tableSoundManager.enabled;
    tableSoundManager.setEnabled(next);
    setSoundEnabled(next);
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    socket.connect();

    socket.on(S2C_TABLE.GAME_STATE, (state: GameState) => {
      setGameState(state);
    });

    socket.on(S2C_TABLE.SOUND, (data: { sound: SoundType }) => {
      tableSoundManager.play(data.sound);
    });

    socket.on(S2C_TABLE.POT_UPDATE, () => {
      // Snapshot current bets before GAME_STATE clears them
      const current = gameStateRef.current;
      if (!current) return;

      const bets: CollectingBet[] = current.players
        .filter(p => p.currentBet > 0)
        .map(p => ({ seatIndex: p.seatIndex, amount: p.currentBet }));

      if (bets.length > 0) {
        setCollectingBets(bets);
        // Trigger pot-grow after chips arrive
        setTimeout(() => setPotGrow(true), 400);
        // Clear collecting animation
        setTimeout(() => {
          setCollectingBets(null);
          setPotGrow(false);
        }, 700);
      }
    });

    socket.on(S2C_TABLE.PLAYER_ACTION, (data: {
      seatIndex: number;
      action: string;
      amount: number;
      playerName: string;
      isAllIn: boolean;
    }) => {
      // Animate bet chip flying from player to bet position
      if (['bet', 'call', 'raise', 'all_in'].includes(data.action) && data.amount > 0) {
        const container = tableContainerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const seatPos = SEAT_POSITIONS[data.seatIndex];
        const betPos = BET_POSITIONS[data.seatIndex];
        // Calculate pixel offset from bet position to seat position
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

        // Clear after animation completes
        setTimeout(() => {
          setBetChipAnimations(prev => prev.filter(a => a.id !== anim.id));
        }, 550);
      }
    });

    socket.on(S2C_TABLE.CARDS_DEALT, (data: {
      dealerSeatIndex: number;
      seatIndices: number[];
    }) => {
      const container = tableContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const dealerPos = SEAT_POSITIONS[data.dealerSeatIndex];

      // Create staggered deal animations: 2 rounds (like real dealing)
      const anims: DealCardAnimation[] = [];
      const rounds = 2;
      for (let round = 0; round < rounds; round++) {
        for (let i = 0; i < data.seatIndices.length; i++) {
          const seatIndex = data.seatIndices[i];
          const seatPos = SEAT_POSITIONS[seatIndex];
          // Pixel offset from seat to dealer (card starts at dealer, ends at seat)
          const startX = ((dealerPos.x - seatPos.x) / 100) * rect.width;
          const startY = ((dealerPos.y - seatPos.y) / 100) * rect.height;

          const cardIndex = round * data.seatIndices.length + i;
          const delay = cardIndex * 120; // 120ms stagger per card

          // Delay adding each animation
          setTimeout(() => {
            const anim: DealCardAnimation = {
              id: animId++,
              seatIndex,
              startX,
              startY,
            };
            setDealCardAnimations(prev => [...prev, anim]);

            // Remove this card after its animation completes
            setTimeout(() => {
              setDealCardAnimations(prev => prev.filter(a => a.id !== anim.id));
            }, 400);
          }, delay);
        }
      }
    });

    socket.on(S2C_TABLE.POT_AWARD, (data: { awards: PotAward[] }) => {
      // Set winner seats for glow animation
      const seats = [...new Set(data.awards.map(a => a.winnerSeatIndex))];
      setWinnerSeats(seats);
      setPotAwards(data.awards);

      // Clear after animation completes
      setTimeout(() => {
        setPotAwards(undefined);
        setWinnerSeats([]);
      }, 2000);
    });

    socket.on(S2C_TABLE.PLAYER_TIMER, (data: { seatIndex: number; secondsRemaining: number }) => {
      setTimerData(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [setGameState]);

  return (
    <div
      ref={tableContainerRef}
      className="w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 50% 80%, #1A1208, #12100C, #0A0A0F, #050508)' }}
    >
      <SoundToggle
        enabled={soundEnabled}
        onToggle={toggleSound}
        className="fixed top-4 right-4 z-50"
      />
      {gameState ? (
        <PokerTable
          gameState={gameState}
          potAwards={potAwards}
          winnerSeats={winnerSeats}
          timerData={timerData}
          collectingBets={collectingBets}
          potGrow={potGrow}
          betChipAnimations={betChipAnimations}
          dealCardAnimations={dealCardAnimations}
        />
      ) : (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22 }}>Connecting...</div>
      )}
    </div>
  );
}
