interface BetChipProps {
  amount: number;
  collecting?: boolean;
  style?: React.CSSProperties;
}

export function BetChip({ amount, collecting, style }: BetChipProps) {
  return (
    <div
      className={collecting ? 'animate-bet-collect' : 'animate-fade-in-up'}
      style={style}
    >
      <div className="flex items-center gap-1">
        {/* Chip icon */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #FBBF24, #D97706)',
            border: '2px dashed rgba(255,255,255,0.4)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            flexShrink: 0,
          }}
        />
        {/* Amount */}
        <span
          className="font-mono font-bold tabular-nums"
          style={{
            color: '#FFFFFF',
            fontSize: 12,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap',
          }}
        >
          {amount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
