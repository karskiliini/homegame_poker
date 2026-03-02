# Animation Sandbox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone sandbox page where developers can visually tune all poker table animation timings using the real PokerTable component with mock data, live delay sliders, and speed controls.

**Architecture:** A new `/sandbox` route renders the real `PokerTable` component fed by a mock socket (EventEmitter) that replays preset scenarios. An `AnimationDriver` class orchestrates timed event emissions. A floating control panel provides playback, speed, delay sliders, and CSS animation tuning. Server delays become runtime-configurable via a REST endpoint.

**Tech Stack:** React, TypeScript, existing `useTableAnimations` hook + `PokerTable` component, CSS custom properties, Express REST endpoint.

---

### Task 1: MockSocket — Minimal EventEmitter

The `useTableAnimations` hook accepts `socket: { on: Function; off?: Function }`. We create a tiny EventEmitter that satisfies this interface. The AnimationDriver will call `emit()` on it, and useTableAnimations will listen via `on()`.

**Files:**
- Create: `client/src/views/sandbox/MockSocket.ts`

**Step 1: Write the failing test**

Create: `client/src/__tests__/sandbox/MockSocket.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { MockSocket } from '../../views/sandbox/MockSocket.js';

describe('MockSocket', () => {
  it('delivers events to listeners', () => {
    const socket = new MockSocket();
    const handler = vi.fn();
    socket.on('test', handler);
    socket.emit('test', { foo: 'bar' });
    expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('supports multiple listeners for same event', () => {
    const socket = new MockSocket();
    const h1 = vi.fn();
    const h2 = vi.fn();
    socket.on('evt', h1);
    socket.on('evt', h2);
    socket.emit('evt', 42);
    expect(h1).toHaveBeenCalledWith(42);
    expect(h2).toHaveBeenCalledWith(42);
  });

  it('removes listener with off()', () => {
    const socket = new MockSocket();
    const handler = vi.fn();
    socket.on('test', handler);
    socket.off('test', handler);
    socket.emit('test', 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  it('reset() clears all listeners', () => {
    const socket = new MockSocket();
    const handler = vi.fn();
    socket.on('test', handler);
    socket.reset();
    socket.emit('test', 'data');
    expect(handler).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- MockSocket`
Expected: FAIL — module not found

**Step 3: Write implementation**

Create: `client/src/views/sandbox/MockSocket.ts`

```ts
type Handler = (...args: any[]) => void;

export class MockSocket {
  private listeners = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: Handler) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach(h => h(...args));
  }

  reset() {
    this.listeners.clear();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- MockSocket`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add client/src/views/sandbox/MockSocket.ts client/src/__tests__/sandbox/MockSocket.test.ts
git commit -m "feat(sandbox): add MockSocket EventEmitter for animation sandbox"
```

---

### Task 2: Scenario Data — GameState factories and presets

Build mock data generators and 8 preset scenarios. Each scenario is an array of `ScenarioStep` objects with event names, payloads, and default delay times.

**Files:**
- Create: `client/src/views/sandbox/types.ts`
- Create: `client/src/views/sandbox/mockData.ts`
- Create: `client/src/views/sandbox/scenarios.ts`

**Step 1: Create sandbox types**

Create: `client/src/views/sandbox/types.ts`

```ts
export interface ScenarioStep {
  /** Display name shown in the phase indicator */
  name: string;
  /** Socket event name (e.g. S2C_TABLE.GAME_STATE) */
  event: string;
  /** Event payload */
  data: any;
  /** Default delay (ms) AFTER this step before the next one fires */
  delayAfterMs: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
}

export interface DelayOverrides {
  [stepIndex: number]: number; // stepIndex → overridden delayAfterMs
}
```

**Step 2: Create mock data factory**

Create: `client/src/views/sandbox/mockData.ts`

This file provides factory functions that produce realistic `GameState` objects at various phases. Read the existing types from `@poker/shared` to ensure correctness:

- `GameState` (from `shared/src/types/game.ts`)
- `PublicPlayerState` (from `shared/src/types/player.ts`)
- `CardString` (from `shared/src/types/card.ts`)

```ts
import type { GameState, PublicPlayerState, CardString, GameConfig } from '@poker/shared';

const DEFAULT_CONFIG: GameConfig = {
  gameType: 'NLHE',
  smallBlind: 1,
  bigBlind: 2,
  maxBuyIn: 200,
  actionTimeSeconds: 30,
  minPlayers: 2,
  maxPlayers: 10,
};

/** Create a player at a given seat */
export function mockPlayer(overrides: Partial<PublicPlayerState> & { seatIndex: number }): PublicPlayerState {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
  const avatars = ['ninja', 'cowgirl', 'robot', 'pirate', 'wizard', 'alien'];
  const i = overrides.seatIndex;
  return {
    id: `player-${i}`,
    name: names[i % names.length],
    seatIndex: i,
    stack: 200,
    status: 'active',
    isConnected: true,
    disconnectedAt: null,
    currentBet: 0,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    isCurrentActor: false,
    holeCards: null,
    hasCards: true,
    avatarId: avatars[i % avatars.length],
    ...overrides,
  };
}

/** Create a GameState snapshot */
export function mockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'hand_in_progress',
    config: DEFAULT_CONFIG,
    handNumber: 1,
    players: [
      mockPlayer({ seatIndex: 0, isDealer: true }),
      mockPlayer({ seatIndex: 2, isSmallBlind: true }),
      mockPlayer({ seatIndex: 4, isBigBlind: true }),
      mockPlayer({ seatIndex: 6 }),
    ],
    communityCards: [],
    pots: [{ amount: 0, eligible: ['player-0', 'player-2', 'player-4', 'player-6'] }],
    currentStreet: null,
    dealerSeatIndex: 0,
    currentActorSeatIndex: null,
    actionTimeRemaining: 30,
    ...overrides,
  };
}

// Sample cards for scenarios
export const SAMPLE_HANDS = {
  royalFlush: ['As', 'Ks'] as CardString[],
  pocket_aces: ['Ah', 'Ad'] as CardString[],
  pocket_kings: ['Kh', 'Kd'] as CardString[],
  suited_connectors: ['9h', '8h'] as CardString[],
  low_pair: ['5s', '5c'] as CardString[],
};

export const SAMPLE_BOARDS = {
  flop: ['Qs', 'Js', 'Ts'] as CardString[],
  turn: 'Kc' as CardString,
  river: '2d' as CardString,
  royalBoard: ['Qs', 'Js', 'Ts', '3c', '2d'] as CardString[],
};
```

**Step 3: Build scenarios**

Create: `client/src/views/sandbox/scenarios.ts`

This is the largest file. Each scenario builds a step array using `S2C_TABLE` event names from `@poker/shared` and the mock data factories.

Import the real event names from `@poker/shared`:
```ts
import { S2C_TABLE } from '@poker/shared';
```

Build each of the 8 scenarios. The scenarios use the same event names and data shapes that `useTableAnimations` expects. Use `DELAY_*` constants from `@poker/shared` as default delay values.

Key patterns per scenario:
- Every scenario starts with a `GAME_STATE` step to set up the table
- `CARDS_DEALT` triggers shuffle + deal
- `PLAYER_ACTION` with `{ seatIndex, action, amount, playerName, isAllIn }` triggers bet chips
- `STREET_DEAL` with `{ street, cards, dramatic? }` triggers community card reveals
- `POT_UPDATE` triggers bet collection
- `ALLIN_SHOWDOWN` with `{ entries }` triggers all-in spotlight + card reveals
- `SHOWDOWN` with `{ reveals }` triggers sequential reveals
- `POT_AWARD` with `{ awards, potIndex, isLastPot, totalPots, winningCards, handRank, handName, isNuts }` triggers chip fly + banners
- `BAD_BEAT` with `BadBeatData` triggers bad beat animation
- `HAND_RESULT` clears animation state

Each scenario should be 8-20 steps. Focus on getting data shapes exactly right (matching what `useTableAnimations` handlers expect). The delay values come from `shared/constants.ts` defaults.

Scenario list:
1. `basicHand` — 4 players, full hand lifecycle through showdown
2. `dramaticRiver` — same but river step has `dramatic: true`
3. `allInShowdown` — preflop all-in with equity runout
4. `multiPot` — 3 all-ins at different stacks, 2 pot awards
5. `runItTwice` — all-in with second board
6. `badBeat` — showdown with bad beat event before pot award
7. `royalFlush` — showdown with `handRank: 'royal_flush'` in pot award
8. `chipMovements` — multiple bet/raise/call actions showing chip movement

Export as: `export const SCENARIOS: Scenario[]`

**Step 4: Write a test for scenario validity**

Create: `client/src/__tests__/sandbox/scenarios.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { SCENARIOS } from '../../views/sandbox/scenarios.js';

describe('Scenarios', () => {
  it('has 8 preset scenarios', () => {
    expect(SCENARIOS).toHaveLength(8);
  });

  it('every scenario has at least 3 steps', () => {
    for (const s of SCENARIOS) {
      expect(s.steps.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every scenario starts with a GAME_STATE step', () => {
    for (const s of SCENARIOS) {
      expect(s.steps[0].event).toContain('game_state');
    }
  });

  it('every step has required fields', () => {
    for (const s of SCENARIOS) {
      for (const step of s.steps) {
        expect(step.name).toBeTruthy();
        expect(step.event).toBeTruthy();
        expect(step.delayAfterMs).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
```

**Step 5: Run tests**

Run: `bun run test -- scenarios`
Expected: PASS

**Step 6: Commit**

```bash
git add client/src/views/sandbox/types.ts client/src/views/sandbox/mockData.ts client/src/views/sandbox/scenarios.ts client/src/__tests__/sandbox/scenarios.test.ts
git commit -m "feat(sandbox): add scenario presets and mock data factories"
```

---

### Task 3: AnimationDriver — Event scheduler

The AnimationDriver takes a MockSocket, a scenario, and playback settings (speed multiplier, delay overrides). It emits events through the MockSocket on schedule.

**Files:**
- Create: `client/src/views/sandbox/AnimationDriver.ts`
- Create: `client/src/__tests__/sandbox/AnimationDriver.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockSocket } from '../../views/sandbox/MockSocket.js';
import { AnimationDriver } from '../../views/sandbox/AnimationDriver.js';
import type { Scenario } from '../../views/sandbox/types.js';

const testScenario: Scenario = {
  id: 'test',
  name: 'Test',
  description: 'Test scenario',
  steps: [
    { name: 'Step 1', event: 'evt:a', data: { value: 1 }, delayAfterMs: 100 },
    { name: 'Step 2', event: 'evt:b', data: { value: 2 }, delayAfterMs: 200 },
    { name: 'Step 3', event: 'evt:c', data: { value: 3 }, delayAfterMs: 0 },
  ],
};

describe('AnimationDriver', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('emits first step immediately on play', () => {
    const socket = new MockSocket();
    const handler = vi.fn();
    socket.on('evt:a', handler);
    const driver = new AnimationDriver(socket, testScenario);
    driver.play();
    expect(handler).toHaveBeenCalledWith({ value: 1 });
  });

  it('emits subsequent steps after their delays', () => {
    const socket = new MockSocket();
    const hB = vi.fn();
    socket.on('evt:b', hB);
    const driver = new AnimationDriver(socket, testScenario);
    driver.play();
    expect(hB).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(hB).toHaveBeenCalledWith({ value: 2 });
  });

  it('respects speed multiplier', () => {
    const socket = new MockSocket();
    const hB = vi.fn();
    socket.on('evt:b', hB);
    const driver = new AnimationDriver(socket, testScenario);
    driver.setSpeed(2); // 2x speed → half delays
    driver.play();
    vi.advanceTimersByTime(49);
    expect(hB).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hB).toHaveBeenCalled();
  });

  it('pause() stops progression', () => {
    const socket = new MockSocket();
    const hB = vi.fn();
    socket.on('evt:b', hB);
    const driver = new AnimationDriver(socket, testScenario);
    driver.play();
    driver.pause();
    vi.advanceTimersByTime(500);
    expect(hB).not.toHaveBeenCalled();
  });

  it('reports current step index', () => {
    const socket = new MockSocket();
    const driver = new AnimationDriver(socket, testScenario);
    expect(driver.currentStepIndex).toBe(-1);
    driver.play();
    expect(driver.currentStepIndex).toBe(0);
    vi.advanceTimersByTime(100);
    expect(driver.currentStepIndex).toBe(1);
  });

  it('calls onStepChange callback', () => {
    const socket = new MockSocket();
    const driver = new AnimationDriver(socket, testScenario);
    const cb = vi.fn();
    driver.onStepChange = cb;
    driver.play();
    expect(cb).toHaveBeenCalledWith(0);
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledWith(1);
  });

  it('calls onComplete when scenario finishes', () => {
    const socket = new MockSocket();
    const driver = new AnimationDriver(socket, testScenario);
    const cb = vi.fn();
    driver.onComplete = cb;
    driver.play();
    vi.advanceTimersByTime(100); // step 2
    vi.advanceTimersByTime(200); // step 3
    expect(cb).toHaveBeenCalled();
  });

  it('restart() replays from beginning', () => {
    const socket = new MockSocket();
    const hA = vi.fn();
    socket.on('evt:a', hA);
    const driver = new AnimationDriver(socket, testScenario);
    driver.play();
    vi.advanceTimersByTime(300);
    driver.restart();
    expect(hA).toHaveBeenCalledTimes(2);
    expect(driver.currentStepIndex).toBe(0);
  });

  it('respects delay overrides', () => {
    const socket = new MockSocket();
    const hB = vi.fn();
    socket.on('evt:b', hB);
    const driver = new AnimationDriver(socket, testScenario);
    driver.setDelayOverride(0, 500); // step 0 delay: 100→500
    driver.play();
    vi.advanceTimersByTime(100);
    expect(hB).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(hB).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- AnimationDriver`
Expected: FAIL — module not found

**Step 3: Write implementation**

Create: `client/src/views/sandbox/AnimationDriver.ts`

```ts
import type { MockSocket } from './MockSocket.js';
import type { Scenario } from './types.js';

export class AnimationDriver {
  private socket: MockSocket;
  private scenario: Scenario;
  private speed = 1;
  private delayOverrides = new Map<number, number>();
  private _currentStepIndex = -1;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private playing = false;

  onStepChange?: (stepIndex: number) => void;
  onComplete?: () => void;

  constructor(socket: MockSocket, scenario: Scenario) {
    this.socket = socket;
    this.scenario = scenario;
  }

  get currentStepIndex() { return this._currentStepIndex; }
  get isPlaying() { return this.playing; }
  get stepCount() { return this.scenario.steps.length; }

  setSpeed(speed: number) { this.speed = speed; }

  setDelayOverride(stepIndex: number, delayMs: number) {
    this.delayOverrides.set(stepIndex, delayMs);
  }

  clearDelayOverrides() { this.delayOverrides.clear(); }

  setScenario(scenario: Scenario) {
    this.stop();
    this.scenario = scenario;
    this._currentStepIndex = -1;
  }

  play() {
    this.playing = true;
    if (this._currentStepIndex === -1) {
      this.executeStep(0);
    } else {
      this.scheduleNext();
    }
  }

  pause() {
    this.playing = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  stop() {
    this.pause();
    this._currentStepIndex = -1;
  }

  restart() {
    this.stop();
    this.play();
  }

  private executeStep(index: number) {
    if (index >= this.scenario.steps.length) {
      this.playing = false;
      this.onComplete?.();
      return;
    }

    this._currentStepIndex = index;
    const step = this.scenario.steps[index];
    this.socket.emit(step.event, step.data);
    this.onStepChange?.(index);
    this.scheduleNext();
  }

  private scheduleNext() {
    if (!this.playing) return;
    const index = this._currentStepIndex;
    const step = this.scenario.steps[index];
    if (!step) return;

    const baseDelay = this.delayOverrides.get(index) ?? step.delayAfterMs;
    const scaledDelay = Math.round(baseDelay / this.speed);

    if (scaledDelay === 0) {
      this.executeStep(index + 1);
    } else {
      this.timer = setTimeout(() => {
        this.executeStep(index + 1);
      }, scaledDelay);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- AnimationDriver`
Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add client/src/views/sandbox/AnimationDriver.ts client/src/__tests__/sandbox/AnimationDriver.test.ts
git commit -m "feat(sandbox): add AnimationDriver event scheduler"
```

---

### Task 4: AnimationSandbox page — Wire up PokerTable

Create the main sandbox page that renders the real PokerTable component with animation state from useTableAnimations, driven by the AnimationDriver through a MockSocket.

**Files:**
- Create: `client/src/views/sandbox/AnimationSandbox.tsx`
- Modify: `client/src/App.tsx` (add route)

**Step 1: Build the sandbox page**

Create: `client/src/views/sandbox/AnimationSandbox.tsx`

Key wiring:
1. Create a `MockSocket` instance (stable ref via `useRef`)
2. Create a `containerRef` for PokerTable's animation position calculations
3. Set up `useTableAnimations` with the MockSocket as socket
4. Create `AnimationDriver` (stable ref)
5. Manage gameState via `useState` (setGameState passed to useTableAnimations)
6. Render `PokerTable` with all animation props from useTableAnimations result
7. Render `ControlPanel` overlay (placeholder div for now — built in Task 5)

```tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { PokerTable } from '../table/PokerTable.js';
import { useTableAnimations } from '../../hooks/useTableAnimations.js';
import { MockSocket } from './MockSocket.js';
import { AnimationDriver } from './AnimationDriver.js';
import { SCENARIOS } from './scenarios.js';
import { ControlPanel } from './ControlPanel.js';
import type { GameState } from '@poker/shared';

export function AnimationSandbox() {
  const mockSocket = useRef(new MockSocket()).current;
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const driverRef = useRef<AnimationDriver | null>(null);

  // Initialize driver
  useEffect(() => {
    const driver = new AnimationDriver(mockSocket, SCENARIOS[scenarioIndex]);
    driver.onStepChange = (idx) => setCurrentStep(idx);
    driver.onComplete = () => setIsPlaying(false);
    driverRef.current = driver;
    return () => { driver.stop(); };
  }, [scenarioIndex, mockSocket]);

  const animations = useTableAnimations({
    socket: mockSocket,
    containerRef,
    setGameState: (s: GameState) => setGameState(s),
    enableSound: false,
  });

  const handlePlay = useCallback(() => {
    const driver = driverRef.current;
    if (!driver) return;
    driver.setSpeed(speed);
    driver.play();
    setIsPlaying(true);
  }, [speed]);

  const handlePause = useCallback(() => {
    driverRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const handleRestart = useCallback(() => {
    const driver = driverRef.current;
    if (!driver) return;
    mockSocket.reset();
    // Re-attach useTableAnimations listeners by forcing a re-mount
    // Actually: the hook uses useEffect on [socket], so we need to trigger it
    // Simplest: driver.restart() emits events to the existing socket
    driver.setSpeed(speed);
    driver.restart();
    setIsPlaying(true);
  }, [speed, mockSocket]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    driverRef.current?.setSpeed(newSpeed);
  }, []);

  const handleScenarioChange = useCallback((index: number) => {
    driverRef.current?.stop();
    setScenarioIndex(index);
    setCurrentStep(-1);
    setIsPlaying(false);
    setGameState(null);
  }, []);

  const handleDelayChange = useCallback((stepIndex: number, delayMs: number) => {
    driverRef.current?.setDelayOverride(stepIndex, delayMs);
  }, []);

  return (
    <div className="w-full h-screen" style={{ background: '#0a0a0a' }}>
      <div ref={containerRef} className="w-full h-full relative">
        {gameState && (
          <PokerTable
            gameState={gameState}
            potAwards={animations.potAwards}
            winnerSeats={animations.winnerSeats}
            awardingPotIndex={animations.awardingPotIndex}
            timerData={animations.timerData}
            collectingBets={animations.collectingBets}
            potGrow={animations.potGrow}
            betChipAnimations={animations.betChipAnimations}
            dealCardAnimations={animations.dealCardAnimations}
            equities={animations.equities}
            dramaticRiver={animations.dramaticRiver}
            badBeat={animations.badBeat}
            chipTrick={animations.chipTrick}
            winningCards={animations.winningCards}
            shuffling={animations.shuffling}
            allInSpotlight={animations.allInSpotlight}
            winnerBanners={animations.winnerBanners}
            celebration={animations.celebration}
          />
        )}
        {!gameState && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}>
              Select a scenario and press Play
            </div>
          </div>
        )}
      </div>
      <ControlPanel
        scenarios={SCENARIOS}
        scenarioIndex={scenarioIndex}
        currentStep={currentStep}
        isPlaying={isPlaying}
        speed={speed}
        onPlay={handlePlay}
        onPause={handlePause}
        onRestart={handleRestart}
        onSpeedChange={handleSpeedChange}
        onScenarioChange={handleScenarioChange}
        onDelayChange={handleDelayChange}
      />
    </div>
  );
}
```

**Step 2: Create ControlPanel placeholder**

Create: `client/src/views/sandbox/ControlPanel.tsx`

Start with a minimal placeholder that renders the play/pause/restart buttons and scenario dropdown. The full control panel is built in Task 5.

```tsx
import type { Scenario } from './types.js';

interface ControlPanelProps {
  scenarios: Scenario[];
  scenarioIndex: number;
  currentStep: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
  onScenarioChange: (index: number) => void;
  onDelayChange: (stepIndex: number, delayMs: number) => void;
}

export function ControlPanel({
  scenarios, scenarioIndex, currentStep, isPlaying, speed,
  onPlay, onPause, onRestart, onSpeedChange, onScenarioChange,
}: ControlPanelProps) {
  const scenario = scenarios[scenarioIndex];

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3"
      style={{
        width: 320,
        background: 'rgba(0,0,0,0.85)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 14,
        backdropFilter: 'blur(8px)',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16 }}>Animation Sandbox</div>

      {/* Scenario selector */}
      <select
        value={scenarioIndex}
        onChange={e => onScenarioChange(Number(e.target.value))}
        style={{
          background: '#222', color: '#fff', border: '1px solid #444',
          borderRadius: 6, padding: '6px 8px', fontSize: 13,
        }}
      >
        {scenarios.map((s, i) => (
          <option key={s.id} value={i}>{s.name}</option>
        ))}
      </select>

      {/* Playback controls */}
      <div className="flex gap-2">
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
        <div className="flex gap-1">
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

      {/* Phase indicator */}
      <div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Steps</div>
        <div className="flex flex-col gap-1">
          {scenario?.steps.map((step, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                padding: '3px 8px',
                borderRadius: 4,
                background: i === currentStep ? '#2a4a2a' : 'transparent',
                color: i < currentStep ? '#555' : i === currentStep ? '#6c6' : '#888',
                fontWeight: i === currentStep ? 600 : 400,
                borderLeft: i === currentStep ? '3px solid #6c6' : '3px solid transparent',
              }}
            >
              {step.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Add route to App.tsx**

Modify: `client/src/App.tsx`

Add sandbox route before the catch-all:

```tsx
import { AnimationSandbox } from './views/sandbox/AnimationSandbox.js';

// Inside Routes, add before the catch-all route:
<Route path="/sandbox" element={<AnimationSandbox />} />
```

**Step 4: Smoke test**

Start dev server and navigate to `http://localhost:PORT/sandbox`. Verify:
- Page renders with dark background
- "Select a scenario and press Play" placeholder visible
- Control panel visible in top-right
- Selecting a scenario and pressing Play triggers shuffle animation + card deals on the real PokerTable

**Step 5: Commit**

```bash
git add client/src/views/sandbox/AnimationSandbox.tsx client/src/views/sandbox/ControlPanel.tsx client/src/App.tsx
git commit -m "feat(sandbox): add AnimationSandbox page with PokerTable + controls"
```

---

### Task 5: Full ControlPanel — Delay sliders + CSS animation sliders

Expand the ControlPanel with delay sliders for all server-side timing constants and CSS animation durations.

**Files:**
- Modify: `client/src/views/sandbox/ControlPanel.tsx`

**Step 1: Add delay sliders section**

Add a section below the phase indicator with labeled sliders for each server delay constant. Use the default values from `@poker/shared` constants.

The slider component pattern:
```tsx
function DelaySlider({ label, value, onChange, min = 0, max = 10000 }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number;
}) {
  return (
    <div>
      <div className="flex justify-between" style={{ fontSize: 11, color: '#888' }}>
        <span>{label}</span>
        <span>{value}ms</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={50} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#6c6' }}
      />
    </div>
  );
}
```

Server delay sliders:
- After cards dealt (default 2000ms)
- After street dealt (1500ms)
- After player acted (800ms)
- Showdown to result (3000ms)
- Showdown reveal interval (500ms)
- After all-in showdown (2000ms)
- All-in runout street (2500ms)
- Dramatic river (3500ms)
- Between pot awards (2000ms)
- Bad beat to result (3000ms)

**Step 2: Add CSS animation sliders section**

Add sliders that modify CSS custom properties in real-time:

```ts
const CSS_ANIM_DEFAULTS: Record<string, { label: string; prop: string; defaultMs: number; max: number }> = {
  cardDeal: { label: 'Card deal', prop: '--ftp-anim-card-deal', defaultMs: 350, max: 2000 },
  cardDealStagger: { label: 'Card stagger', prop: '--ftp-anim-card-deal-stagger', defaultMs: 120, max: 500 },
  cardFlip: { label: 'Card flip', prop: '--ftp-anim-card-flip', defaultMs: 300, max: 1000 },
  flopStagger: { label: 'Flop stagger', prop: '--ftp-anim-flop-stagger', defaultMs: 80, max: 500 },
  chipBet: { label: 'Chip bet fly', prop: '--ftp-anim-chip-bet', defaultMs: 500, max: 2000 },
  chipWin: { label: 'Chip win fly', prop: '--ftp-anim-chip-win', defaultMs: 1200, max: 4000 },
  riverPeel: { label: 'River peel', prop: '--ftp-anim-river-peel', defaultMs: 2500, max: 6000 },
  shuffle: { label: 'Shuffle', prop: '--ftp-anim-shuffle', defaultMs: 1800, max: 4000 },
  badBeat: { label: 'Bad beat', prop: '--ftp-anim-bad-beat', defaultMs: 3000, max: 8000 },
  chipTrick: { label: 'Chip trick', prop: '--ftp-anim-chip-trick', defaultMs: 2500, max: 5000 },
};
```

When a CSS slider changes, immediately call:
```ts
document.documentElement.style.setProperty(prop, `${value}ms`);
```

**Step 3: Add collapsible sections**

Wrap "Server Delays", "CSS Animations", and "Steps" in collapsible sections so the panel doesn't get too tall. Use simple toggle state:

```tsx
const [showDelays, setShowDelays] = useState(true);
const [showCss, setShowCss] = useState(false);
const [showSteps, setShowSteps] = useState(true);
```

Section header pattern:
```tsx
<button
  onClick={() => setShowDelays(!showDelays)}
  style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
>
  {showDelays ? '▼' : '▶'} Server Delays
</button>
```

**Step 4: Wire delay slider changes to AnimationDriver**

The `onDelayChange(stepIndex, delayMs)` callback is already passed from AnimationSandbox. But the server delay sliders are per-constant, not per-step. Add a mapping layer:

In AnimationSandbox, maintain a `serverDelays` state object. When a server delay changes, iterate over the current scenario's steps and update delay overrides for steps that match that constant's timing.

Or simpler: store server delay overrides in the ControlPanel and pass them to AnimationSandbox. AnimationSandbox rebuilds the scenario's default delays with overrides before passing to the driver.

Actually, the cleanest approach: each ScenarioStep stores a `delayKey` field (e.g. `'DELAY_AFTER_CARDS_DEALT_MS'`) alongside the default delay. The delay slider changes are keyed by this constant name. The AnimationSandbox maps them to step-level overrides.

Update `types.ts`:
```ts
export interface ScenarioStep {
  name: string;
  event: string;
  data: any;
  delayAfterMs: number;
  /** Which server delay constant this step's delay corresponds to (for slider binding) */
  delayKey?: string;
}
```

**Step 5: Smoke test**

Navigate to sandbox, play a scenario. Adjust delay sliders mid-play or before restart. Verify:
- Slider values display in ms
- CSS sliders immediately affect visible animations on next replay
- Server delay sliders affect timing between events on next replay

**Step 6: Commit**

```bash
git add client/src/views/sandbox/ControlPanel.tsx client/src/views/sandbox/types.ts client/src/views/sandbox/AnimationSandbox.tsx
git commit -m "feat(sandbox): add delay sliders for server timing and CSS animations"
```

---

### Task 6: Runtime animation config endpoint

Make server delay constants runtime-configurable so the sandbox can apply changes to the real game.

**Files:**
- Create: `shared/src/animationConfig.ts`
- Modify: `shared/src/constants.ts` — export getter functions alongside raw values
- Modify: `server/src/app.ts` — add POST endpoint
- Modify: `server/src/game/HandEngine.ts` — use getters instead of raw constants
- Modify: `server/src/game/GameManager.ts` — use getters instead of raw constants

**Step 1: Create animationConfig module**

Create: `shared/src/animationConfig.ts`

```ts
/** Runtime-mutable animation timing config. Defaults match the constants in constants.ts. */
const defaults = {
  DELAY_AFTER_CARDS_DEALT_MS: 2000,
  DELAY_AFTER_STREET_DEALT_MS: 1500,
  DELAY_AFTER_PLAYER_ACTED_MS: 800,
  DELAY_SHOWDOWN_TO_RESULT_MS: 3000,
  DELAY_POT_AWARD_MS: 1500,
  DELAY_SHOWDOWN_REVEAL_INTERVAL_MS: 500,
  DELAY_AFTER_ALLIN_SHOWDOWN_MS: 2000,
  DELAY_ALLIN_RUNOUT_STREET_MS: 2500,
  DELAY_DRAMATIC_RIVER_MS: 3500,
  DELAY_BAD_BEAT_TO_RESULT_MS: 3000,
  DELAY_BETWEEN_POT_AWARDS_MS: 2000,
};

type AnimationConfigKey = keyof typeof defaults;

const overrides: Partial<Record<AnimationConfigKey, number>> = {};

export function getAnimDelay(key: AnimationConfigKey): number {
  return overrides[key] ?? defaults[key];
}

export function setAnimDelays(updates: Partial<Record<AnimationConfigKey, number>>) {
  for (const [key, val] of Object.entries(updates)) {
    if (key in defaults && typeof val === 'number') {
      overrides[key as AnimationConfigKey] = val;
    }
  }
}

export function resetAnimDelays() {
  for (const key of Object.keys(overrides)) {
    delete overrides[key as AnimationConfigKey];
  }
}

export function getAnimConfig(): Record<AnimationConfigKey, number> {
  return { ...defaults, ...overrides };
}

export type { AnimationConfigKey };
```

**Step 2: Export from shared index**

Modify: `shared/src/index.ts` — add exports for the new module:
```ts
export { getAnimDelay, setAnimDelays, resetAnimDelays, getAnimConfig } from './animationConfig.js';
export type { AnimationConfigKey } from './animationConfig.js';
```

**Step 3: Update server to use getters**

In `server/src/game/HandEngine.ts` and `server/src/game/GameManager.ts`, find all usages of the delay constants (e.g. `DELAY_AFTER_CARDS_DEALT_MS`) and replace with `getAnimDelay('DELAY_AFTER_CARDS_DEALT_MS')`.

Search for patterns like:
- `DELAY_AFTER_CARDS_DEALT_MS` → `getAnimDelay('DELAY_AFTER_CARDS_DEALT_MS')`
- `DELAY_AFTER_STREET_DEALT_MS` → `getAnimDelay('DELAY_AFTER_STREET_DEALT_MS')`
- etc.

Keep the raw constants in `constants.ts` for client-side code that reads them (e.g. `useTableAnimations` for DELAY_SHOWDOWN_REVEAL_INTERVAL_MS). Only server-side setTimeout usage needs getters.

**Step 4: Add REST endpoint**

Modify: `server/src/app.ts`

```ts
import { setAnimDelays, getAnimConfig, resetAnimDelays } from '@poker/shared';

// Inside createApp(), add:
app.get('/api/animation-config', (_req, res) => res.json(getAnimConfig()));
app.post('/api/animation-config', (req, res) => {
  setAnimDelays(req.body);
  res.json(getAnimConfig());
});
app.post('/api/animation-config/reset', (_req, res) => {
  resetAnimDelays();
  res.json(getAnimConfig());
});
```

**Step 5: Wire sandbox to POST endpoint**

In `ControlPanel.tsx`, add an "Apply to Server" button that POSTs the current delay overrides to `POST /api/animation-config`:

```ts
const applyToServer = async () => {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
  await fetch(`${serverUrl}/api/animation-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentDelays),
  });
};
```

Add a "Reset Server" button that POSTs to `/api/animation-config/reset`.

**Step 6: Test endpoint**

Write a test for the endpoint in: `server/src/__tests__/animation-config.test.ts`

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { getAnimConfig, setAnimDelays, resetAnimDelays } from '@poker/shared';

describe('animationConfig', () => {
  afterEach(() => resetAnimDelays());

  it('returns defaults initially', () => {
    const config = getAnimConfig();
    expect(config.DELAY_AFTER_CARDS_DEALT_MS).toBe(2000);
  });

  it('overrides individual values', () => {
    setAnimDelays({ DELAY_AFTER_CARDS_DEALT_MS: 500 });
    const config = getAnimConfig();
    expect(config.DELAY_AFTER_CARDS_DEALT_MS).toBe(500);
    expect(config.DELAY_AFTER_STREET_DEALT_MS).toBe(1500); // unchanged
  });

  it('reset restores defaults', () => {
    setAnimDelays({ DELAY_AFTER_CARDS_DEALT_MS: 500 });
    resetAnimDelays();
    expect(getAnimConfig().DELAY_AFTER_CARDS_DEALT_MS).toBe(2000);
  });
});
```

**Step 7: Run tests**

Run: `bun run test -- animation-config`
Expected: PASS

**Step 8: Commit**

```bash
git add shared/src/animationConfig.ts shared/src/index.ts server/src/app.ts server/src/__tests__/animation-config.test.ts
# + any HandEngine.ts / GameManager.ts changes
git commit -m "feat(sandbox): add runtime animation config with REST endpoint"
```

---

### Task 7: Export functionality

Add "Copy Constants" and "Copy CSS" buttons that generate pasteable code from the current slider values.

**Files:**
- Modify: `client/src/views/sandbox/ControlPanel.tsx`

**Step 1: Add export buttons**

At the bottom of the ControlPanel, add two buttons:

```tsx
const exportConstants = () => {
  const lines = Object.entries(currentDelays)
    .map(([key, val]) => `export const ${key} = ${val};`)
    .join('\n');
  navigator.clipboard.writeText(lines);
};

const exportCss = () => {
  const lines = Object.entries(currentCssValues)
    .map(([_, { prop, value }]) => `  ${prop}: ${value}ms;`)
    .join('\n');
  navigator.clipboard.writeText(`:root {\n${lines}\n}`);
};
```

Add visual feedback (button text changes to "Copied!" for 1.5s).

**Step 2: Commit**

```bash
git add client/src/views/sandbox/ControlPanel.tsx
git commit -m "feat(sandbox): add export constants and CSS buttons"
```

---

### Task 8: Polish, version bump, and documentation

**Files:**
- Modify: `doc/structure.md` — add sandbox to directory tree and feature mapping
- Modify: all 4 `package.json` files — version bump (minor: new feature)

**Step 1: Update structure.md**

Add under Directory Tree:
```
    views/
      sandbox/      # Animation Sandbox (dev tool for tuning timings)
```

Add to Feature-to-File Mapping table:
```
| Animation sandbox | server/src/app.ts (config endpoint), shared/src/animationConfig.ts | views/sandbox/*.tsx | - |
```

**Step 2: Version bump**

Bump minor version in all 4 `package.json` files (root, shared, server, client).

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: add animation sandbox for visual timing tuning (vX.Y.0)"
```
