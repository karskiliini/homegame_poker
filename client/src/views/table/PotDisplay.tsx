import type { PotDisplay as PotDisplayType } from '@poker/shared';

interface PotDisplayProps {
  pots: PotDisplayType[];
}

export function PotDisplay({ pots }: PotDisplayProps) {
  return (
    <div className="flex gap-4 justify-center">
      {pots.map((pot, i) => (
        <div key={i} className="text-center">
          <div className="text-yellow-400 font-bold text-lg font-mono">
            {pot.amount.toLocaleString()}
          </div>
          <div className="text-white/40 text-xs">
            {i === 0 ? 'Main Pot' : `Side Pot ${i}`}
          </div>
        </div>
      ))}
    </div>
  );
}
