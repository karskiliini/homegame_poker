import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { AVATAR_BACKGROUNDS } from '@poker/shared';
import type { TableInfo, AvatarId } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';

interface TableLobbyTVProps {
  socket: Socket;
  onSelectTable: (tableId: string) => void;
}

export function TableLobbyTV({ socket, onSelectTable }: TableLobbyTVProps) {
  const { tables } = useGameStore();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const selectedTable = tables.find(t => t.tableId === selectedTableId) || null;

  return (
    <div
      className="w-screen h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, var(--ftp-bg-lobby-dark), var(--ftp-bg-lobby))' }}
    >
      {/* Header */}
      <div
        className="flex items-center px-8 py-4"
        style={{
          background: 'rgba(0,0,0,0.3)',
          borderBottom: '2px solid var(--ftp-lobby-border)',
        }}
      >
        <h1
          className="font-bold"
          style={{ color: 'var(--ftp-red)', fontSize: 36, letterSpacing: 2 }}
        >
          POKER NIGHT
        </h1>
        <span
          className="ml-4 font-mono"
          style={{ color: 'var(--ftp-text-secondary)', fontSize: 16 }}
        >
          {tables.length} table{tables.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Main content: two columns */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Table list (~65%) */}
        <div className="flex flex-col" style={{ width: '65%', borderRight: '2px solid var(--ftp-lobby-border)' }}>
          {/* Column headers */}
          <div
            className="flex px-4 py-3"
            style={{
              background: 'var(--ftp-lobby-header-bg)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 15,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            <div style={{ flex: 3 }}>Table</div>
            <div style={{ flex: 2 }}>Stakes</div>
            <div style={{ flex: 2 }}>Type</div>
            <div style={{ flex: 1, textAlign: 'center' }}>Plrs</div>
            <div style={{ flex: 2, textAlign: 'center' }}>Status</div>
          </div>

          {/* Table rows */}
          <div className="flex-1 overflow-auto">
            {tables.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 24 }}>
                  No tables running
                </div>
              </div>
            ) : (
              tables.map((table, i) => {
                const isSelected = selectedTableId === table.tableId;
                const isEven = i % 2 === 0;
                const phaseLabel = table.phase === 'hand_in_progress' ? 'Playing' : 'Waiting';
                const phaseColor = table.phase === 'hand_in_progress' ? '#2E7D32' : '#B8860B';

                return (
                  <button
                    key={table.tableId}
                    onClick={() => setSelectedTableId(table.tableId)}
                    className="w-full flex items-center px-4 py-3"
                    style={{
                      background: isSelected
                        ? 'var(--ftp-lobby-row-selected)'
                        : isEven
                          ? 'var(--ftp-lobby-row-even)'
                          : 'var(--ftp-lobby-row-odd)',
                      color: 'var(--ftp-lobby-text)',
                      border: 'none',
                      borderLeft: isSelected ? '4px solid var(--ftp-red)' : '4px solid transparent',
                      cursor: 'pointer',
                      fontSize: 18,
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ flex: 3, textAlign: 'left', fontWeight: isSelected ? 700 : 500 }}>
                      {table.name}
                    </div>
                    <div className="font-mono" style={{ flex: 2, textAlign: 'left' }}>
                      {table.stakeLevel.label}
                    </div>
                    <div style={{ flex: 2, textAlign: 'left' }}>
                      {table.stakeLevel.gameType}
                    </div>
                    <div className="font-mono tabular-nums" style={{ flex: 1, textAlign: 'center' }}>
                      {table.playerCount}/{table.maxPlayers}
                    </div>
                    <div style={{ flex: 2, textAlign: 'center', color: phaseColor, fontWeight: 600 }}>
                      {phaseLabel}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail panel (~35%) */}
        <div
          className="flex flex-col"
          style={{
            width: '35%',
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          {selectedTable ? (
            <div className="flex flex-col h-full">
              {/* Detail header */}
              <div
                className="px-6 py-4"
                style={{
                  background: 'var(--ftp-lobby-header-bg)',
                  borderBottom: '1px solid var(--ftp-lobby-border)',
                }}
              >
                <h2 className="font-bold" style={{ color: '#FFFFFF', fontSize: 22 }}>
                  {selectedTable.name}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
                  {selectedTable.stakeLevel.gameType} {selectedTable.stakeLevel.label}
                </p>
              </div>

              {/* Player list */}
              <div className="flex-1 overflow-auto">
                {/* Player table header */}
                <div
                  className="flex px-6 py-2"
                  style={{
                    background: 'rgba(30,58,95,0.6)',
                    color: 'rgba(255,255,255,0.8)',
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  <div style={{ flex: 3 }}>Player</div>
                  <div className="font-mono" style={{ flex: 1, textAlign: 'right' }}>Chips</div>
                </div>

                {selectedTable.players.length === 0 ? (
                  <div className="px-6 py-8 text-center" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>
                    No players yet
                  </div>
                ) : (
                  selectedTable.players.map((p, i) => {
                    const isEven = i % 2 === 0;
                    const [bg1, bg2] = AVATAR_BACKGROUNDS[p.avatarId as AvatarId] || ['#333', '#444'];
                    return (
                      <div
                        key={i}
                        className="flex items-center px-6 py-2"
                        style={{
                          background: isEven ? 'var(--ftp-lobby-row-even)' : 'var(--ftp-lobby-row-odd)',
                          color: 'var(--ftp-lobby-text)',
                          fontSize: 16,
                        }}
                      >
                        <div className="flex items-center gap-3" style={{ flex: 3 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${bg1}, ${bg2})`,
                              flexShrink: 0,
                            }}
                          />
                          <span className="font-semibold">{p.name}</span>
                        </div>
                        <div className="font-mono tabular-nums" style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>
                          {p.stack}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* View Table button */}
              <div className="p-6">
                <button
                  onClick={() => onSelectTable(selectedTable.tableId)}
                  className="w-full py-4 font-bold"
                  style={{
                    background: 'linear-gradient(180deg, #2563EB, #1D4ED8)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 18,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    boxShadow: '0 4px 0 #1E3A8A, 0 6px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  View Table
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20, textAlign: 'center' }}>
                Select a table
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
