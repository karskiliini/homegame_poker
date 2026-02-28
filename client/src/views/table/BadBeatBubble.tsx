import { useState, useEffect } from 'react';
import { useTheme } from '../../themes/useTheme.js';
import { getBadBeatSlogan } from '../../themes/badbeat-slogans/index.js';

interface BadBeatBubbleProps {
  seatIndex: number;
  playerName: string;
}

export function BadBeatBubble({ seatIndex, playerName }: BadBeatBubbleProps) {
  const theme = useTheme();
  const [slogan] = useState(() => getBadBeatSlogan(theme.id));
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in
    const fadeIn = setTimeout(() => setOpacity(1), 50);
    // Fade out before removal
    const fadeOut = setTimeout(() => setOpacity(0), 4500);
    return () => { clearTimeout(fadeIn); clearTimeout(fadeOut); };
  }, []);

  // Determine tail direction based on seat position
  const isTopHalf = seatIndex >= 3 && seatIndex <= 7;
  const tailStyle = isTopHalf
    ? { bottom: -6, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }
    : { top: -6, left: '50%', transform: 'translateX(-50%) rotate(45deg)' };

  return (
    <div
      style={{
        position: 'absolute',
        [isTopHalf ? 'top' : 'bottom']: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: isTopHalf ? 8 : 0,
        marginBottom: isTopHalf ? 0 : 8,
        zIndex: 100,
        opacity,
        transition: 'opacity 0.5s ease',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          background: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 8,
          padding: '6px 12px',
          maxWidth: 200,
          whiteSpace: 'nowrap',
          fontSize: 12,
          fontWeight: 600,
          color: '#fff',
          textAlign: 'center',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        {/* Tail */}
        <div
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            background: 'rgba(0, 0, 0, 0.85)',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            ...tailStyle,
          }}
        />
        {slogan}
      </div>
    </div>
  );
}
