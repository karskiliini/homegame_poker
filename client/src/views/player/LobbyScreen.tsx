import { useGameStore } from '../../hooks/useGameStore.js';

export function LobbyScreen() {
  const { lobbyState, config } = useGameStore();

  const playerCount = lobbyState?.players.length ?? 0;
  const minPlayers = config?.minPlayers ?? 2;

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
              background: 'rgba(22, 163, 74, 0.15)',
              border: '1px solid rgba(22, 163, 74, 0.3)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: p.isConnected ? '#4ADE80' : '#EF4444',
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

      {/* Status */}
      <div className="mb-4" style={{ color: 'var(--ftp-text-secondary)', fontSize: 13 }}>
        {playerCount < minPlayers
          ? `Waiting for players... (${playerCount}/${minPlayers})`
          : 'Starting...'}
      </div>
    </div>
  );
}
