import { useState } from 'react';
import { useGameStore } from '../../hooks/useGameStore.js';
import { VersionInfo } from '../../components/VersionInfo.js';
import { useT } from '../../hooks/useT.js';
import { LanguageToggle } from '../../components/LanguageToggle.js';
import { ThemeToggle } from '../../components/ThemeToggle.js';
import { useTheme } from '../../themes/useTheme.js';
import { avatarImageFile } from '../../utils/avatarImageFile.js';

export function LoginScreen() {
  const { setScreen, setPlayerName, setPlayerAvatar } = useGameStore();
  const [name, setName] = useState('');
  const t = useT();
  const { gradients, assets } = useTheme();

  const avatarIds = Array.from({ length: assets.avatarCount }, (_, i) => String(i + 1));
  const [selectedAvatar, setSelectedAvatar] = useState(() =>
    String(Math.floor(Math.random() * assets.avatarCount) + 1)
  );

  const handleJoin = () => {
    if (!name.trim()) return;
    setPlayerName(name.trim());
    setPlayerAvatar(selectedAvatar);
    setScreen('table_lobby');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: gradients.loginBackground }}
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
        <div className="flex justify-end mb-2 gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
        <h1
          className="text-center mb-1 font-bold"
          style={{ color: 'var(--ftp-red)', fontSize: 24, letterSpacing: 1 }}
        >
          {t('login_title')}
        </h1>
        <p className="text-center mb-6" style={{ color: 'var(--ftp-text-secondary)', fontSize: 13 }}>
          {t('login_subtitle')}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block mb-1" style={{ color: 'var(--ftp-text-muted)', fontSize: 12, fontWeight: 600 }}>
              {t('login_name_label')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder={t('login_name_placeholder')}
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
              {t('login_avatar_label')}
            </label>
            <div
              className="grid grid-cols-4 gap-2"
              style={{ maxHeight: 240, overflowY: 'auto', padding: 2 }}
            >
              {avatarIds.map((id) => {
                const isSelected = selectedAvatar === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedAvatar(id)}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: '#2C3E50',
                      border: isSelected ? '3px solid var(--ftp-red)' : '2px solid rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? '0 0 12px rgba(196,30,42,0.5)' : 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                  >
                    <img
                      src={`${assets.avatarBasePath}/${avatarImageFile(id)}`}
                      alt={`Avatar ${id}`}
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
            {t('login_enter_lobby')}
          </button>
        </div>
      </div>
      <VersionInfo />
    </div>
  );
}
