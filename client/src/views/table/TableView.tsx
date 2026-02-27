import { useEffect, useRef, useState, useCallback } from 'react';
import { S2C_TABLE } from '@poker/shared';
import type { GameState, SoundType } from '@poker/shared';
import { createTableSocket } from '../../socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { PokerTable } from './PokerTable.js';
import { tableSoundManager } from '../../audio/SoundManager.js';
import { SoundToggle } from '../../components/SoundToggle.js';

interface PotAward {
  potIndex: number;
  amount: number;
  winnerSeatIndex: number;
  winnerName: string;
}

export function TableView() {
  const socketRef = useRef(createTableSocket());
  const { gameState, setGameState } = useGameStore();
  const [soundEnabled, setSoundEnabled] = useState(tableSoundManager.enabled);
  const [potAwards, setPotAwards] = useState<PotAward[] | undefined>(undefined);
  const [winnerSeats, setWinnerSeats] = useState<number[]>([]);
  const [timerData, setTimerData] = useState<{ seatIndex: number; secondsRemaining: number } | null>(null);

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
      className="w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ background: '#0F1520' }}
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
        />
      ) : (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22 }}>Connecting...</div>
      )}
    </div>
  );
}
