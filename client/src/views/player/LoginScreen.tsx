import { useState } from 'react';
import { AVATAR_OPTIONS } from '@poker/shared';
import type { AvatarId } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';

function getRandomAvatar(): AvatarId {
  const idx = Math.floor(Math.random() * AVATAR_OPTIONS.length);
  return AVATAR_OPTIONS[idx].id;
}

export function LoginScreen() {
  const { setScreen, setPlayerName, setPlayerAvatar } = useGameStore();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(getRandomAvatar);

  const handleJoin = () => {
    if (!name.trim()) return;
    setPlayerName(name.trim());
    setPlayerAvatar(selectedAvatar);
    setScreen('table_lobby');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(180deg, #0F1E33, #162D50)' }}
    >
      <div
        className="w-full max-w-sm p-6"
        style={{
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <h1
          className="text-center mb-1 font-bold"
          style={{ color: 'var(--ftp-red)', fontSize: 24, letterSpacing: 1 }}
        >
          POKER NIGHT
        </h1>
        <p className="text-center mb-6" style={{ color: 'var(--ftp-text-secondary)', fontSize: 13 }}>
          Choose your name and avatar
        </p>

        <div className="space-y-4">
          <div>
            <label className="block mb-1" style={{ color: 'var(--ftp-text-muted)', fontSize: 12, fontWeight: 600 }}>
              NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Enter your name"
              className="w-full"
              style={{
                padding: '12px 16px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.4)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: 16,
                outline: 'none',
              }}
              autoFocus
            />
          </div>

          {/* Avatar picker */}
          <div>
            <label className="block mb-2" style={{ color: 'var(--ftp-text-muted)', fontSize: 12, fontWeight: 600 }}>
              AVATAR
            </label>
            <div
              className="grid grid-cols-6 gap-2"
              style={{ maxHeight: 200, overflowY: 'auto', padding: 2 }}
            >
              {AVATAR_OPTIONS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.id)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: '#2C3E50',
                      border: isSelected ? '3px solid var(--ftp-red)' : '2px solid rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? '0 0 12px rgba(196,30,42,0.5)' : 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    title={avatar.label}
                  >
                    <img
                      src={avatar.image}
                      alt={avatar.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={!name.trim()}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 8,
              background: !name.trim()
                ? 'var(--ftp-bg-tertiary)'
                : 'linear-gradient(180deg, var(--ftp-red), var(--ftp-red-dark))',
              color: 'white',
              fontWeight: 700,
              fontSize: 16,
              border: 'none',
              cursor: !name.trim() ? 'not-allowed' : 'pointer',
              boxShadow: !name.trim()
                ? 'none'
                : '0 4px 0 #5a0d12, 0 6px 12px rgba(0,0,0,0.3)',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Enter Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
