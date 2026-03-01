import { useEffect, useState } from 'react';

interface WinnerBannerProps {
  handName: string;
  handDescription: string;
  isNuts: boolean;
  position: { x: number; y: number };
}

export function WinnerBanner({ handName, handDescription, isNuts, position }: WinnerBannerProps) {
  const [phase, setPhase] = useState<'in' | 'visible' | 'out'>('in');

  useEffect(() => {
    const visibleTimer = setTimeout(() => setPhase('visible'), 500);
    const outTimer = setTimeout(() => setPhase('out'), 2500);
    return () => { clearTimeout(visibleTimer); clearTimeout(outTimer); };
  }, []);

  const subtitle = handDescription.includes(', ')
    ? handDescription.split(', ').slice(1).join(', ')
    : '';

  const displayName = isNuts ? 'THE NUTS!' : handName.toUpperCase();

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y - 14}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: 60,
        pointerEvents: 'none',
        textAlign: 'center',
      }}
      className={phase === 'out' ? 'animate-winner-banner-out' : 'animate-winner-banner-in'}
    >
      <div
        style={{
          background: isNuts
            ? 'linear-gradient(135deg, #FFD700, #FFA500, #FFD700)'
            : 'linear-gradient(135deg, #B8860B, #FFD700, #B8860B)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: isNuts ? '22px' : '18px',
          fontWeight: 900,
          letterSpacing: '1px',
          lineHeight: 1.1,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
        }}
        className={isNuts ? 'animate-nuts-glow' : ''}
      >
        {displayName}
      </div>
      {subtitle && !isNuts && (
        <div style={{
          color: '#FFD700',
          fontSize: '12px',
          fontWeight: 600,
          opacity: 0.9,
          marginTop: '2px',
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        }}>
          {subtitle}
        </div>
      )}
      {isNuts && (
        <div style={{
          color: '#FFD700',
          fontSize: '12px',
          fontWeight: 600,
          opacity: 0.85,
          marginTop: '2px',
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        }}>
          {handDescription}
        </div>
      )}
    </div>
  );
}
