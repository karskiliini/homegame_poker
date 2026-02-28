import { useTheme } from '../themes/useTheme.js';

interface CardBackProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_STYLES = {
  sm: { width: 36, height: 52 },
  md: { width: 50, height: 72 },
  lg: { width: 68, height: 96 },
};

export function CardBack({ size = 'md' }: CardBackProps) {
  const s = SIZE_STYLES[size];
  const { gradients } = useTheme();

  return (
    <div
      className="relative select-none overflow-hidden"
      style={{
        width: s.width,
        height: s.height,
        background: gradients.cardBack,
        border: '2px solid #FFFFFF',
        borderRadius: 4,
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }}
    >
      {/* Inner pattern */}
      <div
        className="absolute"
        style={{
          inset: 4,
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 2,
          background: gradients.cardBackPattern,
        }}
      />
      {/* Center diamond */}
      <div
        className="absolute"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(45deg)',
          width: s.width * 0.3,
          height: s.width * 0.3,
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.25)',
        }}
      />
    </div>
  );
}
