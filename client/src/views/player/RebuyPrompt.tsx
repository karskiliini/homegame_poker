import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S } from '@poker/shared';
import { useT } from '../../hooks/useT.js';

interface RebuyPromptProps {
  socket: Socket;
  maxBuyIn: number;
  deadline: number;
  onClose: () => void;
}

export function RebuyPrompt({ socket, maxBuyIn, deadline, onClose }: RebuyPromptProps) {
  const [remaining, setRemaining] = useState(
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  );
  const t = useT();

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) {
        clearInterval(interval);
        // Timeout → auto sit out
        socket.emit(C2S.SIT_OUT);
        onClose();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [deadline, onClose, socket]);

  const handleRebuy = () => {
    socket.emit(C2S.REBUY, { amount: maxBuyIn });
    onClose();
  };

  const handleSitOut = () => {
    socket.emit(C2S.SIT_OUT);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
        <h2 className="text-white text-xl font-bold text-center mb-2">
          {t('rebuy_title')}
        </h2>
        <p className="text-gray-400 text-center text-sm mb-4">
          {t('rebuy_subtitle')}
        </p>

        <div className="text-center text-yellow-400 text-2xl font-mono mb-6">
          {remaining}s
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRebuy}
            className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-lg"
          >
            {t('rebuy_button')} {maxBuyIn}
          </button>
          <button
            onClick={handleSitOut}
            className="w-full py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold text-lg"
          >
            {t('rebuy_sit_out')}
          </button>
        </div>
      </div>
    </div>
  );
}
