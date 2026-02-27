import type { PotDisplay as PotDisplayType } from '@poker/shared';

interface PotDisplayProps {
  pots: PotDisplayType[];
  playerNames?: Record<string, string>; // playerId -> name
  potGrow?: boolean;
}

// Simple chip stack icon
function ChipStack({ color }: { color: string }) {
  return (
    <div className="inline-flex flex-col items-center" style={{ marginRight: 4 }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${color}, ${color}dd)`,
            border: '1.5px dashed rgba(255,255,255,0.35)',
            marginTop: i > 0 ? -18 : 0,
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        />
      ))}
    </div>
  );
}

export function PotDisplay({ pots, playerNames, potGrow }: PotDisplayProps) {
  if (pots.length === 0) return null;

  const hasSidePots = pots.length > 1;

  return (
    <div className="flex gap-6 justify-center items-end">
      {pots.map((pot, i) => {
        // Show eligible player names on side pots
        const eligibleNames = hasSidePots && i > 0 && playerNames
          ? pot.eligible.map(id => playerNames[id]).filter(Boolean)
          : [];

        return (
          <div
            key={i}
            className={`flex items-center gap-1 animate-fade-in-up ${potGrow ? 'animate-pot-grow' : ''}`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <ChipStack color={i === 0 ? '#CC2222' : '#2244AA'} />
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
