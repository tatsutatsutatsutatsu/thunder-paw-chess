import type { Metadata } from 'next';
import SolitaireGame from '@/components/solitaire/SolitaireGame';
import './solitaire.css';

export const metadata: Metadata = {
  title: '電気猫のソリティア | THUNDER PAW',
  description: '電気猫と遊ぶ、1枚めくりのソリティア。場札を並べ替えて4つの組札を完成させよう。',
};

export default function SolitairePage() { return <SolitaireGame />; }
