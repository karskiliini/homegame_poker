import type { ActionType } from './types/hand.js';

export type PreActionType = 'fold_to_bet' | 'auto_check';

export function resolvePreAction(
  preAction: PreActionType | null,
  availableActions: ActionType[],
): ActionType | null {
  if (!preAction) return null;

  if (preAction === 'fold_to_bet') {
    return !availableActions.includes('check') ? 'fold' : null;
  }

  if (preAction === 'auto_check') {
    return availableActions.includes('check') ? 'check' : null;
  }

  return null;
}
