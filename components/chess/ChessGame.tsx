'use client';
/* oxlint-disable next/no-img-element -- Small pre-sized local alpha sprites are reused across the board without an image service. */

import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Chess,type Square,type Move,type PieceSymbol,type Color} from 'chess.js';
import {ArrowDownUp,Plus,Users,Monitor,ChevronRight,Flag,BookOpen,RotateCcw,Zap} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {characters,pieceImage,colorName} from '@/lib/chess/characters';
import {chooseCpuMove,gameResult} from '@/lib/chess/engine';
import Board from './Board';
type Mode='cpu'|'local';
const subscribeReady=()=>()=>{};
const clientReady=()=>true;
const serverReady=()=>false;
export default function ChessGame(){
 const ready=useSyncExternalStore(subscribeReady,clientReady,serverReady);
 const [game,setGame]=useState(()=>new Chess());
 const [revision,setRevision]=useState(0),[started,setStarted]=useState(false),[mode,setMode]=useState<Mode>('cpu'),[draftMode,setDraftMode]=useState<Mode>('cpu');
 const [selected,setSelected]=useState<Square|null>(null),[flipped,setFlipped]=useState(false),[last,setLast]=useState<Move|null>(null),[capture,setCapture]=useState<Square|null>(null);
 const [promotion,setPromotion]=useState<{from:Square;to:Square}|null>(null),[dialog,setDialog]=useState<'new'|'rules'|'draw'|null>(null),[agreedDraw,setAgreedDraw]=useState(false);
 const [notice,setNotice]=useState('');
 const history=game.history({verbose:true});const result=agreedDraw?'引き分け — 両者の合意':gameResult(game);
 const thinking=started&&mode==='cpu'&&game.turn()==='b'&&!result&&dialog!=='new';
 const legal=selected?game.moves({square:selected,verbose:true}).map(m=>m.to):[];
 const selectedPiece=selected?game.get(selected):null;
 const moveLog=useRef<HTMLDivElement>(null);
 const makeMove=useCallback((move:{from:Square;to:Square;promotion?:string})=>{
  try{const next=new Chess();next.loadPgn(game.pgn());const m=next.move(move);setGame(next);setLast(m);setSelected(null);setPromotion(null);setNotice('');setCapture(m.captured?m.to:null);setRevision(r=>r+1);}catch{setNotice('そのマスには移動できません。');}
 },[game]);
 useEffect(()=>{if(!capture)return;const t=setTimeout(()=>setCapture(null),650);return()=>clearTimeout(t);},[capture,revision]);
 useEffect(()=>{
  if(!thinking)return;
  let cancelled=false;
  const timer=setTimeout(()=>{const isolated=new Chess();isolated.loadPgn(game.pgn());const m=chooseCpuMove(isolated);if(!cancelled&&m)makeMove(m);},420);
  return()=>{cancelled=true;clearTimeout(timer);};
 },[thinking,game,makeMove]);
 useEffect(()=>{if(moveLog.current)moveLog.current.scrollTop=moveLog.current.scrollHeight;},[revision]);
 function start(){setGame(new Chess());setMode(draftMode);setStarted(true);setSelected(null);setLast(null);setCapture(null);setPromotion(null);setAgreedDraw(false);setNotice('');setDialog(null);setRevision(r=>r+1);}
 function select(square:Square){
  if(!started||result||promotion||thinking||(mode==='cpu'&&game.turn()==='b'))return;
  const p=game.get(square);
  if(p?.color===game.turn()){setSelected(selected===square?null:square);setNotice('');return;}
  if(selected&&legal.includes(square)){
   const options=game.moves({square:selected,verbose:true}).filter(m=>m.to===square);
   if(options.some(m=>m.promotion))setPromotion({from:selected,to:square});else makeMove({from:selected,to:square});
  }else{setSelected(null);setNotice('自分の駒を選んでください。');}
 }
 function player(color:Color){const active=started&&!result&&game.turn()===color;const taken=history.filter(m=>m.color===color&&m.captured);return <div className={`player-strip ${active?'active':''}`}>
  <span className={`side-chip ${color}`}><img src={pieceImage('k',color)} alt=""/></span>
  <div><strong>{color==='w'?'アイボリー':'チャコール'}</strong><span>{color==='w'?'白の駒':mode==='cpu'?'黒の駒 · CPU 初級':'黒の駒'}</span></div>
  <div className="captured" aria-label={`${colorName(color)}が取った駒`}>{taken.map((m,i)=><img key={i} src={pieceImage(m.captured!,color==='w'?'b':'w')} title={characters[m.captured!].name} alt={characters[m.captured!].name}/>)}</div>
  {active&&<span className="turn-pill">{thinking?'考え中':'手番'}</span>}
 </div>;}
 const setup=<><p className="eyebrow">対局の準備</p><h2>猫たちの一局を、<br/>はじめましょう。</h2><RadioGroup value={draftMode} onValueChange={v=>setDraftMode(v as Mode)} className="mode-options" aria-label="対戦モード">
  <label htmlFor="mode-cpu" className={draftMode==='cpu'?'chosen':''}><RadioGroupItem id="mode-cpu" value="cpu"/><Monitor size={20}/><span><strong>CPUと対戦</strong><small>あなたは白の駒 · 初級</small></span></label>
  <label htmlFor="mode-local" className={draftMode==='local'?'chosen':''}><RadioGroupItem id="mode-local" value="local"/><Users size={20}/><span><strong>ふたりで対戦</strong><small>同じ端末で交互に操作</small></span></label>
 </RadioGroup><button className="primary-button" disabled={!ready} onClick={start}>{ready?'対局をはじめる':'読み込み中…'}<ChevronRight size={18}/></button><p className="setup-note">時間制限なし。白の駒から始まります。</p></>;
 return <main className="chess-app">
  <header className="site-header"><div className="wordmark" aria-label="THUNDER PAW CHESS"><span className="brand-icon"><Zap size={21} fill="currentColor"/></span><span>THUNDER PAW <b>CHESS</b></span></div><button className="quiet-button" onClick={()=>setDialog('rules')}><BookOpen size={17}/><span>遊び方</span></button></header>
  <div className="game-layout"><section className="play-area" aria-label="対局エリア"><div className="board-heading"><h1>猫たちのチェス盤</h1><span>{started?(mode==='cpu'?'CPU対戦 · 初級':'ふたりで対戦'):'対局前'}</span></div>
   {player(flipped?'w':'b')}
   <div className="board-frame"><Board game={game} selected={selected} legal={legal} last={last} flipped={flipped} onSquare={select} capture={capture} disabled={!started||!!result||thinking||!!promotion}/></div>
   {player(flipped?'b':'w')}
   <div className="board-toolbar"><span><i className="legend-dot"/>移動できるマス</span><button onClick={()=>setFlipped(v=>!v)} className="quiet-button"><ArrowDownUp size={17}/>盤面を反転</button></div>
  </section>
  <aside className="game-panel">
   {!started?<section className="setup-panel">{setup}</section>:<>
    <section className={`status-panel ${game.isCheck()&&!result?'check-status':''} ${result?'finished':''}`} aria-live="polite"><p className="eyebrow">{result?'対局終了':thinking?'CPUが考えています':'現在の手番'}</p><h2 data-testid="status">{result||`${colorName(game.turn())}の番です`}</h2><p>{result?'猫たちに、次の一局を。':game.isCheck()?'チェック！ キングを守ってください。':thinking?'チャコールの猫が次の一手を選んでいます。':'駒を選び、光るマスをタップ。'}</p></section>
    <section className="selection-panel" aria-live="polite">{selectedPiece?<><img src={pieceImage(selectedPiece.type,selectedPiece.color)} alt=""/><div><small>{selected} · {colorName(selectedPiece.color)}の駒</small><h3>{characters[selectedPiece.type].name}</h3><p>{characters[selectedPiece.type].hint}</p></div></>:<><span className="selection-symbol"><Zap size={22}/></span><div><h3>{notice||'一手ずつ、じっくりと。'}</h3><p>駒を選ぶと、名前と動き方を表示します。</p></div></>}</section>
    <section className="history-panel"><div className="section-label"><h3>棋譜</h3><span>{history.length} 手</span></div><div className="move-columns"><span>#</span><span>白</span><span>黒</span></div><div className="move-list" ref={moveLog} data-testid="move-list">{history.length===0?<p className="empty-history">最初の一手を待っています。</p>:Array.from({length:Math.ceil(history.length/2)},(_,i)=><div className="move-row" key={i}><span>{i+1}.</span>{[history[i*2],history[i*2+1]].map((m,j)=><span className={m===history.at(-1)?'latest':''} key={j} title={m?`${characters[m.piece].name} ${m.from} → ${m.to}`:''}>{m?.san||'—'}</span>)}</div>)}</div></section>
    <div className="game-actions"><button className="primary-button" onClick={()=>{setDraftMode(mode);setDialog('new');}}><Plus size={18}/>新しい対局</button>{mode==='local'&&!result&&<button className="quiet-button" onClick={()=>setDialog('draw')}><Flag size={16}/>引き分けを提案</button>}</div>
   </>}
   <div className="collection-note"><span>✦</span><p>小さな猫たちの、大きな一手。</p></div>
  </aside></div>
  <footer className="site-footer"><span>THUNDER PAW CHESS</span><span>時間を忘れて、ひと勝負。</span></footer>
  <Dialog open={!!promotion} onOpenChange={()=>{}}><DialogContent showCloseButton={false} className="game-dialog promotion-dialog"><DialogTitle>ポーンを昇格</DialogTitle><DialogDescription>新しい駒を選んでください。</DialogDescription><div className="promotion-options">{(['q','r','b','n'] as PieceSymbol[]).map(p=><button key={p} onClick={()=>promotion&&makeMove({...promotion,promotion:p})}><img src={pieceImage(p,game.turn())} alt=""/><span>{characters[p].name}</span></button>)}</div></DialogContent></Dialog>
  <Dialog open={dialog!==null} onOpenChange={open=>{if(!open)setDialog(null);}}><DialogContent showCloseButton={false} className="game-dialog">
   {dialog==='new'?<><DialogTitle>新しい対局</DialogTitle><DialogDescription>今の対局を終了し、初期配置から始めます。</DialogDescription>{setup}<button className="quiet-button centered" onClick={()=>setDialog(null)}><RotateCcw size={16}/>今の対局に戻る</button></>:dialog==='draw'?<><DialogTitle>引き分けにしますか？</DialogTitle><DialogDescription>相手の方が同意したら「同意して終了」を押してください。</DialogDescription><button className="primary-button" onClick={()=>{setAgreedDraw(true);setSelected(null);setDialog(null);}}>同意して終了</button><button className="quiet-button centered" onClick={()=>setDialog(null)}>対局を続ける</button></>:<><DialogTitle>遊び方</DialogTitle><DialogDescription>猫を選んで、移動先をタップ。ドラッグで視点を回せます。</DialogDescription><div className="rules-text"><p>白が先手です。金色の枠は選択中の駒、丸い印は合法手、淡い金色のマスは直前の一手です。チェック中のキングは赤く光ります。</p><p>相手のキングを逃げられないチェックにすると勝ち。自分のキングをチェックにさらす手は指せません。</p><p>キャスリングはキングを2マス横に移動。アンパッサンは直前に2マス進んだポーンに対してのみ可能です。最終段に届いたポーンは4種類から昇格先を選べます。</p><p>ステイルメイト、戦力不足、同一局面3回、50手ルールで引き分け。3回反復と50手は自動適用します。2人対戦では合意による引き分けも可能です。</p><p>棋譜は標準のSAN表記です。K=キング、Q=クイーン、R=ルーク、B=ビショップ、N=ナイト、x=捕獲、+=チェック、#=メイト。</p></div><button className="primary-button" onClick={()=>setDialog(null)}>盤面に戻る</button></>}
  </DialogContent></Dialog>
 </main>;
}



