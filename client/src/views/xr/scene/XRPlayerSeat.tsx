import { Html } from '@react-three/drei';
import type { PublicPlayerState } from '@poker/shared';
import { CardComponent } from '../../../components/Card.js';
import { CardBack } from '../../../components/CardBack.js';

interface XRPlayerSeatProps {
  position: [number, number, number];
  player: PublicPlayerState;
  isWinner: boolean;
}

export function XRPlayerSeat({ position, player, isWinner }: XRPlayerSeatProps) {
  const isEmpty = player.status === 'sitting_out' || player.status === 'busted';
  const opacity = isEmpty ? 0.4 : 1;

  return (
    <group position={position}>
      {/* Chair mesh */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[0.4, 0.05, 0.4]} />
        <meshStandardMaterial
          color={isWinner ? '#fbbf24' : '#4a3728'}
          emissive={isWinner ? '#fbbf24' : '#000000'}
          emissiveIntensity={isWinner ? 0.3 : 0}
          roughness={0.7}
        />
      </mesh>

      {/* Nameplate + cards as Html overlay */}
      <Html
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none', opacity }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          minWidth: 100,
        }}>
          {/* Player cards */}
          {player.holeCards ? (
            <div style={{ display: 'flex', gap: 2 }}>
              {player.holeCards.map((card, i) => (
                <CardComponent key={i} card={card} size="sm" />
              ))}
            </div>
          ) : player.hasCards ? (
            <div style={{ display: 'flex', gap: 2 }}>
              <CardBack size="sm" />
              <CardBack size="sm" />
            </div>
          ) : null}

          {/* Nameplate */}
          <div style={{
            background: isWinner
              ? 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(245,158,11,0.3))'
              : 'rgba(0,0,0,0.75)',
            borderRadius: 6,
            padding: '4px 10px',
            textAlign: 'center',
            border: isWinner
              ? '1px solid rgba(251,191,36,0.6)'
              : '1px solid rgba(255,255,255,0.15)',
            minWidth: 80,
          }}>
            <div style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 100,
            }}>
              {player.name}
            </div>
            <div style={{
              color: '#EAB308',
              fontSize: 12,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}>
              {player.stack.toLocaleString()}
            </div>
            {/* Status badges */}
            {player.isDealer && (
              <span style={{
                fontSize: 10,
                background: '#fff',
                color: '#000',
                borderRadius: 4,
                padding: '1px 4px',
                fontWeight: 700,
                marginTop: 2,
                display: 'inline-block',
              }}>
                D
              </span>
            )}
            {player.status === 'sitting_out' && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                Sitting Out
              </div>
            )}
            {player.status === 'busted' && (
              <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>
                Busted
              </div>
            )}
            {player.status === 'all_in' && (
              <div style={{ fontSize: 10, color: '#EAB308', fontWeight: 700, marginTop: 2 }}>
                ALL IN
              </div>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}
