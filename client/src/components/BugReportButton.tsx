import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { BugReportModal } from './BugReportModal.js';

interface BugReportButtonProps {
  socket: Socket;
}

export function BugReportButton({ socket }: BugReportButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-4 left-4 z-50 w-10 h-10 rounded-full bg-red-700/80 hover:bg-red-600 text-white text-xs font-bold flex items-center justify-center shadow-lg"
        title="Report a bug"
      >
        BUG
      </button>
      {showModal && (
        <BugReportModal socket={socket} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
