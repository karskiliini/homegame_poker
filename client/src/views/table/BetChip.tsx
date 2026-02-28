import { breakdownChips } from '@poker/shared';
import { ChipStack } from '../../components/ChipStack.js';

interface BetChipProps {
  amount: number;
  bigBlind: number;
  collecting?: boolean;
  style?: React.CSSProperties;
}

export function BetChip({ amount, bigBlind, collecting, style }: BetChipProps) {
  const breakdown = breakdownChips(amount, bigBlind);

  return (
    <div
      className={collecting ? 'animate-bet-collect' : 'animate-fade-in-up'}
      style={style}
    >
      <div className="flex items-center gap-1">
        <ChipStack breakdown={breakdown} size="sm" />
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
