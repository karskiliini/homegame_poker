import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S_LOBBY, STAKE_LEVELS } from '@poker/shared';
import type { StakeLevel } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';

interface TableLobbyScreenProps {
  socket: Socket;
}

export function TableLobbyScreen({ socket }: TableLobbyScreenProps) {
  const { tables, playerName, setWatchingTableId, setScreen } = useGameStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateTable = (stakeLevel: StakeLevel) => {
    socket.emit(C2S_LOBBY.CREATE_TABLE, { stakeLevelId: stakeLevel.id }, (response: { tableId: string }) => {
      setWatchingTableId(response.tableId);
      setScreen('watching');
    });
    setShowCreateModal(false);
  };

  const handleWatchTable = (tableId: string) => {
    setWatchingTableId(tableId);
    setScreen('watching');
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, var(--ftp-bg-lobby-dark), var(--ftp-bg-lobby))' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(0,0,0,0.3)',
          borderBottom: '1px solid var(--ftp-lobby-border)',
        }}
      >
        <div>
          <h1 className="font-bold" style={{ color: '#FFFFFF', fontSize: 20 }}>
            Tables
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            Playing as {playerName}
          </p>
        </div>
        {tables.length > 0 && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: 'linear-gradient(180deg, #16A34A, #15803D)',
              color: 'white',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 3px 0 #14532D, 0 4px 8px rgba(0,0,0,0.3)',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            + Create
          </button>
        )}
      </div>

      {/* Table list */}
      {tables.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>
            No tables running
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '14px 32px',
              borderRadius: 8,
              background: 'linear-gradient(180deg, #16A34A, #15803D)',
              color: 'white',
              fontWeight: 700,
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 0 #14532D, 0 6px 12px rgba(0,0,0,0.3)',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Create Table
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {/* Column headers */}
          <div
            className="flex px-4 py-2"
            style={{
              background: 'var(--ftp-lobby-header-bg)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 1,
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <div style={{ flex: 3 }}>Table</div>
            <div style={{ flex: 2, textAlign: 'center' }}>Stakes</div>
            <div style={{ flex: 1, textAlign: 'center' }}>Plrs</div>
          </div>

          {/* Table rows */}
          {tables.map((table, i) => {
            const isEven = i % 2 === 0;
            return (
              <button
                key={table.tableId}
                onClick={() => handleWatchTable(table.tableId)}
                className="w-full flex items-center px-4 py-3"
                style={{
                  background: isEven
                    ? 'var(--ftp-lobby-row-even)'
                    : 'var(--ftp-lobby-row-odd)',
                  border: 'none',
                  borderBottom: '1px solid var(--ftp-lobby-border)',
                  borderLeft: '4px solid transparent',
                  color: 'var(--ftp-lobby-text)',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <div style={{ flex: 3, textAlign: 'left', fontWeight: 500 }}>
                  {table.name}
                </div>
                <div className="font-mono" style={{ flex: 2, textAlign: 'center' }}>
                  {table.stakeLevel.label}
                </div>
                <div className="font-mono tabular-nums" style={{ flex: 1, textAlign: 'center' }}>
                  {table.playerCount}/{table.maxPlayers}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-sm"
            style={{
              background: 'var(--ftp-bg-lobby)',
              borderRadius: 12,
              border: '1px solid var(--ftp-lobby-border)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-4 py-3"
              style={{
                background: 'var(--ftp-lobby-header-bg)',
                borderBottom: '1px solid var(--ftp-lobby-border)',
              }}
            >
              <h2 className="font-bold" style={{ color: '#FFFFFF', fontSize: 18 }}>
                Create Table
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                Choose blind level
              </p>
            </div>
            <div>
              {STAKE_LEVELS.map((level, i) => {
                const isEven = i % 2 === 0;
                return (
                  <button
                    key={level.id}
                    onClick={() => handleCreateTable(level)}
                    className="w-full flex items-center justify-between px-4 py-3"
                    style={{
                      background: isEven ? 'var(--ftp-lobby-row-even)' : 'var(--ftp-lobby-row-odd)',
                      border: 'none',
                      color: 'var(--ftp-lobby-text)',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    <span className="font-semibold">{level.gameType} {level.label}</span>
                    <span style={{ color: '#666', fontSize: 12 }}>
                      Max: {level.maxBuyIn}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="p-3" style={{ background: 'var(--ftp-lobby-row-even)' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-full py-2 rounded-lg"
                style={{
                  background: 'rgba(0,0,0,0.15)',
                  color: 'var(--ftp-lobby-text)',
                  border: '1px solid var(--ftp-lobby-border)',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
