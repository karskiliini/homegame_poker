import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { C2S, C2S_TABLE, resolvePreAction } from '@poker/shared';
import type { PreActionType } from '@poker/shared';
import { useGameStore } from '../../hooks/useGameStore.js';
import { useTableAnimations } from '../../hooks/useTableAnimations.js';
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
          height: '58vh',
          background: 'radial-gradient(ellipse at 50% 80%, #1A2744, #141E33, #0D1526)',
        }}
      >
        {/* Leave Table button */}
        {onLeaveTable && !isHandActive && (
          <button
            onClick={onLeaveTable}
            className="absolute top-3 left-3 z-30"
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
            Leave Table
          </button>
        )}

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
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>
              Connecting to table...
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Own cards + actions (~42vh) */}
      <div
        className="flex-1 flex flex-col justify-between px-4 pt-3 pb-4"
        style={{
          opacity: isFolded ? 0.6 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* Cards + stack row */}
        <div className="flex items-center justify-center gap-4">
          {privateState && privateState.holeCards.length > 0 ? (
            <>
              <div className="flex gap-2">
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
                    <CardComponent card={card} size="lg" />
                  </div>
                ))}
              </div>
              <div className="text-right ml-2">
                <div style={{ color: 'var(--ftp-text-secondary)', fontSize: 12 }}>Stack</div>
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
                    Pot: {privateState.potTotal.toLocaleString()}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: 20 }}>
              Waiting for cards...
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-2">
          {isSittingOut && (privateState?.stack ?? 0) > 0 ? (
            <div className="text-center py-4 space-y-3">
              <div style={{ color: 'var(--ftp-text-muted)', fontSize: 15 }}>
                Sitting Out
              </div>
              <button
                onClick={() => socket.emit(C2S.SIT_IN)}
                className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-lg"
              >
                Sit In
              </button>
            </div>
          ) : (isBusted || (privateState?.stack ?? 0) <= 0) ? (
            <div className="text-center py-4 space-y-3">
              <div style={{ color: 'var(--ftp-text-muted)', fontSize: 15 }}>
                {isBusted ? 'Busted' : 'Sitting Out'}
              </div>
              <button
                onClick={() => socket.emit(C2S.REBUY, { amount: config?.maxBuyIn ?? 200 })}
                className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-lg"
              >
                Rebuy {config?.maxBuyIn ?? 200}
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
            <div className="text-center py-4">
              <div style={{
                color: isFolded ? 'var(--ftp-text-muted)' : 'var(--ftp-text-secondary)',
                fontSize: 15,
              }}>
                {isFolded ? 'Folded' : 'Waiting for your turn...'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
