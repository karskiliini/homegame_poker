export type AvatarId =
  | 'link'
  | 'vader'
  | 'lincoln'
  | 'napoleon'
  | 'einstein'
  | 'doc-brown'
  | 'evil-santa'
  | 'goblin'
  | 'gnome'
  | 'princess'
  | 'poseidon'
  | 'gandalf'
  | 'balrog'
  | 'agent'
  | 'punk'
  | 'shark'
  | 'homer'
  | 'bart'
  | 'joker'
  | 'batman'
  | 'superman'
  | 'mummy'
  | 'dracula'
  | 'vampire'
  | 'pharaoh'
  | 'yoda'
  | 'hulk'
  | 'wolverine'
  | 'sherlock'
  | 'scared-guy'
  | 'angry-guy'
  | 'nemo'
  | 'creature'
  | 'zombie-cop'
  | 'police'
  | 'pirate'
  | 'explorer'
  | 'predator'
  | 'private'
  | 'drill-sergeant'
  | 'maniac'
  | 'mobster'
  | 'rager'
  | 'witch'
  | 'hitman'
  | 'deadpool'
  | 'cyborg'
  | 'businessman'
  | 'dealer'
  | 'zombie-orc'
  | 'orc'
  | 'professor-x'
  | 'red-hood'
  | 'gi';

export interface AvatarOption {
  id: AvatarId;
  label: string;
  image: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  // Row 1
  { id: 'link', label: 'Link', image: '/avatars/avatar-01.png' },
  { id: 'vader', label: 'Vader', image: '/avatars/avatar-02.png' },
  { id: 'lincoln', label: 'Lincoln', image: '/avatars/avatar-03.png' },
  { id: 'napoleon', label: 'Napoleon', image: '/avatars/avatar-04.png' },
  { id: 'einstein', label: 'Einstein', image: '/avatars/avatar-05.png' },
  { id: 'doc-brown', label: 'Doc Brown', image: '/avatars/avatar-06.png' },
  { id: 'evil-santa', label: 'Evil Santa', image: '/avatars/avatar-07.png' },
  { id: 'goblin', label: 'Goblin', image: '/avatars/avatar-08.png' },
  { id: 'gnome', label: 'Gnome', image: '/avatars/avatar-09.png' },
  // Row 2
  { id: 'princess', label: 'Princess', image: '/avatars/avatar-10.png' },
  { id: 'poseidon', label: 'Poseidon', image: '/avatars/avatar-11.png' },
  { id: 'gandalf', label: 'Gandalf', image: '/avatars/avatar-12.png' },
  { id: 'balrog', label: 'Balrog', image: '/avatars/avatar-13.png' },
  { id: 'agent', label: 'Agent', image: '/avatars/avatar-14.png' },
  { id: 'punk', label: 'Punk', image: '/avatars/avatar-15.png' },
  { id: 'shark', label: 'Shark', image: '/avatars/avatar-16.png' },
  { id: 'homer', label: 'Homer', image: '/avatars/avatar-17.png' },
  { id: 'bart', label: 'Bart', image: '/avatars/avatar-18.png' },
  // Row 3
  { id: 'joker', label: 'Joker', image: '/avatars/avatar-19.png' },
  { id: 'batman', label: 'Batman', image: '/avatars/avatar-20.png' },
  { id: 'superman', label: 'Superman', image: '/avatars/avatar-21.png' },
  { id: 'mummy', label: 'Mummy', image: '/avatars/avatar-22.png' },
  { id: 'dracula', label: 'Dracula', image: '/avatars/avatar-23.png' },
  { id: 'vampire', label: 'Vampire', image: '/avatars/avatar-24.png' },
  { id: 'pharaoh', label: 'Pharaoh', image: '/avatars/avatar-25.png' },
  { id: 'yoda', label: 'Yoda', image: '/avatars/avatar-26.png' },
  { id: 'hulk', label: 'Hulk', image: '/avatars/avatar-27.png' },
  // Row 4
  { id: 'wolverine', label: 'Wolverine', image: '/avatars/avatar-28.png' },
  { id: 'sherlock', label: 'Sherlock', image: '/avatars/avatar-29.png' },
  { id: 'scared-guy', label: 'Scared Guy', image: '/avatars/avatar-30.png' },
  { id: 'angry-guy', label: 'Angry Guy', image: '/avatars/avatar-31.png' },
  { id: 'nemo', label: 'Nemo', image: '/avatars/avatar-32.png' },
  { id: 'creature', label: 'Creature', image: '/avatars/avatar-33.png' },
  { id: 'zombie-cop', label: 'Zombie Cop', image: '/avatars/avatar-34.png' },
  { id: 'police', label: 'Police', image: '/avatars/avatar-35.png' },
  { id: 'pirate', label: 'Pirate', image: '/avatars/avatar-36.png' },
  // Row 5
  { id: 'explorer', label: 'Explorer', image: '/avatars/avatar-37.png' },
  { id: 'predator', label: 'Predator', image: '/avatars/avatar-38.png' },
  { id: 'private', label: 'Private', image: '/avatars/avatar-39.png' },
  { id: 'drill-sergeant', label: 'Drill Sergeant', image: '/avatars/avatar-40.png' },
  { id: 'maniac', label: 'Maniac', image: '/avatars/avatar-41.png' },
  { id: 'mobster', label: 'Mobster', image: '/avatars/avatar-42.png' },
  { id: 'rager', label: 'Rager', image: '/avatars/avatar-43.png' },
  { id: 'witch', label: 'Witch', image: '/avatars/avatar-44.png' },
  { id: 'hitman', label: 'Hitman', image: '/avatars/avatar-45.png' },
  // Row 6
  { id: 'deadpool', label: 'Deadpool', image: '/avatars/avatar-46.png' },
  { id: 'cyborg', label: 'Cyborg', image: '/avatars/avatar-47.png' },
  { id: 'businessman', label: 'Businessman', image: '/avatars/avatar-48.png' },
  { id: 'dealer', label: 'Dealer', image: '/avatars/avatar-49.png' },
  { id: 'zombie-orc', label: 'Zombie Orc', image: '/avatars/avatar-50.png' },
  { id: 'orc', label: 'Orc', image: '/avatars/avatar-51.png' },
  { id: 'professor-x', label: 'Professor X', image: '/avatars/avatar-52.png' },
  { id: 'red-hood', label: 'Red Hood', image: '/avatars/avatar-53.png' },
  { id: 'gi', label: 'GI', image: '/avatars/avatar-54.png' },
];

export const DEFAULT_AVATAR: AvatarId = 'link';
