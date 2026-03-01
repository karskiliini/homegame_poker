# Design: Eliminate WatchingScreen — Merge into GameScreen

## Problem
Switching between WatchingScreen and GameScreen causes a black flash because they are separate components with separate table sockets. AnimatePresence fades one out before mounting the other, and cleanup nulls gameState.

## Solution
Merge WatchingScreen functionality into GameScreen. One component, one table socket, no transitions.

## Architecture

GameScreen handles two modes based on store state:
- `privateState === null` → watching mode (spectator controls)
- `privateState !== null` → playing mode (game controls)

### GameScreen changes
- New props: `onBack` (return to table lobby), `playerSocket` (for JOIN_TABLE emit)
- Bottom panel renders conditionally:
  - **Watching**: "Sit Down" button, buy-in modal, seat selection via onSeatClick
  - **Playing**: Hole cards, action buttons, pre-action, sit-out (existing)
- Top bar: Back button + ThemeToggle/LanguageToggle/SoundToggle in watching mode
- Buy-in modal moved from WatchingScreen into GameScreen
- Table socket stays connected through mode changes

### PlayerView changes
- Remove `'watching'` from screen enum
- Table selection and TABLE_CREATED → setScreen('game') + setWatchingTableId
- handleLeaveTable: clear privateState/lobbyState but keep screen='game'
- Remove AnimatePresence transitionKey grouping hack (no longer needed)

### Store changes
- Remove `'watching'` from screen type
- Keep `watchingTableId` (used to know which table to watch)

### Deleted files
- `client/src/views/player/WatchingScreen.tsx`

## Dataflow
```
TableLobby → select table → screen='game', watchingTableId=X
  → GameScreen mounts, table socket connects, watching starts
  → Player clicks "Sit Down" → buy-in modal → playerSocket.emit(JOIN_TABLE)
  → Server sends JOINED → privateState arrives → panel switches to playing
  → Player clicks "Leave Table" → playerSocket.emit(LEAVE_TABLE) → privateState nulled
  → Panel switches back to watching — table stays visible, no flash
```

## Unchanged
- PokerTable, useTableAnimations, table socket protocol
- ActionButtons, PreActionButtons, card display, sit-out flow
- Chat, BugReportButton, HandHistory
