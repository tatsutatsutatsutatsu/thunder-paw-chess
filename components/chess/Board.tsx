'use client';
import {useRef,useLayoutEffect,type CSSProperties} from 'react';
import type {Chess,Square,Move} from 'chess.js';
import {characters,colorName,pieceImage} from '@/lib/chess/characters';
const point=(col:number,row:number)=>({x:6-row*.75+col*(88+row*1.5)/8,y:3+row*11.6});
export function position(square:Square,flipped:boolean){let c=square.charCodeAt(0)-97,r=8-Number(square[1]);if(flipped){c=7-c;r=7-r;}return{...point(c+.5,r+.5),row:r};}
export default function Board({game,selected,legal,last,flipped,onSquare,capture,disabled}:{game:Chess;selected:Square|null;legal:Square[];last:Move|null;flipped:boolean;onSquare:(s:Square)=>void;capture:Square|null;disabled:boolean}){
 const root=useRef<HTMLDivElement>(null);
 const squares=Array.from({length:64},(_,i)=>`${'abcdefgh'[i%8]}${8-Math.floor(i/8)}` as Square);
 useLayoutEffect(()=>{
  if(!last||!root.current||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const animate=(from:Square,to:Square)=>{
   const a=position(from,flipped),b=position(to,flipped),el=root.current?.querySelector(`[data-piece="${to}"]`);
   if(el)el.animate([{transform:`translate(${(a.x-b.x)/11*100}%, ${(a.y-b.y)/12*100}%)`},{transform:'translate(0,0)'}],{duration:230,easing:'cubic-bezier(.2,.7,.3,1)'});
  };animate(last.from,last.to);
  if(last.flags.includes('k'))animate(`h${last.from[1]}` as Square,`f${last.from[1]}` as Square);
  if(last.flags.includes('q'))animate(`a${last.from[1]}` as Square,`d${last.from[1]}` as Square);
 },[last,flipped]);
 return <div className="board" ref={root} aria-label="チェス盤">
  <svg className="board-stone" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
   <defs><filter id="stone"><feTurbulence type="fractalNoise" baseFrequency=".32" numOctaves="3" seed="8"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".09"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter></defs>
   <path d="M5 3H95L100 96V98H0V96Z" fill="#665943"/>
   <g filter="url(#stone)">{squares.map(s=>{const {row}=position(s,flipped);let c=s.charCodeAt(0)-97;if(flipped)c=7-c;const corners=[point(c,row),point(c+1,row),point(c+1,row+1),point(c,row+1)];return <polygon key={s} points={corners.map(p=>`${p.x},${p.y}`).join(' ')} fill={(c+row)%2===0?'#d9ceb8':'#7d8376'}/>;})}</g>
  </svg>
  {squares.map(s=>{
   const p=game.get(s),pos=position(s,flipped),active=selected===s,movable=legal.includes(s),recent=last?.from===s||last?.to===s,check=p?.type==='k'&&p.color===game.turn()&&game.isCheck();
   return <button key={s} type="button" data-square={s} aria-label={`${s}${p?` ${colorName(p.color)}の${characters[p.type].name}`:' 空きマス'}${active?' 選択中':''}${movable?' 移動可能':''}${check?' チェック':''}`} aria-pressed={active} onClick={()=>onSquare(s)} disabled={disabled} className={`square ${active?'selected':''} ${recent?'last-move':''} ${check?'in-check':''} ${movable&&p?'can-capture':''}`} style={{left:`${pos.x}%`,top:`${pos.y}%`,width:`${11+pos.row*.19}%`,zIndex:10+pos.row} as CSSProperties}>
    {p&&<span className="piece" data-piece={s}><img src={pieceImage(p.type,p.color)} alt="" draggable={false}/><span className={`piece-mark ${p.color}`}>{({k:'K',q:'Q',r:'R',b:'B',n:'N',p:'P'})[p.type]}</span></span>}
    {movable&&!p&&<span className="move-dot"/>}
    {capture===s&&<span className="capture-sparks" key={game.fen()}>✦</span>}
   </button>;
  })}
  <div className="file-labels">{(flipped?'hgfedcba':'abcdefgh').split('').map(f=><span key={f}>{f}</span>)}</div>
  <div className="rank-labels">{(flipped?'12345678':'87654321').split('').map(r=><span key={r}>{r}</span>)}</div>
 </div>;
}

