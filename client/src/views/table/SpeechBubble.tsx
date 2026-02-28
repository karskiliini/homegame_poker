import { useEffect, useState } from 'react';
import type { ChatMessage } from '@poker/shared';

interface SpeechBubbleProps {
  message: ChatMessage;
  onDone: () => void;
}

export function SpeechBubble({ message, onDone }: SpeechBubbleProps) {
  const [fading, setFading] = useState(false);
  const duration = Math.min(5000, 3000 + Math.max(0, message.message.length - 20) * 50);

  useEffect(() => {
    const fadeStart = setTimeout(() => setFading(true), duration - 500);
    const done = setTimeout(onDone, duration);
    return () => {
      clearTimeout(fadeStart);
      clearTimeout(done);
    };
  }, [duration, onDone]);

  return (
    <div
      className={fading ? 'animate-speech-fade-out' : 'animate-speech-pop-in'}
      style={{
        maxWidth: 160,
        padding: '6px 10px',
        borderRadius: 10,
        background: '#FFFFFF',
        color: '#1A1A1A',
        fontSize: 13,
        lineHeight: 1.3,
        fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        position: 'relative',
        wordBreak: 'break-word',
        animationFillMode: 'forwards',
      }}
    >
      {message.message}
      {/* Triangle pointer */}
      <div
        style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          marginLeft: -5,
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '6px solid #FFFFFF',
        }}
      />
    </div>
  );
}
