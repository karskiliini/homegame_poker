import type { PotDisplay as PotDisplayType } from '@poker/shared';

interface PotDisplayProps {
  pots: PotDisplayType[];
}

// Simple chip stack icon
function ChipStack({ color }: { color: string }) {
  return (
    <div className="inline-flex flex-col items-center" style={{ marginRight: 4 }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${color}, ${color}dd)`,
            border: '1.5px dashed rgba(255,255,255,0.35)',
            marginTop: i > 0 ? -12 : 0,
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        />
      ))}
    </div>
  );
}

export function PotDisplay({ pots }: PotDisplayProps) {
  if (pots.length === 0) return null;

  return (
    <div className="flex gap-6 justify-center items-end">
      {pots.map((pot, i) => (
        <div
          key={i}
          className="flex items-center gap-1 animate-fade-in-up"
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
          </div>
        </div>
      ))}
    </div>
  );
}
