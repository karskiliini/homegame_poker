import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';

interface LoginScreenProps {
  socket: Socket;
}

export function LoginScreen({ socket }: LoginScreenProps) {
  const { config, previousName, previousBuyIn, setScreen, setPlayerName } = useGameStore();
  const [name, setName] = useState(previousName || '');
  const [buyIn, setBuyIn] = useState(previousBuyIn || config?.maxBuyIn || 200);

  const maxBuyIn = config?.maxBuyIn || 200;

  const handleJoin = () => {
    if (!name.trim()) return;
    if (buyIn <= 0 || buyIn > maxBuyIn) return;

    socket.emit(C2S.JOIN, { name: name.trim(), buyIn });
    setPlayerName(name.trim());
    setScreen('lobby');
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-800/80 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Poker Night
        </h1>
        <p className="text-gray-400 text-center text-sm mb-6">
          {config ? `${config.gameType} - ${config.smallBlind}/${config.bigBlind}` : 'Connecting...'}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-500 border border-gray-600 focus:border-yellow-500 focus:outline-none text-lg"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Buy-in (max {maxBuyIn})
            </label>
            <input
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              min={1}
              max={maxBuyIn}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-yellow-500 focus:outline-none text-lg"
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={!name.trim() || buyIn <= 0 || buyIn > maxBuyIn}
            className="w-full py-4 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors"
          >
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
}
