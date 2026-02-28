import { useEffect, useRef, useState, useCallback } from 'react';
import { createTableSocket } from '../../socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { useTableAnimations } from '../../hooks/useTableAnimations.js';
import { PokerTable } from './PokerTable.js';
import { tableSoundManager } from '../../audio/SoundManager.js';
import { SoundToggle } from '../../components/SoundToggle.js';

export function TableView() {
  const socketRef = useRef(createTableSocket());
  const { gameState, setGameState } = useGameStore();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(tableSoundManager.enabled);

  const {
    potAwards, winnerSeats, awardingPotIndex,
    timerData, collectingBets, potGrow,
    betChipAnimations, dealCardAnimations,
  } = useTableAnimations({
    socket: socketRef.current,
    containerRef: tableContainerRef,
    setGameState,
    enableSound: true,
  });

  const toggleSound = useCallback(() => {
    const next = !tableSoundManager.enabled;
    tableSoundManager.setEnabled(next);
    setSoundEnabled(next);
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    socket.connect();
    return () => { socket.disconnect(); };
  }, []);

  return (
    <div
      ref={tableContainerRef}
      className="w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 50% 80%, #1A1208, #12100C, #0A0A0F, #050508)' }}
    >
      <SoundToggle
        enabled={soundEnabled}
        onToggle={toggleSound}
        className="fixed top-4 right-4 z-50"
      />
      {gameState ? (
        <PokerTable
          gameState={gameState}
          potAwards={potAwards}
          winnerSeats={winnerSeats}
          awardingPotIndex={awardingPotIndex}
          timerData={timerData}
          collectingBets={collectingBets}
          potGrow={potGrow}
          betChipAnimations={betChipAnimations}
          dealCardAnimations={dealCardAnimations}
        />
      ) : (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22 }}>Connecting...</div>
      )}
    </div>
  );
}
