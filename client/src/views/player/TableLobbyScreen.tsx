import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S_LOBBY, STAKE_LEVELS, AVATAR_BACKGROUNDS } from '@poker/shared';
import type { TableInfo, StakeLevel, AvatarId } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';

interface TableLobbyScreenProps {
  socket: Socket;
}

export function TableLobbyScreen({ socket }: TableLobbyScreenProps) {
  const { tables, playerName, playerAvatar } = useGameStore();
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [buyInAmount, setBuyInAmount] = useState<number>(0);
  const [joiningTableId, setJoiningTableId] = useState<string | null>(null);

  const handleCreateTable = (stakeLevel: StakeLevel) => {
    socket.emit(C2S_LOBBY.CREATE_TABLE, { stakeLevelId: stakeLevel.id });
    setShowCreateModal(false);
  };

  const handleSitDown = (tableId: string, maxBuyIn: number) => {
    if (joiningTableId === tableId) {
      const amount = buyInAmount || maxBuyIn;
      socket.emit(C2S_LOBBY.JOIN_TABLE, {
        tableId,
        name: playerName,
        buyIn: amount,
        avatarId: playerAvatar,
      });
      setJoiningTableId(null);
    } else {
      setJoiningTableId(tableId);
      setBuyInAmount(maxBuyIn);
    }
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
            const isExpanded = expandedTableId === table.tableId;
            const isEven = i % 2 === 0;

            return (
              <TableRow
                key={table.tableId}
                table={table}
                isEven={isEven}
                isExpanded={isExpanded}
                isJoining={joiningTableId === table.tableId}
                buyInAmount={buyInAmount}
                onToggle={() => setExpandedTableId(isExpanded ? null : table.tableId)}
                onSitDown={() => handleSitDown(table.tableId, table.stakeLevel.maxBuyIn)}
                onBuyInChange={setBuyInAmount}
              />
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

function TableRow({
  table,
  isEven,
  isExpanded,
  isJoining,
  buyInAmount,
  onToggle,
  onSitDown,
  onBuyInChange,
}: {
  table: TableInfo;
  isEven: boolean;
  isExpanded: boolean;
  isJoining: boolean;
  buyInAmount: number;
  onToggle: () => void;
  onSitDown: () => void;
  onBuyInChange: (amount: number) => void;
}) {
  return (
    <div
      style={{
        borderBottom: '1px solid var(--ftp-lobby-border)',
        overflow: 'hidden',
      }}
    >
      {/* Table row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center px-4 py-3"
        style={{
          background: isExpanded
            ? 'var(--ftp-lobby-row-selected)'
            : isEven
              ? 'var(--ftp-lobby-row-even)'
              : 'var(--ftp-lobby-row-odd)',
          border: 'none',
          borderLeft: isExpanded ? '4px solid var(--ftp-red)' : '4px solid transparent',
          color: 'var(--ftp-lobby-text)',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        <div style={{ flex: 3, textAlign: 'left', fontWeight: isExpanded ? 700 : 500 }}>
          {table.name}
        </div>
        <div className="font-mono" style={{ flex: 2, textAlign: 'center' }}>
          {table.stakeLevel.label}
        </div>
        <div className="font-mono tabular-nums" style={{ flex: 1, textAlign: 'center' }}>
          {table.playerCount}/{table.maxPlayers}
        </div>
      </button>

      {/* Expanded: players + sit down */}
      {isExpanded && (
        <div
          className="px-4 py-3"
          style={{ background: 'var(--ftp-lobby-row-selected)' }}
        >
          {/* Player list */}
          {table.players.length > 0 ? (
            <div className="mb-3" style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--ftp-lobby-border)' }}>
              {table.players.map((p, i) => {
                const playerEven = i % 2 === 0;
                const [bg1, bg2] = AVATAR_BACKGROUNDS[p.avatarId as AvatarId] || ['#333', '#444'];
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2"
                    style={{
                      background: playerEven ? 'var(--ftp-lobby-row-even)' : 'var(--ftp-lobby-row-odd)',
                      color: 'var(--ftp-lobby-text)',
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${bg1}, ${bg2})`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                    <span className="ml-auto font-mono tabular-nums" style={{ fontSize: 12, fontWeight: 600 }}>
                      {p.stack}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mb-3" style={{ color: 'rgba(26,26,46,0.5)', fontSize: 12 }}>
              No players yet
            </div>
          )}

          {/* Buy-in + Sit Down */}
          {isJoining ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={buyInAmount}
                onChange={(e) => onBuyInChange(Number(e.target.value))}
                min={1}
                max={table.stakeLevel.maxBuyIn}
                className="flex-1"
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: '#FFFFFF',
                  color: 'var(--ftp-lobby-text)',
                  border: '1px solid var(--ftp-lobby-border)',
                  fontSize: 14,
                  outline: 'none',
                }}
                autoFocus
              />
              <button
                onClick={onSitDown}
                disabled={buyInAmount <= 0 || buyInAmount > table.stakeLevel.maxBuyIn}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: buyInAmount <= 0 || buyInAmount > table.stakeLevel.maxBuyIn
                    ? '#CCC'
                    : 'linear-gradient(180deg, var(--ftp-red), var(--ftp-red-dark))',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 13,
                  border: 'none',
                  cursor: buyInAmount <= 0 || buyInAmount > table.stakeLevel.maxBuyIn ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                Sit Down
              </button>
            </div>
          ) : (
            <button
              onClick={onSitDown}
              className="w-full py-2 rounded-lg"
              style={{
                background: 'linear-gradient(180deg, var(--ftp-red), var(--ftp-red-dark))',
                color: 'white',
                fontWeight: 700,
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: 1,
                boxShadow: '0 2px 0 var(--ftp-red-dark)',
              }}
            >
              Sit Down
            </button>
          )}
        </div>
      )}
    </div>
  );
}
