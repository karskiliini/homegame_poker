import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { S2C_PLAYER, S2C_LOBBY, C2S_LOBBY } from '@poker/shared';
import type { PrivatePlayerState, HandRecord, SoundType, TableInfo, StakeLevel } from '@poker/shared';
import { createPlayerSocket } from '../../socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { LoginScreen } from './LoginScreen.js';
import { LobbyScreen } from './LobbyScreen.js';
import { GameScreen } from './GameScreen.js';
import { TableLobbyScreen } from './TableLobbyScreen.js';
import { RunItTwicePrompt } from './RunItTwicePrompt.js';
import { ShowCardsPrompt } from './ShowCardsPrompt.js';
import { RebuyPrompt } from './RebuyPrompt.js';
import { HandHistoryList } from '../history/HandHistoryList.js';
import { HandHistoryDetail } from '../history/HandHistoryDetail.js';
import { playerSoundManager } from '../../audio/SoundManager.js';
import { SoundToggle } from '../../components/SoundToggle.js';
import { BugReportButton } from '../../components/BugReportButton.js';

export function PlayerView() {
  const socketRef = useRef(createPlayerSocket());
  const {
    screen, setScreen, setConnected,
    setLobbyState, setPrivateState,
    setTables, setPlayerId, setCurrentTableId, setStakeLevels,
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

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on(S2C_PLAYER.CONNECTED, (data: { stakeLevels: StakeLevel[] }) => {
      setStakeLevels(data.stakeLevels);
    });

    // Lobby events
    socket.on(S2C_LOBBY.TABLE_LIST, (tables: TableInfo[]) => {
      setTables(tables);
    });

    socket.on(S2C_PLAYER.JOINED, (data: { playerId: string; tableId: string }) => {
      setPlayerId(data.playerId);
      setCurrentTableId(data.tableId);
      setScreen('lobby');
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
    setCurrentTableId(null);
    setLobbyState(null);
    setPrivateState(null);
    setScreen('table_lobby');
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
    switch (screen) {
      case 'login':
        return <LoginScreen />;
      case 'table_lobby':
        return <TableLobbyScreen socket={socketRef.current} />;
      case 'lobby':
        return <LobbyScreen socket={socketRef.current} />;
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
        <div className="fixed top-4 right-4 z-40 flex items-center gap-3">
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          <button
            onClick={openHistory}
            className="text-blue-400 text-sm underline"
          >
            Hand History
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
