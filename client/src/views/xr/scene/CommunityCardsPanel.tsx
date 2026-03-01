import { Html } from '@react-three/drei';
import type { CardString, PotDisplay } from '@poker/shared';
import { CardComponent } from '../../../components/Card.js';

interface CommunityCardsPanelProps {
  position: [number, number, number];
  communityCards: CardString[];
  pots: PotDisplay[];
}

export function CommunityCardsPanel({ position, communityCards, pots }: CommunityCardsPanelProps) {
  const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);

  if (communityCards.length === 0 && totalPot === 0) return null;

  return (
    <group position={position}>
      <Html
        center
        transform
        distanceFactor={6}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
          {/* Community cards */}
          {communityCards.length > 0 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {communityCards.map((card, i) => (
                <CardComponent key={i} card={card} size="md" />
              ))}
            </div>
          )}

          {/* Pot display */}
          {totalPot > 0 && (
            <div style={{
              background: 'rgba(0,0,0,0.7)',
              borderRadius: 8,
              padding: '4px 14px',
              border: '1px solid rgba(234,179,8,0.3)',
            }}>
              <span style={{
                color: '#EAB308',
                fontSize: 16,
                fontWeight: 700,
                fontFamily: 'monospace',
              }}>
                Pot: {totalPot.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
