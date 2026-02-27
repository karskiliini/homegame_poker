import type { Socket } from 'socket.io-client';
import { C2S } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';

interface LobbyScreenProps {
  socket: Socket;
}

export function LobbyScreen({ socket }: LobbyScreenProps) {
  const { lobbyState, config } = useGameStore();

  const handleReady = () => {
    socket.emit(C2S.READY);
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center p-4 pt-8">
      <h1 className="text-2xl font-bold text-white mb-1">Lobby</h1>
      <p className="text-gray-400 text-sm mb-6">
        {config ? `${config.gameType} - ${config.smallBlind}/${config.bigBlind}` : ''}
      </p>

      {/* Players */}
      <div className="w-full max-w-sm space-y-2 mb-6">
        {lobbyState?.players.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between px-4 py-3 rounded-lg ${
              p.isReady ? 'bg-green-900/40 border border-green-600/30' : 'bg-gray-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                p.isConnected ? (p.isReady ? 'bg-green-400' : 'bg-yellow-400') : 'bg-red-400'
              }`} />
              <span className="text-white font-medium">{p.name}</span>
            </div>
            <div className="text-gray-400 text-sm font-mono">{p.stack}</div>
          </div>
        ))}
      </div>

      {/* Ready status */}
      <div className="text-gray-400 text-sm mb-4">
        {lobbyState
          ? `${lobbyState.readyCount}/${lobbyState.neededCount} ready`
          : 'Loading...'}
      </div>

      {/* Ready button */}
      <button
        onClick={handleReady}
        className="w-full max-w-sm py-4 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-xl transition-colors"
      >
        Ready
      </button>
    </div>
  );
}
