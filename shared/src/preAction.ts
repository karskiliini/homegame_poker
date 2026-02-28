import type { ActionType } from './types/hand.js';

export type PreActionType = 'check_fold' | 'auto_check';

export function resolvePreAction(
  preAction: PreActionType | null,
  availableActions: ActionType[],
): ActionType | null {
  if (!preAction) return null;

  if (preAction === 'check_fold') {
    // Check/Fold: check when possible, fold when someone bet/raised
    if (availableActions.includes('check')) return 'check';
    return 'fold';
  }

  if (preAction === 'auto_check') {
    // Auto-check: check when possible, cancel (do nothing) when someone bet/raised
    if (availableActions.includes('check')) return 'check';
    return null;
  }

  return null;
}
