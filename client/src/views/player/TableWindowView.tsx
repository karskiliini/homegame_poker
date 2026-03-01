import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { S2C_PLAYER, S2C_LOBBY, C2S_LOBBY, C2S } from '@poker/shared';
import type { PrivatePlayerState, HandRecord, SoundType, StakeLevel, ChatMessage, TableInfo } from '@poker/shared';
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
  const t = useT();

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

  const [authenticated, setAuthenticated] = useState(false);
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

  // Announce table open/close via BroadcastChannel
  useEffect(() => {
    if (!tableId) return;
    announceTableOpen(tableId);
    return () => { announceTableClose(tableId); };
  }, [tableId]);

  // Socket setup and event handlers
  useEffect(() => {
    if (!tableId) return;

    const socket = socketRef.current;
    socket.connect();

    socket.on('connect', () => {
      setConnected(true);

      // Try per-table session reconnect first
      const tableSession = loadTableSession(tableId);
      if (tableSession) {
        socket.emit(C2S.RECONNECT, {
          playerId: tableSession.playerId,
          tableId: tableSession.tableId,
          playerToken: tableSession.playerToken,
        });
        return;
      }

      // Otherwise authenticate via stored auth session
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

    // Auth success -> start watching
    socket.on(S2C_LOBBY.AUTH_SUCCESS, (data: { playerId: string; name: string; avatarId: string; balance: number; sessionToken?: string }) => {
      setAuthState('authenticated');
      setAuthError(null);
      setPersistentPlayerId(data.playerId);
      setAccountBalance(data.balance);
      useGameStore.getState().setPlayerName(data.name);
      setPlayerAvatar(data.avatarId);
      setAuthenticated(true);
      setWatchingTableId(tableId);
      setScreen('watching');
    });

    socket.on(S2C_LOBBY.AUTH_ERROR, (data: { message: string }) => {
      setAuthError(data.message);
    });

    socket.on(S2C_LOBBY.BALANCE_UPDATE, (data: { balance: number }) => {
      setAccountBalance(data.balance);
    });

    socket.on(S2C_LOBBY.TABLE_LIST, (tables: TableInfo[]) => {
      setTables(tables);
    });

    socket.on(S2C_PLAYER.JOINED, (data: { playerId: string; playerToken?: string; tableId: string }) => {
      setPlayerId(data.playerId);
      setCurrentTableId(data.tableId);
      setScreen('game');

      // Save per-table session for reconnection
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
      const tableSession = loadTableSession(tableId);
      setPlayerId(data.playerId);
      setCurrentTableId(data.tableId);
      if (tableSession) {
        useGameStore.getState().setPlayerName(tableSession.playerName);
        useGameStore.getState().setPlayerAvatar(tableSession.playerAvatar);
      }
      setAuthenticated(true);
      setReconnecting(false);
      setScreen('game');
    });

    socket.on(S2C_PLAYER.RECONNECT_FAILED, () => {
      clearTableSession(tableId);
      setReconnecting(false);
      // Fall back to auth + watch
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
      // Hand finished — no-op
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
  }, [tableId]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeaveTable = useCallback(() => {
    if (!tableId) return;
    socketRef.current.emit(C2S_LOBBY.LEAVE_TABLE);
    clearTableSession(tableId);
    setCurrentTableId(null);
    setLobbyState(null);
    setPrivateState(null);
    setWatchingTableId(tableId);
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

  // No tableId in URL — redirect to lobby
  if (!tableId) return <Navigate to="/" replace />;

  // Loading state
  const isLoading = !authenticated && screen !== 'game';

  const renderScreen = () => {
    if (isLoading) {
      return (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #0F1E33, #162D50)' }}
        >
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>
            {t('watching_connecting')}
          </div>
        </div>
      );
    }

    switch (screen) {
      case 'game':
        return (
          <GameScreen
            socket={socketRef.current}
            onOpenHistory={openHistory}
            onLeaveTable={handleLeaveTable}
            speechBubble={activeBubble}
            onSpeechBubbleDone={onBubbleDone}
          />
        );
      case 'watching':
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

      {/* Top-right controls (visible during game) */}
      {screen === 'game' && handHistoryView === 'none' && (
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
