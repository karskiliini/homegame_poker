import { useRef, useState } from 'react';
import type { Scenario } from './types.js';
import { OVERLAY_CATEGORIES, type OverlayCategory } from './PointsOverlay.js';
import {
  SEAT_POSITIONS, BET_POSITIONS, POT_CENTER, COMMUNITY_CARDS_POS,
  GAME_INFO_POS, WINNING_HAND_POS, DEALER_BTN_OFFSET, CARD_OFFSET_DISTANCE, DECK_POS,
} from '../table/PokerTable.js';

interface ControlPanelProps {
  scenarios: Scenario[];
  scenarioIndex: number;
  currentStep: number;
  isPlaying: boolean;
  speed: number;
  soloSteps: Set<number>;
  delayOverrides: Map<number, number>;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
  onScenarioChange: (index: number) => void;
  onSoloSteps: (steps: Set<number>) => void;
  onDelayChange: (stepIndex: number, delayMs: number) => void;
  activeOverlays: Set<OverlayCategory>;
  onToggleOverlay: (cat: OverlayCategory) => void;
  onClearOverlays: () => void;
}

export function ControlPanel({
  scenarios, scenarioIndex, currentStep, isPlaying, speed, soloSteps, delayOverrides,
  onPlay, onPause, onRestart, onSpeedChange, onScenarioChange, onSoloSteps, onDelayChange,
  activeOverlays, onToggleOverlay, onClearOverlays,
}: ControlPanelProps) {
  const scenario = scenarios[scenarioIndex];
  const [collapsed, setCollapsed] = useState(false);
  const [applyStatus, setApplyStatus] = useState<string | null>(null);
  const [pointsOpen, setPointsOpen] = useState(false);
  const lastClickedRef = useRef<number | null>(null);

  const handleStepClick = (i: number, e: React.MouseEvent) => {
    const next = new Set(soloSteps);

    if (e.shiftKey && lastClickedRef.current != null) {
      const from = Math.min(lastClickedRef.current, i);
      const to = Math.max(lastClickedRef.current, i);
      for (let idx = from; idx <= to; idx++) {
        next.add(idx);
      }
    } else {
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
    }

    lastClickedRef.current = i;
    onSoloSteps(next);
  };

  const applyToServer = async () => {
    if (!scenario) return;
    const config: Record<string, number> = {};
    scenario.steps.forEach((s, i) => {
      if (s.delayKey) {
        const val = delayOverrides.get(i);
        if (val != null) {
          config[s.delayKey] = val;
        }
      }
    });

    if (Object.keys(config).length === 0) {
      setApplyStatus('No changes');
      setTimeout(() => setApplyStatus(null), 1500);
      return;
    }

    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
      const res = await fetch(`${serverUrl}/api/animation-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setApplyStatus('Applied!');
      } else {
        setApplyStatus('Error');
      }
    } catch {
      setApplyStatus('Server unreachable');
    }
    setTimeout(() => setApplyStatus(null), 2000);
  };

  const hasActiveOverlays = activeOverlays.size > 0;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 50,
          background: 'rgba(0,0,0,0.85)', color: '#fff', border: '1px solid #444',
          borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        Sandbox Controls
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 50,
        width: 340,
        background: 'rgba(0,0,0,0.85)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 14,
        backdropFilter: 'blur(8px)',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Animation Sandbox</div>
        <button
          onClick={() => setCollapsed(true)}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16 }}
        >
          _
        </button>
      </div>

      {/* Scenario selector */}
      <select
        value={scenarioIndex}
        onChange={e => onScenarioChange(Number(e.target.value))}
        style={{
          background: '#222', color: '#fff', border: '1px solid #444',
          borderRadius: 6, padding: '6px 8px', fontSize: 13, width: '100%',
        }}
      >
        {scenarios.map((s, i) => (
          <option key={s.id} value={i}>{s.name}</option>
        ))}
      </select>

      {/* Playback controls */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={isPlaying ? onPause : onPlay}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: isPlaying ? '#c44' : '#4a4', color: '#fff', border: 'none', cursor: 'pointer',
          }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={onRestart}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: '#555', color: '#fff', border: 'none', cursor: 'pointer',
          }}
        >
          Restart
        </button>
      </div>

      {/* Speed control */}
      <div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Speed</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0.25, 0.5, 1, 2].map(s => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              style={{
                flex: 1, padding: '4px 0', borderRadius: 4, fontSize: 12,
                background: speed === s ? '#4a4' : '#333', color: '#fff',
                border: speed === s ? '1px solid #6c6' : '1px solid #555',
                cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Edit Points dropdown */}
      <div>
        <button
          onClick={() => setPointsOpen(!pointsOpen)}
          style={{
            width: '100%',
            padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: hasActiveOverlays ? '#2a4a6a' : '#333',
            color: hasActiveOverlays ? '#4af' : '#888',
            border: hasActiveOverlays ? '1px solid #4af' : '1px solid #555',
            cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span>
            Edit Points
            {hasActiveOverlays && ` (${activeOverlays.size})`}
          </span>
          <span style={{ fontSize: 10 }}>{pointsOpen ? '\u25B2' : '\u25BC'}</span>
        </button>

        {pointsOpen && (
          <div style={{
            marginTop: 4, borderRadius: 6, overflow: 'hidden',
            border: '1px solid #333',
          }}>
            {OVERLAY_CATEGORIES.map(cat => {
              const active = activeOverlays.has(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => onToggleOverlay(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 10px', fontSize: 12,
                    cursor: 'pointer', userSelect: 'none',
                    background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                    borderBottom: '1px solid #222',
                  }}
                >
                  {/* Color dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: active ? cat.color : '#444',
                    border: `1px solid ${active ? cat.color : '#555'}`,
                    flexShrink: 0,
                  }} />
                  <span style={{ color: active ? '#fff' : '#666', flex: 1 }}>{cat.label}</span>
                  {active && <span style={{ color: cat.color, fontSize: 10 }}>ON</span>}
                </div>
              );
            })}
            {hasActiveOverlays && (
              <div
                onClick={onClearOverlays}
                style={{
                  padding: '5px 10px', fontSize: 11, textAlign: 'center',
                  color: '#f44', cursor: 'pointer', background: 'rgba(255,68,68,0.05)',
                }}
              >
                Clear All
              </div>
            )}
            <div style={{ padding: '4px 10px', fontSize: 10, color: '#555' }}>
              Ctrl+P to log positions to console
            </div>
          </div>
        )}
      </div>

      {/* Solo mode indicator */}
      {soloSteps.size > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#3a2a00', borderRadius: 6, padding: '6px 10px',
        }}>
          <span style={{ fontSize: 12, color: '#fa0' }}>
            Looping {soloSteps.size} step{soloSteps.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => onSoloSteps(new Set())}
            style={{
              background: 'none', border: '1px solid #fa0', color: '#fa0',
              borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Steps with delay sliders */}
      <div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
          Steps — click to loop, shift+click for range
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {scenario?.steps.map((s, i) => {
            const isSolo = soloSteps.has(i);
            const isCurrent = i === currentStep;
            const delay = delayOverrides.get(i) ?? s.delayAfterMs;

            return (
              <div key={i} style={{ borderRadius: 4, overflow: 'hidden' }}>
                <div
                  onClick={(e) => handleStepClick(i, e)}
                  style={{
                    fontSize: 12,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isSolo ? '#3a2a00' : isCurrent ? '#2a4a2a' : 'transparent',
                    color: isSolo ? '#fa0' : isCurrent ? '#6c6' : i < currentStep ? '#555' : '#888',
                    fontWeight: isCurrent || isSolo ? 600 : 400,
                    borderLeft: isSolo ? '3px solid #fa0' : isCurrent ? '3px solid #6c6' : '3px solid transparent',
                    userSelect: 'none',
                  }}
                >
                  <span>{s.name}</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#666' }}>
                    {delay}ms
                  </span>
                </div>

                <div style={{
                  padding: '2px 8px 4px 11px',
                  background: isSolo ? 'rgba(58,42,0,0.5)' : isCurrent ? 'rgba(42,74,42,0.3)' : 'transparent',
                }}>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(10000, delay * 2)}
                    step={50}
                    value={delay}
                    onChange={e => onDelayChange(i, Number(e.target.value))}
                    style={{
                      width: '100%', height: 12, accentColor: isSolo ? '#fa0' : '#6c6',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Apply to server */}
      <button
        onClick={applyToServer}
        style={{
          padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 600,
          background: applyStatus === 'Applied!' ? '#4a4' : '#2a4a6a',
          color: '#fff', border: 'none', cursor: 'pointer',
        }}
      >
        {applyStatus ?? 'Apply to Server'}
      </button>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <CopyButton
          label="Copy Positions"
          getData={() => JSON.stringify({
            SEAT_POSITIONS,
            BET_POSITIONS,
            POT_CENTER,
            COMMUNITY_CARDS_POS,
            GAME_INFO_POS,
            WINNING_HAND_POS,
            DECK_POS,
            DEALER_BTN_OFFSET: DEALER_BTN_OFFSET.distance,
            CARD_OFFSET_DISTANCE: CARD_OFFSET_DISTANCE.distance,
          }, null, 2)}
        />
        <CopyButton
          label="Copy Delays"
          getData={() => {
            if (!scenario) return '{}';
            const delays: Record<string, number> = {};
            scenario.steps.forEach((s, i) => {
              const key = s.delayKey || s.name;
              delays[key] = delayOverrides.get(i) ?? s.delayAfterMs;
            });
            return JSON.stringify(delays, null, 2);
          }}
        />
      </div>
    </div>
  );
}

function CopyButton({ label, getData }: { label: string; getData: () => string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(getData());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: log to console
      console.log(label + ':', getData());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 600,
        background: copied ? '#4a4' : '#333',
        color: copied ? '#fff' : '#888',
        border: '1px solid #555', cursor: 'pointer',
      }}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
