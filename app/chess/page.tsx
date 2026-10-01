import type { Metadata } from 'next';
import ChessGame from '@/components/chess/ChessGame';

export const metadata: Metadata = {
  title: '電気猫のチェス | THUNDER PAW',
  description: '猫のコマで遊ぶチェス。ひとりでCPU対戦、ふたりで対戦、離れた友だちとオンライン対戦を楽しめます。',
};

export default function ChessPage() { return <ChessGame />; }
