/* oxlint-disable next/no-img-element -- Reuse the game's local character illustrations. */
import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
import { games } from '@/lib/games';
import './home.css';

export default function Home() {
  return <main className="game-home">
    <header className="home-header"><span className="home-brand"><Zap size={22} fill="currentColor" />THUNDER PAW</span><span className="home-header-note">でんきねこのゲームひろば</span></header>
    <section className="home-picker" aria-labelledby="home-title">
      <div className="home-welcome"><div><p>でんきねこと、あそぼう！</p><h1 id="home-title">きょうは、<br />なにしてあそぶ？</h1></div><img className="home-mascot" src="/electric-cat-mark.svg" alt="でんきねこ" /></div>
      <div className="home-game-grid">{games.map((game) => <Link key={game.id} href={game.href} className="home-game-card" style={{ '--game-accent': game.accent, '--game-background': game.background } as React.CSSProperties}>
        <div className="home-game-art"><img src={game.image} alt="" /></div>
        <div className="home-game-copy"><span className="home-game-players">{game.players}</span><h2>{game.title}</h2><p>{game.description}</p><span className="home-game-play">あそぶ<ArrowRight size={22} aria-hidden="true" /></span></div>
      </Link>)}</div>
    </section>
    <footer className="home-footer"><Zap size={16} fill="currentColor" aria-hidden="true" />小さな猫たちの、大きなひらめき。</footer>
  </main>;
}
