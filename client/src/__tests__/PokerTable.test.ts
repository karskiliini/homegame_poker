// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * PokerTable aspect ratio tests
 *
 * The poker table must maintain a fixed aspect ratio regardless of the
 * container/window size. The table's visual shape (oval felt, rail, seats)
 * should never distort when the browser window is resized.
 *
 * Design: Both views use a fixed virtual coordinate system (TABLE_VIRTUAL_W x
 * TABLE_VIRTUAL_H = 900x550) and CSS `transform: scale()` to fit the table
 * into the available space. This guarantees the aspect ratio is always preserved.
 *
 * Both watching and phone views use width-based scaling for consistent layout.
 */

describe('PokerTable aspect ratio', () => {
  it('PokerTable exports TABLE_VIRTUAL_W and TABLE_VIRTUAL_H constants', () => {
    const src = readFileSync(
      join(__dirname, '..', 'views', 'table', 'PokerTable.tsx'),
      'utf-8'
    );

    // Constants must be exported for use by consumer views
    expect(src).toContain('export const TABLE_VIRTUAL_W = 900');
    expect(src).toContain('export const TABLE_VIRTUAL_H = 550');
  });

  it('PokerTable root div uses fixed virtual dimensions, not w-full h-full', () => {
    const src = readFileSync(
      join(__dirname, '..', 'views', 'table', 'PokerTable.tsx'),
      'utf-8'
    );

    // The root div should use fixed pixel dimensions from constants
    expect(src).toContain('width: TABLE_VIRTUAL_W');
    expect(src).toContain('height: TABLE_VIRTUAL_H');
    // It should also set aspect-ratio as a safeguard
    expect(src).toContain("aspectRatio: '900 / 550'");

    // The root div should NOT have w-full h-full classes (which would stretch it)
    const rootDivMatch = src.match(/<div\s+\n?\s*ref={tableRef}\s+\n?\s*className="([^"]*)"/);
    expect(rootDivMatch).toBeTruthy();
    const rootClasses = rootDivMatch![1];
    expect(rootClasses).not.toContain('w-full');
    expect(rootClasses).not.toContain('h-full');
  });

  it('WatchingScreen uses same phone-style layout as GameScreen', () => {
    const src = readFileSync(
      join(__dirname, '..', 'views', 'player', 'WatchingScreen.tsx'),
      'utf-8'
    );

    // Should import the virtual dimensions
    expect(src).toContain('TABLE_VIRTUAL_W');
    expect(src).toContain('TABLE_VIRTUAL_H');

    // Should use width-based scaling like GameScreen (not contain behavior)
    expect(src).toContain('wrapperWidth / TABLE_W');

    // Should wrap PokerTable in a container with fixed virtual size + scale transform
    expect(src).toContain('width: TABLE_W');
    expect(src).toContain('height: TABLE_H');
    expect(src).toMatch(/transform:.*scale/);
  });

  it('GameScreen (phone view) imports constants from PokerTable', () => {
    const src = readFileSync(
      join(__dirname, '..', 'views', 'player', 'GameScreen.tsx'),
      'utf-8'
    );

    // Should import the virtual dimensions from PokerTable
    expect(src).toContain('TABLE_VIRTUAL_W');
    expect(src).toContain('TABLE_VIRTUAL_H');

    // Should use them for TABLE_W and TABLE_H
    expect(src).toContain('TABLE_W = TABLE_VIRTUAL_W');
    expect(src).toContain('TABLE_H = TABLE_VIRTUAL_H');
  });

  it('aspect ratio is 900:550 = 18:11 (~1.636)', () => {
    const ratio = 900 / 550;
    expect(ratio).toBeCloseTo(1.636, 2);
  });
});
