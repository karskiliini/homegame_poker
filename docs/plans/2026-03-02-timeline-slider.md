# Timeline Slider Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a step-based timeline bar to the UI editor that lets users seek to any point in an animation scenario.

**Architecture:** Add `seekTo(stepIndex)` to AnimationDriver (emits steps 0..N synchronously, no delays). Create a new TimelineBar component spanning the full viewport width below the existing table+panel area. Move playback controls (play/pause, restart, speed) from ControlPanel into the timeline bar.

**Tech Stack:** React, TypeScript, inline styles (matching existing editor UI patterns)

---

### Task 1: Add `seekTo()` to AnimationDriver

**Files:**
- Modify: `client/src/views/editor/AnimationDriver.ts`
- Create: `client/src/__tests__/AnimationDriver.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationDriver } from '../views/editor/AnimationDriver.js';
import { MockSocket } from '../views/editor/MockSocket.js';
import type { Scenario } from '../views/editor/types.js';

const testScenario: Scenario = {
  id: 'test',
  name: 'Test',
  description: 'Test scenario',
  steps: [
    { name: 'Step 0', event: 'table:game_state', data: { step: 0 }, delayAfterMs: 500 },
    { name: 'Step 1', event: 'table:player_action', data: { step: 1 }, delayAfterMs: 300 },
    { name: 'Step 2', event: 'table:game_state', data: { step: 2 }, delayAfterMs: 200 },
    { name: 'Step 3', event: 'table:pot_award', data: { step: 3 }, delayAfterMs: 0 },
  ],
};

describe('AnimationDriver', () => {
  let socket: MockSocket;
  let driver: AnimationDriver;

  beforeEach(() => {
    socket = new MockSocket();
    driver = new AnimationDriver(socket, testScenario);
  });

  describe('seekTo', () => {
    it('emits all steps from 0 to target index synchronously', () => {
      const emitted: { event: string; data: any }[] = [];
      // Spy on socket.emit
      const origEmit = socket.emit.bind(socket);
      socket.emit = (event: string, ...args: any[]) => {
        emitted.push({ event, data: args[0] });
        origEmit(event, ...args);
      };

      driver.seekTo(2);

      expect(emitted).toEqual([
        { event: 'table:game_state', data: { step: 0 } },
        { event: 'table:player_action', data: { step: 1 } },
        { event: 'table:game_state', data: { step: 2 } },
      ]);
    });

    it('sets currentStepIndex to target', () => {
      driver.seekTo(2);
      expect(driver.currentStepIndex).toBe(2);
    });

    it('calls onStepChange with target index', () => {
      const onChange = vi.fn();
      driver.onStepChange = onChange;

      driver.seekTo(2);

      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('stops playback before seeking', () => {
      driver.play();
      expect(driver.isPlaying).toBe(true);

      driver.seekTo(1);
      expect(driver.isPlaying).toBe(false);
    });

    it('seekTo(0) emits only step 0', () => {
      const emitted: string[] = [];
      const origEmit = socket.emit.bind(socket);
      socket.emit = (event: string, ...args: any[]) => {
        emitted.push(event);
        origEmit(event, ...args);
      };

      driver.seekTo(0);
      expect(emitted).toEqual(['table:game_state']);
    });

    it('clamps to last step index', () => {
      driver.seekTo(99);
      expect(driver.currentStepIndex).toBe(3);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- AnimationDriver`
Expected: FAIL — `seekTo` is not a function

**Step 3: Implement seekTo on AnimationDriver**

Add to `client/src/views/editor/AnimationDriver.ts`:

```typescript
/** Seek to a specific step by replaying all steps 0..targetIndex synchronously (no delays). */
seekTo(targetIndex: number) {
  this.stop();
  const clamped = Math.min(targetIndex, this.scenario.steps.length - 1);
  for (let i = 0; i <= clamped; i++) {
    const step = this.scenario.steps[i];
    this.socket.emit(step.event, step.data);
  }
  this._currentStepIndex = clamped;
  this.onStepChange?.(clamped);
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- AnimationDriver`
Expected: PASS

**Step 5: Commit**

```bash
git add client/src/views/editor/AnimationDriver.ts client/src/__tests__/AnimationDriver.test.ts
git commit -m "feat: add seekTo() to AnimationDriver for timeline scrubbing"
```

---

### Task 2: Create TimelineBar component

**Files:**
- Create: `client/src/views/editor/TimelineBar.tsx`

**Step 1: Create TimelineBar component**

The component renders a full-width bar (80px tall) with:
- Left section: Play/Pause button, Restart button, speed selector (0.25x, 0.5x, 1x, 2x)
- Right section: horizontal timeline with step dots, connecting line, tooltips on hover

```tsx
// client/src/views/editor/TimelineBar.tsx
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

export function TimelineBar({
  scenario, currentStep, isPlaying, speed,
  onPlay, onPause, onRestart, onSpeedChange, onSeek,
}: TimelineBarProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const steps = scenario.steps;

  return (
    <div style={{
      height: 80,
      background: 'rgba(0,0,0,0.9)',
      borderTop: '1px solid #333',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 16,
      flexShrink: 0,
    }}>
      {/* Playback controls */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={isPlaying ? onPause : onPlay}
          style={{
            width: 40, height: 40, borderRadius: 8, fontSize: 16, fontWeight: 700,
            background: isPlaying ? '#c44' : '#4a4', color: '#fff',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isPlaying ? '||' : '\u25B6'}
        </button>
        <button
          onClick={onRestart}
          style={{
            width: 40, height: 40, borderRadius: 8, fontSize: 14,
            background: '#555', color: '#fff',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          \u21BA
        </button>
      </div>

      {/* Speed */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        {[0.25, 0.5, 1, 2].map(s => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            style={{
              padding: '4px 8px', borderRadius: 4, fontSize: 11,
              background: speed === s ? '#4a4' : '#333', color: '#fff',
              border: speed === s ? '1px solid #6c6' : '1px solid #555',
              cursor: 'pointer',
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 40, background: '#444', flexShrink: 0 }} />

      {/* Timeline */}
      <div style={{ flex: 1, position: 'relative', height: 60, display: 'flex', alignItems: 'center' }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute', left: 8, right: 8, height: 2,
          background: '#333', top: '50%', transform: 'translateY(-50%)',
        }} />
        {/* Progress line */}
        {currentStep >= 0 && steps.length > 1 && (
          <div style={{
            position: 'absolute', left: 8, height: 2,
            width: `${(currentStep / (steps.length - 1)) * 100}%`,
            maxWidth: 'calc(100% - 16px)',
            background: '#4a4', top: '50%', transform: 'translateY(-50%)',
            transition: 'width 0.2s ease',
          }} />
        )}
        {/* Step dots */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', width: '100%',
          position: 'relative', padding: '0 8px',
        }}>
          {steps.map((step, i) => {
            const isPast = i < currentStep;
            const isCurrent = i === currentStep;
            const isHovered = hoveredStep === i;

            return (
              <div
                key={i}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
                onClick={() => onSeek(i)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div style={{
                    position: 'absolute', bottom: 28, whiteSpace: 'nowrap',
                    background: '#222', color: '#fff', fontSize: 11, padding: '4px 8px',
                    borderRadius: 4, border: '1px solid #555', pointerEvents: 'none',
                    zIndex: 10,
                  }}>
                    {step.name}
                  </div>
                )}
                {/* Dot */}
                <div style={{
                  width: isCurrent ? 14 : 10,
                  height: isCurrent ? 14 : 10,
                  borderRadius: '50%',
                  background: isCurrent ? '#4a4' : isPast ? '#6c6' : '#555',
                  border: isCurrent ? '2px solid #8f8' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  transform: isHovered && !isCurrent ? 'scale(1.3)' : 'scale(1)',
                  zIndex: 1,
                }} />
                {/* Step number below (show for current or hovered) */}
                {(isCurrent || isHovered) && (
                  <div style={{
                    position: 'absolute', top: 20, fontSize: 9, color: '#888',
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                  }}>
                    {i + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd client && bunx tsc --noEmit`
Expected: No errors related to TimelineBar

**Step 3: Commit**

```bash
git add client/src/views/editor/TimelineBar.tsx
git commit -m "feat: create TimelineBar component with step dots and playback controls"
```

---

### Task 3: Integrate TimelineBar + strip playback from ControlPanel

**Files:**
- Modify: `client/src/views/editor/AnimationSandbox.tsx`
- Modify: `client/src/views/editor/ControlPanel.tsx`

**Step 1: Add handleSeek to AnimationSandbox and update layout**

In `AnimationSandbox.tsx`:
1. Import TimelineBar
2. Add `handleSeek` callback that calls `driverRef.current.seekTo(stepIndex)`
3. Change layout from side-by-side to 2-row: top row = table + panel (`calc(100vh - 80px)`), bottom row = TimelineBar (80px)
4. Move playback props from ControlPanel to TimelineBar

Key changes to `AnimationSandbox.tsx`:

```tsx
import { TimelineBar } from './TimelineBar.js';

// Add handleSeek callback:
const handleSeek = useCallback((stepIndex: number) => {
  const driver = driverRef.current;
  if (!driver) return;
  driver.seekTo(stepIndex);
  setCurrentStep(stepIndex);
  setIsPlaying(false);
}, []);

// Update return JSX - wrap in column layout:
return (
  <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
    {/* Top row: Table + ControlPanel */}
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div ref={containerRef} style={{
        flex: 1, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* ... table content unchanged ... */}
      </div>
      <ControlPanel
        scenarios={SCENARIOS}
        scenarioIndex={scenarioIndex}
        currentStep={currentStep}
        soloSteps={soloSteps}
        delayOverrides={delayOverrides}
        onScenarioChange={handleScenarioChange}
        onSoloSteps={handleSoloSteps}
        onDelayChange={handleDelayChange}
        activeOverlays={activeOverlays}
        onToggleOverlay={handleToggleOverlay}
        onClearOverlays={handleClearOverlays}
      />
    </div>
    {/* Bottom row: Timeline */}
    <TimelineBar
      scenario={SCENARIOS[scenarioIndex]}
      currentStep={currentStep}
      isPlaying={isPlaying}
      speed={speed}
      onPlay={handlePlay}
      onPause={handlePause}
      onRestart={handleRestart}
      onSpeedChange={handleSpeedChange}
      onSeek={handleSeek}
    />
  </div>
);
```

**Step 2: Strip playback controls from ControlPanel**

In `ControlPanel.tsx`:
1. Remove from `ControlPanelProps`: `isPlaying`, `speed`, `onPlay`, `onPause`, `onRestart`, `onSpeedChange`
2. Remove the playback buttons JSX section ("Play/Pause" and "Restart" buttons)
3. Remove the speed control JSX section
4. The ControlPanel now shows: header, scenario selector, edit points, solo mode, steps list, apply/export

**Step 3: Verify the app compiles and renders**

Run: `cd client && bunx tsc --noEmit`
Expected: No type errors

**Step 4: Manual visual test**

Run: `cd client && bunx vite --port 4321`
Navigate to `http://localhost:4321/editor`
Verify:
- Timeline bar visible at bottom of screen
- Play/Pause and speed controls work from timeline bar
- Clicking step dots seeks to that step and shows correct table state
- ControlPanel no longer shows playback controls
- Steps list in ControlPanel still works (solo mode, delay sliders)

**Step 5: Commit**

```bash
git add client/src/views/editor/AnimationSandbox.tsx client/src/views/editor/ControlPanel.tsx
git commit -m "feat: integrate timeline bar with seek support, move playback to bottom bar"
```

---

### Task 4: Version bump + final cleanup

**Files:**
- Modify: `package.json` (root), `shared/package.json`, `server/package.json`, `client/package.json`
- Modify: `doc/structure.md`

**Step 1: Bump version (minor — new feature)**

Use `/bump minor`

**Step 2: Update doc/structure.md**

Add `TimelineBar.tsx` to the editor file list.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: bump version, update structure docs for timeline slider"
```
