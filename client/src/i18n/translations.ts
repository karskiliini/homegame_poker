export type Language = 'en' | 'fi';

const en = {
  // Login
  login_title: 'POKER NIGHT',
  login_subtitle: 'Choose your name and avatar',
  login_name_label: 'NAME',
  login_name_placeholder: 'Enter your name',
  login_avatar_label: 'AVATAR',
  login_enter_lobby: 'Enter Lobby',

  // Table Lobby
  table_lobby_title: 'Tables',
  table_lobby_playing_as: 'Playing as',
  table_lobby_no_connection: 'No server connection',
  table_lobby_create: '+ Create',
  table_lobby_creating: 'Creating...',
  table_lobby_no_tables: 'No tables running',
  table_lobby_connecting: 'Connecting to server...',
  table_lobby_server_unreachable: 'Server is not reachable. Start the server or check your network.',
  table_lobby_create_table: 'Create Table',
  table_lobby_choose_blind: 'Choose blind level',
  table_lobby_max: 'Max:',
  table_lobby_cancel: 'Cancel',
  table_lobby_col_table: 'Table',
  table_lobby_col_stakes: 'Stakes',
  table_lobby_col_players: 'Plrs',

  // Lobby (waiting room)
  lobby_title: 'Lobby',
  lobby_waiting: 'Waiting for players...',
  lobby_starting: 'Starting...',
} as const;

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;

export const translations: Record<Language, Translations> = {
  en,
  fi: {
    // Login
    login_title: 'POKER NIGHT',
    login_subtitle: 'Valitse nimi ja avatar',
    login_name_label: 'NIMI',
    login_name_placeholder: 'Syötä nimesi',
    login_avatar_label: 'AVATAR',
    login_enter_lobby: 'Siirry aulaan',

    // Table Lobby
    table_lobby_title: 'Pöydät',
    table_lobby_playing_as: 'Pelaajana',
    table_lobby_no_connection: 'Ei yhteyttä palvelimeen',
    table_lobby_create: '+ Luo',
    table_lobby_creating: 'Luodaan...',
    table_lobby_no_tables: 'Ei pöytiä',
    table_lobby_connecting: 'Yhdistetään palvelimeen...',
    table_lobby_server_unreachable: 'Palvelin ei vastaa. Käynnistä palvelin tai tarkista verkko.',
    table_lobby_create_table: 'Luo pöytä',
    table_lobby_choose_blind: 'Valitse blinditaso',
    table_lobby_max: 'Max:',
    table_lobby_cancel: 'Peruuta',
    table_lobby_col_table: 'Pöytä',
    table_lobby_col_stakes: 'Panokset',
    table_lobby_col_players: 'Pelj',

    // Lobby (waiting room)
    lobby_title: 'Aula',
    lobby_waiting: 'Odotetaan pelaajia...',
    lobby_starting: 'Alkaa...',
  },
};

export function detectLanguage(): Language {
  // 1. Check localStorage
  const stored = localStorage.getItem('ftp-language');
  if (stored === 'fi' || stored === 'en') return stored;

  // 2. Check browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('fi')) return 'fi';

  // 3. Default to English
  return 'en';
}
