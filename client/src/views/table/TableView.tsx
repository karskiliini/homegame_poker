import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { S2C_LOBBY, C2S_TABLE } from '@poker/shared';
import type { TableInfo } from '@poker/shared';
import { createTableSocket } from '../../socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { useTableAnimations } from '../../hooks/useTableAnimations.js';
import { PokerTable } from './PokerTable.js';
import { TableLobbyTV } from './TableLobbyTV.js';
import { tableSoundManager } from '../../audio/SoundManager.js';
import { SoundToggle } from '../../components/SoundToggle.js';
import { BugReportButton } from '../../components/BugReportButton.js';

export function TableView() {
  const { tableId: urlTableId } = useParams<{ tableId?: string }>();
  const socketRef = useRef(createTableSocket());
  const { gameState, setGameState, setTables } = useGameStore();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(tableSoundManager.enabled);
  const [watchingTableId, setWatchingTableId] = useState<string | null>(urlTableId || null);

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

    socket.on(S2C_LOBBY.TABLE_LIST, (tables: TableInfo[]) => {
      setTables(tables);
    });

    return () => { socket.disconnect(); };
  }, [setTables]);

  // If URL has tableId, watch it immediately on connect
  useEffect(() => {
    if (urlTableId && socketRef.current.connected) {
      socketRef.current.emit(C2S_TABLE.WATCH, { tableId: urlTableId });
      setWatchingTableId(urlTableId);
    }
  }, [urlTableId]);

  // Watch on connect if we have a tableId
  useEffect(() => {
    const socket = socketRef.current;
    const handleConnect = () => {
      if (watchingTableId) {
        socket.emit(C2S_TABLE.WATCH, { tableId: watchingTableId });
      }
    };
    socket.on('connect', handleConnect);
    return () => { socket.off('connect', handleConnect); };
  }, [watchingTableId]);

  const handleSelectTable = useCallback((tableId: string) => {
    socketRef.current.emit(C2S_TABLE.WATCH, { tableId });
    setWatchingTableId(tableId);
    setGameState(null);
  }, [setGameState]);

  const handleBackToLobby = useCallback(() => {
    socketRef.current.emit(C2S_TABLE.UNWATCH);
    setWatchingTableId(null);
    setGameState(null);
  }, [setGameState]);

  // Lobby mode
  if (!watchingTableId) {
    return <TableLobbyTV socket={socketRef.current} onSelectTable={handleSelectTable} />;
  }

  // Watch mode
  return (
    <div
      ref={tableContainerRef}
      className="w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 50% 80%, #1A2744, #141E33, #0D1526, #080C18)' }}
    >
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <SoundToggle
          enabled={soundEnabled}
          onToggle={toggleSound}
        />
        {!urlTableId && (
          <button
            onClick={handleBackToLobby}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--ftp-text-secondary)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Back
          </button>
        )}
      </div>
      <BugReportButton socket={socketRef.current} />
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
