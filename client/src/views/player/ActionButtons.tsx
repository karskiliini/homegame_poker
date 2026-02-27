import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ActionType } from '@poker/shared';
import { C2S } from '@poker/shared';

interface ActionButtonsProps {
  socket: Socket;
  availableActions: ActionType[];
  callAmount: number;
  minRaise: number;
  maxRaise: number;
  stack: number;
}

export function ActionButtons({
  socket, availableActions, callAmount, minRaise, maxRaise, stack,
}: ActionButtonsProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  const sendAction = (action: ActionType, amount?: number) => {
    socket.emit(C2S.ACTION, { action, amount });
  };

  const canFold = availableActions.includes('fold');
  const canCheck = availableActions.includes('check');
  const canCall = availableActions.includes('call');
  const canBet = availableActions.includes('bet');
  const canRaise = availableActions.includes('raise');

  if (showRaiseSlider) {
    return (
      <div className="space-y-4">
        {/* Slider */}
        <div className="px-2">
          <input
            type="range"
            min={minRaise}
            max={maxRaise}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            className="w-full h-3 rounded-lg appearance-none bg-gray-700 accent-yellow-500"
          />
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>{minRaise}</span>
            <span className="text-yellow-400 font-bold text-lg">{raiseAmount}</span>
            <span>All-in ({maxRaise})</span>
          </div>
        </div>

        {/* Quick buttons */}
        <div className="flex gap-2 justify-center">
          {[0.33, 0.5, 0.75, 1].map((fraction) => {
            const amount = Math.min(Math.round(maxRaise * fraction), maxRaise);
            if (amount < minRaise) return null;
            return (
              <button
                key={fraction}
                onClick={() => setRaiseAmount(amount)}
                className="px-3 py-1 rounded bg-gray-700 text-white text-sm hover:bg-gray-600"
              >
                {fraction === 1 ? 'All-in' : `${Math.round(fraction * 100)}%`}
              </button>
            );
          })}
        </div>

        {/* Confirm / Cancel */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowRaiseSlider(false)}
            className="flex-1 py-3 rounded-lg bg-gray-700 text-white font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              sendAction(raiseAmount === maxRaise ? 'all_in' : (canBet ? 'bet' : 'raise'), raiseAmount);
              setShowRaiseSlider(false);
            }}
            className="flex-1 py-3 rounded-lg bg-yellow-600 text-white font-bold"
          >
            {raiseAmount === maxRaise ? 'All-in' : `Raise to ${raiseAmount}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {canFold && (
        <button
          onClick={() => sendAction('fold')}
          className="flex-1 py-4 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold text-lg transition-colors"
        >
          Fold
        </button>
      )}

      {canCheck && (
        <button
          onClick={() => sendAction('check')}
          className="flex-1 py-4 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold text-lg transition-colors"
        >
          Check
        </button>
      )}

      {canCall && (
        <button
          onClick={() => sendAction('call', callAmount)}
          className="flex-1 py-4 rounded-lg bg-green-700 hover:bg-green-600 text-white font-bold text-lg transition-colors"
        >
          Call {callAmount}
        </button>
      )}

      {(canBet || canRaise) && (
        <button
          onClick={() => {
            setRaiseAmount(minRaise);
            setShowRaiseSlider(true);
          }}
          className="flex-1 py-4 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-lg transition-colors"
        >
          {canBet ? 'Bet' : 'Raise'}
        </button>
      )}
    </div>
  );
}
