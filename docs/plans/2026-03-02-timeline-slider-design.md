# Timeline Slider for UI Editor

## Problem
Editor can only play animations forward at a set speed. No way to jump to a specific moment in the animation sequence to inspect table state at that point.

## Solution
Step-based timeline slider bar spanning the full width below the table/control panel area.

## Layout

```
┌─────────────────────────┬──────────────┐
│                         │              │
│        Table            │  ControlPanel│  ← calc(100vh - 80px)
│                         │              │
├─────────────────────────┴──────────────┤
│  ◄ ■ ► 1x │ ●──●──●──●──●──●──●──●─── │  ← 80px, full width
│            │ shuffle deal flop turn ... │
└────────────────────────────────────────┘
```

## Timeline Bar Contents

**Left:** Playback controls (Play/Pause, Stop, Restart) + speed selector — moved from ControlPanel
**Right:** Horizontal step timeline:
- Each scenario step is a dot/marker on the line
- Active step highlighted (green)
- Past steps filled, future steps empty/dim
- Step name shown on hover (tooltip)
- Click dot or drag slider to seek to step

## AnimationDriver Changes

New `seekTo(stepIndex)` method:
- Executes steps 0..stepIndex synchronously (no delays) via MockSocket
- `useTableAnimations` hook receives all events → table arrives at correct state
- Sets `_currentStepIndex = stepIndex`
- If playing, continues from next step normally

## ControlPanel Changes

Remove from ControlPanel:
- Play/Pause/Restart buttons
- Speed selector

Keep in ControlPanel:
- Scenario selection dropdown
- Steps list (solo mode, delay overrides)
- Edit Points overlay toggles
- Apply to Server / Export buttons
