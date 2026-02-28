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
      // Confirm sit down
      const amount = buyInAmount || maxBuyIn;
      socket.emit(C2S_LOBBY.JOIN_TABLE, {
        tableId,
        name: playerName,
        buyIn: amount,
        avatarId: playerAvatar,
      });
      setJoiningTableId(null);
    } else {
      // Show buy-in input
      setJoiningTableId(tableId);
      setBuyInAmount(maxBuyIn);
    }
  };

  // Group tables by stake level
  const groupedTables = STAKE_LEVELS.map(level => ({
    level,
    tables: tables.filter(t => t.stakeLevel.id === level.id),
  })).filter(g => g.tables.length > 0);

  return (
    <div
      className="min-h-screen flex flex-col p-4"
      style={{ background: 'linear-gradient(180deg, #0F1E33, #162D50)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-bold" style={{ color: '#FFFFFF', fontSize: 20 }}>
            Tables
          </h1>
          <p style={{ color: 'var(--ftp-text-secondary)', fontSize: 12 }}>
            Playing as {playerName}
          </p>
        </div>
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
      </div>

      {/* Table list */}
      {tables.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div style={{ color: 'var(--ftp-text-muted)', fontSize: 16 }}>
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
        <div className="space-y-2">
          {groupedTables.map(({ level, tables: levelTables }) => (
            <div key={level.id}>
              <div className="px-2 py-1 mb-1" style={{ color: 'var(--ftp-text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {level.gameType} {level.label} (Max {level.maxBuyIn})
              </div>
              {levelTables.map(table => (
                <TableRow
                  key={table.tableId}
                  table={table}
                  isExpanded={expandedTableId === table.tableId}
                  isJoining={joiningTableId === table.tableId}
                  buyInAmount={buyInAmount}
                  onToggle={() => setExpandedTableId(expandedTableId === table.tableId ? null : table.tableId)}
                  onSitDown={() => handleSitDown(table.tableId, table.stakeLevel.maxBuyIn)}
                  onBuyInChange={setBuyInAmount}
                />
              ))}
            </div>
          ))}
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
              background: '#1A2744',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <h2 className="font-bold" style={{ color: '#FFFFFF', fontSize: 18 }}>
                Create Table
              </h2>
              <p style={{ color: 'var(--ftp-text-secondary)', fontSize: 12 }}>
                Choose blind level
              </p>
            </div>
            <div className="p-2">
              {STAKE_LEVELS.map(level => (
                <button
                  key={level.id}
                  onClick={() => handleCreateTable(level)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="font-semibold">{level.gameType} {level.label}</span>
                  <span style={{ color: 'var(--ftp-text-muted)', fontSize: 12 }}>
                    Max buy-in: {level.maxBuyIn}
                  </span>
                </button>
              ))}
            </div>
            <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-full py-2 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'var(--ftp-text-secondary)',
                  border: 'none',
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
  isExpanded,
  isJoining,
  buyInAmount,
  onToggle,
  onSitDown,
  onBuyInChange,
}: {
  table: TableInfo;
  isExpanded: boolean;
  isJoining: boolean;
  buyInAmount: number;
  onToggle: () => void;
  onSitDown: () => void;
  onBuyInChange: (amount: number) => void;
}) {
  const phaseLabel = table.phase === 'hand_in_progress' ? 'Playing' : table.phase === 'waiting_for_players' ? 'Waiting' : 'Paused';
  const phaseColor = table.phase === 'hand_in_progress' ? '#4ADE80' : '#FBBF24';

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.25)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 4,
        overflow: 'hidden',
      }}
    >
      {/* Table row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
      >
        <div className="flex items-center gap-3">
          <div className="font-semibold" style={{ fontSize: 14 }}>
            {table.name}
          </div>
          <div style={{ color: 'var(--ftp-text-muted)', fontSize: 12 }}>
            {table.stakeLevel.label}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="font-mono tabular-nums"
            style={{ color: 'var(--ftp-text-secondary)', fontSize: 13 }}
          >
            {table.playerCount}/{table.maxPlayers}
          </span>
          <span style={{ color: phaseColor, fontSize: 11, fontWeight: 600 }}>
            {phaseLabel}
          </span>
        </div>
      </button>

      {/* Expanded: players + sit down */}
      {isExpanded && (
        <div className="px-4 pb-3">
          {table.players.length > 0 ? (
            <div className="space-y-1 mb-3">
              {table.players.map((p, i) => {
                const [bg1, bg2] = AVATAR_BACKGROUNDS[p.avatarId as AvatarId] || ['#333', '#444'];
                return (
                  <div key={i} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${bg1}, ${bg2})`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: '#FFFFFF', fontSize: 13 }}>{p.name}</span>
                    <span className="ml-auto font-mono tabular-nums" style={{ color: 'var(--ftp-text-muted)', fontSize: 12 }}>
                      {p.stack}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mb-3" style={{ color: 'var(--ftp-text-muted)', fontSize: 12 }}>
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
                  background: 'rgba(0,0,0,0.4)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.15)',
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
                    ? 'var(--ftp-bg-tertiary)'
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
