import { useEffect, useRef } from 'react';
import { S2C_TABLE } from '@poker/shared';
import type { GameState } from '@poker/shared';
import { createTableSocket } from '../../socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { PokerTable } from './PokerTable.js';

export function TableView() {
  const socketRef = useRef(createTableSocket());
  const { gameState, setGameState } = useGameStore();

  useEffect(() => {
    const socket = socketRef.current;
    socket.connect();

    socket.on(S2C_TABLE.GAME_STATE, (state: GameState) => {
      setGameState(state);
    });

    return () => {
      socket.disconnect();
    };
  }, [setGameState]);

  return (
    <div className="w-screen h-screen bg-[#0a0a1a] overflow-hidden flex items-center justify-center">
      {gameState ? (
        <PokerTable gameState={gameState} />
      ) : (
        <div className="text-white text-2xl">Connecting...</div>
      )}
    </div>
  );
}
