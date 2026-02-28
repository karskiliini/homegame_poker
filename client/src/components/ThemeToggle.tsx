import { useGameStore } from '../hooks/useGameStore.js';
import { THEME_IDS } from '../themes/index.js';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useGameStore(s => s.theme);
  const setTheme = useGameStore(s => s.setTheme);

  const toggle = () => {
    const currentIndex = THEME_IDS.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_IDS.length;
    setTheme(THEME_IDS[nextIndex]);
  };

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
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}
      title="Switch theme"
    >
      <span style={{ fontSize: 14 }}>
        {theme === 'basic' ? '\u2663' : '\u2606'}
      </span>
      <span>{theme}</span>
    </button>
  );
}
