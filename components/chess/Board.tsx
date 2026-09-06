'use client';
import {useEffect,useRef,useState} from 'react';
import {RotateCcw,Plus,Minus,Box} from 'lucide-react';
import type {Chess,Square,Move} from 'chess.js';
import {characters,colorName} from '@/lib/chess/characters';
import type {createChessScene,BoardState} from '@/lib/chess/three/scene';
type Props={game:Chess;selected:Square|null;legal:Square[];last:Move|null;flipped:boolean;onSquare:(s:Square)=>void;capture:Square|null;disabled:boolean};
export default function Board(props:Props){
 const host=useRef<HTMLDivElement>(null),api=useRef<ReturnType<typeof createChessScene>|null>(null),current=useRef(props);
 const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{current.current=props;api.current?.update(props as BoardState);},[props]);
 useEffect(()=>{
  let cancelled=false;
  import('@/lib/chess/three/scene').then(({createChessScene})=>{if(cancelled||!host.current)return;try{api.current=createChessScene(host.current,s=>current.current.onSquare(s),()=>setFailed(true));api.current.update(current.current);setLoaded(true);setFailed(false);}catch(error){console.error('3D board initialization failed',error);setFailed(true);}}).catch(()=>{if(!cancelled)setFailed(true);});
  return()=>{cancelled=true;api.current?.dispose();api.current=null;};
 },[attempt]);
 const squares=Array.from({length:64},(_,i)=>`${'abcdefgh'[i%8]}${8-Math.floor(i/8)}` as Square);
 return <div className="board3d-container"><div className="board3d" ref={host} data-testid="board-3d" aria-label="3Dチェス盤">
  {!loaded&&!failed&&<div className="three-message">3Dの駒を準備しています…</div>}
  {failed&&<div className="three-message"><p>3D表示を開始できませんでした。</p><p>WebGL 2対応のブラウザでお試しください。</p><button className="primary-button" onClick={()=>{setFailed(false);setLoaded(false);setAttempt(v=>v+1);}}>もう一度読み込む</button></div>}
  {squares.map(s=>{const p=props.game.get(s);return <button key={s} type="button" className="board3d-key-square" data-square={s} aria-label={`${s}${p?` ${colorName(p.color)}の${characters[p.type].name}`:' 空きマス'}${props.legal.includes(s)?' 移動可能':''}`} aria-pressed={props.selected===s} disabled={props.disabled||!loaded||failed} onClick={()=>props.onSquare(s)}>{s}{p?` ${characters[p.type].name}`:''}</button>;})}
 </div><div className="three-controls"><span><Box size={14}/>3D <small>ドラッグで回転・ピンチで拡大</small></span><div><button className="quiet-button" aria-label="縮小" onClick={()=>api.current?.zoom(-.15)}><Minus size={16}/></button><button className="quiet-button" aria-label="拡大" onClick={()=>api.current?.zoom(.15)}><Plus size={16}/></button><button className="quiet-button" aria-label="視点を戻す" onClick={()=>api.current?.resetView()}><RotateCcw size={16}/></button></div></div></div>;
}
