import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S_TABLE, C2S_LOBBY, S2C_TABLE } from '@poker/shared';
import type { ChatMessage } from '@poker/shared';
import { createTableSocket } from '../../socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { useTableAnimations } from '../../hooks/useTableAnimations.js';
import { useSpeechBubbleQueue } from '../../hooks/useSpeechBubbleQueue.js';
import { useT } from '../../hooks/useT.js';
import { PokerTable, TABLE_VIRTUAL_W, TABLE_VIRTUAL_H } from '../table/PokerTable.js';
import { ChatWindow } from '../../components/ChatWindow.js';
import { tableSoundManager } from '../../audio/SoundManager.js';
import { SoundToggle } from '../../components/SoundToggle.js';
import { BugReportButton } from '../../components/BugReportButton.js';
import { LanguageToggle } from '../../components/LanguageToggle.js';
import { ThemeToggle } from '../../components/ThemeToggle.js';
import { useTheme } from '../../themes/useTheme.js';

// Use canonical virtual table dimensions from PokerTable
const TABLE_W = TABLE_VIRTUAL_W;
const TABLE_H = TABLE_VIRTUAL_H;

interface WatchingScreenProps {
  playerSocket: Socket;
}

export function WatchingScreen({ playerSocket }: WatchingScreenProps) {
  const {
    watchingTableId, setScreen, setWatchingTableId,
    gameState, setGameState, tables,
    playerName, playerAvatar,
    chatMessages, addChatMessage, clearChat,
    accountBalance,
  } = useGameStore();
  const t = useT();
  const { gradients } = useTheme();
  const { activeBubble, enqueue, onBubbleDone } = useSpeechBubbleQueue();

  const tableSocketRef = useRef(createTableSocket());
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showBuyIn, setShowBuyIn] = useState(false);
  const [buyInAmount, setBuyInAmount] = useState(0);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [chatMinimized, setChatMinimized] = useState(true);

  const table = tables.find(t => t.tableId === watchingTableId);
  const tableMaxBuyIn = table?.stakeLevel.maxBuyIn ?? 200;
  const maxBuyIn = Math.min(tableMaxBuyIn, accountBalance);
  const canBuyIn = accountBalance > 0;

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

    const handleChat = (msg: ChatMessage) => {
      addChatMessage(msg);
      enqueue(msg);
    };
    ts.on(S2C_TABLE.CHAT_MESSAGE, handleChat);

    return () => {
      ts.off(S2C_TABLE.CHAT_MESSAGE, handleChat);
      ts.emit(C2S_TABLE.UNWATCH);
      ts.off('connect', handleConnect);
      ts.disconnect();
      setGameState(null);
      clearChat();
    };
  }, [watchingTableId, setGameState, addChatMessage, enqueue, clearChat]);

  const {
    potAwards, winnerSeats, winningCards, awardingPotIndex,
    timerData, collectingBets, potGrow,
    betChipAnimations, dealCardAnimations,
    equities, dramaticRiver, badBeat, chipTrick,
  } = useTableAnimations({
    socket: tableSocketRef.current,
    containerRef: tableContainerRef,
    setGameState,
    enableSound: true,
  });

  // Calculate scale to fit the virtual table into the wrapper width (phone style)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateScale = () => {
      const wrapperWidth = wrapper.clientWidth;
      setScale((wrapperWidth / TABLE_W) * 0.75);
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  const handleBack = useCallback(() => {
    setWatchingTableId(null);
    setScreen('table_lobby');
  }, [setWatchingTableId, setScreen]);

  const handleSeatClick = useCallback((seatIndex: number) => {
    setSelectedSeat(seatIndex);
    setBuyInAmount(maxBuyIn);
    setShowBuyIn(true);
  }, [maxBuyIn]);

  const handleSitDown = useCallback(() => {
    setBuyInAmount(maxBuyIn);
    setSelectedSeat(null);
    setShowBuyIn(true);
  }, [maxBuyIn]);

  const handleConfirmSitDown = useCallback(() => {
    if (!watchingTableId || buyInAmount <= 0) return;
    playerSocket.emit(C2S_LOBBY.JOIN_TABLE, {
      tableId: watchingTableId,
      name: playerName,
      buyIn: buyInAmount,
      avatarId: playerAvatar,
      ...(selectedSeat !== null ? { seatIndex: selectedSeat } : {}),
    });
    setShowBuyIn(false);
    setSelectedSeat(null);
  }, [watchingTableId, buyInAmount, playerSocket, playerName, playerAvatar, selectedSeat]);

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: '100dvh', background: gradients.phoneBackground }}
    >
      {/* Top: Mini poker table (same layout as GameScreen) */}
      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden flex items-center justify-center flex-1"
        style={{
          minHeight: '38vh',
          background: gradients.phoneRadialBackground,
        }}
      >
        {/* Top-left: Back button */}
        <div className="absolute top-3 left-3 z-30">
          <button
            onClick={handleBack}
            style={{
              padding: '10px 16px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--ftp-text-secondary)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {t('watching_back')}
          </button>
        </div>

        {/* Top-right: Controls */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-3">
          <ThemeToggle />
          <LanguageToggle />
          <SoundToggle soundManager={tableSoundManager} />
        </div>

        {/* Poker table -- fixed virtual size, scaled to fit wrapper width */}
        {gameState ? (
          <div
            ref={tableContainerRef}
            style={{
              width: TABLE_W,
              height: TABLE_H,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            <PokerTable
              gameState={gameState}
              potAwards={potAwards}
              winnerSeats={winnerSeats}
              winningCards={winningCards}
              awardingPotIndex={awardingPotIndex}
              timerData={timerData}
              collectingBets={collectingBets}
              potGrow={potGrow}
              betChipAnimations={betChipAnimations}
              dealCardAnimations={dealCardAnimations}
              equities={equities}
              dramaticRiver={dramaticRiver}
              badBeat={badBeat}
              chipTrick={chipTrick}
              onSeatClick={handleSeatClick}
              speechBubble={activeBubble}
              onSpeechBubbleDone={onBubbleDone}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>
              {t('watching_connecting')}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Sit Down + Chat (same position as GameScreen action panel) */}
      <div
        className="flex flex-col px-3 pt-1 pb-1"
        style={{
          background: 'rgba(0,0,0,0.5)',
          paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Sit Down area */}
        <div className="flex flex-col items-center gap-2 py-3">
          {!canBuyIn && (
            <span style={{ color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
              {t('balance_insufficient')}
            </span>
          )}
          <button
            onClick={canBuyIn ? handleSitDown : undefined}
            disabled={!canBuyIn}
            style={{
              padding: '14px 40px',
              borderRadius: 8,
              background: canBuyIn
                ? 'linear-gradient(180deg, var(--ftp-red), var(--ftp-red-dark))'
                : '#555',
              color: 'white',
              fontWeight: 700,
              fontSize: 16,
              border: 'none',
              cursor: canBuyIn ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase',
              letterSpacing: 1,
              boxShadow: canBuyIn
                ? '0 4px 0 var(--ftp-red-dark), 0 6px 12px rgba(0,0,0,0.4)'
                : 'none',
              opacity: canBuyIn ? 1 : 0.5,
            }}
          >
            {t('watching_sit_down')}
          </button>
        </div>

        {/* Chat */}
        <ChatWindow messages={chatMessages} minimized={chatMinimized} onToggleMinimize={() => setChatMinimized(m => !m)} />
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
              {selectedSeat !== null && (
                <span style={{ color: 'var(--ftp-gold)', marginLeft: 8 }}>
                  {t('table_seat')} {selectedSeat + 1}
                </span>
              )}
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
