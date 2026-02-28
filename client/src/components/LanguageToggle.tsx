import { useGameStore } from '../hooks/useGameStore.js';
import type { Language } from '../i18n/translations.js';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const language = useGameStore(s => s.language);
  const setLanguage = useGameStore(s => s.setLanguage);

  const btn = (lang: Language, label: string) => (
    <button
      onClick={() => setLanguage(lang)}
      style={{
        padding: '4px 10px',
        borderRadius: 4,
        background: language === lang ? 'rgba(255,255,255,0.2)' : 'transparent',
        color: language === lang ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div className={`flex gap-1 ${className}`}>
      {btn('en', 'EN')}
      {btn('fi', 'FI')}
    </div>
  );
}
