import type { HandRecord } from '@poker/shared';
import { useT } from '../../hooks/useT.js';

interface HandHistoryListProps {
  hands: HandRecord[];
  onSelectHand: (handId: string) => void;
  onClose: () => void;
}

export function HandHistoryList({ hands, onSelectHand, onClose }: HandHistoryListProps) {
  const t = useT();

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-auto">
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl font-bold">{t('history_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            &times;
          </button>
        </div>

        {hands.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t('history_no_hands')}</p>
        ) : (
          <div className="space-y-2">
            {[...hands].reverse().map((hand) => {
              const myResult = hand.summary.results.find(r =>
                hand.players.some(p => p.playerId === r.playerId && p.holeCards)
              );
              return (
                <button
                  key={hand.handId}
                  onClick={() => onSelectHand(hand.handId)}
                  className="w-full text-left px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
                >
                  <div className="flex justify-between">
                    <span className="text-white font-medium">{t('history_hand')} #{hand.handNumber}</span>
                    <span className={`font-mono ${
                      myResult && myResult.netChips > 0 ? 'text-green-400' :
                      myResult && myResult.netChips < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {myResult ? (myResult.netChips > 0 ? '+' : '') + myResult.netChips : ''}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {hand.gameType} {hand.blinds.small}/{hand.blinds.big} - {hand.players.length} {t('history_players')}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
