import type { PotDisplay as PotDisplayType } from '@poker/shared';
import { breakdownChips } from '@poker/shared';
import { ChipStack } from '../../components/ChipStack.js';

interface PotDisplayProps {
  pots: PotDisplayType[];
  bigBlind: number;
  playerNames?: Record<string, string>; // playerId -> name
  potGrow?: boolean;
}

export function PotDisplay({ pots, bigBlind, playerNames, potGrow }: PotDisplayProps) {
  if (pots.length === 0) return null;

  const hasSidePots = pots.length > 1;

  return (
    <div className="flex gap-6 justify-center items-end">
      {pots.map((pot, i) => {
        // Show eligible player names on side pots
        const eligibleNames = hasSidePots && i > 0 && playerNames
          ? pot.eligible.map(id => playerNames[id]).filter(Boolean)
          : [];

        const breakdown = breakdownChips(pot.amount, bigBlind);

        return (
          <div
            key={i}
            className={`flex items-center gap-1 animate-fade-in-up ${potGrow ? 'animate-pot-grow' : ''}`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <ChipStack breakdown={breakdown} size="md" />
            <div className="text-center">
              <div
                className="font-bold font-mono tabular-nums"
                style={{
                  color: '#EAB308',
                  fontSize: 16,
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }}
              >
                {pot.amount.toLocaleString()}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                {i === 0 ? 'Main Pot' : `Side Pot ${i}`}
              </div>
              {eligibleNames.length > 0 && (
                <div
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 9,
                    maxWidth: 100,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {eligibleNames.join(', ')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
