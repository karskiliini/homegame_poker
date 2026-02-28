import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S_LOBBY } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';
import { VersionInfo } from '../../components/VersionInfo.js';
import { useT } from '../../hooks/useT.js';
import { LanguageToggle } from '../../components/LanguageToggle.js';
import { ThemeToggle } from '../../components/ThemeToggle.js';
import { useTheme } from '../../themes/useTheme.js';
import { avatarImageFile } from '../../utils/avatarImageFile.js';

interface LoginScreenProps {
  socket: Socket;
}

export function LoginScreen({ socket }: LoginScreenProps) {
  const { setPlayerName, setPlayerAvatar, authState, authError, setAuthError } = useGameStore();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [checking, setChecking] = useState(false);
  const t = useT();
  const { gradients, assets } = useTheme();

  const avatarIds = Array.from({ length: assets.avatarCount }, (_, i) => String(i + 1));

  // Initialize avatar randomly once
  if (!selectedAvatar) {
    setSelectedAvatar(String(Math.floor(Math.random() * assets.avatarCount) + 1));
  }

  const handleCheckName = () => {
    if (!name.trim()) return;
    setChecking(true);
    setAuthError(null);
    socket.emit(C2S_LOBBY.CHECK_NAME, { name: name.trim() });
  };

  const handleRegister = () => {
    if (!password) {
      setAuthError(t('auth_password_required'));
      return;
    }
    if (password !== confirmPassword) {
      setAuthError(t('auth_passwords_mismatch'));
      return;
    }
    setAuthError(null);
    setPlayerName(name.trim());
    setPlayerAvatar(selectedAvatar);
    socket.emit(C2S_LOBBY.REGISTER, {
      name: name.trim(),
      password,
      avatarId: selectedAvatar,
    });
  };

  const handleLogin = () => {
    if (!password) {
      setAuthError(t('auth_password_required'));
      return;
    }
    setAuthError(null);
    setPlayerName(name.trim());
    socket.emit(C2S_LOBBY.LOGIN, { name: name.trim(), password });
  };

  const handleBack = () => {
    useGameStore.getState().setAuthState('idle');
    setPassword('');
    setConfirmPassword('');
    setAuthError(null);
    setChecking(false);
  };

  const inputStyle = {
    padding: '12px 16px',
    borderRadius: 6,
    background: 'rgba(0,0,0,0.4)',
    color: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.15)',
    fontSize: 16,
    outline: 'none',
  };

  const renderStep = () => {
    // Step 2a: New player registration
    if (authState === 'needs_register') {
      return (
        <div className="space-y-4">
          <p style={{ color: 'var(--ftp-text-secondary)', fontSize: 14, textAlign: 'center' }}>
            {t('auth_new_player')}
          </p>

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

          <div>
            <label className="block mb-1" style={{ color: 'var(--ftp-text-muted)', fontSize: 12, fontWeight: 600 }}>
              {t('auth_password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              placeholder={t('auth_choose_password')}
              className="w-full"
              style={inputStyle}
              autoFocus
            />
          </div>
          <div>
            <label className="block mb-1" style={{ color: 'var(--ftp-text-muted)', fontSize: 12, fontWeight: 600 }}>
              {t('auth_confirm_password')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              placeholder={t('auth_confirm_password')}
              className="w-full"
              style={inputStyle}
            />
          </div>

          {authError && (
            <p style={{ color: '#EF4444', fontSize: 13, textAlign: 'center' }}>{authError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleBack}
              style={{
                flex: 1, padding: '12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.1)', color: 'var(--ftp-text-secondary)',
                border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                fontWeight: 600, fontSize: 14,
              }}
            >
              {t('auth_back')}
            </button>
            <button
              onClick={handleRegister}
              disabled={!password}
              style={{
                flex: 2, padding: '12px', borderRadius: 8,
                background: !password ? 'var(--ftp-bg-tertiary)' : 'linear-gradient(180deg, var(--ftp-red), var(--ftp-red-dark))',
                color: 'white', fontWeight: 700, fontSize: 16,
                border: 'none', cursor: !password ? 'not-allowed' : 'pointer',
                boxShadow: !password ? 'none' : '0 4px 0 #5a0d12, 0 6px 12px rgba(0,0,0,0.3)',
                letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              {t('auth_create_account')}
            </button>
          </div>
        </div>
      );
    }

    // Step 2b: Returning player login
    if (authState === 'needs_password') {
      return (
        <div className="space-y-4">
          <p style={{ color: 'var(--ftp-text-secondary)', fontSize: 14, textAlign: 'center' }}>
            {t('auth_welcome_back')}
          </p>
          <div>
            <label className="block mb-1" style={{ color: 'var(--ftp-text-muted)', fontSize: 12, fontWeight: 600 }}>
              {t('auth_password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder={t('auth_enter_password')}
              className="w-full"
              style={inputStyle}
              autoFocus
            />
          </div>

          {authError && (
            <p style={{ color: '#EF4444', fontSize: 13, textAlign: 'center' }}>{authError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleBack}
              style={{
                flex: 1, padding: '12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.1)', color: 'var(--ftp-text-secondary)',
                border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                fontWeight: 600, fontSize: 14,
              }}
            >
              {t('auth_back')}
            </button>
            <button
              onClick={handleLogin}
              disabled={!password}
              style={{
                flex: 2, padding: '12px', borderRadius: 8,
                background: !password ? 'var(--ftp-bg-tertiary)' : 'linear-gradient(180deg, var(--ftp-red), var(--ftp-red-dark))',
                color: 'white', fontWeight: 700, fontSize: 16,
                border: 'none', cursor: !password ? 'not-allowed' : 'pointer',
                boxShadow: !password ? 'none' : '0 4px 0 #5a0d12, 0 6px 12px rgba(0,0,0,0.3)',
                letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              {t('auth_login')}
            </button>
          </div>
        </div>
      );
    }

    // Step 1: Enter name
    return (
      <div className="space-y-4">
        <div>
          <label className="block mb-1" style={{ color: 'var(--ftp-text-muted)', fontSize: 12, fontWeight: 600 }}>
            {t('login_name_label')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckName()}
            placeholder={t('login_name_placeholder')}
            className="w-full"
            style={inputStyle}
            autoFocus
          />
        </div>

        {authError && (
          <p style={{ color: '#EF4444', fontSize: 13, textAlign: 'center' }}>{authError}</p>
        )}

        <button
          onClick={handleCheckName}
          disabled={!name.trim() || checking}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: 8,
            background: !name.trim() || checking
              ? 'var(--ftp-bg-tertiary)'
              : 'linear-gradient(180deg, var(--ftp-red), var(--ftp-red-dark))',
            color: 'white',
            fontWeight: 700,
            fontSize: 16,
            border: 'none',
            cursor: !name.trim() || checking ? 'not-allowed' : 'pointer',
            boxShadow: !name.trim() || checking
              ? 'none'
              : '0 4px 0 #5a0d12, 0 6px 12px rgba(0,0,0,0.3)',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {checking ? t('auth_checking') : t('auth_continue')}
        </button>
      </div>
    );
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

        {renderStep()}
      </div>
      <VersionInfo />
    </div>
  );
}
