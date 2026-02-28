import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { S2C_PLAYER, S2C_LOBBY, C2S_LOBBY, C2S } from '@poker/shared';
import type { PrivatePlayerState, HandRecord, SoundType, TableInfo, StakeLevel } from '@poker/shared';
import { createPlayerSocket } from '../../socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { LoginScreen } from './LoginScreen.js';
import { LobbyScreen } from './LobbyScreen.js';
import { GameScreen } from './GameScreen.js';
import { TableLobbyScreen } from './TableLobbyScreen.js';
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

// === Session persistence for reconnection ===
const SESSION_KEY = 'ftp-session';

interface StoredSession {
  playerId: string;
  playerToken: string;
  tableId: string;
  playerName: string;
  playerAvatar: string;
}

function saveSession(session: StoredSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage may be unavailable
  }
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.playerId && parsed.playerToken && parsed.tableId) return parsed;
    return null;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // localStorage may be unavailable
  }
}

export function PlayerView() {
  const socketRef = useRef(createPlayerSocket());
  const {
    screen, setScreen, setConnected, setServerVersion,
    setLobbyState, setPrivateState,
    setTables, setPlayerId, setCurrentTableId, setStakeLevels,
    setWatchingTableId,
    reconnecting, setReconnecting,
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
  const [soundEnabled, setSoundEnabled] = useState(playerSoundManager.enabled);

  useEffect(() => {
    const socket = socketRef.current;
    socket.connect();

    socket.on('connect', () => {
      setConnected(true);

      // Attempt reconnection if we have a stored session
      const session = loadSession();
      if (session) {
        socket.emit(C2S.RECONNECT, {
          playerId: session.playerId,
          tableId: session.tableId,
          playerToken: session.playerToken,
        });
      }
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on(S2C_PLAYER.CONNECTED, (data: { stakeLevels: StakeLevel[]; serverVersion?: string }) => {
      setStakeLevels(data.stakeLevels);
      if (data.serverVersion) setServerVersion(data.serverVersion);
    });

    // Lobby events
    socket.on(S2C_LOBBY.TABLE_LIST, (tables: TableInfo[]) => {
      setTables(tables);
    });

    socket.on(S2C_LOBBY.TABLE_CREATED, (data: { tableId: string }) => {
      setWatchingTableId(data.tableId);
      setScreen('watching');
    });

    socket.on(S2C_PLAYER.JOINED, (data: { playerId: string; playerToken?: string; tableId: string }) => {
      setPlayerId(data.playerId);
      setCurrentTableId(data.tableId);
      setScreen('game');

      // Persist session for reconnection after refresh
      if (data.playerToken) {
        const store = useGameStore.getState();
        saveSession({
          playerId: data.playerId,
          playerToken: data.playerToken,
          tableId: data.tableId,
          playerName: store.playerName || '',
          playerAvatar: store.playerAvatar || 'ninja',
        });
      }
    });

    // Reconnection events
    socket.on(S2C_PLAYER.RECONNECTED, (data: { playerId: string; tableId: string }) => {
      // Restore store state from stored session
      const session = loadSession();
      setPlayerId(data.playerId);
      setCurrentTableId(data.tableId);
      if (session) {
        useGameStore.getState().setPlayerName(session.playerName);
        useGameStore.getState().setPlayerAvatar(session.playerAvatar as any);
      }
      setReconnecting(false);
      setScreen('game');
    });

    socket.on(S2C_PLAYER.RECONNECT_FAILED, () => {
      // Session is no longer valid, clear it and let player start fresh
      clearSession();
      setReconnecting(false);
    });

    // Per-table events
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
      setRebuyMaxBuyIn(data.maxBuyIn);
      setRebuyDeadline(data.deadline);
      setShowRebuyPrompt(true);
    });

    socket.on(S2C_PLAYER.RIT_OFFER, (data: { deadline: number }) => {
      setRitDeadline(data.deadline);
      setShowRit(true);
    });

    socket.on(S2C_PLAYER.RIT_RESOLVED, () => {
      setShowRit(false);
    });

    socket.on(S2C_PLAYER.SHOW_CARDS_OFFER, () => {
      setShowShowCards(true);
    });

    socket.on(S2C_PLAYER.HISTORY_LIST, (data: HandRecord[]) => {
      setHandHistoryData(data);
    });

    socket.on(S2C_PLAYER.HAND_DETAIL, (data: HandRecord) => {
      setSelectedHand(data);
      setHandHistoryView('detail');
    });

    socket.on(S2C_PLAYER.HAND_RESULT, () => {
      // Hand finished
    });

    socket.on(S2C_PLAYER.ERROR, (data: { message: string }) => {
      alert(data.message);
    });

    socket.on(S2C_LOBBY.ERROR, (data: { message: string }) => {
      alert(data.message);
    });

    socket.on(S2C_PLAYER.SOUND, (data: { sound: SoundType }) => {
      playerSoundManager.play(data.sound);
    });

    return () => {
      socket.disconnect();
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeaveTable = useCallback(() => {
    socketRef.current.emit(C2S_LOBBY.LEAVE_TABLE);
    clearSession();
    setCurrentTableId(null);
    setLobbyState(null);
    setPrivateState(null);
    setScreen('watching');
  }, [setCurrentTableId, setLobbyState, setPrivateState, setScreen]);

  const toggleSound = useCallback(() => {
    const next = !playerSoundManager.enabled;
    playerSoundManager.setEnabled(next);
    setSoundEnabled(next);
  }, []);

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

  const renderScreen = () => {
    // Show reconnecting screen while attempting to rejoin
    if (reconnecting) {
      return (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #0F1E33, #162D50)' }}
        >
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>
            Reconnecting...
          </div>
        </div>
      );
    }

    switch (screen) {
      case 'login':
        return <LoginScreen />;
      case 'table_lobby':
        return <TableLobbyScreen socket={socketRef.current} />;
      case 'watching':
        return <WatchingScreen playerSocket={socketRef.current} />;
      case 'lobby':
        return <LobbyScreen />;
      case 'game':
        return <GameScreen socket={socketRef.current} onOpenHistory={openHistory} onLeaveTable={handleLeaveTable} />;
      default:
        return <LoginScreen />;
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

      {/* Top-right controls (visible during game) */}
      {screen === 'game' && handHistoryView === 'none' && (
        <TopRightControls soundEnabled={soundEnabled} toggleSound={toggleSound} openHistory={openHistory} />
      )}

      {/* Overlays */}
      {showRit && (
        <RunItTwicePrompt
          socket={socketRef.current}
          deadline={ritDeadline}
          onClose={() => setShowRit(false)}
        />
      )}

      {showShowCards && (
        <ShowCardsPrompt
          socket={socketRef.current}
          onClose={() => setShowShowCards(false)}
        />
      )}

      {showRebuyPrompt && (
        <RebuyPrompt
          socket={socketRef.current}
          maxBuyIn={rebuyMaxBuyIn}
          deadline={rebuyDeadline}
          onClose={() => setShowRebuyPrompt(false)}
        />
      )}

      {handHistoryView === 'list' && (
        <HandHistoryList
          hands={handHistoryData}
          onSelectHand={selectHand}
          onClose={() => setHandHistoryView('none')}
        />
      )}

      {handHistoryView === 'detail' && selectedHand && (
        <HandHistoryDetail
          hand={selectedHand}
          onBack={() => setHandHistoryView('list')}
          onPrev={selectedIdx > 0 ? () => navigateHand('prev') : undefined}
          onNext={selectedIdx < handHistoryData.length - 1 ? () => navigateHand('next') : undefined}
        />
      )}

      <BugReportButton socket={socketRef.current} />
    </>
  );
}

function TopRightControls({ soundEnabled, toggleSound, openHistory }: {
  soundEnabled: boolean;
  toggleSound: () => void;
  openHistory: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed top-4 right-4 z-40 flex items-center gap-3">
      <ThemeToggle />
      <LanguageToggle />
      <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
      <button
        onClick={openHistory}
        className="text-blue-400 text-sm underline"
      >
        {t('game_hand_history')}
      </button>
    </div>
  );
}
