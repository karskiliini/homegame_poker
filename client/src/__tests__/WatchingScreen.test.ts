// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * WatchingScreen layout tests
 *
 * The watching screen (spectator view on phone) should use the same
 * mini-table layout as GameScreen so spectators see the same visual
 * experience as seated players.
 *
 * Differences from GameScreen:
 * - No action panel (fold/check/call/raise buttons)
 * - No own hole cards display
 * - Has a "Sit Down" button and buy-in modal instead
 * - Has a "Back" button to return to table lobby
 */

describe('WatchingScreen uses same phone layout as GameScreen', () => {
  const watchingSrc = readFileSync(
    join(__dirname, '..', 'views', 'player', 'WatchingScreen.tsx'),
    'utf-8'
  );

  it('uses phone-style flex column layout like GameScreen, not full-screen TV layout', () => {
    // WatchingScreen should use the same flex-col layout as GameScreen
    expect(watchingSrc).toContain('flex flex-col');
    expect(watchingSrc).toContain("minHeight: '100dvh'");

    // Should NOT use the old TV-style full-screen layout
    expect(watchingSrc).not.toContain('w-screen h-screen');
  });

  it('uses phone-style width-based scaling like GameScreen', () => {
    // Should scale based on wrapper width like GameScreen (not contain behavior)
    expect(watchingSrc).toContain('wrapperWidth / TABLE');

    // Should NOT use the TV-style contain behavior (Math.min of scaleX, scaleY)
    expect(watchingSrc).not.toContain('Math.min(scaleX, scaleY)');
  });

  it('uses phone background gradient like GameScreen', () => {
    // Should use phone-specific background gradients
    expect(watchingSrc).toContain('gradients.phoneBackground');
    expect(watchingSrc).toContain('gradients.phoneRadialBackground');

    // Should NOT use TV background
    expect(watchingSrc).not.toContain('gradients.tvBackground');
  });

  it('renders PokerTable component', () => {
    expect(watchingSrc).toContain('<PokerTable');
  });

  it('does NOT include ActionButtons or PreActionButtons (spectators cannot act)', () => {
    expect(watchingSrc).not.toContain('ActionButtons');
    expect(watchingSrc).not.toContain('PreActionButtons');
  });

  it('has sit-down and buy-in functionality for spectators to join', () => {
    expect(watchingSrc).toContain('handleSitDown');
    expect(watchingSrc).toContain('handleConfirmSitDown');
    expect(watchingSrc).toContain('showBuyIn');
  });

  it('has back button to return to table lobby', () => {
    expect(watchingSrc).toContain('handleBack');
  });
});
