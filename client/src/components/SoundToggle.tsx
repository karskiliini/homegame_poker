import { useState, useEffect, useRef, useCallback } from 'react';
import type { SoundCategory } from '@poker/shared';
import { ALL_SOUND_CATEGORIES } from '@poker/shared';
import type { SoundManager } from '../audio/SoundManager.js';
import { useT } from '../hooks/useT.js';

interface SoundToggleProps {
  soundManager: SoundManager;
  className?: string;
}

const CATEGORY_KEYS: Record<SoundCategory, string> = {
  cards: 'sound_category_cards',
  chips: 'sound_category_chips',
  actions: 'sound_category_actions',
  notifications: 'sound_category_notifications',
};

function TogglePill({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        background: on ? 'var(--ftp-gold)' : 'rgba(255,255,255,0.15)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.15s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 16 : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
}

export function SoundToggle({ soundManager, className = '' }: SoundToggleProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(soundManager.enabled);
  const [volume, setVolume] = useState(soundManager.volume);
  const [mutedCats, setMutedCats] = useState<SoundCategory[]>(soundManager.mutedCategories);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleTogglePanel = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const handleToggleEnabled = useCallback(() => {
    const next = !soundManager.enabled;
    soundManager.setEnabled(next);
    setEnabled(next);
  }, [soundManager]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    soundManager.setVolume(val);
    setVolume(val);
  }, [soundManager]);

  const handleCategoryToggle = useCallback((cat: SoundCategory) => {
    const isMuted = soundManager.isCategoryMuted(cat);
    soundManager.setCategoryMuted(cat, !isMuted);
    setMutedCats(soundManager.mutedCategories);
  }, [soundManager]);

  // Click-outside to close panel
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} className={className}>
      {/* Speaker icon button */}
      <button
        ref={btnRef}
        onClick={handleTogglePanel}
        className="text-gray-400 hover:text-white transition-colors"
        title={enabled ? t('sound_mute') : t('sound_unmute')}
      >
        {enabled ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </button>

      {/* Settings popover panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 220,
            background: 'var(--ftp-bg-secondary, #1a2332)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            padding: '14px 16px',
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {/* Sound ON/OFF */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--ftp-text-primary, #fff)', fontSize: 13, fontWeight: 600 }}>Sound</span>
            <TogglePill on={enabled} onClick={handleToggleEnabled} />
          </div>

          {/* Volume slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: 'var(--ftp-text-secondary, #9CA3AF)', fontSize: 11, marginBottom: 6 }}>
              {t('sound_volume')}
            </div>
            <input
              type="range"
              className="ftp-volume-slider"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onInput={handleVolumeChange as any}
              style={{ width: '100%' }}
            />
          </div>

          {/* Category toggles */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
            {ALL_SOUND_CATEGORIES.map(cat => (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: cat === 'notifications' ? 0 : 8,
                }}
              >
                <span style={{ color: 'var(--ftp-text-secondary, #9CA3AF)', fontSize: 12 }}>
                  {t(CATEGORY_KEYS[cat] as any)}
                </span>
                <div data-category={cat}>
                  <TogglePill
                    on={!mutedCats.includes(cat)}
                    onClick={() => handleCategoryToggle(cat)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
