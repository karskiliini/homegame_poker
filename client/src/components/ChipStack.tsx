import type { ChipBreakdown, ChipDenomination } from '@poker/shared';
import { useTheme } from '../themes/useTheme.js';

const SIZES = {
  sm: { width: 24, height: 16, edgeHeight: 4, stackOffset: 5 },
  md: { width: 30, height: 20, edgeHeight: 5, stackOffset: 6 },
} as const;

interface ChipStackProps {
  breakdown: ChipBreakdown[];
  size: 'sm' | 'md';
}

export function ChipStack({ breakdown, size }: ChipStackProps) {
  const { chipColors } = useTheme();
  const { width, height, edgeHeight, stackOffset } = SIZES[size];

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

  // Total height: each chip contributes stackOffset except the last which shows full chip+edge
  const totalHeight = (stackedChips.length - 1) * stackOffset + height + edgeHeight;

  return (
    <div
      className="inline-flex flex-col items-center"
      style={{ position: 'relative', width, height: totalHeight }}
    >
      {stackedChips.map((denom, i) => {
        const colors = chipColors[denom];
        // Position from bottom: first chip (i=0) at bottom, last at top
        const bottomOffset = i * stackOffset;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: bottomOffset,
              left: 0,
              width,
              zIndex: i + 1,
            }}
          >
            {/* Chip edge (visible thickness) */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width,
                height: height / 2 + edgeHeight,
                borderRadius: `0 0 ${width / 2}px ${width / 2}px / 0 0 ${height / 2}px ${height / 2}px`,
                background: `linear-gradient(180deg, ${colors.edge} 0%, ${colors.edgeDark} 100%)`,
                boxShadow: `0 1px 2px rgba(0,0,0,0.5)`,
              }}
            />
            {/* Chip face (top surface) */}
            <div
              style={{
                position: 'absolute',
                bottom: edgeHeight,
                left: 0,
                width,
                height,
                borderRadius: '50%',
                background: `radial-gradient(ellipse at 45% 40%, ${colors.surface}, ${colors.edge})`,
                boxShadow: `inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -1px 1px rgba(0,0,0,0.15)`,
              }}
            >
              {/* Inner stripe ring */}
              <div
                style={{
                  position: 'absolute',
                  inset: '20%',
                  borderRadius: '50%',
                  border: `1.5px solid ${colors.stripe}`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
