import { describe, it, expect } from 'vitest';
import { translations } from '../i18n/translations.js';

describe('i18n translations', () => {
  it('en and fi have the same keys', () => {
    const enKeys = Object.keys(translations.en).sort();
    const fiKeys = Object.keys(translations.fi).sort();
    expect(fiKeys).toEqual(enKeys);
  });

  it('no empty translation values', () => {
    for (const lang of ['en', 'fi'] as const) {
      for (const [key, value] of Object.entries(translations[lang])) {
        expect(value, `${lang}.${key} is empty`).not.toBe('');
      }
    }
  });
});
