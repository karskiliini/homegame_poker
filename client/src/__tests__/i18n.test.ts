// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { translations, detectLanguage } from '../i18n/translations.js';

describe('translations', () => {
  it('fi has all the same keys as en', () => {
    const enKeys = Object.keys(translations.en).sort();
    const fiKeys = Object.keys(translations.fi).sort();
    expect(fiKeys).toEqual(enKeys);
  });

  it('no empty translation values in en', () => {
    for (const [key, value] of Object.entries(translations.en)) {
      expect(value, `en.${key} is empty`).not.toBe('');
    }
  });

  it('no empty translation values in fi', () => {
    for (const [key, value] of Object.entries(translations.fi)) {
      expect(value, `fi.${key} is empty`).not.toBe('');
    }
  });
});

describe('detectLanguage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns localStorage value when set to fi', () => {
    localStorage.setItem('ftp-language', 'fi');
    expect(detectLanguage()).toBe('fi');
  });

  it('returns localStorage value when set to en', () => {
    localStorage.setItem('ftp-language', 'en');
    expect(detectLanguage()).toBe('en');
  });

  it('ignores invalid localStorage values', () => {
    localStorage.setItem('ftp-language', 'de');
    // Falls through to navigator.language or default 'en'
    const result = detectLanguage();
    expect(['en', 'fi']).toContain(result);
  });

  it('defaults to en when no localStorage and non-fi browser', () => {
    // In test env, navigator.language is typically 'en-US'
    const result = detectLanguage();
    expect(result).toBe('en');
  });
});
