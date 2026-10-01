import Link from 'next/link';
import { House } from 'lucide-react';
import { games } from '@/lib/games';

export default function GameNavigation({ current }: { current: string }) {
  return <nav className="game-nav" aria-label="ゲームを選ぶ">
    <Link href="/"><House size={16} aria-hidden="true" />ホーム</Link>
    {games.map((game) => game.id === current
      ? <span key={game.id} aria-current="page">{game.title}</span>
      : <Link key={game.id} href={game.href}>{game.title}</Link>)}
  </nav>;
}
