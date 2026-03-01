import { Html } from '@react-three/drei';
import type { Socket } from 'socket.io-client';
import type { PrivatePlayerState, GameConfig } from '@poker/shared';
import { C2S } from '@poker/shared';
import { CardComponent } from '../../../components/Card.js';
import { ActionButtons } from '../../player/ActionButtons.js';

interface ActionHUDProps {
  position: [number, number, number];
  socket: Socket;
  privateState: PrivatePlayerState | null;
  gameConfig: GameConfig | null;
  isHandActive: boolean;
}

export function ActionHUD({ position, socket, privateState, gameConfig, isHandActive }: ActionHUDProps) {
  if (!privateState) return null;

  const isFolded = privateState.status === 'folded';
  const isSittingOut = privateState.status === 'sitting_out';
  const isBusted = privateState.status === 'busted';
  const isAllIn = privateState.status === 'all_in';
  const showActions = privateState.isMyTurn && isHandActive && privateState.availableActions.length > 0;

  return (
    <group position={position}>
      <Html
        center
        transform
        distanceFactor={5}
        style={{ pointerEvents: 'auto' }}
      >
        <div style={{
          background: 'rgba(0,0,0,0.85)',
          borderRadius: 12,
          padding: '12px 20px',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          minWidth: 280,
        }}>
          {/* Hole cards + stack */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {privateState.holeCards.length > 0 && !isFolded ? (
              <div style={{ display: 'flex', gap: 4 }}>
                {privateState.holeCards.map((card, i) => (
                  <CardComponent key={i} card={card} size="md" />
                ))}
              </div>
            ) : isFolded ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                Folded
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                Waiting for cards...
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Stack</div>
              <div style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: 700,
                fontFamily: 'monospace',
              }}>
                {privateState.stack.toLocaleString()}
              </div>
              {privateState.potTotal > 0 && (
                <div style={{
                  color: '#EAB308',
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}>
                  Pot {privateState.potTotal.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {showActions ? (
            <ActionButtons
              socket={socket}
              availableActions={privateState.availableActions}
              callAmount={privateState.callAmount}
              minRaise={privateState.minRaise}
              maxRaise={privateState.maxRaise}
              stack={privateState.stack}
              currentBet={privateState.currentBet}
              potTotal={privateState.potTotal}
              bigBlind={gameConfig?.bigBlind ?? 2}
              maxBuyIn={gameConfig?.maxBuyIn ?? 200}
              gameType={gameConfig?.gameType ?? 'NLHE'}
            />
          ) : isSittingOut && privateState.stack > 0 ? (
            <button
              onClick={() => socket.emit(C2S.SIT_IN)}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                background: '#16a34a',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Sit In
            </button>
          ) : isAllIn ? (
            <div style={{ color: '#EAB308', fontSize: 16, fontWeight: 700 }}>
              ALL IN
            </div>
          ) : (isBusted || (privateState.stack <= 0)) ? (
            <button
              onClick={() => socket.emit(C2S.REBUY, { amount: gameConfig?.maxBuyIn ?? 200 })}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                background: '#16a34a',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Rebuy {gameConfig?.maxBuyIn ?? 200}
            </button>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              {isFolded ? 'Folded' : 'Waiting...'}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
