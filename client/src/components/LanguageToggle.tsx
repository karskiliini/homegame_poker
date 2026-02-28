import { useGameStore } from '../hooks/useGameStore.js';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const language = useGameStore(s => s.language);
  const setLanguage = useGameStore(s => s.setLanguage);

  const toggle = () => setLanguage(language === 'en' ? 'fi' : 'en');

  return (
    <button
      onClick={toggle}
      className={className}
      style={{
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6,
        padding: '4px 8px',
        cursor: 'pointer',
        fontSize: 16,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
      title={language === 'en' ? 'Switch to Finnish' : 'Vaihda englanniksi'}
    >
      <span>{language === 'en' ? '🇬🇧' : '🇫🇮'}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 }}>
        {language.toUpperCase()}
      </span>
    </button>
  );
}
