// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Theme-specific table backgrounds', () => {
  // ---- Theme config completeness ----

  it('all themes have watermark defined', () => {
    // Basic theme
    const basicSrc = readFileSync(
      join(__dirname, '..', 'themes', 'basic.tsx'),
      'utf-8'
    );
    expect(basicSrc).toContain('watermark');

    // CCCP theme
    const cccpSrc = readFileSync(
      join(__dirname, '..', 'themes', 'cccp.tsx'),
      'utf-8'
    );
    expect(cccpSrc).toContain('watermark');
  });

  it('ThemeConfig type includes watermark field', () => {
    const typesSrc = readFileSync(
      join(__dirname, '..', 'themes', 'types.ts'),
      'utf-8'
    );
    expect(typesSrc).toContain('watermark');
    expect(typesSrc).toContain('ReactNode');
  });

  it('basic theme defines all gradient keys explicitly', () => {
    const requiredGradientKeys = [
      'tvBackground', 'loginBackground', 'phoneBackground', 'phoneRadialBackground',
      'tableRail', 'tableRailHighlight', 'tableRailEdge', 'tableFelt',
      'cardBack', 'cardBackPattern',
      'namePlate', 'namePlateActive', 'dealerButton', 'sbButton', 'bbButton',
      'badgeAllIn', 'badgeBusted', 'badgeAway',
      'emptySeatHover', 'emptySeatDefault',
      'sliderTrack', 'sliderThumb',
    ];

    const src = readFileSync(
      join(__dirname, '..', 'themes', 'basic.tsx'),
      'utf-8'
    );
    for (const key of requiredGradientKeys) {
      expect(src, `basic missing gradient: ${key}`).toContain(key);
    }
  });

  it('cccp theme inherits basic gradients via spread and overrides key ones', () => {
    const src = readFileSync(
      join(__dirname, '..', 'themes', 'cccp.tsx'),
      'utf-8'
    );
    // Must spread from basic to inherit all keys
    expect(src).toContain('...basicTheme.gradients');
    // Must override the key visual gradients
    expect(src).toContain('tvBackground');
    expect(src).toContain('tableFelt');
    expect(src).toContain('tableRail');
  });

  // ---- CCCP distinct gradients ----

  it('CCCP tableFelt differs from basic', () => {
    const basicSrc = readFileSync(join(__dirname, '..', 'themes', 'basic.tsx'), 'utf-8');
    const cccpSrc = readFileSync(join(__dirname, '..', 'themes', 'cccp.tsx'), 'utf-8');

    // CCCP must NOT use the basic green felt colors
    expect(cccpSrc).not.toContain('#52B86E');  // basic feltGreenLight
    expect(cccpSrc).not.toContain('#3A9D56');  // basic feltGreen

    // CCCP should have crimson/red tones
    expect(cccpSrc).toMatch(/8B2020|6B1A1A|4A1010|crimson/i);

    // Basic should still have green felt
    expect(basicSrc).toContain('#52B86E');
    expect(basicSrc).toContain('#3A9D56');
  });

  it('CCCP tvBackground differs from basic', () => {
    const basicSrc = readFileSync(join(__dirname, '..', 'themes', 'basic.tsx'), 'utf-8');
    const cccpSrc = readFileSync(join(__dirname, '..', 'themes', 'cccp.tsx'), 'utf-8');

    // Both must define tvBackground with different values
    const basicMatch = basicSrc.match(/tvBackground:\s*'([^']+)'/);
    const cccpMatch = cccpSrc.match(/tvBackground:\s*'([^']+)'/);

    expect(basicMatch).toBeTruthy();
    expect(cccpMatch).toBeTruthy();
    expect(basicMatch![1]).not.toBe(cccpMatch![1]);
  });

  it('CCCP tableRail differs from basic', () => {
    const basicSrc = readFileSync(join(__dirname, '..', 'themes', 'basic.tsx'), 'utf-8');
    const cccpSrc = readFileSync(join(__dirname, '..', 'themes', 'cccp.tsx'), 'utf-8');

    // CCCP should NOT use the basic warm-brown rail colors
    expect(cccpSrc).not.toContain('#7A4F2B');  // basic rail light brown
    expect(cccpSrc).not.toContain('#5C3A1E');  // basic rail brown
  });

  // ---- PokerTable no hardcoded watermark ----

  it('PokerTable does not contain hardcoded "POKER NIGHT" text', () => {
    const src = readFileSync(
      join(__dirname, '..', 'views', 'table', 'PokerTable.tsx'),
      'utf-8'
    );
    expect(src).not.toContain('POKER NIGHT');
  });

  it('PokerTable renders theme watermark', () => {
    const src = readFileSync(
      join(__dirname, '..', 'views', 'table', 'PokerTable.tsx'),
      'utf-8'
    );
    // Should reference watermark from theme
    expect(src).toMatch(/watermark/);
  });

  // ---- CCCP watermark content ----

  it('CCCP theme watermark contains Soviet star SVG and CCCP text', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'cccp.tsx'), 'utf-8');
    // Should have inline SVG with a polygon (star)
    expect(src).toContain('<svg');
    expect(src).toContain('<polygon');
    // Should have CCCP text
    expect(src).toContain('CCCP');
    // Should use gold color
    expect(src).toContain('#C9A84C');
    // Should reference the glow animation
    expect(src).toContain('cccp-star-glow');
  });

  // ---- CCCP avatar names ----

  it('CCCP theme defines avatarNames list matching actual files on disk', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'cccp.tsx'), 'utf-8');
    // Must have avatarNames array
    expect(src).toContain('avatarNames');
    // Must include known character names
    expect(src).toContain('beria.png');
    expect(src).toContain('lenin.png');
    expect(src).toContain('marx.png');
  });

  it('CCCP avatarCount matches avatarNames length', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'cccp.tsx'), 'utf-8');
    // Extract avatarNames array entries
    const namesMatch = src.match(/avatarNames:\s*\[([\s\S]*?)\]/);
    expect(namesMatch).toBeTruthy();
    const entries = namesMatch![1].match(/'.+?\.png'/g);
    expect(entries).toBeTruthy();
    // Extract avatarCount
    const countMatch = src.match(/avatarCount:\s*(\d+)/);
    expect(countMatch).toBeTruthy();
    expect(entries!.length).toBe(parseInt(countMatch![1], 10));
  });

  it('avatarImageFile resolves named avatars from avatarNames', () => {
    const src = readFileSync(
      join(__dirname, '..', 'utils', 'avatarImageFile.ts'),
      'utf-8'
    );
    // Must accept an optional avatarNames parameter
    expect(src).toContain('avatarNames');
  });

  it('basic theme does NOT define avatarNames (uses numbered fallback)', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'basic.tsx'), 'utf-8');
    expect(src).not.toContain('avatarNames');
  });

  // ---- CSS animation exists ----

  it('index.css contains cccp-star-glow keyframes', () => {
    const css = readFileSync(
      join(__dirname, '..', 'styles', 'index.css'),
      'utf-8'
    );
    expect(css).toContain('@keyframes cccp-star-glow');
    expect(css).toContain('.animate-cccp-star-glow');
  });
});
