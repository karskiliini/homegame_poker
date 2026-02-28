import type { Socket } from 'socket.io-client';
import { C2S } from '@poker/shared';
import { useT } from '../../hooks/useT.js';

interface ShowCardsPromptProps {
  socket: Socket;
  onClose: () => void;
}

export function ShowCardsPrompt({ socket, onClose }: ShowCardsPromptProps) {
  const t = useT();

  const respond = (show: boolean) => {
    socket.emit(C2S.SHOW_CARDS, { show });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4 pb-8">
      <div className="bg-gray-800 rounded-2xl p-4 max-w-sm w-full">
        <p className="text-white text-center font-medium mb-3">{t('show_cards_question')}</p>
        <div className="flex gap-3">
          <button
            onClick={() => respond(false)}
            className="flex-1 py-3 rounded-lg bg-gray-700 text-white font-bold"
          >
            {t('show_cards_muck')}
          </button>
          <button
            onClick={() => respond(true)}
            className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-bold"
          >
            {t('show_cards_show')}
          </button>
        </div>
      </div>
    </div>
  );
}
