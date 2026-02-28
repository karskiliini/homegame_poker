import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S_LOBBY, STAKE_LEVELS } from '@poker/shared';
import type { StakeLevel } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';
import { VersionInfo } from '../../components/VersionInfo.js';
import { useT } from '../../hooks/useT.js';
import { LanguageToggle } from '../../components/LanguageToggle.js';
import { ThemeToggle } from '../../components/ThemeToggle.js';

interface TableLobbyScreenProps {
  socket: Socket;
}

export function TableLobbyScreen({ socket }: TableLobbyScreenProps) {
  const { tables, playerName, isConnected, setWatchingTableId, setScreen, accountBalance } = useGameStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(1000);
  const [creating, setCreating] = useState(false);
  const t = useT();

  const handleCreateTable = (stakeLevel: StakeLevel) => {
    if (!isConnected) return;
    setCreating(true);
    setShowCreateModal(false);
    socket.emit(C2S_LOBBY.CREATE_TABLE, { stakeLevelId: stakeLevel.id }, (response: { tableId: string }) => {
      setCreating(false);
      setWatchingTableId(response.tableId);
      setScreen('watching');
    });
    // Timeout: if server doesn't respond within 5s, reset state
    setTimeout(() => setCreating(false), 5000);
  };

  const handleWatchTable = (tableId: string) => {
    setWatchingTableId(tableId);
    setScreen('watching');
  };

  const handleDeposit = () => {
    if (depositAmount <= 0) return;
    socket.emit(C2S_LOBBY.DEPOSIT, { amount: depositAmount });
    setShowDepositModal(false);
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
          <div className="flex items-center gap-2">
            <h1 className="font-bold" style={{ color: '#FFFFFF', fontSize: 20 }}>
              {t('table_lobby_title')}
            </h1>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isConnected ? '#22C55E' : '#EF4444',
                boxShadow: isConnected ? '0 0 6px #22C55E' : '0 0 6px #EF4444',
              }}
            />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            {isConnected
              ? `${t('table_lobby_playing_as')} ${playerName}`
              : t('table_lobby_no_connection')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Balance display */}
          <div
            className="flex items-center gap-2"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ color: 'var(--ftp-gold)', fontSize: 12, fontWeight: 600 }}>
              {t('balance_label')}
            </span>
            <span className="font-mono" style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>
              {accountBalance.toLocaleString()}
            </span>
            <button
              onClick={() => setShowDepositModal(true)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: 'linear-gradient(180deg, #16A34A, #15803D)',
                color: 'white',
                fontWeight: 700,
                fontSize: 11,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              +
            </button>
          </div>
          <ThemeToggle />
          <LanguageToggle />
          {tables.length > 0 && (
            <button
              onClick={() => isConnected && !creating && setShowCreateModal(true)}
              disabled={!isConnected || creating}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: !isConnected || creating
                  ? '#555'
                  : 'linear-gradient(180deg, #16A34A, #15803D)',
                color: 'white',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: !isConnected || creating ? 'not-allowed' : 'pointer',
                boxShadow: !isConnected || creating
                  ? 'none'
                  : '0 3px 0 #14532D, 0 4px 8px rgba(0,0,0,0.3)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                opacity: !isConnected || creating ? 0.5 : 1,
              }}
            >
              {creating ? t('table_lobby_creating') : t('table_lobby_create')}
            </button>
          )}
        </div>
      </div>

      {/* Table list */}
      {tables.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>
            {isConnected ? t('table_lobby_no_tables') : t('table_lobby_connecting')}
          </div>
          {!isConnected && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', maxWidth: 260 }}>
              {t('table_lobby_server_unreachable')}
            </div>
          )}
          <button
            onClick={() => isConnected && !creating && setShowCreateModal(true)}
            disabled={!isConnected || creating}
            style={{
              padding: '14px 32px',
              borderRadius: 8,
              background: !isConnected || creating
                ? '#555'
                : 'linear-gradient(180deg, #16A34A, #15803D)',
              color: 'white',
              fontWeight: 700,
              fontSize: 16,
              border: 'none',
              cursor: !isConnected || creating ? 'not-allowed' : 'pointer',
              boxShadow: !isConnected || creating
                ? 'none'
                : '0 4px 0 #14532D, 0 6px 12px rgba(0,0,0,0.3)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              opacity: !isConnected || creating ? 0.5 : 1,
            }}
          >
            {creating ? t('table_lobby_creating') : t('table_lobby_create_table')}
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
            <div style={{ flex: 3 }}>{t('table_lobby_col_table')}</div>
            <div style={{ flex: 2, textAlign: 'center' }}>{t('table_lobby_col_stakes')}</div>
            <div style={{ flex: 1, textAlign: 'center' }}>{t('table_lobby_col_players')}</div>
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
                {t('table_lobby_create_table')}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                {t('table_lobby_choose_blind')}
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
                      {t('table_lobby_max')} {level.maxBuyIn}
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
                {t('table_lobby_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowDepositModal(false)}
        >
          <div
            className="w-full max-w-xs p-6"
            style={{
              background: 'var(--ftp-bg-lobby)',
              borderRadius: 12,
              border: '1px solid var(--ftp-lobby-border)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold mb-1" style={{ color: '#FFFFFF', fontSize: 18 }}>
              {t('balance_deposit_title')}
            </h2>
            <p className="mb-4" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              {t('balance_label')}: <span className="font-mono font-bold">{accountBalance.toLocaleString()}</span>
            </p>
            <label className="block mb-1" style={{ color: 'var(--ftp-text-muted)', fontSize: 12, fontWeight: 600 }}>
              {t('balance_deposit_amount')}
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handleDeposit()}
              min={1}
              className="w-full mb-4"
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.4)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: 16,
                outline: 'none',
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 py-3 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'var(--ftp-text-secondary)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {t('balance_deposit_cancel')}
              </button>
              <button
                onClick={handleDeposit}
                disabled={depositAmount <= 0}
                className="flex-1 py-3 rounded-lg"
                style={{
                  background: depositAmount <= 0
                    ? '#555'
                    : 'linear-gradient(180deg, #16A34A, #15803D)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: depositAmount <= 0 ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                  boxShadow: depositAmount > 0
                    ? '0 2px 0 #14532D'
                    : 'none',
                }}
              >
                {t('balance_deposit_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      <VersionInfo />
    </div>
  );
}
