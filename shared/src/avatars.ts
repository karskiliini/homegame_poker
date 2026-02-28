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
  | 'cowboy'
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
  | 'ironman'
  | 'wolverine'
  | 'medusa'
  | 'sherlock'
  | 'scared-guy'
  | 'angry-guy'
  | 'hitman'
  | 'mobster'
  | 'boss';

export interface AvatarOption {
  id: AvatarId;
  label: string;
  image: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'link', label: 'Link', image: '/avatars/avatar-01.png' },
  { id: 'vader', label: 'Vader', image: '/avatars/avatar-02.png' },
  { id: 'lincoln', label: 'Lincoln', image: '/avatars/avatar-03.png' },
  { id: 'napoleon', label: 'Napoleon', image: '/avatars/avatar-04.png' },
  { id: 'einstein', label: 'Einstein', image: '/avatars/avatar-05.png' },
  { id: 'doc-brown', label: 'Doc Brown', image: '/avatars/avatar-06.png' },
  { id: 'evil-santa', label: 'Evil Santa', image: '/avatars/avatar-07.png' },
  { id: 'goblin', label: 'Goblin', image: '/avatars/avatar-08.png' },
  { id: 'gnome', label: 'Gnome', image: '/avatars/avatar-09.png' },
  { id: 'princess', label: 'Princess', image: '/avatars/avatar-10.png' },
  { id: 'poseidon', label: 'Poseidon', image: '/avatars/avatar-11.png' },
  { id: 'gandalf', label: 'Gandalf', image: '/avatars/avatar-12.png' },
  { id: 'balrog', label: 'Balrog', image: '/avatars/avatar-13.png' },
  { id: 'agent', label: 'Agent', image: '/avatars/avatar-14.png' },
  { id: 'punk', label: 'Punk', image: '/avatars/avatar-15.png' },
  { id: 'shark', label: 'Shark', image: '/avatars/avatar-16.png' },
  { id: 'cowboy', label: 'Cowboy', image: '/avatars/avatar-17.png' },
  { id: 'homer', label: 'Homer', image: '/avatars/avatar-18.png' },
  { id: 'bart', label: 'Bart', image: '/avatars/avatar-19.png' },
  { id: 'joker', label: 'Joker', image: '/avatars/avatar-20.png' },
  { id: 'batman', label: 'Batman', image: '/avatars/avatar-21.png' },
  { id: 'superman', label: 'Superman', image: '/avatars/avatar-22.png' },
  { id: 'mummy', label: 'Mummy', image: '/avatars/avatar-23.png' },
  { id: 'dracula', label: 'Dracula', image: '/avatars/avatar-24.png' },
  { id: 'vampire', label: 'Vampire', image: '/avatars/avatar-25.png' },
  { id: 'pharaoh', label: 'Pharaoh', image: '/avatars/avatar-26.png' },
  { id: 'yoda', label: 'Yoda', image: '/avatars/avatar-27.png' },
  { id: 'ironman', label: 'Iron Man', image: '/avatars/avatar-28.png' },
  { id: 'wolverine', label: 'Wolverine', image: '/avatars/avatar-29.png' },
  { id: 'medusa', label: 'Medusa', image: '/avatars/avatar-30.png' },
  { id: 'sherlock', label: 'Sherlock', image: '/avatars/avatar-31.png' },
  { id: 'scared-guy', label: 'Scared Guy', image: '/avatars/avatar-32.png' },
  { id: 'angry-guy', label: 'Angry Guy', image: '/avatars/avatar-33.png' },
  { id: 'hitman', label: 'Hitman', image: '/avatars/avatar-34.png' },
  { id: 'mobster', label: 'Mobster', image: '/avatars/avatar-35.png' },
  { id: 'boss', label: 'The Boss', image: '/avatars/avatar-36.png' },
];

export const DEFAULT_AVATAR: AvatarId = 'link';

