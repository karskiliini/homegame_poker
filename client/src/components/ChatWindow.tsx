import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@poker/shared';

interface ChatWindowProps {
  messages: ChatMessage[];
}

export function ChatWindow({ messages }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div
      style={{
        width: 280,
        height: 200,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(8px)',
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 30,
      }}
    >
      {/* Fade mask: transparent at top, opaque at bottom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 40%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 40%)',
        }}
      />
      <div
        ref={scrollRef}
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          scrollbarWidth: 'none',
        }}
      >
        {/* Spacer to push messages to bottom when few */}
        <div style={{ flex: 1 }} />
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="animate-chat-slide-in"
            style={{ fontSize: 13, lineHeight: 1.4 }}
          >
            <span style={{ color: 'var(--ftp-gold)', fontWeight: 600 }}>
              {msg.senderName}:
            </span>{' '}
            <span style={{ color: '#FFFFFF' }}>{msg.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
