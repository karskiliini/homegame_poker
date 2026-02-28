import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S_TABLE, C2S_LOBBY } from '@poker/shared';
import { createTableSocket } from '../../socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { useTableAnimations } from '../../hooks/useTableAnimations.js';
import { useT } from '../../hooks/useT.js';
import { PokerTable } from '../table/PokerTable.js';
import { tableSoundManager } from '../../audio/SoundManager.js';
import { SoundToggle } from '../../components/SoundToggle.js';
import { BugReportButton } from '../../components/BugReportButton.js';
import { LanguageToggle } from '../../components/LanguageToggle.js';

interface WatchingScreenProps {
  playerSocket: Socket;
}

export function WatchingScreen({ playerSocket }: WatchingScreenProps) {
  const {
    watchingTableId, setScreen, setWatchingTableId,
    gameState, setGameState, tables,
    playerName, playerAvatar,
  } = useGameStore();
  const t = useT();

  const tableSocketRef = useRef(createTableSocket());
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(tableSoundManager.enabled);
  const [showBuyIn, setShowBuyIn] = useState(false);
  const [buyInAmount, setBuyInAmount] = useState(0);

  const table = tables.find(t => t.tableId === watchingTableId);
  const maxBuyIn = table?.stakeLevel.maxBuyIn ?? 200;

  // Connect table socket and watch
  useEffect(() => {
    if (!watchingTableId) return;

    const ts = tableSocketRef.current;
    ts.connect();

    const handleConnect = () => {
      ts.emit(C2S_TABLE.WATCH, { tableId: watchingTableId });
    };

    ts.on('connect', handleConnect);
    if (ts.connected) {
      ts.emit(C2S_TABLE.WATCH, { tableId: watchingTableId });
    }

    return () => {
      ts.emit(C2S_TABLE.UNWATCH);
      ts.off('connect', handleConnect);
      ts.disconnect();
      setGameState(null);
    };
  }, [watchingTableId, setGameState]);

  const {
    potAwards, winnerSeats, awardingPotIndex,
    timerData, collectingBets, potGrow,
    betChipAnimations, dealCardAnimations,
    equities, dramaticRiver,
  } = useTableAnimations({
    socket: tableSocketRef.current,
    containerRef: tableContainerRef,
    setGameState,
    enableSound: true,
  });

  const toggleSound = useCallback(() => {
    const next = !tableSoundManager.enabled;
    tableSoundManager.setEnabled(next);
    setSoundEnabled(next);
  }, []);

  const handleBack = useCallback(() => {
    setWatchingTableId(null);
    setScreen('table_lobby');
  }, [setWatchingTableId, setScreen]);

  const handleSitDown = useCallback(() => {
    setBuyInAmount(maxBuyIn);
    setShowBuyIn(true);
  }, [maxBuyIn]);

  const handleConfirmSitDown = useCallback(() => {
    if (!watchingTableId || buyInAmount <= 0) return;
    playerSocket.emit(C2S_LOBBY.JOIN_TABLE, {
      tableId: watchingTableId,
      name: playerName,
      buyIn: buyInAmount,
      avatarId: playerAvatar,
    });
    setShowBuyIn(false);
  }, [watchingTableId, buyInAmount, playerSocket, playerName, playerAvatar]);

  return (
    <div
      ref={tableContainerRef}
      className="w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 50% 80%, #1A1208, #12100C, #0A0A0F, #050508)' }}
    >
      {/* Top controls */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={handleBack}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.1)',
            color: 'var(--ftp-text-secondary)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {t('watching_back')}
        </button>
      </div>
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <LanguageToggle />
        <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
      </div>

      {/* Poker table */}
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
          equities={equities}
          dramaticRiver={dramaticRiver}
        />
      ) : (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22 }}>{t('watching_connecting')}</div>
      )}

      {/* Bottom: Sit Down button */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center">
        <button
          onClick={handleSitDown}
          style={{
            padding: '14px 40px',
            borderRadius: 8,
            background: 'linear-gradient(180deg, var(--ftp-red), var(--ftp-red-dark))',
            color: 'white',
            fontWeight: 700,
            fontSize: 16,
            border: 'none',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: 1,
            boxShadow: '0 4px 0 var(--ftp-red-dark), 0 6px 12px rgba(0,0,0,0.4)',
          }}
        >
          {t('watching_sit_down')}
        </button>
      </div>

      {/* Buy-in modal */}
      {showBuyIn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowBuyIn(false)}
        >
          <div
            className="w-full max-w-xs p-6"
            style={{
              background: 'var(--ftp-bg-lobby)',
              borderRadius: 12,
              border: '1px solid var(--ftp-lobby-border)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold mb-1" style={{ color: '#FFFFFF', fontSize: 18 }}>
              {t('watching_buy_in')}
            </h2>
            <p className="mb-4" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              {table?.name} &mdash; {table?.stakeLevel.label}
            </p>
            <input
              type="number"
              value={buyInAmount}
              onChange={(e) => setBuyInAmount(Number(e.target.value))}
              min={1}
              max={maxBuyIn}
              className="w-full mb-4"
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                background: '#FFFFFF',
                color: 'var(--ftp-lobby-text)',
                border: '1px solid var(--ftp-lobby-border)',
                fontSize: 16,
                outline: 'none',
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowBuyIn(false)}
                className="flex-1 py-3 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'var(--ftp-text-secondary)',
                  border: '1px solid var(--ftp-lobby-border)',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {t('watching_cancel')}
              </button>
              <button
                onClick={handleConfirmSitDown}
                disabled={buyInAmount <= 0 || buyInAmount > maxBuyIn}
                className="flex-1 py-3 rounded-lg"
                style={{
                  background: buyInAmount <= 0 || buyInAmount > maxBuyIn
                    ? '#555'
                    : 'linear-gradient(180deg, var(--ftp-red), var(--ftp-red-dark))',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: buyInAmount <= 0 || buyInAmount > maxBuyIn ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                  boxShadow: buyInAmount > 0 && buyInAmount <= maxBuyIn
                    ? '0 2px 0 var(--ftp-red-dark)'
                    : 'none',
                }}
              >
                {t('watching_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <BugReportButton socket={tableSocketRef.current} />
    </div>
  );
}
