// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { computeDealStartOffset, computeBetChipStartOffset } from '../hooks/useTableAnimations.js';
import { SEAT_POSITIONS, BET_POSITIONS, DECK_POS } from '../views/table/layout-positions.js';

/**
 * Deal card animation coordinate tests
 *
 * Cards fly from the deck (center) to each player's seat. The start offset
 * (startX, startY) is the pixel delta FROM the deck TO the seat, in the
 * virtual table coordinate space (900×550). These values are used as CSS
 * translate() in the animation keyframe.
 *
 * Bug: Previously computed using container.getBoundingClientRect() which
 * returns scaled screen pixels. The animation elements live inside the
 * virtual 900×550 table, so offsets must use virtual dimensions.
 */

describe('deal animation start offset', () => {
  it('computes offset from deck to seat 0 (bottom center) in virtual pixels', () => {
    // Seat 0: { x: 50, y: 92 }, Deck: { x: 50, y: 42 }
    // Delta: deck.x - seat.x = 0, deck.y - seat.y = -50 (percentage points)
    // In virtual pixels: 0/100*900 = 0, -50/100*550 = -275
    const offset = computeDealStartOffset(0);
    expect(offset.startX).toBeCloseTo(0);
    expect(offset.startY).toBeCloseTo(-275);
  });

  it('computes offset from deck to seat 5 (top center) in virtual pixels', () => {
    // Seat 5: { x: 50, y: 8 }, Deck: { x: 50, y: 42 }
    // Delta: 0, (42-8)/100*550 = 187
    const offset = computeDealStartOffset(5);
    expect(offset.startX).toBeCloseTo(0);
    expect(offset.startY).toBeCloseTo(187);
  });

  it('computes offset from deck to seat 2 (left) in virtual pixels', () => {
    // Seat 2: { x: 3, y: 55 }, Deck: { x: 50, y: 42 }
    // Delta x: (50-3)/100*900 = 423, y: (42-55)/100*550 = -71.5
    const offset = computeDealStartOffset(2);
    expect(offset.startX).toBeCloseTo(423);
    expect(offset.startY).toBeCloseTo(-71.5);
  });

  it('respects seat rotation', () => {
    // With seatRotation=2, seat index 2 maps to display index (2-2+10)%10 = 0
    // Display index 0 = { x: 50, y: 92 } (bottom center)
    // Same as seat 0 without rotation
    const offset = computeDealStartOffset(2, 2);
    expect(offset.startX).toBeCloseTo(0);
    expect(offset.startY).toBeCloseTo(-275);
  });

  it('offset is independent of any container/screen size', () => {
    // The same seat must always produce the same offset regardless of
    // how the table is scaled on screen
    const a = computeDealStartOffset(7);
    const b = computeDealStartOffset(7);
    expect(a.startX).toBe(b.startX);
    expect(a.startY).toBe(b.startY);
    // Seat 7: { x: 97, y: 30 }, Deck: { x: 50, y: 42 }
    // x: (50-97)/100*900 = -423, y: (42-30)/100*550 = 66
    expect(a.startX).toBeCloseTo(-423);
    expect(a.startY).toBeCloseTo(66);
  });
});

describe('bet chip animation start offset', () => {
  it('computes offset from seat to bet position in virtual pixels', () => {
    // Seat 0: { x: 50, y: 92 }, Bet 0: { x: 50, y: 75 }
    // Delta: (50-50)/100*900 = 0, (92-75)/100*550 = 93.5
    const offset = computeBetChipStartOffset(0);
    expect(offset.startX).toBeCloseTo(0);
    expect(offset.startY).toBeCloseTo(93.5);
  });

  it('computes offset for side seat in virtual pixels', () => {
    // Seat 2: { x: 3, y: 55 }, Bet 2: { x: 22, y: 53 }
    // Delta: (3-22)/100*900 = -171, (55-53)/100*550 = 11
    const offset = computeBetChipStartOffset(2);
    expect(offset.startX).toBeCloseTo(-171);
    expect(offset.startY).toBeCloseTo(11);
  });

  it('respects seat rotation', () => {
    // With seatRotation=2, seat 2 → display 0
    // Seat display 0: { x: 50, y: 92 }, Bet display 0: { x: 50, y: 75 }
    const offset = computeBetChipStartOffset(2, 2);
    expect(offset.startX).toBeCloseTo(0);
    expect(offset.startY).toBeCloseTo(93.5);
  });
});
