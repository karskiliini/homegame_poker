import type { Socket } from 'socket.io-client';
import { C2S_TABLE, AVATAR_BACKGROUNDS } from '@poker/shared';
import type { TableInfo, AvatarId } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';

interface TableLobbyTVProps {
  socket: Socket;
  onSelectTable: (tableId: string) => void;
}

export function TableLobbyTV({ socket, onSelectTable }: TableLobbyTVProps) {
  const { tables } = useGameStore();

  return (
    <div
      className="w-screen h-screen flex flex-col p-8"
      style={{ background: 'radial-gradient(ellipse at 50% 80%, #1A1208, #12100C, #0A0A0F, #050508)' }}
    >
      <h1
        className="text-center mb-8 font-bold"
        style={{ color: 'var(--ftp-red)', fontSize: 48, letterSpacing: 2 }}
      >
        POKER NIGHT
      </h1>

      {tables.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 28 }}>
            No tables running
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-4">
          {tables.map(table => {
            const phaseLabel = table.phase === 'hand_in_progress' ? 'Playing' : 'Waiting';
            const phaseColor = table.phase === 'hand_in_progress' ? '#4ADE80' : '#FBBF24';

            return (
              <button
                key={table.tableId}
                onClick={() => onSelectTable(table.tableId)}
                className="w-full flex items-center justify-between px-8 py-6 rounded-xl"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
              >
                <div className="text-left">
                  <div className="font-bold" style={{ fontSize: 28 }}>{table.name}</div>
                  <div style={{ color: 'var(--ftp-text-secondary)', fontSize: 20 }}>
                    {table.stakeLevel.gameType} {table.stakeLevel.label}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {/* Player avatars */}
                  <div className="flex -space-x-2">
                    {table.players.slice(0, 5).map((p, i) => {
                      const [bg1, bg2] = AVATAR_BACKGROUNDS[p.avatarId as AvatarId] || ['#333', '#444'];
                      return (
                        <div
                          key={i}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${bg1}, ${bg2})`,
                            border: '2px solid #0A0A0F',
                          }}
                        />
                      );
                    })}
                    {table.players.length > 5 && (
                      <div style={{ color: 'var(--ftp-text-muted)', fontSize: 16, marginLeft: 8 }}>
                        +{table.players.length - 5}
                      </div>
                    )}
                  </div>
                  <div className="font-mono tabular-nums" style={{ fontSize: 24, color: 'var(--ftp-text-secondary)' }}>
                    {table.playerCount}/{table.maxPlayers}
                  </div>
                  <div style={{ color: phaseColor, fontSize: 18, fontWeight: 600 }}>
                    {phaseLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
