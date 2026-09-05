import type { Color, PieceSymbol } from 'chess.js';
export const characters: Record<PieceSymbol,{name:string;file:string;hint:string}> = {
 q:{name:'クイーン',file:'queen',hint:'縦・横・斜めに、何マスでも'},
 k:{name:'キング',file:'king',hint:'すべての方向に1マス'},
 n:{name:'ナイト',file:'knight',hint:'縦2・横1のL字。駒を飛び越えます'},
 r:{name:'ルーク',file:'rook',hint:'縦・横に、何マスでも'},
 p:{name:'ポーン',file:'pawn',hint:'前へ1マス。初手は2マスも可。斜め前の駒を取ります'},
 b:{name:'ビショップ',file:'bishop',hint:'斜めに、何マスでも'},
};
export const colorName=(color:Color)=>color==='w'?'白':'黒';
export const pieceImage=(type:PieceSymbol,color:Color)=>`/pieces/${characters[type].file}-${color}.png`;
