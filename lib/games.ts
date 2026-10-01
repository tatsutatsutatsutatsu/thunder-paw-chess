export interface GameEntry {
  id: string;
  title: string;
  href: string;
  description: string;
  players: string;
  image: string;
  accent: string;
  background: string;
}

// A new entry appears on the home screen and in every game's navigation.
// Create its page at the corresponding href before adding it here.
export const games: readonly GameEntry[] = [
  {
    id: 'chess',
    title: 'チェス',
    href: '/chess',
    description: '猫のコマで、王さまをつかまえよう！',
    players: 'ひとりでも、ふたりでも',
    image: '/pieces/king-w.png',
    accent: '#4b6350',
    background: '#e3efdf',
  },
  {
    id: 'solitaire',
    title: 'ソリティア',
    href: '/solitaire',
    description: 'カードをならべて、ぜんぶあつめよう！',
    players: 'ひとりでじっくり',
    image: '/cards/cat-hearts-k.png',
    accent: '#a43c32',
    background: '#ffe7dc',
  },
];
