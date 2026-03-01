# Player Profile Modal — Design

## Goal
Add a profile modal accessible from the lobby that shows player info, balance, avatar editing, and balance transaction history.

## Database

New `balance_transactions` table in SQLite:

```sql
CREATE TABLE balance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  type TEXT NOT NULL,        -- 'deposit' | 'buy_in' | 'cash_out' | 'rebuy'
  amount REAL NOT NULL,      -- positive = balance increases, negative = decreases
  table_id TEXT,             -- table ID for buy_in/cash_out/rebuy
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
)
```

Modify existing `updateBalance()` to also log transactions. All balance changes go through this function, so a single modification covers all cases.

## Socket Events

```
C2S_LOBBY.GET_PROFILE → S2C_LOBBY.PROFILE_DATA
  Request: (no payload, uses authenticatedPlayerId)
  Response: { name, avatarId, balance, transactions: Transaction[] }

C2S_LOBBY.UPDATE_AVATAR → S2C_LOBBY.AVATAR_UPDATED
  Request: { avatarId }
  Response: { avatarId }
```

Transaction type:
```typescript
interface BalanceTransaction {
  id: number
  type: 'deposit' | 'buy_in' | 'cash_out' | 'rebuy'
  amount: number
  tableId?: string
  createdAt: string
}
```

## UI: ProfileModal

Opens when player clicks their name/avatar area in the lobby.

Layout:
- Avatar (large, centered) — clickable to open avatar selection grid
- Player name
- "Change avatar" button
- Current balance (large, prominent)
- Divider
- Transaction history list (most recent 50, newest first)
  - Each row: icon + amount + type label + time
  - Color: green for positive (deposit, cash_out), red for negative (buy_in, rebuy)

Styling: follows existing modal pattern (`fixed inset-0 bg-black/70 z-50`), uses `--ftp-*` design tokens.

## Files to Modify

| File | Change |
|------|--------|
| `server/src/db/players.ts` | Add `balance_transactions` table, `logTransaction()`, `getTransactions()`, update `updateBalance()` |
| `server/src/socket/player-namespace.ts` | Add GET_PROFILE and UPDATE_AVATAR handlers, pass transaction type to updateBalance |
| `shared/src/types/socket-events.ts` | Add new C2S/S2C events, BalanceTransaction type |
| `client/src/views/player/ProfileModal.tsx` | New file — profile modal component |
| `client/src/views/player/LobbyScreen.tsx` | Add click handler on player info to open ProfileModal |

## Decision: No admin view now
Admin balance management deferred to end of roadmap.
