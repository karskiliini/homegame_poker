import { useEffect, useRef, useState, useCallback } from 'react';
import { S2C_PLAYER } from '@poker/shared';
import type { GameConfig, PrivatePlayerState, HandRecord } from '@poker/shared';
import { createPlayerSocket } from '../../socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { LoginScreen } from './LoginScreen.js';
import { LobbyScreen } from './LobbyScreen.js';
import { GameScreen } from './GameScreen.js';
import { RunItTwicePrompt } from './RunItTwicePrompt.js';
import { ShowCardsPrompt } from './ShowCardsPrompt.js';
import { HandHistoryList } from '../history/HandHistoryList.js';
import { HandHistoryDetail } from '../history/HandHistoryDetail.js';

export function PlayerView() {
  const socketRef = useRef(createPlayerSocket());
  const {
    screen, setScreen, setConnected, setConfig,
    setLobbyState, setPrivateState, setPreviousInfo,
  } = useGameStore();

  const [showRit, setShowRit] = useState(false);
  const [ritDeadline, setRitDeadline] = useState(0);
  const [showShowCards, setShowShowCards] = useState(false);
  const [handHistoryView, setHandHistoryView] = useState<'none' | 'list' | 'detail'>('none');
  const [handHistoryData, setHandHistoryData] = useState<HandRecord[]>([]);
  const [selectedHand, setSelectedHand] = useState<HandRecord | null>(null);

  useEffect(() => {
    const socket = socketRef.current;
    socket.connect();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on(S2C_PLAYER.CONNECTED, (data: { config: GameConfig }) => {
      setConfig(data.config);
    });

    socket.on(S2C_PLAYER.LOBBY_STATE, (state: any) => {
      setLobbyState(state);
      if (state.phase === 'hand_in_progress' && screen !== 'game') {
        setScreen('game');
      }
    });

    socket.on(S2C_PLAYER.PRIVATE_STATE, (state: PrivatePlayerState) => {
      setPrivateState(state);
    });

    socket.on(S2C_PLAYER.HAND_START, () => {
      setScreen('game');
    });

    socket.on(S2C_PLAYER.BUSTED, (data: { previousName: string; previousBuyIn: number }) => {
      setPreviousInfo(data.previousName, data.previousBuyIn);
      setScreen('login');
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
      // Hand finished - could show result overlay
    });

    socket.on(S2C_PLAYER.ERROR, (data: { message: string }) => {
      alert(data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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

  const mainContent = (() => {
    switch (screen) {
      case 'login':
        return <LoginScreen socket={socketRef.current} />;
      case 'lobby':
        return <LobbyScreen socket={socketRef.current} />;
      case 'game':
        return <GameScreen socket={socketRef.current} onOpenHistory={openHistory} />;
      default:
        return <LoginScreen socket={socketRef.current} />;
    }
  })();

  const selectedIdx = selectedHand ? handHistoryData.findIndex(h => h.handId === selectedHand.handId) : -1;

  return (
    <>
      {mainContent}

      {/* Hand history link (visible during game) */}
      {screen === 'game' && handHistoryView === 'none' && (
        <button
          onClick={openHistory}
          className="fixed top-4 right-4 z-40 text-blue-400 text-sm underline"
        >
          Hand History
        </button>
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
    </>
  );
}
