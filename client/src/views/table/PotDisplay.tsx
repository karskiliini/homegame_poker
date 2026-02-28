import type { PotDisplay as PotDisplayType } from '@poker/shared';
import { breakdownChips } from '@poker/shared';
import { ChipStack } from '../../components/ChipStack.js';
import { useT } from '../../hooks/useT.js';

interface PotDisplayProps {
  pots: PotDisplayType[];
  bigBlind: number;
  playerNames?: Record<string, string>; // playerId -> name
  potGrow?: boolean;
  /** Index of the pot currently being awarded (highlighted) */
  awardingPotIndex?: number | null;
}

export function PotDisplay({ pots, bigBlind, playerNames, potGrow, awardingPotIndex }: PotDisplayProps) {
  const t = useT();
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
        const isAwarding = awardingPotIndex === i;

        return (
          <div
            key={i}
            className={`flex items-center gap-1 animate-fade-in-up ${potGrow ? 'animate-pot-grow' : ''} ${isAwarding ? 'animate-pot-pulse' : ''}`}
            style={{
              animationDelay: `${i * 100}ms`,
              ...(isAwarding ? { filter: 'brightness(1.2)' } : {}),
            }}
          >
            <ChipStack breakdown={breakdown} size="md" />
            <div className="text-center">
              <div
                className="font-bold font-mono tabular-nums"
                style={{
                  color: isAwarding ? '#EAB308' : '#FFFFFF',
                  fontSize: 16,
                  textShadow: isAwarding
                    ? '0 0 8px rgba(234,179,8,0.5), 0 1px 3px rgba(0,0,0,0.5)'
                    : '0 1px 3px rgba(0,0,0,0.5)',
                  transition: 'color 200ms ease',
                }}
              >
                {pot.amount.toLocaleString()}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                {i === 0 ? t('table_total_pot') : `${t('table_side_pot')} ${i}`}
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
