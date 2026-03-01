// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Deck Shuffle Animation tests
 *
 * At the start of each new hand, a deck shuffle animation should play
 * in the center of the table before cards are dealt to players.
 * The animation style varies per theme (shuffleStyle field in ThemeConfig).
 *
 * Animation phases:
 * 1. Deck appears at table center (card stack)
 * 2. Shuffle motion (theme-specific: riffle, smash, fan, speed, slide, burst)
 * 3. Cards gather back together
 * 4. Deck fades out and dealing begins
 */

describe('DeckShuffleAnimation component', () => {
  const componentPath = join(__dirname, '..', 'views', 'table', 'DeckShuffleAnimation.tsx');

  it('DeckShuffleAnimation component file exists', () => {
    const src = readFileSync(componentPath, 'utf-8');
    expect(src).toBeTruthy();
  });

  it('exports a DeckShuffleAnimation component', () => {
    const src = readFileSync(componentPath, 'utf-8');
    expect(src).toContain('export function DeckShuffleAnimation');
  });

  it('accepts shuffleStyle prop to select animation variant', () => {
    const src = readFileSync(componentPath, 'utf-8');
    expect(src).toContain('shuffleStyle');
  });

  it('accepts onComplete callback prop', () => {
    const src = readFileSync(componentPath, 'utf-8');
    expect(src).toContain('onComplete');
  });

  it('uses CSS animation classes for shuffle styles', () => {
    const src = readFileSync(componentPath, 'utf-8');
    // Should reference the shuffle animation classes
    expect(src).toContain('animate-shuffle');
  });

  it('renders card back elements for the deck visual', () => {
    const src = readFileSync(componentPath, 'utf-8');
    // Should use CardBack or card-back-like rendering
    expect(src).toContain('CardBack');
  });
});

describe('Theme shuffleStyle configuration', () => {
  it('ThemeConfig includes shuffleStyle field', () => {
    const src = readFileSync(
      join(__dirname, '..', 'themes', 'types.ts'),
      'utf-8'
    );
    expect(src).toContain('shuffleStyle: ShuffleStyle');
  });

  it('ShuffleStyle type includes all 6 variants', () => {
    const src = readFileSync(
      join(__dirname, '..', 'themes', 'types.ts'),
      'utf-8'
    );
    expect(src).toContain("'riffle'");
    expect(src).toContain("'smash'");
    expect(src).toContain("'fan'");
    expect(src).toContain("'speed'");
    expect(src).toContain("'slide'");
    expect(src).toContain("'burst'");
  });

  it('basic theme uses riffle shuffle', () => {
    const src = readFileSync(
      join(__dirname, '..', 'themes', 'basic.tsx'),
      'utf-8'
    );
    expect(src).toContain("shuffleStyle: 'riffle'");
  });

  it('cccp theme uses smash shuffle', () => {
    const src = readFileSync(
      join(__dirname, '..', 'themes', 'cccp.tsx'),
      'utf-8'
    );
    expect(src).toContain("shuffleStyle: 'smash'");
  });

  it('midnight theme uses fan shuffle', () => {
    const src = readFileSync(
      join(__dirname, '..', 'themes', 'midnight.tsx'),
      'utf-8'
    );
    expect(src).toContain("shuffleStyle: 'fan'");
  });

  it('vegas theme uses speed shuffle', () => {
    const src = readFileSync(
      join(__dirname, '..', 'themes', 'vegas.tsx'),
      'utf-8'
    );
    expect(src).toContain("shuffleStyle: 'speed'");
  });

  it('arctic theme uses slide shuffle', () => {
    const src = readFileSync(
      join(__dirname, '..', 'themes', 'arctic.tsx'),
      'utf-8'
    );
    expect(src).toContain("shuffleStyle: 'slide'");
  });

  it('lava theme uses burst shuffle', () => {
    const src = readFileSync(
      join(__dirname, '..', 'themes', 'lava.tsx'),
      'utf-8'
    );
    expect(src).toContain("shuffleStyle: 'burst'");
  });
});

describe('CSS shuffle animations', () => {
  const cssPath = join(__dirname, '..', 'styles', 'index.css');

  it('defines @keyframes for shuffle-riffle', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toContain('@keyframes shuffle-riffle');
  });

  it('defines @keyframes for shuffle-smash', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toContain('@keyframes shuffle-smash');
  });

  it('defines @keyframes for shuffle-fan', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toContain('@keyframes shuffle-fan');
  });

  it('defines @keyframes for shuffle-speed', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toContain('@keyframes shuffle-speed');
  });

  it('defines @keyframes for shuffle-slide', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toContain('@keyframes shuffle-slide');
  });

  it('defines @keyframes for shuffle-burst', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toContain('@keyframes shuffle-burst');
  });

  it('defines --ftp-anim-shuffle token', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toContain('--ftp-anim-shuffle');
  });

  it('defines .animate-shuffle-* classes for each style', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toContain('.animate-shuffle-riffle');
    expect(css).toContain('.animate-shuffle-smash');
    expect(css).toContain('.animate-shuffle-fan');
    expect(css).toContain('.animate-shuffle-speed');
    expect(css).toContain('.animate-shuffle-slide');
    expect(css).toContain('.animate-shuffle-burst');
  });
});

describe('Shuffle animation integration', () => {
  it('useTableAnimations exposes shuffling state', () => {
    const src = readFileSync(
      join(__dirname, '..', 'hooks', 'useTableAnimations.ts'),
      'utf-8'
    );
    expect(src).toContain('shuffling');
  });

  it('PokerTable renders DeckShuffleAnimation when shuffling', () => {
    const src = readFileSync(
      join(__dirname, '..', 'views', 'table', 'PokerTable.tsx'),
      'utf-8'
    );
    expect(src).toContain('DeckShuffleAnimation');
    expect(src).toContain('shuffling');
  });
});
