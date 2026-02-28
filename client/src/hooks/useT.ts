import { useGameStore } from './useGameStore.js';
import { translations } from '../i18n/translations.js';
import type { TranslationKey } from '../i18n/translations.js';

export function useT() {
  const language = useGameStore(s => s.language);
  return (key: TranslationKey): string => translations[language][key];
}
