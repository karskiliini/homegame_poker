import { useState, useEffect, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type { ActionType } from '@poker/shared';
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
  potTotal: number;
  bigBlind: number;
  maxBuyIn: number;
}

export function ActionButtons({
  socket, availableActions, callAmount, minRaise, maxRaise, stack, potTotal,
  bigBlind, maxBuyIn,
}: ActionButtonsProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
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
  const halfPot = calcHalfPotBet(potTotal, callAmount, maxRaise, stack, minRaise);
  const fullPot = calcPotSizedBet(potTotal, callAmount, maxRaise, stack, minRaise);

  // Slider step: 5% of max buy-in
  const sliderStep = Math.max(1, Math.round(maxBuyIn * 0.05));

  // Mouse wheel handler: 1 big blind per scroll tick
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? bigBlind : -bigBlind;
    setRaiseAmount(prev => clampRaise(prev + delta));
  }, [bigBlind, clampRaise]);

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
              sendAction(raiseAmount === maxRaise ? 'all_in' : (canBet ? 'bet' : 'raise'), raiseAmount);
            }}
            className="flex-1"
          >
            {raiseAmount === maxRaise ? t('action_all_in') : `${canBet ? t('action_bet') : t('action_raise')} ${raiseAmount.toLocaleString()}`}
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
            <PresetButton label={t('action_pot')} onClick={() => setRaiseAmount(Math.min(fullPot, maxRaise))} />
            <PresetButton label={t('action_all_in_preset')} onClick={() => setRaiseAmount(maxRaise)} active={raiseAmount === maxRaise} />
          </div>

          {/* Slider */}
          <div className="px-1">
            <input
              type="range"
              min={minRaise}
              max={maxRaise}
              step={sliderStep}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              onWheel={handleWheel}
              className="w-full ftp-slider"
            />
            <div className="flex justify-between items-center mt-1">
              <span style={{ color: 'var(--ftp-text-muted)', fontSize: 12 }}>{minRaise}</span>
              <span
                className="font-bold font-mono tabular-nums"
                style={{ color: '#EAB308', fontSize: 20 }}
              >
                {raiseAmount.toLocaleString()}
              </span>
              <span style={{ color: 'var(--ftp-text-muted)', fontSize: 12 }}>{t('action_all_in_preset')} ({maxRaise})</span>
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
