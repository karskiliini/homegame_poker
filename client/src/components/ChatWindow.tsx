import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@poker/shared';

interface ChatWindowProps {
  messages: ChatMessage[];
  minimized?: boolean;
  onToggleMinimize?: () => void;
}

export function ChatWindow({ messages, minimized: minimizedProp, onToggleMinimize }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [minimizedLocal, setMinimizedLocal] = useState(false);
  const minimized = minimizedProp ?? minimizedLocal;
  const toggle = onToggleMinimize ?? (() => setMinimizedLocal(m => !m));

  useEffect(() => {
    if (scrollRef.current && !minimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, minimized]);

  if (messages.length === 0) return null;

  const lastMessage = messages[messages.length - 1];

  return (
    <div
      style={{
        width: '100%',
        height: minimized ? 36 : 180,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(8px)',
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 30,
        transition: 'height 200ms ease',
      }}
    >
      {/* Header bar — click to toggle */}
      <div
        onClick={toggle}
        style={{
          height: 36,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: minimized ? 'none' : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {minimized ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', flex: 1 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, flexShrink: 0 }}>Chat ▴</span>
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: 'var(--ftp-gold)' }}>{lastMessage.senderName}:</span>{' '}
              {lastMessage.message}
            </span>
          </div>
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Chat ▾</span>
        )}
      </div>

      {/* Message list */}
      {!minimized && (
        <>
          {/* Fade mask: transparent at top, opaque at bottom */}
          <div
            style={{
              position: 'absolute',
              top: 36,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              zIndex: 1,
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 40%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 40%)',
            }}
          />
          <div
            ref={scrollRef}
            style={{
              height: 144,
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
        </>
      )}
    </div>
  );
}
