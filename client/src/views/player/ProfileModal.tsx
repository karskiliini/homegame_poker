import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S_LOBBY, S2C_LOBBY } from '@poker/shared';
import type { BalanceTransaction } from '@poker/shared';
import { useTheme } from '../../themes/useTheme.js';
import { avatarImageFile } from '../../utils/avatarImageFile.js';
import { useT } from '../../hooks/useT.js';
import { useGameStore } from '../../hooks/useGameStore.js';

interface ProfileModalProps {
  socket: Socket;
  onClose: () => void;
}

const txnMeta: Record<string, { icon: string; key: string }> = {
  deposit:  { icon: '\u{1F4E5}', key: 'profile_txn_deposit' },
  buy_in:   { icon: '\u{1F3B0}', key: 'profile_txn_buy_in' },
  cash_out: { icon: '\u{1F4B0}', key: 'profile_txn_cash_out' },
  rebuy:    { icon: '\u{1F504}', key: 'profile_txn_rebuy' },
};

export function ProfileModal({ socket, onClose }: ProfileModalProps) {
  const t = useT();
  const { assets } = useTheme();
  const { playerAvatar, setPlayerAvatar } = useGameStore();

  const [profileName, setProfileName] = useState('');
  const [profileBalance, setProfileBalance] = useState(0);
  const [avatarId, setAvatarId] = useState(playerAvatar);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const avatarIds = Array.from({ length: assets.avatarCount }, (_, i) => String(i + 1));

  useEffect(() => {
    socket.emit(C2S_LOBBY.GET_PROFILE);

    const handleProfile = (data: { name: string; avatarId: string; balance: number; transactions: BalanceTransaction[] }) => {
      setProfileName(data.name);
      setAvatarId(data.avatarId);
      setProfileBalance(data.balance);
      setTransactions(data.transactions);
    };

    const handleAvatarUpdated = (data: { avatarId: string }) => {
      setAvatarId(data.avatarId);
      setPlayerAvatar(data.avatarId);
    };

    socket.on(S2C_LOBBY.PROFILE_DATA, handleProfile);
    socket.on(S2C_LOBBY.AVATAR_UPDATED, handleAvatarUpdated);

    return () => {
      socket.off(S2C_LOBBY.PROFILE_DATA, handleProfile);
      socket.off(S2C_LOBBY.AVATAR_UPDATED, handleAvatarUpdated);
    };
  }, [socket, setPlayerAvatar]);

  const handleAvatarSelect = (id: string) => {
    socket.emit(C2S_LOBBY.UPDATE_AVATAR, { avatarId: id });
    setShowAvatarPicker(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso + 'Z');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm"
        style={{
          background: 'var(--ftp-bg-lobby)',
          borderRadius: 12,
          border: '1px solid var(--ftp-lobby-border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            background: 'var(--ftp-lobby-header-bg)',
            borderBottom: '1px solid var(--ftp-lobby-border)',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <h2 className="font-bold" style={{ color: '#FFFFFF', fontSize: 18 }}>
            {t('profile_title')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
              fontSize: 20, cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
            }}
          >
            \u2715
          </button>
        </div>

        {/* Content */}
        <div style={{ overflow: 'auto', flex: 1, padding: '16px' }}>
          {/* Avatar + Name + Balance */}
          <div className="flex flex-col items-center gap-2" style={{ marginBottom: 16 }}>
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              style={{
                width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
                background: '#2C3E50', border: '3px solid var(--ftp-gold)',
                cursor: 'pointer', padding: 0,
                boxShadow: '0 0 16px rgba(212,175,55,0.3)',
              }}
            >
              <img
                src={`${assets.avatarBasePath}/${avatarImageFile(avatarId, assets.avatarNames)}`}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
            <div style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700 }}>
              {profileName}
            </div>
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ftp-text-secondary)', fontSize: 13,
                textDecoration: 'underline',
              }}
            >
              {t('profile_change_avatar')}
            </button>

            {/* Balance */}
            <div
              className="flex items-center gap-2"
              style={{
                padding: '8px 16px', borderRadius: 8,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ color: 'var(--ftp-gold)', fontSize: 13, fontWeight: 600 }}>
                {t('profile_balance')}
              </span>
              <span className="font-mono" style={{ color: 'var(--ftp-gold)', fontSize: 20, fontWeight: 700 }}>
                {profileBalance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Avatar picker */}
          {showAvatarPicker && (
            <div style={{ marginBottom: 16 }}>
              <div
                className="grid grid-cols-4 gap-2"
                style={{ maxHeight: 240, overflowY: 'auto', padding: 2 }}
              >
                {avatarIds.map((id) => {
                  const isSelected = avatarId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleAvatarSelect(id)}
                      style={{
                        width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
                        background: '#2C3E50',
                        border: isSelected ? '3px solid var(--ftp-red)' : '2px solid rgba(255,255,255,0.1)',
                        boxShadow: isSelected ? '0 0 12px rgba(196,30,42,0.5)' : 'none',
                        cursor: 'pointer', padding: 0,
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                    >
                      <img
                        src={`${assets.avatarBasePath}/${avatarImageFile(id, assets.avatarNames)}`}
                        alt={`Avatar ${id}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div>
            <h3 style={{ color: 'var(--ftp-text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {t('profile_history')}
            </h3>
            {transactions.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                {t('profile_no_history')}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {transactions.map((txn) => {
                  const meta = txnMeta[txn.type] || { icon: '\u2753', key: txn.type };
                  const isPositive = txn.amount > 0;
                  return (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between"
                      style={{
                        padding: '8px 10px', borderRadius: 6,
                        background: 'rgba(0,0,0,0.15)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 16 }}>{meta.icon}</span>
                        <div>
                          <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 500 }}>
                            {t(meta.key as any)}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                            {formatTime(txn.createdAt)}
                          </div>
                        </div>
                      </div>
                      <span
                        className="font-mono"
                        style={{
                          color: isPositive ? '#22C55E' : '#EF4444',
                          fontSize: 14, fontWeight: 700,
                        }}
                      >
                        {isPositive ? '+' : ''}{txn.amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: '1px solid var(--ftp-lobby-border)' }}>
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg"
            style={{
              background: 'rgba(0,0,0,0.15)',
              color: 'var(--ftp-lobby-text)',
              border: '1px solid var(--ftp-lobby-border)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {t('profile_close')}
          </button>
        </div>
      </div>
    </div>
  );
}
