name: sandbox-editor
description: Use when modifying the Animation Sandbox / UI editor view. Provides complete file map, component architecture, layout constants, and styling patterns so you can skip exploration and go straight to editing.

# Animation Sandbox — Editor Context

## File Map

| File | Purpose |
|------|---------|
| `client/src/views/sandbox/AnimationSandbox.tsx` | Main entry: layout container, state management, wires PokerTable + ControlPanel + PointsOverlay |
| `client/src/views/sandbox/ControlPanel.tsx` | Right sidebar (fixed, 340px, z-50): scenario selector, playback, speed, edit points toggle, step list, delay sliders, apply/export buttons |
| `client/src/views/sandbox/PointsOverlay.tsx` | Draggable dots overlay (absolute, z-40): seat/bet/pot/community/deck/info/dealer/card positions. Mutates position objects in-place. |
| `client/src/views/sandbox/AnimationDriver.ts` | Playback engine: step-by-step scenario execution, speed control, solo mode, delay overrides |
| `client/src/views/sandbox/scenarios.ts` | Predefined test scenarios (large file) |
| `client/src/views/sandbox/MockSocket.ts` | Simple EventEmitter to simulate Socket.IO |
| `client/src/views/sandbox/types.ts` | `ScenarioStep`, `Scenario` types |
| `client/src/views/table/PokerTable.tsx` | The actual poker table component (900x550 virtual, shared with production views) |
| `client/src/views/table/layout-positions.ts` | Position data: SEAT_POSITIONS[10], BET_POSITIONS[10], POT_CENTER, COMMUNITY_CARDS_POS, GAME_INFO_POS, WINNING_HAND_POS, DEALER_BTN_OFFSET, CARD_OFFSET_DISTANCE, DECK_POS |

## Layout Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  AnimationSandbox — 100vw × 100vh, bg: #0a0a0a                      │
│  ┌──────────────────────────────────────┐  ┌──────────────────────┐  │
│  │  containerRef div                    │  │  ControlPanel        │  │
│  │  width: calc(100% - 372px)           │  │  position: fixed     │  │
│  │  flex center (both axes)             │  │  top: 16, right: 16  │  │
│  │                                      │  │  width: 340, z: 50   │  │
│  │  ┌──────────────────────────────┐    │  │  bg: rgba(0,0,0,.85) │  │
│  │  │  PokerTable                  │    │  │  backdrop-blur: 8px  │  │
│  │  │  900px × 550px (virtual)     │    │  │  max-h: 100vh-32px   │  │
│  │  │  aspect-ratio: 18:11         │    │  │  overflow-y: auto    │  │
│  │  └──────────────────────────────┘    │  │                      │  │
│  │  ┌──────────────────────────────┐    │  │  Sections:           │  │
│  │  │  PointsOverlay (if active)   │    │  │  - Header + collapse │  │
│  │  │  900×550, absolute, z: 40    │    │  │  - Scenario select   │  │
│  │  │  pointer-events: drag only   │    │  │  - Play/Pause/Restart│  │
│  │  └──────────────────────────────┘    │  │  - Speed (0.25-2x)   │  │
│  └──────────────────────────────────────┘  │  - Edit Points toggle│  │
│                                            │  - Solo mode bar     │  │
│                                            │  - Steps + sliders   │  │
│                                            │  - Apply to Server   │  │
│                                            │  - Export buttons    │  │
│                                            └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## Key Constants

- `TABLE_VIRTUAL_W = 900`, `TABLE_VIRTUAL_H = 550` (exported from PokerTable.tsx)
- ControlPanel: `position: fixed, top: 16, right: 16, width: 340, zIndex: 50`
- Container: `width: calc(100% - 372px)` (340 + 16 + 16 gap)
- PointsOverlay: `position: absolute, width: 900, height: 550, zIndex: 40`
- All position data uses percentage coords (0-100% for x,y on virtual table)

## OverlayCategory IDs & Colors

| ID | Label | Color |
|----|-------|-------|
| seats | Seats (S0-S9) | #4af |
| bets | Bets (B0-B9) | #fa0 |
| pot | Pot Center | #f44 |
| community | Community Cards | #4f4 |
| deck | Deck / Shuffle | #a4f |
| gameInfo | Game Info | #ff4 |
| winningHand | Winning Hand Text | #f4a |
| dealer | Dealer Btn Offset | #4ff |
| cardOffset | Card Offset | #aaa |

## Styling Conventions

- Dark theme: bg `#0a0a0a`, panel `rgba(0,0,0,0.85)`, text `#fff`
- Buttons: green `#4a4` (play/active), red `#c44` (pause), gray `#555`/`#333`
- Solo mode: orange `#fa0`, bg `#3a2a00`
- Current step: green `#6c6`, bg `#2a4a2a`
- All inline styles, no CSS classes (except Tailwind utilities on PokerTable internals)

## State Flow

1. `AnimationSandbox` owns all state (gameState, scenario, playback, overlays)
2. `AnimationDriver` controls scenario playback via MockSocket events
3. `useTableAnimations` hook listens to MockSocket → updates animation state
4. `PokerTable` renders based on gameState + animation props
5. `PointsOverlay` mutates position objects in-place (SEAT_POSITIONS etc.) — restart animation to see effect
6. `ControlPanel` is pure UI — all mutations via callbacks to parent

## Common Modifications

- **Layout changes**: Edit `AnimationSandbox.tsx` container styles
- **New controls**: Add to `ControlPanel.tsx` (follow existing section pattern)
- **New overlay categories**: Add to `OVERLAY_CATEGORIES` in `PointsOverlay.tsx` + handle in `getPos`/`setPos`
- **New scenarios**: Add to `scenarios.ts`
- **Table position defaults**: Edit `layout-positions.ts`
