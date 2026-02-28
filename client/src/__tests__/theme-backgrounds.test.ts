// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Theme-specific table backgrounds', () => {
  // ---- Theme config completeness ----

  const ALL_THEMES = ['basic', 'cccp', 'midnight', 'vegas', 'arctic', 'lava'] as const;

  it('all themes have watermark defined', () => {
    for (const theme of ALL_THEMES) {
      const src = readFileSync(
        join(__dirname, '..', 'themes', `${theme}.tsx`),
        'utf-8'
      );
      expect(src, `${theme} missing watermark`).toContain('watermark');
    }
  });

  it('ThemeConfig type includes watermark field', () => {
    const typesSrc = readFileSync(
      join(__dirname, '..', 'themes', 'types.ts'),
      'utf-8'
    );
    expect(typesSrc).toContain('watermark');
    expect(typesSrc).toContain('ReactNode');
  });

  it('ThemeId includes all 6 themes', () => {
    const typesSrc = readFileSync(
      join(__dirname, '..', 'themes', 'types.ts'),
      'utf-8'
    );
    for (const theme of ALL_THEMES) {
      expect(typesSrc, `ThemeId missing '${theme}'`).toContain(`'${theme}'`);
    }
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

  // ---- Data-driven: all derived themes inherit from basic ----

  const DERIVED_THEMES = ['cccp', 'midnight', 'vegas', 'arctic', 'lava'] as const;

  for (const theme of DERIVED_THEMES) {
    it(`${theme} theme inherits basic gradients via spread and overrides key ones`, () => {
      const src = readFileSync(
        join(__dirname, '..', 'themes', `${theme}.tsx`),
        'utf-8'
      );
      expect(src).toContain('...basicTheme.gradients');
      expect(src).toContain('tvBackground');
      expect(src).toContain('tableFelt');
      expect(src).toContain('tableRail');
    });

    it(`${theme} tvBackground differs from basic`, () => {
      const basicSrc = readFileSync(join(__dirname, '..', 'themes', 'basic.tsx'), 'utf-8');
      const themeSrc = readFileSync(join(__dirname, '..', 'themes', `${theme}.tsx`), 'utf-8');

      const basicMatch = basicSrc.match(/tvBackground:\s*'([^']+)'/);
      const themeMatch = themeSrc.match(/tvBackground:\s*'([^']+)'/);

      expect(basicMatch).toBeTruthy();
      expect(themeMatch).toBeTruthy();
      expect(basicMatch![1]).not.toBe(themeMatch![1]);
    });

    it(`${theme} does not use basic green felt colors`, () => {
      const src = readFileSync(join(__dirname, '..', 'themes', `${theme}.tsx`), 'utf-8');
      expect(src, `${theme} should not contain basic feltGreenLight`).not.toContain('#52B86E');
      expect(src, `${theme} should not contain basic feltGreen`).not.toContain('#3A9D56');
    });

    it(`${theme} uses basic avatars`, () => {
      const src = readFileSync(join(__dirname, '..', 'themes', `${theme}.tsx`), 'utf-8');
      expect(src).toContain("avatarBasePath");
    });
  }

  // ---- CCCP distinct gradients ----

  it('CCCP tableFelt has crimson/red tones', () => {
    const cccpSrc = readFileSync(join(__dirname, '..', 'themes', 'cccp.tsx'), 'utf-8');
    expect(cccpSrc).toMatch(/8B2020|6B1A1A|4A1010|crimson/i);

    const basicSrc = readFileSync(join(__dirname, '..', 'themes', 'basic.tsx'), 'utf-8');
    expect(basicSrc).toContain('#52B86E');
    expect(basicSrc).toContain('#3A9D56');
  });

  it('CCCP tableRail differs from basic', () => {
    const cccpSrc = readFileSync(join(__dirname, '..', 'themes', 'cccp.tsx'), 'utf-8');
    expect(cccpSrc).not.toContain('#7A4F2B');
    expect(cccpSrc).not.toContain('#5C3A1E');
  });

  // ---- Theme-specific felt color checks ----

  it('midnight uses navy felt colors', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'midnight.tsx'), 'utf-8');
    expect(src).toContain('#1A2744');
  });

  it('vegas uses gold/champagne felt colors', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'vegas.tsx'), 'utf-8');
    expect(src).toContain('#8B7840');
  });

  it('arctic uses icy blue felt colors', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'arctic.tsx'), 'utf-8');
    expect(src).toContain('#6890A8');
  });

  it('lava uses volcanic orange felt colors', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'lava.tsx'), 'utf-8');
    expect(src).toContain('#8B4420');
  });

  // ---- PokerTable no hardcoded watermark ----

  it('PokerTable does not contain hardcoded "CCCPokeri" text', () => {
    const src = readFileSync(
      join(__dirname, '..', 'views', 'table', 'PokerTable.tsx'),
      'utf-8'
    );
    expect(src).not.toContain('CCCPokeri');
  });

  it('PokerTable renders theme watermark', () => {
    const src = readFileSync(
      join(__dirname, '..', 'views', 'table', 'PokerTable.tsx'),
      'utf-8'
    );
    expect(src).toMatch(/watermark/);
  });

  // ---- CCCP watermark content ----

  it('CCCP theme watermark contains Soviet star SVG and CCCP text', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'cccp.tsx'), 'utf-8');
    expect(src).toContain('<svg');
    expect(src).toContain('<polygon');
    expect(src).toContain('CCCP');
    expect(src).toContain('#C9A84C');
    expect(src).toContain('cccp-star-glow');
  });

  // ---- Theme watermark animation references ----

  const WATERMARK_ANIMATIONS: Record<string, string> = {
    cccp: 'cccp-star-glow',
    midnight: 'midnight-glow',
    vegas: 'vegas-sparkle',
    arctic: 'arctic-shimmer',
    lava: 'lava-pulse',
  };

  for (const [theme, animName] of Object.entries(WATERMARK_ANIMATIONS)) {
    it(`${theme} watermark references ${animName} animation`, () => {
      const src = readFileSync(join(__dirname, '..', 'themes', `${theme}.tsx`), 'utf-8');
      expect(src).toContain(animName);
    });
  }

  // ---- CCCP avatar names ----

  it('CCCP theme defines avatarNames list matching actual files on disk', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'cccp.tsx'), 'utf-8');
    expect(src).toContain('avatarNames');
    expect(src).toContain('beria.png');
    expect(src).toContain('lenin.png');
    expect(src).toContain('marx.png');
  });

  it('CCCP avatarCount matches avatarNames length', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'cccp.tsx'), 'utf-8');
    const namesMatch = src.match(/avatarNames:\s*\[([\s\S]*?)\]/);
    expect(namesMatch).toBeTruthy();
    const entries = namesMatch![1].match(/'.+?\.png'/g);
    expect(entries).toBeTruthy();
    const countMatch = src.match(/avatarCount:\s*(\d+)/);
    expect(countMatch).toBeTruthy();
    expect(entries!.length).toBe(parseInt(countMatch![1], 10));
  });

  it('avatarImageFile resolves named avatars from avatarNames', () => {
    const src = readFileSync(
      join(__dirname, '..', 'utils', 'avatarImageFile.ts'),
      'utf-8'
    );
    expect(src).toContain('avatarNames');
  });

  it('basic theme does NOT define avatarNames (uses numbered fallback)', () => {
    const src = readFileSync(join(__dirname, '..', 'themes', 'basic.tsx'), 'utf-8');
    expect(src).not.toContain('avatarNames');
  });

  // ---- CSS animations exist ----

  const CSS_ANIMATIONS = [
    { keyframes: 'cccp-star-glow', className: '.animate-cccp-star-glow' },
    { keyframes: 'midnight-glow', className: '.animate-midnight-glow' },
    { keyframes: 'vegas-sparkle', className: '.animate-vegas-sparkle' },
    { keyframes: 'arctic-shimmer', className: '.animate-arctic-shimmer' },
    { keyframes: 'lava-pulse', className: '.animate-lava-pulse' },
  ];

  for (const { keyframes, className } of CSS_ANIMATIONS) {
    it(`index.css contains ${keyframes} keyframes and ${className} class`, () => {
      const css = readFileSync(
        join(__dirname, '..', 'styles', 'index.css'),
        'utf-8'
      );
      expect(css).toContain(`@keyframes ${keyframes}`);
      expect(css).toContain(className);
    });
  }

  // ---- Theme registry completeness ----

  it('theme index registers all 6 themes', () => {
    const src = readFileSync(
      join(__dirname, '..', 'themes', 'index.ts'),
      'utf-8'
    );
    for (const theme of ALL_THEMES) {
      expect(src, `index.ts missing theme: ${theme}`).toContain(`${theme}:`);
    }
  });

  // ---- ThemeToggle icons ----

  it('ThemeToggle has icons for all themes', () => {
    const src = readFileSync(
      join(__dirname, '..', 'components', 'ThemeToggle.tsx'),
      'utf-8'
    );
    for (const theme of ALL_THEMES) {
      expect(src, `ThemeToggle missing icon for: ${theme}`).toContain(`${theme}:`);
    }
  });
});
