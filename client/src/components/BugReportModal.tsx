import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S, S2C_PLAYER } from '@poker/shared';
import { useT } from '../hooks/useT.js';

interface BugReportModalProps {
  socket: Socket;
  onClose: () => void;
}

export function BugReportModal({ socket, onClose }: BugReportModalProps) {
  const [description, setDescription] = useState('');
  const [sent, setSent] = useState(false);
  const t = useT();

  useEffect(() => {
    const handleReported = () => {
      setSent(true);
      setTimeout(onClose, 1500);
    };
    socket.on(S2C_PLAYER.BUG_REPORTED, handleReported);
    return () => { socket.off(S2C_PLAYER.BUG_REPORTED, handleReported); };
  }, [socket, onClose]);

  const handleSend = () => {
    if (!description.trim()) return;
    socket.emit(C2S.REPORT_BUG, { description: description.trim() });
  };

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center">
          <p className="text-green-400 text-xl font-bold">{t('bug_report_thanks')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('bug_report_sent')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
        <h2 className="text-white text-lg font-bold mb-3">{t('bug_report_title')}</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('bug_report_placeholder')}
          maxLength={2000}
          rows={4}
          className="w-full bg-gray-700 text-white rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium"
          >
            {t('bug_report_cancel')}
          </button>
          <button
            onClick={handleSend}
            disabled={!description.trim()}
            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:text-gray-500 text-white font-medium"
          >
            {t('bug_report_send')}
          </button>
        </div>
      </div>
    </div>
  );
}
