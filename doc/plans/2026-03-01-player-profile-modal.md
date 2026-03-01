# Player Profile Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a profile modal in the table lobby that shows player info, balance, avatar editing, and balance transaction history.

**Architecture:** New `balance_transactions` SQLite table logs every balance change. `updateBalance()` gains a `type` + optional `tableId` parameter to log transactions atomically. New socket events (`GET_PROFILE`, `UPDATE_AVATAR`) serve profile data. A `ProfileModal` component in the client opens when the player clicks their name/avatar area in the table lobby header.

**Tech Stack:** SQLite (better-sqlite3), Socket.IO, React, Zustand, Tailwind v4, vitest

---

### Task 1: Add `balance_transactions` table and logging functions

**Files:**
- Modify: `server/src/db/players.ts`
- Test: `server/src/__tests__/balance-transactions.test.ts`

**Step 1: Write the failing test**

Create `server/src/__tests__/balance-transactions.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  _setDb, _initSchema,
  createPlayer, setBalance, updateBalance,
  logTransaction, getTransactions,
} from '../db/players.js';

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  _initSchema(db);
  _setDb(db);
});

afterEach(() => {
  db.close();
});

describe('Balance transactions', () => {
  it('logTransaction stores a transaction record', async () => {
    const player = await createPlayer('Test', 'pass');
    logTransaction(player.id, 'deposit', 500);
    const txns = getTransactions(player.id);
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe('deposit');
    expect(txns[0].amount).toBe(500);
    expect(txns[0].tableId).toBeNull();
  });

  it('logTransaction stores tableId for buy_in', async () => {
    const player = await createPlayer('Test2', 'pass');
    logTransaction(player.id, 'buy_in', -200, 'table-abc');
    const txns = getTransactions(player.id);
    expect(txns[0].tableId).toBe('table-abc');
  });

  it('getTransactions returns newest first, limited to 50', async () => {
    const player = await createPlayer('Test3', 'pass');
    for (let i = 0; i < 55; i++) {
      logTransaction(player.id, 'deposit', i + 1);
    }
    const txns = getTransactions(player.id);
    expect(txns).toHaveLength(50);
    expect(txns[0].amount).toBe(55); // newest first
  });

  it('getTransactions returns empty array for new player', async () => {
    const player = await createPlayer('Fresh', 'pass');
    const txns = getTransactions(player.id);
    expect(txns).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd server && bunx vitest run src/__tests__/balance-transactions.test.ts`
Expected: FAIL — `logTransaction` and `getTransactions` not exported from players.ts

**Step 3: Implement in players.ts**

Add `balance_transactions` table to `initAllTables()`:

```typescript
database.exec(`
  CREATE TABLE IF NOT EXISTS balance_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    table_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  )
`);
```

Add `TransactionRecord` interface and two functions:

```typescript
export interface TransactionRecord {
  id: number;
  player_id: string;
  type: string;
  amount: number;
  table_id: string | null;
  created_at: string;
}

export function logTransaction(playerId: string, type: string, amount: number, tableId?: string): void {
  getDb().prepare(
    'INSERT INTO balance_transactions (player_id, type, amount, table_id) VALUES (?, ?, ?, ?)'
  ).run(playerId, type, amount, tableId ?? null);
}

export function getTransactions(playerId: string, limit: number = 50): TransactionRecord[] {
  return getDb().prepare(
    'SELECT * FROM balance_transactions WHERE player_id = ? ORDER BY id DESC LIMIT ?'
  ).all(playerId, limit) as TransactionRecord[];
}
```

**Step 4: Run test to verify it passes**

Run: `cd server && bunx vitest run src/__tests__/balance-transactions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/src/db/players.ts server/src/__tests__/balance-transactions.test.ts
git commit -m "feat: add balance_transactions table and logging functions"
```

---

### Task 2: Wire transaction logging into existing balance change points

**Files:**
- Modify: `server/src/socket/player-namespace.ts`
- Modify: `server/src/db/players.ts` (add import if needed)

**Step 1: Add `logTransaction` to deposit handler**

In `player-namespace.ts`, import `logTransaction` from `../db/players.js`.

In the `C2S_LOBBY.DEPOSIT` handler (line ~148), after `updateBalance` succeeds:

```typescript
logTransaction(authenticatedPlayerId, 'deposit', data.amount);
```

**Step 2: Add `logTransaction` to buy-in (JOIN_TABLE handler)**

After `updateBalance(authenticatedPlayerId, -data.buyIn)` succeeds (line ~198):

```typescript
logTransaction(authenticatedPlayerId, 'buy_in', -data.buyIn, data.tableId);
```

**Step 3: Add `logTransaction` to cash-out (onPlayerRemoved callback)**

In the `setOnPlayerRemoved` callback (line ~206-212), after `updateBalance(pid, remainingStack)`:

```typescript
logTransaction(pid, 'cash_out', remainingStack, currentTableId ?? undefined);
```

Note: capture `currentTableId` as `const tableIdForCallback = data.tableId;` before the callback, then use `tableIdForCallback` inside the callback.

**Step 4: Add `logTransaction` to rebuy handler**

After `updateBalance(authenticatedPlayerId, -data.amount)` in the REBUY handler (line ~326):

```typescript
logTransaction(authenticatedPlayerId, 'rebuy', -data.amount, currentTableId ?? undefined);
```

**Step 5: Run all tests to verify nothing broke**

Run: `cd server && bunx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add server/src/socket/player-namespace.ts
git commit -m "feat: log balance transactions for deposit, buy-in, cash-out, rebuy"
```

---

### Task 3: Add socket events for profile data

**Files:**
- Modify: `shared/src/types/socket-events.ts`
- Modify: `server/src/socket/player-namespace.ts`

**Step 1: Add new event constants to shared types**

In `shared/src/types/socket-events.ts`:

Add to `C2S_LOBBY`:
```typescript
GET_PROFILE: 'lobby:get_profile',
UPDATE_AVATAR: 'lobby:update_avatar',
```

Add to `S2C_LOBBY`:
```typescript
PROFILE_DATA: 'lobby:profile_data',
AVATAR_UPDATED: 'lobby:avatar_updated',
```

**Step 2: Add BalanceTransaction type to shared**

Create or append to `shared/src/types/lobby.ts` (or inline in socket-events.ts if lobby.ts doesn't have types — check first):

```typescript
export interface BalanceTransaction {
  id: number;
  type: 'deposit' | 'buy_in' | 'cash_out' | 'rebuy';
  amount: number;
  tableId: string | null;
  createdAt: string;
}
```

**Step 3: Add GET_PROFILE handler to player-namespace.ts**

Import `getTransactions` from `../db/players.js`.

Add handler:

```typescript
socket.on(C2S_LOBBY.GET_PROFILE, () => {
  if (!authenticatedPlayerId) {
    socket.emit(S2C_LOBBY.AUTH_ERROR, { message: 'Not authenticated' });
    return;
  }
  const player = findPlayerById(authenticatedPlayerId);
  if (!player) return;
  const transactions = getTransactions(authenticatedPlayerId).map(t => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    tableId: t.table_id,
    createdAt: t.created_at,
  }));
  socket.emit(S2C_LOBBY.PROFILE_DATA, {
    name: player.name,
    avatarId: player.avatar_id,
    balance: player.balance,
    transactions,
  });
});
```

**Step 4: Add UPDATE_AVATAR handler to player-namespace.ts**

```typescript
socket.on(C2S_LOBBY.UPDATE_AVATAR, (data: { avatarId: string }) => {
  if (!authenticatedPlayerId) {
    socket.emit(S2C_LOBBY.AUTH_ERROR, { message: 'Not authenticated' });
    return;
  }
  updateAvatar(authenticatedPlayerId, data.avatarId);
  socket.emit(S2C_LOBBY.AVATAR_UPDATED, { avatarId: data.avatarId });
});
```

**Step 5: Run all tests**

Run: `bun run test`
Expected: All tests PASS (shared type changes are additive, no breaking changes)

**Step 6: Commit**

```bash
git add shared/src/types/socket-events.ts shared/src/types/lobby.ts server/src/socket/player-namespace.ts
git commit -m "feat: add GET_PROFILE and UPDATE_AVATAR socket events"
```

---

### Task 4: Create ProfileModal component

**Files:**
- Create: `client/src/views/player/ProfileModal.tsx`

**Step 1: Build the ProfileModal component**

The component:
- Receives `socket` prop and `onClose` callback
- On mount, emits `C2S_LOBBY.GET_PROFILE` and listens for `S2C_LOBBY.PROFILE_DATA`
- Shows avatar (large, centered), player name, balance
- Has "Change Avatar" toggle that shows avatar grid (reuse pattern from LoginScreen)
- Shows transaction history list (newest first, up to 50)
- Emits `C2S_LOBBY.UPDATE_AVATAR` when avatar is changed
- Uses existing modal pattern: `fixed inset-0 bg-black/70 z-50`
- Uses `--ftp-*` design tokens, `font-mono` for numbers
- Avatar images use `avatarImageFile()` helper and theme's `assets`

Key UI elements:
- Close button (top-right X)
- Avatar with click-to-change
- Avatar selection grid (same as LoginScreen: 4 columns, scrollable, red border on selected)
- Balance display (gold color, large font-mono)
- Transaction list with type icon, amount (green/red), and timestamp

Transaction type display mapping:
```typescript
const txnDisplay: Record<string, { icon: string; label: string }> = {
  deposit:  { icon: '📥', label: 'Deposit' },
  buy_in:   { icon: '🎰', label: 'Buy-in' },
  cash_out: { icon: '💰', label: 'Cash-out' },
  rebuy:    { icon: '🔄', label: 'Rebuy' },
};
```

Use i18n keys for labels (add them in Task 5).

**Step 2: Commit**

```bash
git add client/src/views/player/ProfileModal.tsx
git commit -m "feat: add ProfileModal component"
```

---

### Task 5: Add i18n translations for profile

**Files:**
- Modify: `client/src/i18n/translations.ts`

**Step 1: Add English translations**

Add to the `en` object:

```typescript
// Profile
profile_title: 'Profile',
profile_change_avatar: 'Change Avatar',
profile_balance: 'Balance',
profile_history: 'Transaction History',
profile_no_history: 'No transactions yet',
profile_txn_deposit: 'Deposit',
profile_txn_buy_in: 'Buy-in',
profile_txn_cash_out: 'Cash-out',
profile_txn_rebuy: 'Rebuy',
profile_close: 'Close',
```

**Step 2: Add Finnish translations**

Add to the `fi` object:

```typescript
// Profile
profile_title: 'Profiili',
profile_change_avatar: 'Vaihda avatar',
profile_balance: 'Saldo',
profile_history: 'Tapahtumahistoria',
profile_no_history: 'Ei tapahtumia',
profile_txn_deposit: 'Talletus',
profile_txn_buy_in: 'Buy-in',
profile_txn_cash_out: 'Cash-out',
profile_txn_rebuy: 'Rebuy',
profile_close: 'Sulje',
```

**Step 3: Commit**

```bash
git add client/src/i18n/translations.ts
git commit -m "feat: add profile modal i18n translations (EN/FI)"
```

---

### Task 6: Integrate ProfileModal into TableLobbyScreen

**Files:**
- Modify: `client/src/views/player/TableLobbyScreen.tsx`

**Step 1: Add profile modal state and trigger**

Import `ProfileModal` and add state:

```typescript
const [showProfileModal, setShowProfileModal] = useState(false);
```

**Step 2: Make player name/balance area clickable**

Wrap the existing player info area in the header (the "Playing as [name]" text and balance display, lines 61-100) so that clicking the player name or balance area opens the profile modal. Add a subtle hover indicator.

Specifically, wrap the left-side header content (player name area) with an `onClick` that sets `setShowProfileModal(true)`.

**Step 3: Render ProfileModal**

Before the closing `</div>` of the component, add:

```typescript
{showProfileModal && (
  <ProfileModal socket={socket} onClose={() => setShowProfileModal(false)} />
)}
```

**Step 4: Update `playerAvatar` in Zustand store when avatar changes**

In PlayerView.tsx, add listener for `S2C_LOBBY.AVATAR_UPDATED` that updates the store's `playerAvatar`.

**Step 5: Run the full test suite**

Run: `bun run test`
Expected: All tests PASS

**Step 6: Manual test**

Start local server on random port, open in browser:
1. Login → see table lobby
2. Click player name area → profile modal opens
3. See balance and empty transaction history
4. Deposit → close modal → reopen → see deposit in history
5. Change avatar → verify it updates
6. Close modal → verify lobby still works

**Step 7: Commit**

```bash
git add client/src/views/player/TableLobbyScreen.tsx client/src/views/player/ProfileModal.tsx client/src/views/player/PlayerView.tsx
git commit -m "feat: integrate ProfileModal into table lobby"
```

---

### Task 7: Version bump and final verification

**Files:**
- Modify: `package.json` (root), `shared/package.json`, `server/package.json`, `client/package.json`

**Step 1: Bump version**

This is a new feature (minor bump). Update all 4 `package.json` files from current version to next minor.

**Step 2: Run full test suite**

Run: `bun run test`
Expected: All tests PASS

**Step 3: Run build**

Run: `cd client && bun run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add package.json shared/package.json server/package.json client/package.json
git commit -m "chore: bump version to X.Y.0 for player profile modal feature"
```

---

### Task 8: Update docs

**Files:**
- Modify: `doc/roadmap.md`
- Modify: `doc/structure.md`

**Step 1: Mark completed roadmap items**

In `doc/roadmap.md`, under Vaihe 0.4, mark completed:
- `[x] Pelaajan profiili: nimi, avatar, sähköposti, saldohistoria`
- Mark other already-done items as `[x]` too

**Step 2: Update structure.md**

Add `ProfileModal` to the feature-to-file mapping.

**Step 3: Commit**

```bash
git add doc/roadmap.md doc/structure.md
git commit -m "docs: update roadmap and structure for profile modal"
```
