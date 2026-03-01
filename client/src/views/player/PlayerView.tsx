import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { S2C_PLAYER, S2C_LOBBY, C2S_LOBBY } from '@poker/shared';
import type { PrivatePlayerState, HandRecord, SoundType, TableInfo, StakeLevel, ChatMessage } from '@poker/shared';
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
import { useSpeechBubbleQueue } from '../../hooks/useSpeechBubbleQueue.js';
import { useXRDetection } from '../xr/useXRDetection.js';
import { XRGameScreen } from '../xr/XRGameScreen.js';
import { saveTableSession, clearTableSession } from '../../utils/tableSession.js';

// === Auth session persistence (survives server restarts) ===
const AUTH_SESSION_KEY = 'ftp-auth-session';

function saveAuthSession(token: string) {
  try { localStorage.setItem(AUTH_SESSION_KEY, token); } catch { /* noop */ }
}

function loadAuthSession(): string | null {
  try { return localStorage.getItem(AUTH_SESSION_KEY); } catch { return null; }
}

function clearAuthSession() {
  try { localStorage.removeItem(AUTH_SESSION_KEY); } catch { /* noop */ }
}

export function PlayerView() {
  const socketRef = useRef(createPlayerSocket());
  const {
    screen, setScreen, setConnected, setServerVersion,
    setLobbyState, setPrivateState,
    setTables, setPlayerId, setCurrentTableId, setStakeLevels,
    setWatchingTableId,
    setReconnecting,
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
  const { activeBubble, enqueue, onBubbleDone } = useSpeechBubbleQueue();
  const { supportsVR } = useXRDetection();
  useEffect(() => {
    const socket = socketRef.current;
    socket.connect();

    socket.on('connect', () => {
      setConnected(true);

      // Auto-login with session token if we have one (survives server restarts)
      const authToken = loadAuthSession();
      if (authToken) {
        socket.emit(C2S_LOBBY.SESSION_AUTH, { sessionToken: authToken });
      }
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on(S2C_PLAYER.CONNECTED, (data: { stakeLevels: StakeLevel[]; serverVersion?: string }) => {
      setStakeLevels(data.stakeLevels);
      if (data.serverVersion) setServerVersion(data.serverVersion);
    });

    // === Auth events ===
    socket.on(S2C_LOBBY.NAME_STATUS, (data: { exists: boolean }) => {
      if (data.exists) {
        setAuthState('needs_password');
      } else {
        setAuthState('needs_register');
      }
    });

    socket.on(S2C_LOBBY.AUTH_SUCCESS, (data: { playerId: string; name: string; avatarId: string; balance: number; sessionToken?: string }) => {
      setAuthState('authenticated');
      setAuthError(null);
      setPersistentPlayerId(data.playerId);
      setAccountBalance(data.balance);
      useGameStore.getState().setPlayerName(data.name);
      setPlayerAvatar(data.avatarId);
      if (data.sessionToken) {
        saveAuthSession(data.sessionToken);
      }
      setScreen('table_lobby');
    });

    socket.on(S2C_LOBBY.AUTH_ERROR, (data: { message: string }) => {
      // If session auth failed, clear the stored token so we don't retry
      if (data.message === 'Invalid or expired session') {
        clearAuthSession();
      }
      setAuthError(data.message);
    });

    socket.on(S2C_LOBBY.BALANCE_UPDATE, (data: { balance: number }) => {
      setAccountBalance(data.balance);
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

      // Persist per-table session for reconnection in table windows
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

    // Reconnection events (kept for backward compatibility / edge cases)
    socket.on(S2C_PLAYER.RECONNECTED, (data: { playerId: string; tableId: string }) => {
      setPlayerId(data.playerId);
      setCurrentTableId(data.tableId);
      setReconnecting(false);
      setScreen('game');
    });

    socket.on(S2C_PLAYER.RECONNECT_FAILED, () => {
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
      const balance = useGameStore.getState().accountBalance;
      setRebuyMaxBuyIn(Math.min(data.maxBuyIn, balance));
      setRebuyDeadline(data.deadline);
      // Only show rebuy prompt if player has balance
      if (balance > 0) {
        setShowRebuyPrompt(true);
      }
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

    socket.on(S2C_PLAYER.CHAT_MESSAGE, (msg: ChatMessage) => {
      addChatMessage(msg);
      enqueue(msg);
    });

    socket.on(S2C_PLAYER.SOUND, (data: { sound: SoundType }) => {
      playerSoundManager.play(data.sound);
    });

    return () => {
      socket.disconnect();
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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
    switch (screen) {
      case 'login':
        return <LoginScreen socket={socketRef.current} />;
      case 'table_lobby':
        return <TableLobbyScreen socket={socketRef.current} />;
      case 'watching':
        return <WatchingScreen playerSocket={socketRef.current} />;
      case 'lobby':
        return <LobbyScreen />;
      case 'game':
        return supportsVR
          ? <XRGameScreen socket={socketRef.current} onOpenHistory={openHistory} onLeaveTable={handleLeaveTable} speechBubble={activeBubble} onSpeechBubbleDone={onBubbleDone} />
          : <GameScreen socket={socketRef.current} onOpenHistory={openHistory} onLeaveTable={handleLeaveTable} speechBubble={activeBubble} onSpeechBubbleDone={onBubbleDone} />;
      default:
        return <LoginScreen socket={socketRef.current} />;
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
        <TopRightControls openHistory={openHistory} />
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

function TopRightControls({ openHistory }: {
  openHistory: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed top-4 right-4 z-40 flex items-center gap-3">
      <ThemeToggle />
      <LanguageToggle />
      <SoundToggle soundManager={playerSoundManager} />
      <button
        onClick={openHistory}
        className="text-blue-400 text-sm underline"
      >
        {t('game_hand_history')}
      </button>
    </div>
  );
}
