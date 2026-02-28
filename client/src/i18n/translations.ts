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

  // Watching
  watching_back: 'Back',
  watching_sit_down: 'Sit Down',
  watching_buy_in: 'Buy In',
  watching_confirm: 'Confirm',
  watching_cancel: 'Cancel',
  watching_connecting: 'Connecting...',

  // Game
  game_leave_table: 'Leave Table',
  game_connecting: 'Connecting to table...',
  game_stack: 'Stack',
  game_pot: 'Pot:',
  game_waiting_cards: 'Waiting for cards...',
  game_sitting_out: 'Sitting Out',
  game_busted: 'Busted',
  game_rebuy: 'Rebuy',
  game_sit_out: 'Sit Out',
  game_sit_in: 'Sit In',
  game_folded: 'Folded',
  game_waiting_turn: 'Waiting for your turn...',
  game_hand_history: 'Hand History',

  // Action buttons (poker terms stay in English)
  action_fold: 'FOLD',
  action_check: 'CHECK',
  action_call: 'CALL',
  action_bet: 'BET',
  action_raise: 'RAISE',
  action_all_in: 'ALL IN',
  action_min: 'Min',
  action_half_pot: '1/2 Pot',
  action_pot: 'Pot',
  action_all_in_preset: 'All-in',

  // Pre-action buttons
  preaction_fold_to_bet: 'Fold to any bet',
  preaction_check: 'Check',

  // Rebuy prompt
  rebuy_title: 'Chips finished!',
  rebuy_subtitle: 'Rebuy or sit out?',
  rebuy_button: 'Rebuy',
  rebuy_sit_out: 'Sit Out',

  // Show cards prompt
  show_cards_question: 'Show your cards?',
  show_cards_muck: 'Muck',
  show_cards_show: 'Show',

  // Run it twice
  rit_title: 'Run It Twice?',
  rit_description: 'All players are all-in. Deal the remaining cards twice and split the pot?',
  rit_yes: 'Yes',
  rit_no: 'No',
  rit_always_no: "Always No (don't ask again)",

  // Hand history
  history_title: 'Hand History',
  history_no_hands: 'No hands played yet',
  history_players: 'players',
  history_back: 'Back',
  history_prev: 'Prev',
  history_next: 'Next',
  history_hand: 'Hand',
  history_results: 'RESULTS',
  history_board: 'Board',
  history_board_1: 'Board 1',
  history_board_2: 'Board 2',
  history_seat: 'Seat',
  history_wins_from: 'wins',
  history_from: 'from',

  // Hand history actions
  history_folds: 'folds',
  history_checks: 'checks',
  history_calls: 'calls',
  history_bets: 'bets',
  history_raises_to: 'raises to',
  history_goes_all_in: 'goes all-in',

  // Bug report
  bug_report_title: 'Report a Bug',
  bug_report_placeholder: 'Describe the bug...',
  bug_report_cancel: 'Cancel',
  bug_report_send: 'Send',
  bug_report_thanks: 'Thanks!',
  bug_report_sent: 'Bug report sent.',
  bug_report_button: 'BUG',

  // Sound toggle
  sound_mute: 'Mute sounds',
  sound_unmute: 'Unmute sounds',
  sound_volume: 'Volume',
  sound_category_cards: 'Cards',
  sound_category_chips: 'Chips',
  sound_category_actions: 'Actions',
  sound_category_notifications: 'Notifications',

  // Poker table
  table_waiting: 'Waiting for players...',
  table_seat: 'Seat',
  table_sit_in: 'Sit In',
  table_total_pot: 'Total Pot',
  table_side_pot: 'Side Pot',

  // Chat
  chat_placeholder: 'Type a message...',
  chat_send: 'Send',
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
    login_name_placeholder: 'Syota nimesi',
    login_avatar_label: 'AVATAR',
    login_enter_lobby: 'Siirry aulaan',

    // Table Lobby
    table_lobby_title: 'Poydat',
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
    table_lobby_col_table: 'Poyta',
    table_lobby_col_stakes: 'Panokset',
    table_lobby_col_players: 'Pelj',

    // Lobby (waiting room)
    lobby_title: 'Aula',
    lobby_waiting: 'Odotetaan pelaajia...',
    lobby_starting: 'Alkaa...',

    // Watching
    watching_back: 'Takaisin',
    watching_sit_down: 'Istu poytaan',
    watching_buy_in: 'Osta sisaan',
    watching_confirm: 'Vahvista',
    watching_cancel: 'Peruuta',
    watching_connecting: 'Yhdistetaan...',

    // Game
    game_leave_table: 'Poistu poydasta',
    game_connecting: 'Yhdistetaan poytaan...',
    game_stack: 'Pino',
    game_pot: 'Potti:',
    game_waiting_cards: 'Odotetaan kortteja...',
    game_sitting_out: 'Tauolla',
    game_busted: 'Pelimerkit loppu',
    game_rebuy: 'Rebuy',
    game_sit_out: 'Tauko',
    game_sit_in: 'Pelaa',
    game_folded: 'Folded',
    game_waiting_turn: 'Odotetaan vuoroasi...',
    game_hand_history: 'Kasihistoria',

    // Action buttons (poker terms stay in English)
    action_fold: 'FOLD',
    action_check: 'CHECK',
    action_call: 'CALL',
    action_bet: 'BET',
    action_raise: 'RAISE',
    action_all_in: 'ALL IN',
    action_min: 'Min',
    action_half_pot: '1/2 Pot',
    action_pot: 'Pot',
    action_all_in_preset: 'All-in',

    // Pre-action buttons
    preaction_fold_to_bet: 'Fold mihin tahansa',
    preaction_check: 'Check',

    // Rebuy prompt
    rebuy_title: 'Pelimerkit loppu!',
    rebuy_subtitle: 'Rebuy vai tauko?',
    rebuy_button: 'Rebuy',
    rebuy_sit_out: 'Tauko',

    // Show cards prompt
    show_cards_question: 'Nayta korttisi?',
    show_cards_muck: 'Muck',
    show_cards_show: 'Nayta',

    // Run it twice
    rit_title: 'Run It Twice?',
    rit_description: 'Kaikki ovat all-in. Jaetaanko loput kortit kahdesti ja jaetaan potti?',
    rit_yes: 'Kylla',
    rit_no: 'Ei',
    rit_always_no: 'Aina ei (ala kysy uudelleen)',

    // Hand history
    history_title: 'Kasihistoria',
    history_no_hands: 'Ei pelattuja kasia',
    history_players: 'pelaajaa',
    history_back: 'Takaisin',
    history_prev: 'Edellinen',
    history_next: 'Seuraava',
    history_hand: 'Kasi',
    history_results: 'TULOKSET',
    history_board: 'Poyta',
    history_board_1: 'Poyta 1',
    history_board_2: 'Poyta 2',
    history_seat: 'Paikka',
    history_wins_from: 'voittaa',
    history_from: 'potista',

    // Hand history actions
    history_folds: 'foldaa',
    history_checks: 'checkkaa',
    history_calls: 'callaa',
    history_bets: 'bettaa',
    history_raises_to: 'raisee',
    history_goes_all_in: 'menee all-in',

    // Bug report
    bug_report_title: 'Ilmoita bugi',
    bug_report_placeholder: 'Kuvaile bugi...',
    bug_report_cancel: 'Peruuta',
    bug_report_send: 'Laheta',
    bug_report_thanks: 'Kiitos!',
    bug_report_sent: 'Bugi-ilmoitus lahetetty.',
    bug_report_button: 'BUG',

    // Sound toggle
    sound_mute: 'Mykista aanet',
    sound_unmute: 'Aanet paalle',
    sound_volume: 'Aanenvoimakkuus',
    sound_category_cards: 'Kortit',
    sound_category_chips: 'Pelimerkit',
    sound_category_actions: 'Toiminnot',
    sound_category_notifications: 'Ilmoitukset',

    // Poker table
    table_waiting: 'Odotetaan pelaajia...',
    table_seat: 'Paikka',
    table_sit_in: 'Istu',
    table_total_pot: 'Kokonaispotti',
    table_side_pot: 'Sivupotti',

    // Chat
    chat_placeholder: 'Kirjoita viesti...',
    chat_send: 'Laheta',
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
