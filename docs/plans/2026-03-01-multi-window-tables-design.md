# Multi-Window Table Design

## Problem
Players want to play at multiple tables simultaneously. Currently the app uses a single-window flow: login → lobby → watching → game. Opening the same table in two tabs has no protection.

## Solution
Lobby opens each table in a separate browser window via `window.open()`. Each window is an independent SPA instance with its own socket connections. BroadcastChannel prevents duplicate windows for the same table+user.

## Architecture

### URL Routing
- `/` — Login/Lobby (existing flow)
- `/table/:tableId` — Table view (watching → game)

App.tsx detects URL path and renders either lobby flow or table view directly.

### Lobby → Table Flow
1. Player clicks table in lobby
2. `window.open('/table/<tableId>', 'table-<tableId>')` opens new window
3. Window name ensures same table reuses existing window
4. Lobby shows visual indicator for open tables

### Duplicate Protection (BroadcastChannel)
- Table window broadcasts `TABLE_OPENED` on open
- Table window broadcasts `TABLE_CLOSED` on close/unload
- Lobby listens and updates UI (shows which tables are open)
- Same window name prevents true duplicates

### Auth in Table Window
- Auth session already in localStorage (`ftp-auth-session`)
- Table window reads it directly — no URL params needed

### Socket Connections
Each table window creates its own:
- `/player` socket — actions, rebuy, sit-out
- `/table` socket — game state observation

Lobby maintains its own `/player` socket for lobby data.

## Scope
- Player phone view only
- TV view not affected
- Server-side changes minimal (no new endpoints needed)
