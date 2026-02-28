export type AvatarId =
  | 'ninja'
  | 'cowgirl'
  | 'robot'
  | 'pirate'
  | 'wizard'
  | 'alien'
  | 'viking'
  | 'detective'
  | 'astronaut'
  | 'chef'
  | 'samurai'
  | 'vampire';

export interface AvatarOption {
  id: AvatarId;
  label: string;
  emoji: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'ninja', label: 'Ninja', emoji: '\u{1F977}' },
  { id: 'cowgirl', label: 'Cowgirl', emoji: '\u{1F920}' },
  { id: 'robot', label: 'Robot', emoji: '\u{1F916}' },
  { id: 'pirate', label: 'Pirate', emoji: '\u{1F3F4}\u{200D}\u{2620}\u{FE0F}' },
  { id: 'wizard', label: 'Wizard', emoji: '\u{1F9D9}' },
  { id: 'alien', label: 'Alien', emoji: '\u{1F47D}' },
  { id: 'viking', label: 'Viking', emoji: '\u{1F9D4}' },
  { id: 'detective', label: 'Detective', emoji: '\u{1F575}\u{FE0F}' },
  { id: 'astronaut', label: 'Astronaut', emoji: '\u{1F468}\u{200D}\u{1F680}' },
  { id: 'chef', label: 'Chef', emoji: '\u{1F468}\u{200D}\u{1F373}' },
  { id: 'samurai', label: 'Samurai', emoji: '\u{2694}\u{FE0F}' },
  { id: 'vampire', label: 'Vampire', emoji: '\u{1F9DB}' },
];

export const AVATAR_BACKGROUNDS: Record<AvatarId, [string, string]> = {
  ninja: ['#1A1A2E', '#16213E'],
  cowgirl: ['#8B4513', '#A0522D'],
  robot: ['#2C3E50', '#34495E'],
  pirate: ['#2C1810', '#4A2820'],
  wizard: ['#4A148C', '#6A1B9A'],
  alien: ['#1B5E20', '#2E7D32'],
  viking: ['#3E2723', '#5D4037'],
  detective: ['#263238', '#37474F'],
  astronaut: ['#0D47A1', '#1565C0'],
  chef: ['#BF360C', '#E64A19'],
  samurai: ['#B71C1C', '#C62828'],
  vampire: ['#311B92', '#4527A0'],
};

export const DEFAULT_AVATAR: AvatarId = 'ninja';
