import { describe, it, expect } from 'vitest';
import { resolvePreAction } from '@poker/shared';
import type { ActionType } from '@poker/shared';

describe('resolvePreAction', () => {
  it('fold_to_bet: folds when must call (no check available)', () => {
    const actions: ActionType[] = ['fold', 'call', 'raise'];
    expect(resolvePreAction('fold_to_bet', actions)).toBe('fold');
  });

  it('fold_to_bet: cancels when check is available (nobody bet)', () => {
    const actions: ActionType[] = ['check', 'bet'];
    expect(resolvePreAction('fold_to_bet', actions)).toBeNull();
  });

  it('auto_check: checks when check is available', () => {
    const actions: ActionType[] = ['check', 'bet'];
    expect(resolvePreAction('auto_check', actions)).toBe('check');
  });

  it('auto_check: cancels when check is not available (must call)', () => {
    const actions: ActionType[] = ['fold', 'call', 'raise'];
    expect(resolvePreAction('auto_check', actions)).toBeNull();
  });

  it('returns null when no pre-action is set', () => {
    const actions: ActionType[] = ['fold', 'call', 'raise'];
    expect(resolvePreAction(null, actions)).toBeNull();
  });
});
