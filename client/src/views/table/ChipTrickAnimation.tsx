import type { ChipTrickType } from '@poker/shared';

const CHIP_COLORS = [
  'var(--ftp-chip-red)',
  'var(--ftp-chip-black)',
  'var(--ftp-chip-green)',
  'var(--ftp-chip-blue)',
  'var(--ftp-chip-white)',
];

const CHIP_SIZE = 14;

function Chip({ color, style, className }: { color: string; style?: React.CSSProperties; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        borderRadius: '50%',
        background: color,
        border: '2px solid rgba(255,255,255,0.5)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        ...style,
      }}
    />
  );
}

interface ChipTrickAnimationProps {
  trickType: ChipTrickType;
}

export function ChipTrickAnimation({ trickType }: ChipTrickAnimationProps) {
  const chips = CHIP_COLORS.slice(0, 5);

  if (trickType === 'riffle') {
    return (
      <div className="flex items-center justify-center" style={{ gap: 1 }}>
        {chips.map((color, i) => (
          <Chip
            key={i}
            color={color}
            className="animate-chip-trick-riffle"
            style={{
              '--riffle-x': i < 3 ? '-8px' : '8px',
              animationDelay: `${i * 80}ms`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    );
  }

  if (trickType === 'thumb_flip') {
    return (
      <div className="relative flex items-end justify-center" style={{ width: 50, height: 40 }}>
        {/* Static stack */}
        {chips.slice(1).map((color, i) => (
          <Chip
            key={`stack-${i}`}
            color={color}
            style={{
              position: 'absolute',
              bottom: i * 2,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        ))}
        {/* Flipping chip */}
        <Chip
          color={chips[0]}
          className="animate-chip-trick-thumb-flip"
          style={{
            position: 'absolute',
            bottom: chips.length * 2,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      </div>
    );
  }

  if (trickType === 'twirl') {
    return (
      <div className="flex items-center justify-center" style={{ gap: 2 }}>
        {chips.map((color, i) => (
          <Chip
            key={i}
            color={color}
            className="animate-chip-trick-twirl"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    );
  }

  // knuckle_roll
  return (
    <div className="flex items-center justify-center" style={{ gap: 3 }}>
      {chips.slice(0, 4).map((color, i) => (
        <Chip
          key={i}
          color={color}
          className="animate-chip-trick-knuckle-roll"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
