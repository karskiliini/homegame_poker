import { useState, useRef, useCallback } from 'react';
import type { ChatMessage } from '@poker/shared';

export function useSpeechBubbleQueue() {
  const queueRef = useRef<ChatMessage[]>([]);
  const [activeBubble, setActiveBubble] = useState<ChatMessage | null>(null);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    setActiveBubble(next ?? null);
  }, []);

  const enqueue = useCallback((msg: ChatMessage) => {
    if (!activeBubble && queueRef.current.length === 0) {
      setActiveBubble(msg);
    } else {
      queueRef.current.push(msg);
    }
  }, [activeBubble]);

  const onBubbleDone = useCallback(() => {
    showNext();
  }, [showNext]);

  return { activeBubble, enqueue, onBubbleDone };
}
