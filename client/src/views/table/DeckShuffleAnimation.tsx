import { useEffect } from 'react';
import { CardBack } from '../../components/CardBack.js';
import type { ShuffleStyle } from '../../themes/types.js';

/** Duration of the full shuffle animation in ms */
export const SHUFFLE_DURATION_MS = 1800;

interface DeckShuffleAnimationProps {
  shuffleStyle: ShuffleStyle;
  onComplete: () => void;
}

/**
 * Deck shuffle animation shown at the start of each new hand.
 * Renders a stack of card backs that animate based on the theme's shuffleStyle.
 *
 * Shuffle styles:
 * - riffle: classic split & interleave
 * - smash: forceful slam together
 * - fan: elegant spread & collect
 * - speed: rapid professional riffle
 * - slide: smooth gliding motion
 * - burst: explosive scatter & reform
 */
export function DeckShuffleAnimation({ shuffleStyle, onComplete }: DeckShuffleAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, SHUFFLE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const animClass = `animate-shuffle-${shuffleStyle}`;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top: '42%',
        transform: 'translate(-50%, -50%)',
        zIndex: 40,
      }}
    >
      <div className="animate-shuffle-container">
        {/* Left half of deck */}
        <div
          className={`absolute ${animClass}`}
          style={{
            '--shuffle-dir': '-1',
          } as React.CSSProperties}
        >
          <div className="relative" style={{ width: 50, height: 72 }}>
            {/* Stacked card backs for depth */}
            {[0, 1, 2].map(i => (
              <div
                key={`l-${i}`}
                className="absolute"
                style={{
                  top: -i * 1.5,
                  left: -i * 0.5,
                }}
              >
                <CardBack size="md" />
              </div>
            ))}
          </div>
        </div>

        {/* Right half of deck */}
        <div
          className={`absolute ${animClass}`}
          style={{
            '--shuffle-dir': '1',
          } as React.CSSProperties}
        >
          <div className="relative" style={{ width: 50, height: 72 }}>
            {[0, 1, 2].map(i => (
              <div
                key={`r-${i}`}
                className="absolute"
                style={{
                  top: -i * 1.5,
                  left: i * 0.5,
                }}
              >
                <CardBack size="md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
