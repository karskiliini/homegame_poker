import { useState, useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { ActionType, GameType } from '@poker/shared';
import { C2S, calcPotSizedBet, calcHalfPotBet } from '@poker/shared';
import { useT } from '../../hooks/useT.js';
import { useTheme } from '../../themes/useTheme.js';

interface ActionButtonsProps {
  socket: Socket;
  availableActions: ActionType[];
  callAmount: number;
  minRaise: number;
  maxRaise: number;
  stack: number;
  currentBet: number;
  potTotal: number;
  bigBlind: number;
  maxBuyIn: number;
  gameType: GameType;
}

export function ActionButtons({
  socket, availableActions, callAmount, minRaise, maxRaise, stack, currentBet,
  potTotal, bigBlind, maxBuyIn, gameType,
}: ActionButtonsProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();

  // Reset raiseAmount to minRaise when available actions change
  useEffect(() => {
    setRaiseAmount(minRaise);
  }, [minRaise, availableActions]);

  const clampRaise = useCallback((v: number) => {
    return Math.min(Math.max(Math.round(v), minRaise), maxRaise);
  }, [minRaise, maxRaise]);

  const sendAction = (action: ActionType, amount?: number) => {
    socket.emit(C2S.ACTION, { action, amount });
  };

  const canFold = availableActions.includes('fold');
  const canCheck = availableActions.includes('check');
  const canCall = availableActions.includes('call');
  const canBet = availableActions.includes('bet');
  const canRaise = availableActions.includes('raise');

  // Calculate pot-based presets (proper pot-sized raise = call + pot after call)
  const halfPot = calcHalfPotBet(potTotal, callAmount, currentBet, minRaise, maxRaise);
  const fullPot = calcPotSizedBet(potTotal, callAmount, currentBet, minRaise, maxRaise);

  const isPotLimit = gameType === 'PLO';
  // In PLO, maxRaise may be pot-limit (not all-in). True all-in = stack + currentBet
  const allInAmount = stack + currentBet;
  const isMaxAllIn = maxRaise >= allInAmount;

  // Slider step: 5% of max buy-in
  const sliderStep = Math.max(1, Math.round(maxBuyIn * 0.05));

  const smallBlind = Math.round(bigBlind / 2);

  // Mouse wheel handler: 1 big blind per scroll tick
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? bigBlind : -bigBlind;
    setRaiseAmount(prev => clampRaise(prev + delta));
  }, [bigBlind, clampRaise]);

  const sliderRef = useRef<HTMLInputElement>(null);
  const isDraggingThumb = useRef(false);

  // Prevent native jump-to-click; step by 1 small blind toward click instead
  const handleSliderPointerDown = useCallback((e: React.PointerEvent<HTMLInputElement>) => {
    const input = sliderRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    const thumbWidth = 28; // matches CSS thumb size
    const trackLeft = rect.left + thumbWidth / 2;
    const trackWidth = rect.width - thumbWidth;

    // Where the thumb currently sits (pixel offset from track start)
    const fraction = (raiseAmount - minRaise) / (maxRaise - minRaise || 1);
    const thumbCenter = trackLeft + fraction * trackWidth;

    // If click is within the thumb area, allow normal drag
    if (Math.abs(e.clientX - thumbCenter) <= thumbWidth / 2) {
      isDraggingThumb.current = true;
      return;
    }

    // Click is on the track — prevent native jump and step by 1 small blind
    e.preventDefault();
    const direction = e.clientX > thumbCenter ? 1 : -1;
    setRaiseAmount(prev => clampRaise(prev + direction * smallBlind));
  }, [raiseAmount, minRaise, maxRaise, smallBlind, clampRaise]);

  const handleSliderPointerUp = useCallback(() => {
    isDraggingThumb.current = false;
  }, []);

  return (
    <div className="space-y-3 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.4)' }}>
      {/* Main action buttons */}
      <div className="flex gap-3">
        {canFold && (
          <FTPButton color="fold" onClick={() => sendAction('fold')} className="flex-1">
            {t('action_fold')}
          </FTPButton>
        )}

        {canCheck && (
          <FTPButton color="check" onClick={() => sendAction('check')} className="flex-1">
            {t('action_check')}
          </FTPButton>
        )}

        {canCall && (
          <FTPButton color="call" onClick={() => sendAction('call', callAmount)} className="flex-1">
            {t('action_call')} {callAmount.toLocaleString()}
          </FTPButton>
        )}

        {(canBet || canRaise) && (
          <FTPButton
            color="raise"
            onClick={() => {
              // In PLO, only send all_in if raiseAmount truly covers entire stack
              const shouldAllIn = raiseAmount === maxRaise && isMaxAllIn;
              sendAction(shouldAllIn ? 'all_in' : (canBet ? 'bet' : 'raise'), raiseAmount);
            }}
            className="flex-1"
          >
            {raiseAmount === maxRaise && isMaxAllIn
              ? t('action_all_in')
              : `${canBet ? t('action_bet') : t('action_raise')} ${raiseAmount.toLocaleString()}`}
          </FTPButton>
        )}
      </div>

      {/* Inline raise slider + presets (always visible when raise/bet available) */}
      {(canBet || canRaise) && (
        <>
          {/* Preset buttons */}
          <div className="flex gap-2 justify-center">
            <PresetButton label={t('action_min')} onClick={() => setRaiseAmount(minRaise)} />
            <PresetButton label={t('action_half_pot')} onClick={() => setRaiseAmount(Math.min(halfPot, maxRaise))} />
            <PresetButton label={t('action_pot')} onClick={() => setRaiseAmount(Math.min(fullPot, maxRaise))} active={isPotLimit && raiseAmount === maxRaise} />
            {!isPotLimit && (
              <PresetButton label={t('action_all_in_preset')} onClick={() => setRaiseAmount(maxRaise)} active={raiseAmount === maxRaise} />
            )}
          </div>

          {/* Slider */}
          <div className="px-1">
            <input
              ref={sliderRef}
              type="range"
              min={minRaise}
              max={maxRaise}
              step={sliderStep}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              onPointerDown={handleSliderPointerDown}
              onPointerUp={handleSliderPointerUp}
              onWheel={handleWheel}
              className="w-full ftp-slider"
            />
            <div className="flex justify-between items-center mt-1">
              <span style={{ color: 'var(--ftp-text-muted)', fontSize: 12 }}>{minRaise}</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                className="font-bold font-mono tabular-nums text-center"
                style={{
                  color: '#EAB308',
                  fontSize: 20,
                  background: isEditing ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: isEditing ? '1px solid #D97706' : '1px solid transparent',
                  borderRadius: 6,
                  outline: 'none',
                  width: 100,
                  padding: '2px 4px',
                }}
                value={isEditing ? inputValue : raiseAmount.toLocaleString()}
                onFocus={() => {
                  setIsEditing(true);
                  setInputValue(String(raiseAmount));
                  setTimeout(() => inputRef.current?.select(), 0);
                }}
                onBlur={() => {
                  setIsEditing(false);
                  const parsed = parseInt(inputValue, 10);
                  if (!isNaN(parsed)) {
                    setRaiseAmount(clampRaise(parsed));
                  }
                }}
                onChange={(e) => {
                  setInputValue(e.target.value.replace(/[^0-9]/g, ''));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    inputRef.current?.blur();
                  }
                }}
              />
              <span style={{ color: 'var(--ftp-text-muted)', fontSize: 12 }}>
                {isPotLimit && !isMaxAllIn ? t('action_pot') : t('action_all_in_preset')} ({maxRaise})
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// FTP-style 3D action button
function FTPButton({
  color,
  onClick,
  children,
  className = '',
}: {
  color: 'fold' | 'check' | 'call' | 'raise';
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const { cssVars } = useTheme();
  const styles: Record<string, { bg1: string; bg2: string; shadow: string }> = {
    fold: { bg1: cssVars.btnFold, bg2: cssVars.btnFoldDark, shadow: cssVars.btnFoldShadow },
    check: { bg1: cssVars.btnCheck, bg2: cssVars.btnCheckDark, shadow: cssVars.btnCheckShadow },
    call: { bg1: cssVars.btnCall, bg2: cssVars.btnCallDark, shadow: cssVars.btnCallShadow },
    raise: { bg1: cssVars.btnRaise, bg2: cssVars.btnRaiseDark, shadow: cssVars.btnRaiseShadow },
  };

  const s = styles[color];

  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        padding: '14px 24px',
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 16,
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        background: `linear-gradient(180deg, ${s.bg1}, ${s.bg2})`,
        boxShadow: `0 4px 0 ${s.shadow}, 0 6px 12px rgba(0,0,0,0.3)`,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        transition: 'transform 0.1s ease, box-shadow 0.15s ease, filter 0.15s ease',
        minWidth: 100,
      }}
      onPointerDown={(e) => {
        const btn = e.currentTarget;
        btn.style.transform = 'translateY(2px)';
        btn.style.boxShadow = `0 2px 0 ${s.shadow}, 0 3px 6px rgba(0,0,0,0.3)`;
      }}
      onPointerUp={(e) => {
        const btn = e.currentTarget;
        btn.style.transform = '';
        btn.style.boxShadow = '';
      }}
      onPointerLeave={(e) => {
        const btn = e.currentTarget;
        btn.style.transform = '';
        btn.style.boxShadow = '';
      }}
    >
      {children}
    </button>
  );
}

// Preset button for bet sizing
function PresetButton({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 4,
        background: active ? '#D97706' : 'rgba(255,255,255,0.1)',
        border: `1px solid ${active ? '#D97706' : 'rgba(255,255,255,0.2)'}`,
        color: active ? '#FFFFFF' : '#E0E0E0',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background 0.1s ease',
      }}
    >
      {label}
    </button>
  );
}
