export type SoundType =
  | 'card_deal'
  | 'card_flip'
  | 'chip_bet'
  | 'chip_win'
  | 'check'
  | 'fold'
  | 'all_in'
  | 'timer_warning'
  | 'your_turn';

export type SoundCategory = 'cards' | 'chips' | 'actions' | 'notifications';

export const ALL_SOUND_CATEGORIES: SoundCategory[] = ['cards', 'chips', 'actions', 'notifications'];

export const SOUND_CATEGORIES: Record<SoundType, SoundCategory> = {
  card_deal: 'cards',
  card_flip: 'cards',
  chip_bet: 'chips',
  chip_win: 'chips',
  check: 'actions',
  fold: 'actions',
  all_in: 'actions',
  timer_warning: 'notifications',
  your_turn: 'notifications',
};
