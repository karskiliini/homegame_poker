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
  { id: 'link', label: 'Link', image: 'avatar-01.png' },
  { id: 'vader', label: 'Vader', image: 'avatar-02.png' },
  { id: 'lincoln', label: 'Lincoln', image: 'avatar-03.png' },
  { id: 'napoleon', label: 'Napoleon', image: 'avatar-04.png' },
  { id: 'einstein', label: 'Einstein', image: 'avatar-05.png' },
  { id: 'doc-brown', label: 'Doc Brown', image: 'avatar-06.png' },
  { id: 'evil-santa', label: 'Evil Santa', image: 'avatar-07.png' },
  { id: 'goblin', label: 'Goblin', image: 'avatar-08.png' },
  { id: 'gnome', label: 'Gnome', image: 'avatar-09.png' },
  // Row 2
  { id: 'princess', label: 'Princess', image: 'avatar-10.png' },
  { id: 'poseidon', label: 'Poseidon', image: 'avatar-11.png' },
  { id: 'gandalf', label: 'Gandalf', image: 'avatar-12.png' },
  { id: 'balrog', label: 'Balrog', image: 'avatar-13.png' },
  { id: 'agent', label: 'Agent', image: 'avatar-14.png' },
  { id: 'punk', label: 'Punk', image: 'avatar-15.png' },
  { id: 'shark', label: 'Shark', image: 'avatar-16.png' },
  { id: 'homer', label: 'Homer', image: 'avatar-17.png' },
  { id: 'bart', label: 'Bart', image: 'avatar-18.png' },
  // Row 3
  { id: 'joker', label: 'Joker', image: 'avatar-19.png' },
  { id: 'batman', label: 'Batman', image: 'avatar-20.png' },
  { id: 'superman', label: 'Superman', image: 'avatar-21.png' },
  { id: 'mummy', label: 'Mummy', image: 'avatar-22.png' },
  { id: 'dracula', label: 'Dracula', image: 'avatar-23.png' },
  { id: 'vampire', label: 'Vampire', image: 'avatar-24.png' },
  { id: 'pharaoh', label: 'Pharaoh', image: 'avatar-25.png' },
  { id: 'yoda', label: 'Yoda', image: 'avatar-26.png' },
  { id: 'hulk', label: 'Hulk', image: 'avatar-27.png' },
  // Row 4
  { id: 'wolverine', label: 'Wolverine', image: 'avatar-28.png' },
  { id: 'sherlock', label: 'Sherlock', image: 'avatar-29.png' },
  { id: 'scared-guy', label: 'Scared Guy', image: 'avatar-30.png' },
  { id: 'angry-guy', label: 'Angry Guy', image: 'avatar-31.png' },
  { id: 'nemo', label: 'Nemo', image: 'avatar-32.png' },
  { id: 'creature', label: 'Creature', image: 'avatar-33.png' },
  { id: 'zombie-cop', label: 'Zombie Cop', image: 'avatar-34.png' },
  { id: 'police', label: 'Police', image: 'avatar-35.png' },
  { id: 'pirate', label: 'Pirate', image: 'avatar-36.png' },
  // Row 5
  { id: 'explorer', label: 'Explorer', image: 'avatar-37.png' },
  { id: 'predator', label: 'Predator', image: 'avatar-38.png' },
  { id: 'private', label: 'Private', image: 'avatar-39.png' },
  { id: 'drill-sergeant', label: 'Drill Sergeant', image: 'avatar-40.png' },
  { id: 'maniac', label: 'Maniac', image: 'avatar-41.png' },
  { id: 'mobster', label: 'Mobster', image: 'avatar-42.png' },
  { id: 'rager', label: 'Rager', image: 'avatar-43.png' },
  { id: 'witch', label: 'Witch', image: 'avatar-44.png' },
  { id: 'hitman', label: 'Hitman', image: 'avatar-45.png' },
  // Row 6
  { id: 'deadpool', label: 'Deadpool', image: 'avatar-46.png' },
  { id: 'cyborg', label: 'Cyborg', image: 'avatar-47.png' },
  { id: 'businessman', label: 'Businessman', image: 'avatar-48.png' },
  { id: 'dealer', label: 'Dealer', image: 'avatar-49.png' },
  { id: 'zombie-orc', label: 'Zombie Orc', image: 'avatar-50.png' },
  { id: 'orc', label: 'Orc', image: 'avatar-51.png' },
  { id: 'professor-x', label: 'Professor X', image: 'avatar-52.png' },
  { id: 'red-hood', label: 'Red Hood', image: 'avatar-53.png' },
  { id: 'gi', label: 'GI', image: 'avatar-54.png' },
];

export const DEFAULT_AVATAR: AvatarId = 'link';
