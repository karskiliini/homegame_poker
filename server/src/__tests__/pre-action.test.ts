import { describe, it, expect } from 'vitest';
import { resolvePreAction } from '@poker/shared';
import type { ActionType } from '@poker/shared';

describe('resolvePreAction', () => {
  it('check_fold: folds when must call (no check available)', () => {
    const actions: ActionType[] = ['fold', 'call', 'raise'];
    expect(resolvePreAction('check_fold', actions)).toBe('fold');
  });

  it('check_fold: checks when check is available (nobody bet)', () => {
    const actions: ActionType[] = ['check', 'bet'];
    expect(resolvePreAction('check_fold', actions)).toBe('check');
  });

  it('auto_check: checks when check is available', () => {
    const actions: ActionType[] = ['check', 'bet'];
    expect(resolvePreAction('auto_check', actions)).toBe('check');
  });

  it('auto_check: cancels when check is not available (must call) — never folds', () => {
    const actions: ActionType[] = ['fold', 'call', 'raise'];
    const result = resolvePreAction('auto_check', actions);
    expect(result).toBeNull();
    expect(result).not.toBe('fold');
  });

  it('returns null when no pre-action is set', () => {
    const actions: ActionType[] = ['fold', 'call', 'raise'];
    expect(resolvePreAction(null, actions)).toBeNull();
  });
});
