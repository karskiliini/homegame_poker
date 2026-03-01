# Eliminate WatchingScreen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge WatchingScreen into GameScreen so watching/playing share one component and one table socket — no screen transitions, no black flash.

**Architecture:** GameScreen gains a "watching" mode when `privateState === null`. The bottom panel switches between spectator controls (Sit Down + buy-in) and player controls (cards + actions) based on this state. WatchingScreen is deleted. The `'watching'` screen enum value is removed — both modes use `screen='game'`.

**Tech Stack:** React, Zustand, Socket.IO, Tailwind CSS, Framer Motion

---

### Task 1: Update useGameStore — remove 'watching' from screen type

**Files:**
- Modify: `client/src/hooks/useGameStore.ts:74-75`

**Step 1: Change the screen type**

Replace:
```ts
screen: 'login' | 'table_lobby' | 'watching' | 'lobby' | 'game';
setScreen: (screen: 'login' | 'table_lobby' | 'watching' | 'lobby' | 'game') => void;
```

With:
```ts
screen: 'login' | 'table_lobby' | 'lobby' | 'game';
setScreen: (screen: 'login' | 'table_lobby' | 'lobby' | 'game') => void;
```

**Step 2: Commit**

```bash
git add client/src/hooks/useGameStore.ts
git commit -m "refactor: remove 'watching' from screen enum in store"
```

---

### Task 2: Update GameScreen — add watching mode with buy-in + back button

**Files:**
- Modify: `client/src/views/player/GameScreen.tsx`

**Step 1: Add new imports and props**

Add to imports:
```ts
import { C2S_LOBBY, S2C_TABLE } from '@poker/shared';
import { tableSoundManager } from '../../audio/SoundManager.js';
import { SoundToggle } from '../../components/SoundToggle.js';
import { LanguageToggle } from '../../components/LanguageToggle.js';
import { ThemeToggle } from '../../components/ThemeToggle.js';
import { useSpeechBubbleQueue } from '../../hooks/useSpeechBubbleQueue.js';
```

Update GameScreenProps:
```ts
interface GameScreenProps {
  socket: Socket;          // player socket (for actions + JOIN_TABLE)
  onOpenHistory?: () => void;
  onLeaveTable?: () => void;
  onBack?: () => void;     // NEW: return to table lobby (watching mode)
  speechBubble?: ChatMessage | null;
  onSpeechBubbleDone?: () => void;
}
```

**Step 2: Add watching-mode state and derive isWatching**

After the existing state declarations, add:
```ts
const { watchingTableId, tables, playerName, playerAvatar, accountBalance, persistentPlayerId } = useGameStore();
const isWatching = !privateState;

// Buy-in state (only used when watching)
const [showBuyIn, setShowBuyIn] = useState(false);
const [buyInAmount, setBuyInAmount] = useState(0);
const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
const buyInOpenedAt = useRef(0);

const table = tables.find(t => t.tableId === (currentTableId || watchingTableId));
const tableMaxBuyIn = table?.stakeLevel.maxBuyIn ?? 200;
const maxBuyIn = Math.min(tableMaxBuyIn, accountBalance);
const canBuyIn = accountBalance > 0;
const isAlreadySeated = !!(persistentPlayerId && gameState?.players.some(p => p.id === persistentPlayerId));
```

**Step 3: Update table socket effect to use watchingTableId as fallback**

Change the table socket useEffect to watch `currentTableId || watchingTableId`:
```ts
const activeTableId = currentTableId || watchingTableId;

useEffect(() => {
  if (!activeTableId) return;
  const ts = tableSocketRef.current;
  ts.connect();

  const handleConnect = () => {
    ts.emit(C2S_TABLE.WATCH, { tableId: activeTableId });
  };

  ts.on('connect', handleConnect);
  if (ts.connected) {
    ts.emit(C2S_TABLE.WATCH, { tableId: activeTableId });
  }

  // Listen for chat on table socket (watching mode — player socket doesn't receive table chat)
  const handleChat = (msg: ChatMessage) => {
    addChatMessage(msg);
  };
  ts.on(S2C_TABLE.CHAT_MESSAGE, handleChat);

  return () => {
    ts.off(S2C_TABLE.CHAT_MESSAGE, handleChat);
    ts.off('connect', handleConnect);
    ts.disconnect();
  };
}, [activeTableId]);
```

Also pull `addChatMessage` from the store destructure.

**Step 4: Update useTableAnimations to enable sound when watching**

Change:
```ts
enableSound: false,
```
To:
```ts
enableSound: isWatching,
```

This way, watching mode plays table sounds (like WatchingScreen did), while playing mode defers to PlayerView's player namespace sounds.

**Step 5: Add watching-mode handlers**

```ts
const handleSeatClick = useCallback((seatIndex: number) => {
  if (isWatching && !isAlreadySeated) {
    setSelectedSeat(seatIndex);
    setBuyInAmount(maxBuyIn);
    buyInOpenedAt.current = Date.now();
    setShowBuyIn(true);
  } else if (isSittingOut || isBusted) {
    socket.emit(C2S.CHANGE_SEAT, { seatIndex });
  }
}, [isWatching, isAlreadySeated, maxBuyIn, isSittingOut, isBusted, socket]);

const handleSitDown = useCallback(() => {
  setBuyInAmount(maxBuyIn);
  setSelectedSeat(null);
  buyInOpenedAt.current = Date.now();
  setShowBuyIn(true);
}, [maxBuyIn]);

const handleConfirmSitDown = useCallback(() => {
  const tableId = currentTableId || watchingTableId;
  if (!tableId || buyInAmount <= 0) return;
  socket.emit(C2S_LOBBY.JOIN_TABLE, {
    tableId,
    name: playerName,
    buyIn: buyInAmount,
    avatarId: playerAvatar,
    ...(selectedSeat !== null ? { seatIndex: selectedSeat } : {}),
  });
  setShowBuyIn(false);
  setSelectedSeat(null);
}, [currentTableId, watchingTableId, buyInAmount, socket, playerName, playerAvatar, selectedSeat]);
```

Remove old `handleSeatChange` callback (replaced by unified `handleSeatClick`).

**Step 6: Update the top area — add Back button + controls in watching mode**

In the top wrapper div, replace the existing "Leave Table" button section with:
```tsx
{/* Top-left: Back (watching) or Leave Table (sitting out) */}
{isWatching && onBack && (
  <div className="absolute top-3 left-3 z-30">
    <button
      onClick={onBack}
      style={{
        padding: '10px 16px',
        borderRadius: 6,
        background: 'rgba(255,255,255,0.1)',
        color: 'var(--ftp-text-secondary)',
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {t('watching_back')}
    </button>
  </div>
)}
{!isWatching && onLeaveTable && isSittingOut && (
  <div className="absolute top-3 left-3 z-30">
    <button
      onClick={onLeaveTable}
      style={{
        padding: '10px 16px',
        borderRadius: 6,
        background: 'rgba(255,255,255,0.1)',
        color: 'var(--ftp-text-secondary)',
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {t('game_leave_table')}
    </button>
  </div>
)}

{/* Top-right: Controls (watching mode) */}
{isWatching && (
  <div className="absolute top-3 right-3 z-30 flex items-center gap-3">
    <ThemeToggle />
    <LanguageToggle />
    <SoundToggle soundManager={tableSoundManager} />
  </div>
)}
```

**Step 7: Update PokerTable onSeatClick prop**

Replace:
```tsx
onSeatClick={(isSittingOut || isBusted) ? handleSeatChange : undefined}
```
With:
```tsx
onSeatClick={handleSeatClick}
```

The `handleSeatClick` already handles both watching (open buy-in) and playing (change seat) modes internally.

But only enable it when appropriate:
```tsx
onSeatClick={(isWatching && !isAlreadySeated) || (!isWatching && (isSittingOut || isBusted)) ? handleSeatClick : undefined}
```

**Step 8: Update bottom panel — add watching mode branch**

Wrap the entire bottom panel content in a conditional. Before the existing "Cards + stack row" div, add the watching branch:
```tsx
{isWatching ? (
  <>
    {/* Sit Down area */}
    <div className="flex flex-col items-center gap-2 py-3">
      {isAlreadySeated ? (
        <span style={{ color: 'var(--ftp-gold)', fontSize: 14, fontWeight: 600 }}>
          {t('watching_already_seated')}
        </span>
      ) : (
        <>
          {!canBuyIn && (
            <span style={{ color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
              {t('balance_insufficient')}
            </span>
          )}
          <button
            onClick={canBuyIn ? handleSitDown : undefined}
            disabled={!canBuyIn}
            style={{
              padding: '14px 40px',
              borderRadius: 8,
              background: canBuyIn
                ? 'linear-gradient(180deg, var(--ftp-red), var(--ftp-red-dark))'
                : '#555',
              color: 'white',
              fontWeight: 700,
              fontSize: 16,
              border: 'none',
              cursor: canBuyIn ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase',
              letterSpacing: 1,
              boxShadow: canBuyIn
                ? '0 4px 0 var(--ftp-red-dark), 0 6px 12px rgba(0,0,0,0.4)'
                : 'none',
              opacity: canBuyIn ? 1 : 0.5,
            }}
          >
            {t('watching_sit_down')}
          </button>
        </>
      )}
    </div>
    {/* Chat (watching) */}
    <ChatWindow messages={chatMessages} minimized={chatMinimized} onToggleMinimize={() => setChatMinimized(m => !m)} />
  </>
) : (
  <>
    {/* === Existing playing mode bottom panel (cards, actions, sit-out, chat) === */}
    ...keep all existing content...
  </>
)}
```

**Step 9: Add buy-in modal (from WatchingScreen)**

After the avatar picker modal, add:
```tsx
{/* Buy-in modal (watching mode) */}
{showBuyIn && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ background: 'rgba(0,0,0,0.7)' }}
    onClick={() => { if (Date.now() - buyInOpenedAt.current > 300) setShowBuyIn(false); }}
  >
    <div
      className="w-full max-w-xs p-6"
      style={{
        background: 'var(--ftp-bg-lobby)',
        borderRadius: 12,
        border: '1px solid var(--ftp-lobby-border)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="font-bold mb-1" style={{ color: '#FFFFFF', fontSize: 18 }}>
        {t('watching_buy_in')}
      </h2>
      <p className="mb-4" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
        {table?.name} &mdash; {table?.stakeLevel.label}
        {selectedSeat !== null && (
          <span style={{ color: 'var(--ftp-gold)', marginLeft: 8 }}>
            {t('table_seat')} {selectedSeat + 1}
          </span>
        )}
      </p>
      <input
        type="number"
        value={buyInAmount}
        onChange={(e) => setBuyInAmount(Number(e.target.value))}
        min={1}
        max={maxBuyIn}
        className="w-full mb-4"
        style={{
          padding: '10px 14px',
          borderRadius: 6,
          background: '#FFFFFF',
          color: 'var(--ftp-lobby-text)',
          border: '1px solid var(--ftp-lobby-border)',
          fontSize: 16,
          outline: 'none',
        }}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={() => setShowBuyIn(false)}
          className="flex-1 py-3 rounded-lg"
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'var(--ftp-text-secondary)',
            border: '1px solid var(--ftp-lobby-border)',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {t('watching_cancel')}
        </button>
        <button
          onClick={handleConfirmSitDown}
          disabled={buyInAmount <= 0 || buyInAmount > maxBuyIn}
          className="flex-1 py-3 rounded-lg"
          style={{
            background: buyInAmount <= 0 || buyInAmount > maxBuyIn
              ? '#555'
              : 'linear-gradient(180deg, var(--ftp-red), var(--ftp-red-dark))',
            color: 'white',
            fontWeight: 700,
            fontSize: 14,
            border: 'none',
            cursor: buyInAmount <= 0 || buyInAmount > maxBuyIn ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
            boxShadow: buyInAmount > 0 && buyInAmount <= maxBuyIn
              ? '0 2px 0 var(--ftp-red-dark)'
              : 'none',
          }}
        >
          {t('watching_confirm')}
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 10: Commit**

```bash
git add client/src/views/player/GameScreen.tsx
git commit -m "feat: add watching mode to GameScreen (buy-in, back, seat selection)"
```

---

### Task 3: Update PlayerView — remove 'watching' case, add onBack prop

**Files:**
- Modify: `client/src/views/player/PlayerView.tsx`

**Step 1: Remove WatchingScreen import**

Delete:
```ts
import { WatchingScreen } from './WatchingScreen.js';
```

**Step 2: Update TABLE_CREATED handler**

Change line 132:
```ts
setScreen('watching');
```
To:
```ts
setScreen('game');
```

**Step 3: Update handleLeaveTable**

Replace:
```ts
const handleLeaveTable = useCallback(() => {
  const tableId = useGameStore.getState().currentTableId;
  socketRef.current.emit(C2S_LOBBY.LEAVE_TABLE);
  if (tableId) {
    clearTableSession(tableId);
    setWatchingTableId(tableId);
  }
  setCurrentTableId(null);
  setLobbyState(null);
  setPrivateState(null);
  setScreen('watching');
}, [setCurrentTableId, setLobbyState, setPrivateState, setScreen, setWatchingTableId]);
```

With:
```ts
const handleLeaveTable = useCallback(() => {
  const tableId = useGameStore.getState().currentTableId;
  socketRef.current.emit(C2S_LOBBY.LEAVE_TABLE);
  if (tableId) {
    clearTableSession(tableId);
    setWatchingTableId(tableId);
  }
  setCurrentTableId(null);
  setLobbyState(null);
  setPrivateState(null);
  // Stay on screen='game' — GameScreen switches to watching mode when privateState is null
}, [setCurrentTableId, setLobbyState, setPrivateState, setWatchingTableId]);
```

**Step 4: Add handleBackToLobby**

```ts
const handleBackToLobby = useCallback(() => {
  useGameStore.getState().setGameState(null);
  useGameStore.getState().clearChat();
  setWatchingTableId(null);
  setScreen('table_lobby');
}, [setWatchingTableId, setScreen]);
```

**Step 5: Update renderScreen — remove watching case, pass onBack**

Replace:
```ts
case 'watching':
  return <WatchingScreen playerSocket={socketRef.current} />;
```

Remove entirely.

Update the game case to pass `onBack`:
```ts
case 'game':
  return supportsVR
    ? <XRGameScreen socket={socketRef.current} onOpenHistory={openHistory} onLeaveTable={handleLeaveTable} speechBubble={activeBubble} onSpeechBubbleDone={onBubbleDone} />
    : <GameScreen socket={socketRef.current} onOpenHistory={openHistory} onLeaveTable={handleLeaveTable} onBack={handleBackToLobby} speechBubble={activeBubble} onSpeechBubbleDone={onBubbleDone} />;
```

**Step 6: Remove transitionKey hack**

Delete:
```ts
// Group watching/game under same key so AnimatePresence doesn't animate between them
// (both show the same poker table — animating causes a black flash)
const transitionKey = (screen === 'watching' || screen === 'game') ? 'table-view' : screen;
```

Change `key={transitionKey}` back to `key={screen}`.

**Step 7: Update TopRightControls visibility**

The top-right controls (history, sound, etc.) should show in game mode only when playing (not watching — GameScreen handles its own controls in watching mode). Change:
```ts
{screen === 'game' && handHistoryView === 'none' && (
```
to the same (no change needed — GameScreen shows its own watching controls internally).

**Step 8: Commit**

```bash
git add client/src/views/player/PlayerView.tsx
git commit -m "refactor: remove watching screen case from PlayerView, pass onBack"
```

---

### Task 4: Update TableWindowView — same changes as PlayerView

**Files:**
- Modify: `client/src/views/player/TableWindowView.tsx`

**Step 1: Remove WatchingScreen import**

Delete:
```ts
import { WatchingScreen } from './WatchingScreen.js';
```

**Step 2: Update AUTH_SUCCESS handler (line 107)**

Change `setScreen('watching')` to `setScreen('game')`.

**Step 3: Update handleLeaveTable (line 241)**

Change `setScreen('watching')` to remove it — stay on `'game'` (same as PlayerView).

```ts
const handleLeaveTable = useCallback(() => {
  if (!tableId) return;
  socketRef.current.emit(C2S_LOBBY.LEAVE_TABLE);
  clearTableSession(tableId);
  setCurrentTableId(null);
  setLobbyState(null);
  setPrivateState(null);
  setWatchingTableId(tableId);
  // Stay on screen='game' — GameScreen switches to watching mode
}, [tableId, setCurrentTableId, setLobbyState, setPrivateState, setWatchingTableId]);
```

**Step 4: Update renderScreen — remove watching case, pass onBack**

Replace:
```ts
case 'watching':
default:
  return <WatchingScreen playerSocket={socketRef.current} />;
```

With:
```ts
default:
  return (
    <GameScreen
      socket={socketRef.current}
      onOpenHistory={openHistory}
      onLeaveTable={handleLeaveTable}
      speechBubble={activeBubble}
      onSpeechBubbleDone={onBubbleDone}
    />
  );
```

(No `onBack` for TableWindowView — it has no lobby to go back to.)

**Step 5: Fix AnimatePresence key — use transitionKey or remove wait mode**

Since TableWindowView only switches between loading/game now, simplify. Remove the `mode="wait"` entirely or keep it — there's no watching↔game transition anymore.

**Step 6: Commit**

```bash
git add client/src/views/player/TableWindowView.tsx
git commit -m "refactor: remove watching screen from TableWindowView"
```

---

### Task 5: Delete WatchingScreen and update tests

**Files:**
- Delete: `client/src/views/player/WatchingScreen.tsx`
- Delete: `client/src/__tests__/WatchingScreen.test.ts`
- Modify: `client/src/__tests__/PokerTable.test.ts:52-69` (remove WatchingScreen test)
- Modify: `client/src/__tests__/leave-table-spectator.test.ts` (update to new flow)

**Step 1: Delete WatchingScreen**

```bash
rm client/src/views/player/WatchingScreen.tsx
rm client/src/__tests__/WatchingScreen.test.ts
```

**Step 2: Remove WatchingScreen test from PokerTable.test.ts**

Delete the `it('WatchingScreen uses same phone-style layout as GameScreen', ...)` test block (lines 52-69).

**Step 3: Update leave-table-spectator.test.ts**

Update the test to reflect the new flow where leaving table keeps `screen='game'` and `privateState=null`:

- Test "handleLeaveTable should set watchingTableId...": change `store.setScreen('watching')` to keep `screen` as `'game'`, and change assertion from `expect(afterStore.screen).toBe('watching')` to `expect(afterStore.screen).toBe('game')`.

- Test "watching screen Leave button should go to table_lobby": update to set `screen: 'game'` instead of `'watching'`, and update the comment to reflect that "Back" button now calls `handleBackToLobby`.

**Step 4: Run tests**

Run: `bun run test`
Expected: all tests pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: delete WatchingScreen, update tests for merged game/watching"
```

---

### Task 6: Version bump + final verification

**Step 1: Bump version**

Bump to `1.24.0` (minor — feature change) in all 4 `package.json` files.

**Step 2: Build check**

Run: `bun run build` (or TypeScript check)

**Step 3: Run full test suite**

Run: `bun run test`

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: bump version to 1.24.0 for unified game/watching screen"
```

---

### Task 7: Update docs

**Files:**
- Modify: `doc/structure.md`
- Modify: `doc/plans/2026-03-01-eliminate-watching-screen-design.md` (mark completed)

**Step 1: Update structure.md**

In the Feature-to-File Mapping table, remove the "Watching view" row that points to `WatchingScreen.tsx`. Update the "Table mgmt" row to note that GameScreen now handles both watching and playing.

**Step 2: Commit**

```bash
git add doc/
git commit -m "docs: update structure for unified GameScreen"
```
