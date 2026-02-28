import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S, C2S_TABLE, resolvePreAction } from '@poker/shared';
import type { PreActionType } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';
import { useTableAnimations } from '../../hooks/useTableAnimations.js';
import { useT } from '../../hooks/useT.js';
import { createTableSocket } from '../../socket.js';
import { PokerTable } from '../table/PokerTable.js';
import { CardComponent } from '../../components/Card.js';
import { ActionButtons } from './ActionButtons.js';
import { PreActionButtons } from './PreActionButtons.js';

// Virtual table dimensions for scaling
const TABLE_W = 900;
const TABLE_H = 550;

interface GameScreenProps {
  socket: Socket;
  onOpenHistory?: () => void;
  onLeaveTable?: () => void;
}

export function GameScreen({ socket, onOpenHistory, onLeaveTable }: GameScreenProps) {
  const { privateState, lobbyState, gameState, setGameState, currentTableId } = useGameStore();
  const tableSocketRef = useRef(createTableSocket());
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const t = useT();

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

  // Animation hook — sound disabled (PlayerView handles sound via /player namespace)
  const seatRotation = privateState?.seatIndex;
  const {
    potAwards, winnerSeats, awardingPotIndex,
    timerData, collectingBets, potGrow,
    betChipAnimations, dealCardAnimations,
    equities, dramaticRiver,
  } = useTableAnimations({
    socket: tableSocketRef.current,
    containerRef: tableContainerRef,
    setGameState,
    enableSound: false,
    seatRotation,
  });

  // Calculate scale to fit the virtual table into the wrapper width
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateScale = () => {
      const wrapperWidth = wrapper.clientWidth;
      setScale(wrapperWidth / TABLE_W);
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  // Pre-action state
  const [preAction, setPreAction] = useState<PreActionType | null>(null);
  const prevIsMyTurn = useRef(false);

  // Auto-action when it becomes our turn
  useEffect(() => {
    if (!privateState) return;
    const justBecameMyTurn = privateState.isMyTurn && !prevIsMyTurn.current;
    prevIsMyTurn.current = privateState.isMyTurn;

    if (!justBecameMyTurn || !preAction) return;

    const autoAction = resolvePreAction(preAction, privateState.availableActions);
    setPreAction(null);

    if (autoAction) {
      socket.emit(C2S.ACTION, { action: autoAction });
    }
  }, [privateState?.isMyTurn, preAction, privateState?.availableActions, socket]);

  // Reset pre-action when hand ends (hole cards cleared)
  useEffect(() => {
    if (privateState && privateState.holeCards.length === 0) {
      setPreAction(null);
    }
  }, [privateState?.holeCards.length]);

  const isFolded = privateState?.status === 'folded';
  const isSittingOut = privateState?.status === 'sitting_out';
  const isBusted = privateState?.status === 'busted';
  const sitOutNextHand = privateState?.sitOutNextHand ?? false;
  const autoMuck = privateState?.autoMuck ?? false;
  const isHandActive = lobbyState?.phase === 'hand_in_progress';
  const showActions = privateState?.isMyTurn && isHandActive && (privateState?.availableActions.length ?? 0) > 0;
  const showPreActions = !privateState?.isMyTurn && isHandActive && !isFolded && !isSittingOut && !isBusted && (privateState?.holeCards.length ?? 0) > 0;

  const config = gameState?.config;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0D1526 0%, #0F1828 100%)' }}
    >
      {/* Top: Mini poker table (~60vh) */}
      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden"
        style={{
          height: '79vh',
          background: 'radial-gradient(ellipse at 50% 80%, #1A2744, #141E33, #0D1526)',
        }}
      >
        {/* Top-left buttons: Leave Table + Sit Out */}
        <div className="absolute top-3 left-3 z-30 flex gap-2">
          {onLeaveTable && !isHandActive && (
            <button
              onClick={onLeaveTable}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.1)',
                color: 'var(--ftp-text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {t('game_leave_table')}
            </button>
          )}
          {!isSittingOut && !isBusted && (!isHandActive || isFolded) && (
            <button
              onClick={() => socket.emit(C2S.SIT_OUT)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.1)',
                color: 'var(--ftp-text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {t('game_sit_out')}
            </button>
          )}
        </div>

        {gameState ? (
          <div
            ref={tableContainerRef}
            style={{
              width: TABLE_W,
              height: TABLE_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
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
              mySeatIndex={privateState?.seatIndex}
              myPlayerId={privateState?.id}
              myHoleCards={privateState?.holeCards}
              highlightMySeat
              equities={equities}
              dramaticRiver={dramaticRiver}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>
              {t('game_connecting')}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Own cards + actions */}
      <div
        className="flex-1 flex flex-col px-4 pt-1 pb-1"
        style={{
          background: 'rgba(0,0,0,0.5)',
          opacity: isFolded ? 0.6 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* Cards + stack row */}
        <div className="flex items-center justify-center gap-4">
          {privateState && privateState.holeCards.length > 0 ? (
            <>
              <div className="flex" style={{ gap: privateState.holeCards.length > 2 ? 4 : 8 }}>
                {privateState.holeCards.map((card, i) => (
                  <div
                    key={i}
                    className="animate-card-flip"
                    style={{
                      animationDelay: `${i * 120}ms`,
                      opacity: isFolded ? 0.35 : 1,
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    <CardComponent card={card} size={privateState.holeCards.length > 2 ? 'md' : 'lg'} />
                  </div>
                ))}
              </div>
              <div className="text-right ml-2">
                <div style={{ color: 'var(--ftp-text-secondary)', fontSize: 12 }}>{t('game_stack')}</div>
                <div
                  className="font-mono font-bold tabular-nums"
                  style={{ color: '#FFFFFF', fontSize: 20 }}
                >
                  {privateState.stack.toLocaleString()}
                </div>
                {privateState.potTotal > 0 && (
                  <div
                    className="font-mono tabular-nums"
                    style={{ color: '#EAB308', fontSize: 13 }}
                  >
                    {t('game_pot')} {privateState.potTotal.toLocaleString()}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 8 }}>
              {t('game_waiting_cards')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-1">
          {isSittingOut && (privateState?.stack ?? 0) > 0 ? (
            <div className="text-center py-2 space-y-2">
              <div style={{ color: 'var(--ftp-text-muted)', fontSize: 14 }}>
                {t('game_sitting_out')}
              </div>
              <button
                onClick={() => socket.emit(C2S.SIT_IN)}
                className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-base"
              >
                {t('game_sit_in')}
              </button>
            </div>
          ) : (isBusted || isSittingOut || (privateState?.stack ?? 0) <= 0) ? (
            <div className="text-center py-2 space-y-2">
              <div style={{ color: 'var(--ftp-text-muted)', fontSize: 14 }}>
                {isBusted ? t('game_busted') : t('game_sitting_out')}
              </div>
              <button
                onClick={() => socket.emit(C2S.REBUY, { amount: config?.maxBuyIn ?? 200 })}
                className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-base"
              >
                {t('game_rebuy')} {config?.maxBuyIn ?? 200}
              </button>
            </div>
          ) : showActions && privateState ? (
            <ActionButtons
              socket={socket}
              availableActions={privateState.availableActions}
              callAmount={privateState.callAmount}
              minRaise={privateState.minRaise}
              maxRaise={privateState.maxRaise}
              stack={privateState.stack}
              potTotal={privateState.potTotal}
              bigBlind={config?.bigBlind ?? 2}
              maxBuyIn={config?.maxBuyIn ?? 200}
            />
          ) : showPreActions ? (
            <PreActionButtons preAction={preAction} setPreAction={setPreAction} />
          ) : (
            <div className="text-center py-2">
              <div style={{
                color: isFolded ? 'var(--ftp-text-muted)' : 'var(--ftp-text-secondary)',
                fontSize: 14,
              }}>
                {isFolded ? t('game_folded') : t('game_waiting_turn')}
              </div>
            </div>
          )}
        </div>

        {/* Sit Out Next Hand + Auto-Muck checkboxes */}
        {!isSittingOut && !isBusted && (privateState?.stack ?? 0) > 0 && (
          <div className="flex justify-center gap-3 mt-1">
            <button
              onClick={() => socket.emit(C2S.SIT_OUT_NEXT_HAND)}
              className="flex items-center gap-2"
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: sitOutNextHand ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                border: sitOutNextHand ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: sitOutNextHand ? '2px solid #EAB308' : '2px solid rgba(255,255,255,0.3)',
                  background: sitOutNextHand ? '#EAB308' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  fontSize: 11,
                  color: '#000',
                  fontWeight: 700,
                }}
              >
                {sitOutNextHand && '\u2713'}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: sitOutNextHand ? '#EAB308' : 'var(--ftp-text-muted)',
                  fontWeight: sitOutNextHand ? 600 : 400,
                }}
              >
                Sit Out Next Hand
              </span>
            </button>
            <button
              onClick={() => socket.emit(C2S.AUTO_MUCK)}
              className="flex items-center gap-2"
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: autoMuck ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                border: autoMuck ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: autoMuck ? '2px solid #EAB308' : '2px solid rgba(255,255,255,0.3)',
                  background: autoMuck ? '#EAB308' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  fontSize: 11,
                  color: '#000',
                  fontWeight: 700,
                }}
              >
                {autoMuck && '\u2713'}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: autoMuck ? '#EAB308' : 'var(--ftp-text-muted)',
                  fontWeight: autoMuck ? 600 : 400,
                }}
              >
                Auto-Muck
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
