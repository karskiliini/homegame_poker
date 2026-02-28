import { useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S } from '@poker/shared';
import { useT } from '../hooks/useT.js';

interface ChatInputProps {
  socket: Socket;
}

export function ChatInput({ socket }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const t = useT();

  const send = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed) return;
    socket.emit(C2S.CHAT, { message: trimmed });
    setMessage('');
  }, [message, socket]);

  return (
    <div
      className="flex items-center gap-2"
      style={{
        padding: '6px 12px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        maxLength={200}
        placeholder={t('chat_placeholder')}
        style={{
          flex: 1,
          padding: '8px 14px',
          borderRadius: 20,
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          fontSize: 14,
          outline: 'none',
        }}
      />
      <button
        onClick={send}
        disabled={!message.trim()}
        style={{
          padding: '8px 16px',
          borderRadius: 20,
          background: message.trim() ? '#2563EB' : 'rgba(255, 255, 255, 0.1)',
          color: message.trim() ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
          border: 'none',
          fontSize: 14,
          fontWeight: 600,
          cursor: message.trim() ? 'pointer' : 'default',
          transition: 'background 0.2s ease',
        }}
      >
        {t('chat_send')}
      </button>
    </div>
  );
}
