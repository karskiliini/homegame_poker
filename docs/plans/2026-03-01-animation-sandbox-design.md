# Animation Sandbox — Design

## Problem
Tuning animation timing by editing code blind is frustrating. Need a visual tool to see animations, adjust delays, and apply changes to the real app.

## Solution
A standalone sandbox page (`/#/sandbox`) that renders the real `PokerTable` component with mock game data, controllable playback, and live-adjustable timing values that propagate to the running app.

## Layout
- **PokerTable** renders full-width, identical to production
- **Control Panel** is a floating overlay (right side), semi-transparent dark background, collapsible

## Scenarios (Presets)

| Scenario | Content |
|----------|---------|
| Basic Hand | Shuffle → deal 2×4 players → flop → turn → river → showdown → pot award |
| Dramatic River | Same as basic but river uses dramatic peel (2500ms) |
| All-In Showdown | Preflop all-in → spotlight → equity → runout → pot award |
| Multi-Pot | 3 players all-in different stacks → main + side pot → sequential awards |
| Run It Twice | All-in → board 1 → board 2 → split pot awards |
| Bad Beat | Showdown → bad beat explosion + text → pot award |
| Royal Flush | Showdown → pot award → confetti celebration |
| Chip Movements | Bet → raise → call → collect to pot → award |

Each scenario is an array of `ScenarioStep` objects:
```ts
type ScenarioStep = {
  name: string        // "Shuffle", "Deal Cards", "Flop", etc.
  event: string       // socket event name
  data: any           // event payload
  delayAfterMs: number // default delay before next step
}
```

## Controls

**Playback:** Play / Pause / Restart / Speed (0.25x, 0.5x, 1x, 2x)

**Phase indicator:** Vertical list of steps — active highlighted, past grayed, future dimmed.

**Delay sliders (server-side):**
- After cards dealt (default 2000ms)
- After street dealt (1500ms)
- After player acted (800ms)
- Showdown to result (3000ms)
- Showdown reveal interval (500ms)
- After all-in showdown (2000ms)
- All-in runout street (2500ms)
- Dramatic river (3500ms)
- Bad beat to result (3000ms)
- Between pot awards (2000ms)

**CSS animation sliders (client-side):**
- Card deal (350ms), card deal stagger (120ms)
- Card flip (300ms), flop stagger (80ms)
- Chip bet fly (500ms), chip win fly (1200ms)
- River peel (2500ms), shuffle (1800ms)
- Winner banner in/visible/out, celebration (4500ms)
- Bad beat (3000ms), chip trick (2500ms)

**Export:** "Copy Constants" and "Copy CSS" buttons for persisting tuned values to code.

## Live Application of Values

### CSS animations
Sandbox calls `document.documentElement.style.setProperty('--ftp-anim-*', value)` — takes effect immediately for all animations in the browser.

### Server delays
- `shared/constants.ts` delay values are wrapped in a mutable `AnimationConfig` object
- Server exposes `POST /api/animation-config` endpoint to update values at runtime
- Sandbox sends tuned values → server uses them from next hand onward
- Values reset to defaults on server restart (unless exported and committed to code)

## Architecture

### Minimal production code changes
1. `useTableAnimations.ts` — add `AnimationDriver` interface: event emitter pattern alongside socket listeners. When driver is provided, events come from driver instead of socket.
2. `shared/constants.ts` — wrap delay constants in mutable `AnimationConfig` with getter functions
3. `server/src/app.ts` — add `/api/animation-config` POST endpoint

### Sandbox-specific code
```
client/src/views/sandbox/
  AnimationSandbox.tsx    — main page component
  ControlPanel.tsx        — floating overlay UI
  AnimationDriver.ts      — event scheduler (plays scenarios)
  scenarios.ts            — preset scenario definitions
  types.ts                — sandbox types
```

### Data flow
```
Scenario → AnimationDriver → useTableAnimations → PokerTable (renders)
                                                       ↑
ControlPanel sliders → CSS variables (immediate)
                     → POST /api/animation-config (next hand)
```

## Scope

**V1:** 8 presets, play/pause/restart, speed, delay sliders, CSS sliders, export, live app integration.

**Not V1:** Scrubber bar, custom scenario builder, recorded game replay, theme switching in sandbox.
