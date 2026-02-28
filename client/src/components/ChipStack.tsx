import type { ChipBreakdown, ChipDenomination } from '@poker/shared';

const CHIP_COLORS: Record<ChipDenomination, { surface: string; edge: string; stripe: string }> = {
  white: { surface: '#E0E0E0', edge: '#B0B0B0', stripe: 'rgba(180,180,180,0.6)' },
  red:   { surface: '#CC2222', edge: '#991818', stripe: 'rgba(255,255,255,0.35)' },
  green: { surface: '#228B22', edge: '#186618', stripe: 'rgba(255,255,255,0.3)' },
  black: { surface: '#333333', edge: '#111111', stripe: 'rgba(255,255,255,0.25)' },
  blue:  { surface: '#2244AA', edge: '#1A3388', stripe: 'rgba(255,255,255,0.3)' },
};

const SIZES = {
  sm: { width: 22, height: 14, stackOffset: -11 },
  md: { width: 28, height: 18, stackOffset: -14 },
} as const;

interface ChipStackProps {
  breakdown: ChipBreakdown[];
  size: 'sm' | 'md';
}

export function ChipStack({ breakdown, size }: ChipStackProps) {
  const { width, height, stackOffset } = SIZES[size];

  // Flatten breakdown into individual chips for stacking
  const chips: ChipDenomination[] = [];
  for (const { denomination, count } of breakdown) {
    for (let i = 0; i < count; i++) {
      chips.push(denomination);
    }
  }

  if (chips.length === 0) return null;

  // Stack chips bottom-to-top (smallest denomination at bottom)
  // Reverse so smallest (last in breakdown) is at the bottom
  const stackedChips = [...chips].reverse();

  return (
    <div
      className="inline-flex flex-col items-center"
      style={{ position: 'relative', height: height + (stackedChips.length - 1) * -stackOffset }}
    >
      {stackedChips.map((denom, i) => {
        const colors = CHIP_COLORS[denom];
        return (
          <div
            key={i}
            style={{
              width,
              height,
              borderRadius: '50%',
              background: `radial-gradient(ellipse at 40% 38%, ${colors.surface}, ${colors.edge})`,
              border: `1.5px dashed ${colors.stripe}`,
              boxShadow: `0 1px 3px rgba(0,0,0,0.4)`,
              marginTop: i > 0 ? stackOffset : 0,
              position: 'relative',
              zIndex: stackedChips.length - i,
            }}
          />
        );
      })}
    </div>
  );
}
