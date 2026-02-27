import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S } from '@poker/shared';

interface RunItTwicePromptProps {
  socket: Socket;
  deadline: number;
  onClose: () => void;
}

export function RunItTwicePrompt({ socket, deadline, onClose }: RunItTwicePromptProps) {
  const [remaining, setRemaining] = useState(
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [deadline, onClose]);

  const respond = (accept: boolean, alwaysNo = false) => {
    socket.emit(C2S.RIT_RESPONSE, { accept, alwaysNo });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
        <h2 className="text-white text-xl font-bold text-center mb-2">
          Run It Twice?
        </h2>
        <p className="text-gray-400 text-center text-sm mb-4">
          All players are all-in. Deal the remaining cards twice and split the pot?
        </p>

        <div className="text-center text-yellow-400 text-2xl font-mono mb-6">
          {remaining}s
        </div>

        <div className="space-y-3">
          <button
            onClick={() => respond(true)}
            className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-lg"
          >
            Yes
          </button>
          <button
            onClick={() => respond(false)}
            className="w-full py-3 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold text-lg"
          >
            No
          </button>
          <button
            onClick={() => respond(false, true)}
            className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"
          >
            Always No (don't ask again)
          </button>
        </div>
      </div>
    </div>
  );
}
