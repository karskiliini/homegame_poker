import type { Socket } from 'socket.io-client';
import { useGameStore } from '../../hooks/useGameStore.js';
import { CardComponent } from '../../components/Card.js';
import { ActionButtons } from './ActionButtons.js';

interface GameScreenProps {
  socket: Socket;
  onOpenHistory?: () => void;
}

export function GameScreen({ socket, onOpenHistory }: GameScreenProps) {
  const { privateState, lobbyState } = useGameStore();

  if (!privateState) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--ftp-bg-primary)' }}
      >
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>Starting hand...</div>
      </div>
    );
  }

  const isFolded = privateState.status === 'folded';
  const isHandActive = lobbyState?.phase === 'hand_in_progress';
  const showActions = privateState.isMyTurn && isHandActive && privateState.availableActions.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col justify-between"
      style={{
        background: 'linear-gradient(180deg, #1C1C1C 0%, #0F1520 100%)',
        padding: 16,
      }}
    >
      {/* Top: game info */}
      <div className="text-center pt-2">
        <div style={{ color: 'var(--ftp-text-secondary)', fontSize: 13 }}>
          Stack:{' '}
          <span
            className="font-mono font-bold tabular-nums"
            style={{ color: '#FFFFFF' }}
          >
            {privateState.stack.toLocaleString()}
          </span>
        </div>
        {privateState.potTotal > 0 && (
          <div
            className="font-mono font-bold tabular-nums mt-1"
            style={{ color: '#EAB308', fontSize: 14 }}
          >
            Pot: {privateState.potTotal.toLocaleString()}
          </div>
        )}
      </div>

      {/* Middle: hole cards */}
      <div className="flex justify-center gap-4 my-8">
        {privateState.holeCards.length > 0 ? (
          privateState.holeCards.map((card, i) => (
            <div
              key={i}
              className="animate-card-flip"
              style={{
                animationDelay: `${i * 120}ms`,
                opacity: isFolded ? 0.35 : 1,
                transition: 'opacity 0.3s ease',
              }}
            >
              <CardComponent card={card} size="lg" />
            </div>
          ))
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16, padding: 40 }}>
            Waiting for cards...
          </div>
        )}
      </div>

      {/* Bottom: actions */}
      <div className="pb-4">
        {showActions ? (
          <ActionButtons
            socket={socket}
            availableActions={privateState.availableActions}
            callAmount={privateState.callAmount}
            minRaise={privateState.minRaise}
            maxRaise={privateState.maxRaise}
            stack={privateState.stack}
            potTotal={privateState.potTotal}
          />
        ) : (
          <div className="text-center py-8">
            <div style={{
              color: isFolded ? 'var(--ftp-text-muted)' : 'var(--ftp-text-secondary)',
              fontSize: 16,
            }}>
              {isFolded ? 'Folded' : 'Waiting for your turn...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
