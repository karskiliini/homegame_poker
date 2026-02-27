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
    <div
      className="min-h-screen flex flex-col items-center p-4 pt-8"
      style={{ background: 'linear-gradient(180deg, #0F1E33, #162D50)' }}
    >
      <h1 className="font-bold mb-1" style={{ color: '#FFFFFF', fontSize: 22 }}>
        Lobby
      </h1>
      <p className="mb-6" style={{ color: 'var(--ftp-text-secondary)', fontSize: 13 }}>
        {config ? `${config.gameType} - ${config.smallBlind}/${config.bigBlind}` : ''}
      </p>

      {/* Players list */}
      <div className="w-full max-w-sm space-y-2 mb-6">
        {lobbyState?.players.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between px-4 py-3"
            style={{
              borderRadius: 8,
              background: p.isReady
                ? 'rgba(22, 163, 74, 0.15)'
                : 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${p.isReady ? 'rgba(22, 163, 74, 0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: p.isConnected
                    ? (p.isReady ? '#4ADE80' : '#FBBF24')
                    : '#EF4444',
                }}
              />
              <span className="font-semibold" style={{ color: '#FFFFFF', fontSize: 14 }}>
                {p.name}
              </span>
            </div>
            <div className="font-mono tabular-nums" style={{ color: 'var(--ftp-text-secondary)', fontSize: 13 }}>
              {p.stack}
            </div>
          </div>
        ))}
      </div>

      {/* Ready status */}
      <div className="mb-4" style={{ color: 'var(--ftp-text-secondary)', fontSize: 13 }}>
        {lobbyState
          ? `${lobbyState.readyCount}/${lobbyState.neededCount} ready`
          : 'Loading...'}
      </div>

      {/* Ready button */}
      <button
        onClick={handleReady}
        className="w-full max-w-sm"
        style={{
          padding: '16px 24px',
          borderRadius: 8,
          background: 'linear-gradient(180deg, #16A34A, #15803D)',
          color: 'white',
          fontWeight: 700,
          fontSize: 18,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 0 #14532D, 0 6px 12px rgba(0,0,0,0.3)',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Ready
      </button>
    </div>
  );
}
