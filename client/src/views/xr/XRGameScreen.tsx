import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { createXRStore, XR } from '@react-three/xr';
import type { Socket } from 'socket.io-client';
import { C2S, C2S_TABLE } from '@poker/shared';
import type { ChatMessage } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';
import { useTableAnimations } from '../../hooks/useTableAnimations.js';
import { createTableSocket } from '../../socket.js';
import { XRScene } from './XRScene.js';

const xrStore = createXRStore();

interface XRGameScreenProps {
  socket: Socket;
  onOpenHistory?: () => void;
  onLeaveTable?: () => void;
  speechBubble?: ChatMessage | null;
  onSpeechBubbleDone?: () => void;
}

export function XRGameScreen({ socket, onLeaveTable }: XRGameScreenProps) {
  const { privateState, gameState, setGameState, currentTableId } = useGameStore();
  const tableSocketRef = useRef(createTableSocket());
  // Dummy container ref for useTableAnimations (chip-fly animations are skipped in VR)
  const dummyContainerRef = useRef<HTMLDivElement>(null);

  // Connect table socket and watch the current table
  useEffect(() => {
    const ts = tableSocketRef.current;
    ts.connect();

    const handleConnect = () => {
      if (currentTableId) {
        ts.emit(C2S_TABLE.WATCH, { tableId: currentTableId });
      }
    };

    ts.on('connect', handleConnect);
    if (ts.connected && currentTableId) {
      ts.emit(C2S_TABLE.WATCH, { tableId: currentTableId });
    }

    return () => {
      ts.off('connect', handleConnect);
      ts.disconnect();
    };
  }, [currentTableId]);

  const seatRotation = privateState?.seatIndex;
  const {
    winnerSeats, winningCards,
  } = useTableAnimations({
    socket: tableSocketRef.current,
    containerRef: dummyContainerRef,
    setGameState,
    enableSound: false,
    seatRotation,
  });

  return (
    <div style={{ width: '100vw', height: '100dvh', position: 'relative' }}>
      {/* Hidden dummy div for useTableAnimations containerRef */}
      <div ref={dummyContainerRef} style={{ display: 'none' }} />

      <Canvas
        camera={{ position: [0, 1.6, 0], fov: 75 }}
        style={{ width: '100%', height: '100%', background: '#0a0a0a' }}
      >
        <XR store={xrStore}>
          <XRScene
            socket={socket}
            gameState={gameState}
            privateState={privateState}
            winnerSeats={winnerSeats}
            winningCards={winningCards}
          />
        </XR>
      </Canvas>

      {/* Enter VR button */}
      <button
        onClick={() => xrStore.enterVR()}
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '14px 32px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          color: '#fff',
          fontSize: 18,
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(79, 70, 229, 0.4)',
          zIndex: 10,
        }}
      >
        Enter VR
      </button>

      {/* Leave table button */}
      {onLeaveTable && (
        <button
          onClick={onLeaveTable}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            padding: '10px 16px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            zIndex: 10,
          }}
        >
          Leave Table
        </button>
      )}
    </div>
  );
}
