import { useState } from 'react';
import type { Scenario } from './types.js';

interface TimelineBarProps {
  scenario: Scenario;
  currentStep: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (stepIndex: number) => void;
}

const SPEEDS = [0.25, 0.5, 1, 2];

export function TimelineBar({
  scenario, currentStep, isPlaying, speed,
  onPlay, onPause, onRestart, onSpeedChange, onSeek,
}: TimelineBarProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const steps = scenario.steps;
  const totalSteps = steps.length;

  return (
    <div style={{
      width: '100%', flexShrink: 0,
      height: 80,
      background: 'rgba(0,0,0,0.9)',
      borderTop: '1px solid #333',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
    }}>
      {/* Playback controls */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={isPlaying ? onPause : onPlay}
          style={{
            width: 40, height: 40, borderRadius: 8,
            background: isPlaying ? '#c44' : '#4a4',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 16, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isPlaying ? '\u23F8' : '\u25B6'}
        </button>
        <button
          onClick={onRestart}
          style={{
            width: 40, height: 40, borderRadius: 8,
            background: '#555',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          \u21BA
        </button>
      </div>

      {/* Speed selector */}
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            style={{
              padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: speed === s ? '#4a4' : '#333',
              color: speed === s ? '#fff' : '#888',
              border: speed === s ? '1px solid #6c6' : '1px solid #555',
              cursor: 'pointer',
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Vertical divider */}
      <div style={{ width: 1, height: 48, background: '#444', flexShrink: 0 }} />

      {/* Step timeline */}
      <div style={{
        flex: 1, position: 'relative', height: '100%',
        display: 'flex', alignItems: 'center',
        paddingLeft: 12, paddingRight: 12,
      }}>
        {totalSteps > 0 && (
          <div style={{ position: 'relative', width: '100%', height: 40 }}>
            {/* Background line */}
            <div style={{
              position: 'absolute', top: 14, left: 0, right: 0,
              height: 2, background: '#555',
            }} />

            {/* Progress line */}
            <div style={{
              position: 'absolute', top: 14, left: 0,
              width: totalSteps > 1
                ? `${(currentStep / (totalSteps - 1)) * 100}%`
                : '0%',
              height: 2, background: '#6c6',
              transition: 'width 0.3s ease',
            }} />

            {/* Step dots */}
            {steps.map((step, i) => {
              const pct = totalSteps > 1 ? (i / (totalSteps - 1)) * 100 : 50;
              const isCurrent = i === currentStep;
              const isPast = i < currentStep;
              const isHovered = i === hoveredStep;
              const dotSize = isCurrent ? 14 : 10;

              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${pct}%`,
                    top: 15,
                    transform: `translate(-50%, -50%) ${isHovered && !isCurrent ? 'scale(1.3)' : ''}`,
                    transition: 'transform 0.15s ease',
                    cursor: 'pointer',
                    zIndex: isCurrent ? 2 : 1,
                  }}
                  onClick={() => onSeek(i)}
                  onMouseEnter={() => setHoveredStep(i)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  {/* Dot */}
                  <div style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
                    background: isCurrent ? '#4a4' : isPast ? '#6c6' : '#555',
                    border: isCurrent ? '2px solid #8f8' : 'none',
                    transition: 'all 0.15s ease',
                  }} />

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div style={{
                      position: 'absolute',
                      bottom: dotSize + 6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#222',
                      color: '#ccc',
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      border: '1px solid #444',
                    }}>
                      {step.name}
                    </div>
                  )}

                  {/* Step number below for current or hovered */}
                  {(isCurrent || isHovered) && (
                    <div style={{
                      position: 'absolute',
                      top: dotSize + 4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 10,
                      color: isCurrent ? '#6c6' : '#888',
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}>
                      {i + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
