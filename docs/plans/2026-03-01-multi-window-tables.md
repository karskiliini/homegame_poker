# Multi-Window Table Support — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lobby opens each poker table in a separate browser window. One window per user account per table. Players can play at multiple tables simultaneously.

**Architecture:** URL-based routing (`/table/:tableId`) + `window.open()` from lobby. Each table window is a self-contained SPA with its own socket connections. BroadcastChannel coordinates open tables between lobby and table windows. Auth shared via localStorage.

**Tech Stack:** React Router (already installed), BroadcastChannel API, existing Socket.IO architecture.

---

### Task 1: Per-table session storage

**Files:**
- Modify: `client/src/views/player/PlayerView.tsx` (lines 40-77, session functions)

**Step 1: Write the failing test**

Create `client/src/__tests__/table-session.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
});

import { saveTableSession, loadTableSession, clearTableSession } from '../utils/tableSession.js';

describe('per-table session storage', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
  });

  it('saves and loads session for specific table', () => {
    const session = { playerId: 'p1', playerToken: 'tok1', tableId: 'table-abc', playerName: 'Alice', playerAvatar: 'ninja' };
    saveTableSession('table-abc', session);
    expect(loadTableSession('table-abc')).toEqual(session);
  });

  it('returns null for unknown table', () => {
    expect(loadTableSession('unknown')).toBeNull();
  });

  it('clears session for specific table without affecting others', () => {
    saveTableSession('t1', { playerId: 'p1', playerToken: 'tok1', tableId: 't1', playerName: 'A', playerAvatar: '1' });
    saveTableSession('t2', { playerId: 'p2', playerToken: 'tok2', tableId: 't2', playerName: 'B', playerAvatar: '2' });
    clearTableSession('t1');
    expect(loadTableSession('t1')).toBeNull();
    expect(loadTableSession('t2')).not.toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd client && bunx vitest run src/__tests__/table-session.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `client/src/utils/tableSession.ts`:

```ts
const TABLE_SESSION_PREFIX = 'ftp-session-';

export interface TableSession {
  playerId: string;
  playerToken: string;
  tableId: string;
  playerName: string;
  playerAvatar: string;
}

export function saveTableSession(tableId: string, session: TableSession) {
  try { localStorage.setItem(`${TABLE_SESSION_PREFIX}${tableId}`, JSON.stringify(session)); } catch { /* noop */ }
}

export function loadTableSession(tableId: string): TableSession | null {
  try {
    const raw = localStorage.getItem(`${TABLE_SESSION_PREFIX}${tableId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.playerId && parsed.playerToken && parsed.tableId) return parsed;
    return null;
  } catch { return null; }
}

export function clearTableSession(tableId: string) {
  try { localStorage.removeItem(`${TABLE_SESSION_PREFIX}${tableId}`); } catch { /* noop */ }
}
```

**Step 4: Run test to verify it passes**

Run: `cd client && bunx vitest run src/__tests__/table-session.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add client/src/utils/tableSession.ts client/src/__tests__/table-session.test.ts
git commit -m "feat: add per-table session storage utilities"
```

---

### Task 2: BroadcastChannel hook for cross-window coordination

**Files:**
- Create: `client/src/hooks/useTableWindows.ts`
- Create: `client/src/__tests__/useTableWindows.test.ts`

**Step 1: Write the failing test**

Create `client/src/__tests__/useTableWindows.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock BroadcastChannel
let listeners: ((event: { data: any }) => void)[] = [];
class MockBroadcastChannel {
  onmessage: ((event: { data: any }) => void) | null = null;
  postMessage(data: any) {
    listeners.forEach(fn => fn({ data }));
  }
  close() {}
  constructor() {
    listeners.push((event) => this.onmessage?.(event));
  }
}
vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

import { openTableWindow, isTableOpen, announceTableOpen, announceTableClose } from '../hooks/useTableWindows.js';

describe('table window coordination', () => {
  beforeEach(() => {
    listeners = [];
  });

  it('openTableWindow calls window.open with correct args', () => {
    const mockOpen = vi.fn().mockReturnValue({});
    vi.stubGlobal('open', mockOpen);
    openTableWindow('abc-123');
    expect(mockOpen).toHaveBeenCalledWith('/table/abc-123', 'table-abc-123');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd client && bunx vitest run src/__tests__/useTableWindows.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `client/src/hooks/useTableWindows.ts`:

```ts
import { useState, useEffect, useCallback } from 'react';

const CHANNEL_NAME = 'ftp-table-windows';

interface TableWindowMessage {
  type: 'TABLE_OPENED' | 'TABLE_CLOSED';
  tableId: string;
}

export function openTableWindow(tableId: string) {
  window.open(`/table/${tableId}`, `table-${tableId}`);
}

export function announceTableOpen(tableId: string) {
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage({ type: 'TABLE_OPENED', tableId } satisfies TableWindowMessage);
    ch.close();
  } catch { /* BroadcastChannel not supported */ }
}

export function announceTableClose(tableId: string) {
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage({ type: 'TABLE_CLOSED', tableId } satisfies TableWindowMessage);
    ch.close();
  } catch { /* BroadcastChannel not supported */ }
}

/** Hook for lobby to track which tables are currently open in other windows */
export function useOpenTables() {
  const [openTables, setOpenTables] = useState<Set<string>>(new Set());

  useEffect(() => {
    let ch: BroadcastChannel;
    try {
      ch = new BroadcastChannel(CHANNEL_NAME);
      ch.onmessage = (event: MessageEvent<TableWindowMessage>) => {
        const { type, tableId } = event.data;
        setOpenTables(prev => {
          const next = new Set(prev);
          if (type === 'TABLE_OPENED') next.add(tableId);
          if (type === 'TABLE_CLOSED') next.delete(tableId);
          return next;
        });
      };
    } catch { /* BroadcastChannel not supported */ }
    return () => { try { ch?.close(); } catch {} };
  }, []);

  const isTableOpen = useCallback((tableId: string) => openTables.has(tableId), [openTables]);

  return { openTables, isTableOpen };
}
```

**Step 4: Run test to verify it passes**

Run: `cd client && bunx vitest run src/__tests__/useTableWindows.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add client/src/hooks/useTableWindows.ts client/src/__tests__/useTableWindows.test.ts
git commit -m "feat: add BroadcastChannel coordination for table windows"
```

---

### Task 3: Add URL routing for table windows

**Files:**
- Modify: `client/src/App.tsx`
- Create: `client/src/views/player/TableWindowView.tsx`

**Step 1: Create TableWindowView**

This is the entry point for table windows opened via `/table/:tableId`. It's a self-contained player view that:
- Reads tableId from URL
- Authenticates from localStorage
- Goes directly to watching → game flow
- Never shows login or lobby

Create `client/src/views/player/TableWindowView.tsx`:

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { S2C_PLAYER, S2C_LOBBY, C2S_LOBBY, C2S } from '@poker/shared';
import type { PrivatePlayerState, HandRecord, SoundType, StakeLevel, ChatMessage } from '@poker/shared';
import { createPlayerSocket } from '../../socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { GameScreen } from './GameScreen.js';
import { WatchingScreen } from './WatchingScreen.js';
import { RunItTwicePrompt } from './RunItTwicePrompt.js';
import { ShowCardsPrompt } from './ShowCardsPrompt.js';
import { RebuyPrompt } from './RebuyPrompt.js';
import { HandHistoryList } from '../history/HandHistoryList.js';
import { HandHistoryDetail } from '../history/HandHistoryDetail.js';
import { playerSoundManager } from '../../audio/SoundManager.js';
import { SoundToggle } from '../../components/SoundToggle.js';
import { BugReportButton } from '../../components/BugReportButton.js';
import { LanguageToggle } from '../../components/LanguageToggle.js';
import { ThemeToggle } from '../../components/ThemeToggle.js';
import { useT } from '../../hooks/useT.js';
import { useSpeechBubbleQueue } from '../../hooks/useSpeechBubbleQueue.js';
import { saveTableSession, loadTableSession, clearTableSession } from '../../utils/tableSession.js';
import { announceTableOpen, announceTableClose } from '../../hooks/useTableWindows.js';

const AUTH_SESSION_KEY = 'ftp-auth-session';

export function TableWindowView() {
  const { tableId } = useParams<{ tableId: string }>();
  const socketRef = useRef(createPlayerSocket());
  const {
    screen, setScreen, setConnected, setServerVersion,
    setLobbyState, setPrivateState,
    setTables, setPlayerId, setCurrentTableId, setStakeLevels,
    setWatchingTableId,
    addChatMessage,
    setAuthState, setAuthError, setAccountBalance, setPersistentPlayerId,
    setPlayerAvatar,
  } = useGameStore();

  const [showRit, setShowRit] = useState(false);
  const [ritDeadline, setRitDeadline] = useState(0);
  const [showShowCards, setShowShowCards] = useState(false);
  const [showRebuyPrompt, setShowRebuyPrompt] = useState(false);
  const [rebuyDeadline, setRebuyDeadline] = useState(0);
  const [rebuyMaxBuyIn, setRebuyMaxBuyIn] = useState(0);
  const [handHistoryView, setHandHistoryView] = useState<'none' | 'list' | 'detail'>('none');
  const [handHistoryData, setHandHistoryData] = useState<HandRecord[]>([]);
  const [selectedHand, setSelectedHand] = useState<HandRecord | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const { activeBubble, enqueue, onBubbleDone } = useSpeechBubbleQueue();

  // If no tableId in URL, redirect to lobby
  if (!tableId) return <Navigate to="/" replace />;

  useEffect(() => {
    if (!tableId) return;

    // Announce this table window is open
    announceTableOpen(tableId);

    const socket = socketRef.current;
    socket.connect();

    socket.on('connect', () => {
      setConnected(true);

      // Try to reconnect to this specific table first
      const session = loadTableSession(tableId);
      if (session) {
        socket.emit(C2S.RECONNECT, {
          playerId: session.playerId,
          tableId: session.tableId,
          playerToken: session.playerToken,
        });
        return; // Wait for RECONNECTED or RECONNECT_FAILED
      }

      // Otherwise, authenticate and start watching
      const authToken = localStorage.getItem(AUTH_SESSION_KEY);
      if (authToken) {
        socket.emit(C2S_LOBBY.SESSION_AUTH, { sessionToken: authToken });
      }
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on(S2C_PLAYER.CONNECTED, (data: { stakeLevels: StakeLevel[]; serverVersion?: string }) => {
      setStakeLevels(data.stakeLevels);
      if (data.serverVersion) setServerVersion(data.serverVersion);
    });

    // Auth success → start watching the table
    socket.on(S2C_LOBBY.AUTH_SUCCESS, (data: { playerId: string; name: string; avatarId: string; balance: number; sessionToken?: string }) => {
      setAuthState('authenticated');
      setPersistentPlayerId(data.playerId);
      setAccountBalance(data.balance);
      useGameStore.getState().setPlayerName(data.name);
      setPlayerAvatar(data.avatarId);
      setAuthenticated(true);
      // Go directly to watching this table
      setWatchingTableId(tableId);
      setScreen('watching');
    });

    socket.on(S2C_LOBBY.AUTH_ERROR, (data: { message: string }) => {
      // Auth failed — redirect to main lobby
      setAuthError(data.message);
    });

    socket.on(S2C_LOBBY.BALANCE_UPDATE, (data: { balance: number }) => {
      setAccountBalance(data.balance);
    });

    socket.on(S2C_LOBBY.TABLE_LIST, (tables: any[]) => {
      setTables(tables);
    });

    socket.on(S2C_PLAYER.JOINED, (data: { playerId: string; playerToken?: string; tableId: string }) => {
      setPlayerId(data.playerId);
      setCurrentTableId(data.tableId);
      setScreen('game');

      if (data.playerToken) {
        const store = useGameStore.getState();
        saveTableSession(data.tableId, {
          playerId: data.playerId,
          playerToken: data.playerToken,
          tableId: data.tableId,
          playerName: store.playerName || '',
          playerAvatar: store.playerAvatar || 'ninja',
        });
      }
    });

    socket.on(S2C_PLAYER.RECONNECTED, (data: { playerId: string; tableId: string }) => {
      const session = loadTableSession(tableId);
      setPlayerId(data.playerId);
      setCurrentTableId(data.tableId);
      if (session) {
        useGameStore.getState().setPlayerName(session.playerName);
        useGameStore.getState().setPlayerAvatar(session.playerAvatar);
      }
      setAuthenticated(true);
      setScreen('game');
    });

    socket.on(S2C_PLAYER.RECONNECT_FAILED, () => {
      clearTableSession(tableId);
      // Try to authenticate and watch instead
      const authToken = localStorage.getItem(AUTH_SESSION_KEY);
      if (authToken) {
        socket.emit(C2S_LOBBY.SESSION_AUTH, { sessionToken: authToken });
      }
    });

    socket.on(S2C_PLAYER.LOBBY_STATE, (state: any) => {
      setLobbyState(state);
      if (state.phase === 'hand_in_progress' && useGameStore.getState().screen !== 'game') {
        setScreen('game');
      }
    });

    socket.on(S2C_PLAYER.PRIVATE_STATE, (state: PrivatePlayerState) => {
      setPrivateState(state);
    });

    socket.on(S2C_PLAYER.HAND_START, () => {
      setScreen('game');
    });

    socket.on(S2C_PLAYER.REBUY_PROMPT, (data: { maxBuyIn: number; deadline: number }) => {
      const balance = useGameStore.getState().accountBalance;
      setRebuyMaxBuyIn(Math.min(data.maxBuyIn, balance));
      setRebuyDeadline(data.deadline);
      if (balance > 0) setShowRebuyPrompt(true);
    });

    socket.on(S2C_PLAYER.RIT_OFFER, (data: { deadline: number }) => {
      setRitDeadline(data.deadline);
      setShowRit(true);
    });

    socket.on(S2C_PLAYER.RIT_RESOLVED, () => setShowRit(false));
    socket.on(S2C_PLAYER.SHOW_CARDS_OFFER, () => setShowShowCards(true));

    socket.on(S2C_PLAYER.HISTORY_LIST, (data: HandRecord[]) => setHandHistoryData(data));
    socket.on(S2C_PLAYER.HAND_DETAIL, (data: HandRecord) => {
      setSelectedHand(data);
      setHandHistoryView('detail');
    });
    socket.on(S2C_PLAYER.HAND_RESULT, () => {});

    socket.on(S2C_PLAYER.ERROR, (data: { message: string }) => alert(data.message));
    socket.on(S2C_LOBBY.ERROR, (data: { message: string }) => alert(data.message));

    socket.on(S2C_PLAYER.CHAT_MESSAGE, (msg: ChatMessage) => {
      addChatMessage(msg);
      enqueue(msg);
    });

    socket.on(S2C_PLAYER.SOUND, (data: { sound: SoundType }) => {
      playerSoundManager.play(data.sound);
    });

    return () => {
      announceTableClose(tableId);
      socket.disconnect();
    };
  }, [tableId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeaveTable = useCallback(() => {
    socketRef.current.emit(C2S_LOBBY.LEAVE_TABLE);
    clearTableSession(tableId!);
    setCurrentTableId(null);
    setLobbyState(null);
    setPrivateState(null);
    // Go back to watching (player can re-sit or close window)
    setWatchingTableId(tableId!);
    setScreen('watching');
  }, [tableId, setCurrentTableId, setLobbyState, setPrivateState, setScreen, setWatchingTableId]);

  const openHistory = useCallback(() => {
    socketRef.current.emit('player:get_history');
    setHandHistoryView('list');
  }, []);

  const selectHand = useCallback((handId: string) => {
    const hand = handHistoryData.find(h => h.handId === handId);
    if (hand) {
      setSelectedHand(hand);
      setHandHistoryView('detail');
    }
  }, [handHistoryData]);

  const navigateHand = useCallback((direction: 'prev' | 'next') => {
    if (!selectedHand) return;
    const idx = handHistoryData.findIndex(h => h.handId === selectedHand.handId);
    const newIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (newIdx >= 0 && newIdx < handHistoryData.length) {
      setSelectedHand(handHistoryData[newIdx]);
    }
  }, [selectedHand, handHistoryData]);

  // Render loading while authenticating
  if (!authenticated && screen !== 'game') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #0F1E33, #162D50)' }}
      >
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>
          Connecting...
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'watching':
        return <WatchingScreen playerSocket={socketRef.current} />;
      case 'game':
        return <GameScreen socket={socketRef.current} onOpenHistory={openHistory} onLeaveTable={handleLeaveTable} speechBubble={activeBubble} onSpeechBubbleDone={onBubbleDone} />;
      default:
        return <WatchingScreen playerSocket={socketRef.current} />;
    }
  };

  const selectedIdx = selectedHand ? handHistoryData.findIndex(h => h.handId === selectedHand.handId) : -1;

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      {screen === 'game' && handHistoryView === 'none' && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-3">
          <ThemeToggle />
          <LanguageToggle />
          <SoundToggle soundManager={playerSoundManager} />
          <button onClick={openHistory} className="text-blue-400 text-sm underline">
            {useT()('game_hand_history')}
          </button>
        </div>
      )}

      {showRit && <RunItTwicePrompt socket={socketRef.current} deadline={ritDeadline} onClose={() => setShowRit(false)} />}
      {showShowCards && <ShowCardsPrompt socket={socketRef.current} onClose={() => setShowShowCards(false)} />}
      {showRebuyPrompt && <RebuyPrompt socket={socketRef.current} maxBuyIn={rebuyMaxBuyIn} deadline={rebuyDeadline} onClose={() => setShowRebuyPrompt(false)} />}
      {handHistoryView === 'list' && <HandHistoryList hands={handHistoryData} onSelectHand={selectHand} onClose={() => setHandHistoryView('none')} />}
      {handHistoryView === 'detail' && selectedHand && <HandHistoryDetail hand={selectedHand} onBack={() => setHandHistoryView('list')} onPrev={selectedIdx > 0 ? () => navigateHand('prev') : undefined} onNext={selectedIdx < handHistoryData.length - 1 ? () => navigateHand('next') : undefined} />}
      <BugReportButton socket={socketRef.current} />
    </>
  );
}
```

**Step 2: Add route to App.tsx**

Modify `client/src/App.tsx`:

```tsx
import { Routes, Route } from 'react-router-dom';
import { PlayerView } from './views/player/PlayerView.js';
import { TableWindowView } from './views/player/TableWindowView.js';
import { ThemeApplier } from './themes/ThemeApplier.js';

export function App() {
  return (
    <>
      <ThemeApplier />
      <Routes>
        <Route path="/table/:tableId" element={<TableWindowView />} />
        <Route path="/*" element={<PlayerView />} />
      </Routes>
    </>
  );
}
```

**Step 3: Run build to verify no compile errors**

Run: `cd client && bun run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add client/src/views/player/TableWindowView.tsx client/src/App.tsx
git commit -m "feat: add TableWindowView and URL routing for table windows"
```

---

### Task 4: Modify TableLobbyScreen to open tables in new windows

**Files:**
- Modify: `client/src/views/player/TableLobbyScreen.tsx`

**Step 1: Update lobby click handlers**

Replace `handleWatchTable` and `handleCreateTable` to use `window.open()`:

```tsx
// Add import at top:
import { openTableWindow, useOpenTables } from '../../hooks/useTableWindows.js';

// Inside component, add:
const { isTableOpen } = useOpenTables();

// Replace handleCreateTable callback:
const handleCreateTable = (stakeLevel: StakeLevel) => {
  if (!isConnected) return;
  setCreating(true);
  setShowCreateModal(false);
  socket.emit(C2S_LOBBY.CREATE_TABLE, { stakeLevelId: stakeLevel.id }, (response: { tableId: string }) => {
    setCreating(false);
    openTableWindow(response.tableId);
  });
  setTimeout(() => setCreating(false), 5000);
};

// Replace handleWatchTable:
const handleWatchTable = (tableId: string) => {
  openTableWindow(tableId);
};
```

Also add a visual indicator for tables that are already open in another window. In the table row button, add an "OPEN" badge:

```tsx
{isTableOpen(table.tableId) && (
  <span style={{
    padding: '2px 6px',
    borderRadius: 4,
    background: '#16A34A',
    color: 'white',
    fontSize: 10,
    fontWeight: 700,
    marginLeft: 6,
  }}>
    OPEN
  </span>
)}
```

**Step 2: Remove setWatchingTableId and setScreen imports if no longer needed**

The lobby no longer navigates internally to watching screen. Remove `setWatchingTableId` and `setScreen` from the destructured useGameStore call if they are not used elsewhere in the file.

**Step 3: Run build**

Run: `cd client && bun run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add client/src/views/player/TableLobbyScreen.tsx
git commit -m "feat: lobby opens tables in new windows instead of internal navigation"
```

---

### Task 5: Update PlayerView to skip table reconnect in lobby mode

**Files:**
- Modify: `client/src/views/player/PlayerView.tsx`

**Step 1: Remove old session-based table reconnect from lobby PlayerView**

The lobby window should no longer attempt to reconnect to a specific table on load. The old `ftp-session` key is no longer used (each table window uses `ftp-session-<tableId>`).

In PlayerView's `useEffect`, remove the session reconnect logic on 'connect':

```tsx
socket.on('connect', () => {
  setConnected(true);

  // Auto-login with session token if we have one
  const authToken = loadAuthSession();
  if (authToken) {
    socket.emit(C2S_LOBBY.SESSION_AUTH, { sessionToken: authToken });
  }
});
```

Remove:
- `loadSession()`, `saveSession()`, `clearSession()` functions (replaced by tableSession utils)
- The `SESSION_KEY` constant
- The `StoredSession` interface
- The reconnection attempt from the connect handler
- `S2C_PLAYER.RECONNECTED` and `S2C_PLAYER.RECONNECT_FAILED` handlers (not needed in lobby)
- `reconnecting` state from useGameStore usage in PlayerView
- The "Reconnecting..." UI block

**Update S2C_PLAYER.JOINED handler** to use per-table session:

```tsx
import { saveTableSession } from '../../utils/tableSession.js';

socket.on(S2C_PLAYER.JOINED, (data: { playerId: string; playerToken?: string; tableId: string }) => {
  // This shouldn't happen in lobby mode, but handle gracefully
  setPlayerId(data.playerId);
  setCurrentTableId(data.tableId);
  setScreen('game');
  if (data.playerToken) {
    const store = useGameStore.getState();
    saveTableSession(data.tableId, {
      playerId: data.playerId,
      playerToken: data.playerToken,
      tableId: data.tableId,
      playerName: store.playerName || '',
      playerAvatar: store.playerAvatar || 'ninja',
    });
  }
});
```

**Update handleLeaveTable** to use per-table session:

```tsx
import { clearTableSession } from '../../utils/tableSession.js';

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

**Step 2: Update useGameStore** — set initial `reconnecting` to `false` since lobby doesn't reconnect:

In `client/src/hooks/useGameStore.ts`, remove the `hasStoredSession()` function and change:
```ts
reconnecting: false,
```

**Step 3: Run tests and build**

Run: `bun run test && cd client && bun run build`
Expected: All tests pass, build succeeds

**Step 4: Commit**

```bash
git add client/src/views/player/PlayerView.tsx client/src/hooks/useGameStore.ts
git commit -m "refactor: lobby PlayerView no longer reconnects to tables directly"
```

---

### Task 6: Integration test — full multi-window flow

**Files:**
- Create: `client/src/__tests__/multi-window-flow.test.ts`

**Step 1: Write integration test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { openTableWindow } from '../hooks/useTableWindows.js';

describe('multi-window table flow', () => {
  it('openTableWindow opens correct URL with window name', () => {
    const mockOpen = vi.fn().mockReturnValue({});
    vi.stubGlobal('open', mockOpen);

    openTableWindow('test-table-id');

    expect(mockOpen).toHaveBeenCalledWith(
      '/table/test-table-id',
      'table-test-table-id'
    );
  });

  it('opening same table twice reuses window name', () => {
    const mockWindow = {};
    const mockOpen = vi.fn().mockReturnValue(mockWindow);
    vi.stubGlobal('open', mockOpen);

    openTableWindow('same-table');
    openTableWindow('same-table');

    // Both calls use same window name, browser reuses window
    expect(mockOpen).toHaveBeenCalledTimes(2);
    expect(mockOpen).toHaveBeenNthCalledWith(1, '/table/same-table', 'table-same-table');
    expect(mockOpen).toHaveBeenNthCalledWith(2, '/table/same-table', 'table-same-table');
  });

  it('different tables open different windows', () => {
    const mockOpen = vi.fn().mockReturnValue({});
    vi.stubGlobal('open', mockOpen);

    openTableWindow('table-1');
    openTableWindow('table-2');

    expect(mockOpen).toHaveBeenNthCalledWith(1, '/table/table-1', 'table-table-1');
    expect(mockOpen).toHaveBeenNthCalledWith(2, '/table/table-2', 'table-table-2');
  });
});
```

**Step 2: Run tests**

Run: `cd client && bunx vitest run src/__tests__/multi-window-flow.test.ts`
Expected: PASS

**Step 3: Run full test suite**

Run: `bun run test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add client/src/__tests__/multi-window-flow.test.ts
git commit -m "test: add multi-window flow integration tests"
```

---

### Task 7: Bump version and final verification

**Step 1: Bump version** (minor — new feature)

Update version in all 4 `package.json` files (root, shared, server, client).

**Step 2: Run full test suite**

Run: `bun run test`
Expected: All tests pass

**Step 3: Run build**

Run: `cd client && bun run build`
Expected: Build succeeds

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: multi-window table support — lobby opens tables in separate windows (v1.21.0)"
```
