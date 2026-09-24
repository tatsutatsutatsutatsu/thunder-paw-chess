'use client';
/* oxlint-disable next/no-img-element -- The existing small local cat sprite is used as character art. */

import { useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { RotateCcw, Undo2, Zap } from 'lucide-react';
import { autoFoundation, draw, isWon, move, newGame, suits, type Card, type Destination, type Game, type Pile, type Suit } from '@/lib/solitaire/engine';

const suitMark: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const suitName: Record<Suit, string> = { spades: 'スペード', hearts: 'ハート', diamonds: 'ダイヤ', clubs: 'クラブ' };
const rankMark = (rank: number) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[rank as 1 | 11 | 12 | 13] || String(rank);
const sourceId = (source: Pile) => source.kind === 'waste' ? 'waste' : `${source.kind}-${source.index}-${source.kind === 'tableau' ? source.cardIndex : ''}`;
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

function PlayingCard({ card, onClick, onDoubleClick, onDragStart, selected, style }: { card: Card; onClick?: () => void; onDoubleClick?: () => void; onDragStart?: (event: React.DragEvent) => void; selected?: boolean; style?: React.CSSProperties }) {
  const label = card.faceUp ? `${suitName[card.suit]}の${rankMark(card.rank)}` : '裏向きのカード';
  return <button type="button" className={`sol-card ${card.faceUp ? 'face-up' : 'face-down'} ${card.faceUp && (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : ''} ${selected ? 'picked' : ''}`} style={style} aria-label={label} aria-pressed={card.faceUp && selected ? true : undefined} draggable={card.faceUp} onClick={onClick} onDoubleClick={onDoubleClick} onDragStart={onDragStart}>
    {card.faceUp ? <><span className="sol-card-corner">{rankMark(card.rank)}<small>{suitMark[card.suit]}</small></span><span className="sol-card-center">{suitMark[card.suit]}</span></> : <span className="sol-card-bolt"><Zap size={27} fill="currentColor" /></span>}
  </button>;
}

export default function SolitaireGame() {
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const [game, setGame] = useState<Game>(() => newGame());
  const [history, setHistory] = useState<Game[]>([]);
  const [selected, setSelected] = useState<Pile | null>(null);
  const [message, setMessage] = useState('カードを選んで移動先をタップ。ドラッグでも動かせます。');
  const dragging = useRef<Pile | null>(null);
  const won = isWon(game);
  const complete = game.foundations.reduce((sum, pile) => sum + pile.length, 0);

  function commit(next: Game | null, success: string) {
    if (!next) { setMessage('その場所には置けません。'); return false; }
    setHistory((previous) => [...previous, game]);
    setGame(next);
    setSelected(null);
    setMessage(isWon(next) ? '大成功！ 4つの組札が完成しました。' : success);
    return true;
  }
  function choose(source: Pile) {
    if (selected && sourceId(selected) === sourceId(source)) { setSelected(null); return; }
    if (selected && source.kind === 'tableau' && commitMove(selected, { kind: 'tableau', index: source.index })) return;
    setSelected(source);
    setMessage('移動先の列か組札を選んでください。');
  }
  function commitMove(source: Pile, target: Destination) {
    const next = move(game, source, target);
    if (!next) return false;
    return commit(next, 'いい手です！');
  }
  function targetClick(target: Destination) {
    if (selected) commitMove(selected, target);
    else setMessage('まず移動するカードを選んでください。');
  }
  function drop(event: React.DragEvent, target: Destination) {
    event.preventDefault();
    if (dragging.current) commitMove(dragging.current, target);
    dragging.current = null;
  }
  function drag(event: React.DragEvent, source: Pile) {
    dragging.current = source;
    event.dataTransfer.setData('text/plain', sourceId(source));
    event.dataTransfer.effectAllowed = 'move';
  }
  function auto(source: Pile) { commit(autoFoundation(game, source), '組札に置きました。'); }
  function undo() {
    if (!history.length) return;
    setGame(history.at(-1)!);
    setHistory(history.slice(0, -1));
    setSelected(null);
    setMessage('1手戻しました。');
  }
  function restart() {
    setGame(newGame());
    setHistory([]);
    setSelected(null);
    setMessage('新しいゲームを始めました。');
  }
  if (!ready) return <main className="sol-app"><div className="sol-loading"><Zap size={24} fill="currentColor" />カードを配っています…</div></main>;
  return <main className="sol-app">
    <header className="sol-header"><Link href="/" className="sol-brand"><span><Zap size={20} fill="currentColor" /></span>THUNDER PAW</Link><nav aria-label="ゲームを選ぶ"><Link href="/">チェス</Link><span aria-current="page">ソリティア</span></nav></header>
    <div className="sol-intro"><div><p className="sol-eyebrow">THUNDER PAW MINI GAMES · 02</p><h1>電気猫のソリティア</h1><p>ひらめく一手で、4つの組札を完成させよう。</p></div><div className="sol-mascot"><img src="/pieces/king-w.png" alt="電気猫のチェスフィギュア" /><Zap size={28} fill="currentColor" aria-hidden="true" /></div></div>
    <section className="sol-game" aria-label="ソリティアの盤面"><div className="sol-toolbar"><div><strong>{complete} <small>/ 52 枚</small></strong><span>組札に集めたカード</span></div><div className="sol-toolbar-actions"><button onClick={undo} disabled={!history.length}><Undo2 size={17} />1手戻す</button><button onClick={restart}><RotateCcw size={17} />新しいゲーム</button></div></div>
      <output className="sol-message" aria-live="polite">{message}</output>
      <div className="sol-board-scroll"><div className="sol-board"><div className="sol-top-row"><div className="sol-top-left"><div className="sol-pile"><span className="sol-pile-label">山札</span><button className={`sol-slot sol-stock ${game.stock.length ? 'has-cards' : ''}`} onClick={() => commit(draw(game), game.stock.length ? '山札をめくりました。' : '山札を戻しました。')} aria-label={game.stock.length ? `山札をめくる。残り${game.stock.length}枚` : game.waste.length ? '捨て札を山札に戻す' : '山札は空です'} disabled={!game.stock.length && !game.waste.length}>{game.stock.length ? <Zap size={29} fill="currentColor" /> : <RotateCcw size={24} />}</button></div><div className="sol-pile"><span className="sol-pile-label">めくった札</span><div className="sol-slot">{game.waste.length ? <PlayingCard card={game.waste.at(-1)!} selected={selected?.kind === 'waste'} onClick={() => choose({ kind: 'waste' })} onDoubleClick={() => auto({ kind: 'waste' })} onDragStart={(event) => drag(event, { kind: 'waste' })} /> : <span className="sol-empty-symbol">✦</span>}</div></div></div><div className="sol-foundations">{suits.map((suit, index) => <div className="sol-pile" key={suit}><span className="sol-pile-label">組札 {suitMark[suit]}</span><div className="sol-slot" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, { kind: 'foundation', index })}>{game.foundations[index].length ? <PlayingCard card={game.foundations[index].at(-1)!} selected={selected?.kind === 'foundation' && selected.index === index} onClick={() => selected ? targetClick({ kind: 'foundation', index }) : choose({ kind: 'foundation', index })} onDragStart={(event) => drag(event, { kind: 'foundation', index })} /> : <button className="sol-empty-foundation" onClick={() => targetClick({ kind: 'foundation', index })} aria-label={`${suitName[suit]}の組札に置く`}>{suitMark[suit]}</button>}</div></div>)}</div></div>
      <div className="sol-tableau">{game.tableau.map((pile, index) => <div className="sol-pile" key={index}><span className="sol-pile-label">場札 {index + 1}</span><div className="sol-tableau-slot" style={{ height: `max(var(--sol-card-h), calc(${pile.length - 1} * var(--sol-overlap) + var(--sol-card-h)))` }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, { kind: 'tableau', index })}>{pile.length ? pile.map((card, cardIndex) => <PlayingCard key={`${card.suit}-${card.rank}`} card={card} style={{ top: `calc(${cardIndex} * var(--sol-overlap))` }} selected={selected?.kind === 'tableau' && selected.index === index && selected.cardIndex === cardIndex} onClick={() => card.faceUp && choose({ kind: 'tableau', index, cardIndex })} onDoubleClick={() => card.faceUp && auto({ kind: 'tableau', index, cardIndex })} onDragStart={(event) => drag(event, { kind: 'tableau', index, cardIndex })} />) : <button className="sol-empty-tableau" onClick={() => targetClick({ kind: 'tableau', index })} aria-label={`空の場札${index + 1}に置く`}>K</button>}</div></div>)}</div></div></div>
      {won && <div className="sol-win"><Zap size={30} fill="currentColor" /><strong>おめでとう！</strong><span>電気猫とソリティアをクリアしました。</span><button onClick={restart}>もう一度遊ぶ</button></div>}
    </section><aside className="sol-rules"><h2>遊び方</h2><p>赤と黒を交互に、数字が1つ小さくなる順で場札を重ねます。空いた列にはKから置けます。4つの組札はAから同じマークで順番に重ね、すべて集めるとクリアです。</p><p>カードを選んで行き先をタップ。ダブルクリックで組札へ自動で移動します。山札は1枚ずつめくれ、最後までめくったら戻して繰り返し使えます。</p></aside>
    <footer className="sol-footer">THUNDER PAW · 小さな猫たちの、大きなひらめき。</footer>
  </main>;
}
