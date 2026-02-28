import type { HandRecord, HandRecordPlayer, CardString } from '@poker/shared';
import { SUIT_SYMBOLS } from '@poker/shared';
import { useT } from '../../hooks/useT.js';
import type { TranslationKey } from '../../i18n/translations.js';

interface HandHistoryDetailProps {
  hand: HandRecord;
  onBack: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

function formatCard(card: CardString): string {
  const rank = card[0] === 'T' ? '10' : card[0];
  const suit = card[1] as 'h' | 'd' | 'c' | 's';
  return `${rank}${SUIT_SYMBOLS[suit]}`;
}

function formatAction(
  action: { action: string; playerName: string; amount: number; isAllIn: boolean },
  t: (key: TranslationKey) => string,
): string {
  switch (action.action) {
    case 'fold': return `${action.playerName} ${t('history_folds')}`;
    case 'check': return `${action.playerName} ${t('history_checks')}`;
    case 'call': return `${action.playerName} ${t('history_calls')} ${action.amount}${action.isAllIn ? ' (all-in)' : ''}`;
    case 'bet': return `${action.playerName} ${t('history_bets')} ${action.amount}${action.isAllIn ? ' (all-in)' : ''}`;
    case 'raise': return `${action.playerName} ${t('history_raises_to')} ${action.amount}${action.isAllIn ? ' (all-in)' : ''}`;
    case 'all_in': return `${action.playerName} ${t('history_goes_all_in')} ${action.amount}`;
    default: return `${action.playerName} ${action.action} ${action.amount}`;
  }
}

function PlayerLabel({ player, t }: { player: HandRecordPlayer; t: (key: TranslationKey) => string }) {
  const tags = [];
  if (player.isDealer) tags.push('D');
  if (player.isSmallBlind) tags.push('SB');
  if (player.isBigBlind) tags.push('BB');
  const tagStr = tags.length > 0 ? ` [${tags.join('/')}]` : '';
  return (
    <span>
      {t('history_seat')} {player.seatIndex + 1}: {player.name} ({player.startingStack}){tagStr}
    </span>
  );
}

export function HandHistoryDetail({ hand, onBack, onNext, onPrev }: HandHistoryDetailProps) {
  const t = useT();

  return (
    <div className="fixed inset-0 bg-black/95 z-50 overflow-auto">
      <div className="p-4 max-w-lg mx-auto font-mono text-sm">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={onBack} className="text-blue-400 hover:text-blue-300">
            &larr; {t('history_back')}
          </button>
          <div className="flex gap-2">
            {onPrev ? (
              <button onClick={onPrev} className="text-gray-400 hover:text-white px-2">
                &larr; {t('history_prev')}
              </button>
            ) : (
              <span className="text-black px-2">&larr; {t('history_prev')}</span>
            )}
            {onNext ? (
              <button onClick={onNext} className="text-gray-400 hover:text-white px-2">
                {t('history_next')} &rarr;
              </button>
            ) : (
              <span className="text-black px-2">{t('history_next')} &rarr;</span>
            )}
          </div>
        </div>

        {/* Hand info */}
        <div className="text-yellow-400 mb-3">
          {t('history_hand')} #{hand.handNumber} - {hand.gameType} ({hand.blinds.small}/{hand.blinds.big})
        </div>

        {/* Players */}
        <div className="text-gray-400 mb-3 space-y-0.5">
          {hand.players.map(p => (
            <div key={p.playerId}>
              <PlayerLabel player={p} t={t} />
            </div>
          ))}
        </div>

        {/* Streets */}
        {hand.streets.map((street, i) => (
          <div key={i} className="mb-3">
            <div className="text-green-400 font-bold">
              --- {street.street.toUpperCase()} ---
              {street.boardCards.length > 0 && (
                <span className="ml-2 text-white">
                  [{street.boardCards.map(formatCard).join(' ')}]
                </span>
              )}
            </div>
            <div className="text-gray-300 space-y-0.5 ml-2">
              {street.actions.map((action, j) => (
                <div key={j}>{formatAction(action, t)}</div>
              ))}
            </div>
          </div>
        ))}

        {/* Board */}
        {hand.communityCards.length > 0 && (
          <div className="text-white mb-3">
            {hand.secondBoard && hand.secondBoard.length > 0 ? t('history_board_1') : t('history_board')}: [{hand.communityCards.map(formatCard).join(' ')}]
          </div>
        )}

        {/* Second board (RIT) */}
        {hand.secondBoard && hand.secondBoard.length > 0 && (
          <div className="text-white mb-3">
            {t('history_board_2')}: [{hand.secondBoard.map(formatCard).join(' ')}]
          </div>
        )}

        {/* Results */}
        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="text-yellow-400 font-bold mb-2">--- {t('history_results')} ---</div>
          {hand.pots.map((pot, i) => (
            <div key={i} className="mb-2">
              {pot.winners.map((w, j) => (
                <div key={j} className="text-green-400">
                  {w.playerName} {t('history_wins_from')} {w.amount} {t('history_from')} {pot.name}
                  {pot.winningHand && <span className="text-gray-400"> ({pot.winningHand})</span>}
                </div>
              ))}
            </div>
          ))}

          {/* Player hole cards (if visible) */}
          <div className="mt-2 space-y-0.5">
            {hand.players.map(p => (
              p.holeCards ? (
                <div key={p.playerId} className="text-gray-300">
                  {p.name}: [{p.holeCards.map(formatCard).join(' ')}]
                </div>
              ) : null
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="border-t border-gray-700 pt-3 mt-3 mb-8">
          {hand.summary.results.map(r => (
            <div key={r.playerId} className={`${
              r.netChips > 0 ? 'text-green-400' : r.netChips < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {r.playerName}: {r.netChips > 0 ? '+' : ''}{r.netChips}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
