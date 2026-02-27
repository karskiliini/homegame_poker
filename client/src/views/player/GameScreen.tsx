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

  // Show a basic game screen even before privateState is available
  if (!privateState) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-white text-xl">Starting hand...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col justify-between p-4">
      {/* Top: game info */}
      <div className="text-center">
        <div className="text-gray-400 text-sm">
          Stack: <span className="text-white font-mono font-bold">{privateState.stack.toLocaleString()}</span>
        </div>
        {privateState.potTotal > 0 && (
          <div className="text-yellow-400 text-sm mt-1">
            Pot: {privateState.potTotal.toLocaleString()}
          </div>
        )}
      </div>

      {/* Middle: hole cards */}
      <div className="flex justify-center gap-3 my-8">
        {privateState.holeCards.map((card, i) => (
          <CardComponent key={i} card={card} size="lg" />
        ))}
      </div>

      {/* Bottom: actions */}
      <div className="pb-4">
        {privateState.isMyTurn ? (
          <ActionButtons
            socket={socket}
            availableActions={privateState.availableActions}
            callAmount={privateState.callAmount}
            minRaise={privateState.minRaise}
            maxRaise={privateState.maxRaise}
            stack={privateState.stack}
          />
        ) : (
          <div className="text-center text-gray-500 text-lg py-8">
            {privateState.status === 'folded' ? 'Folded' : 'Waiting for your turn...'}
          </div>
        )}
      </div>
    </div>
  );
}
