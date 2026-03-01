import { useMemo } from 'react';

interface RoyalFlushCelebrationProps {
  type: 'royal_flush' | 'straight_flush';
}

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1', '#FF9FF3', '#FECA57', '#FF6348'];

export function RoyalFlushCelebration({ type }: RoyalFlushCelebrationProps) {
  const particles = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 1.5,
      rotation: 360 + Math.random() * 720,
      size: 4 + Math.random() * 6,
    }));
  }, []);

  const starbursts = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: 30 + Math.random() * 40,
      top: 35 + Math.random() * 30,
      delay: 0.5 + Math.random() * 1,
      color: type === 'royal_flush' ? '#FFD700' : '#C0C0C0',
    }));
  }, [type]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 55, overflow: 'hidden' }}>
      {/* Radial glow */}
      <div
        className="animate-royal-glow"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '200px',
          height: '200px',
          marginLeft: '-100px',
          marginTop: '-100px',
          borderRadius: '50%',
          background: type === 'royal_flush'
            ? 'radial-gradient(circle, rgba(255,215,0,0.6), rgba(255,165,0,0.2), transparent 70%)'
            : 'radial-gradient(circle, rgba(192,192,192,0.6), rgba(150,150,200,0.2), transparent 70%)',
        }}
      />
      {/* Confetti */}
      {particles.map(p => (
        <div
          key={p.id}
          className="animate-confetti"
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size * 1.5}px`,
            backgroundColor: p.color,
            borderRadius: '1px',
            '--confetti-delay': `${p.delay}s`,
            '--confetti-duration': `${p.duration}s`,
            '--confetti-rotation': `${p.rotation}deg`,
          } as React.CSSProperties}
        />
      ))}
      {/* Starbursts */}
      {starbursts.map(s => (
        <div
          key={s.id}
          className="animate-starburst"
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${s.color}, transparent 70%)`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
