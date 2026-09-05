import { Chess, type PieceSymbol } from 'chess.js';
export const values:Record<PieceSymbol,number>={p:100,n:320,b:330,r:500,q:900,k:0};
export function gameResult(game:Chess):string|null {
 if(game.isCheckmate()) return `${game.turn()==='w'?'黒':'白'}の勝ち — チェックメイト`;
 if(game.isStalemate()) return '引き分け — ステイルメイト';
 if(game.isInsufficientMaterial()) return '引き分け — 戦力不足';
 if(game.isThreefoldRepetition()) return '引き分け — 同一局面が3回';
 if(game.isDrawByFiftyMoves()) return '引き分け — 50手ルール';
 return null;
}
function evaluate(game:Chess):number {
 const side=game.turn();
 if(game.isCheckmate())return -100000;
 if(game.isDraw())return 0;
 let score=0;
 for(const row of game.board())for(const p of row)if(p){
  const f=p.square.charCodeAt(0)-97,r=Number(p.square[1])-1;
  const central=(3.5-Math.abs(f-3.5))+(3.5-Math.abs(r-3.5));
  const advance=p.type==='p'?(p.color==='w'?r:7-r)*6:0;
  score+=(p.color===side?1:-1)*(values[p.type]+central*(p.type==='n'?8:2)+advance);
 }
 return score;
}
/** Two-ply negamax; receives an isolated game and restores its history. */
export function chooseCpuMove(game:Chess) {
 if(gameResult(game))return null;
 const moves=game.moves({verbose:true});
 let best=moves[0],bestScore=-Infinity;
 for(const move of moves){
  game.move(move);
  let score:number;
  if(game.isCheckmate())score=100000;
  else if(game.isDraw())score=0;
  else {
   let opponent=-Infinity;
   for(const reply of game.moves({verbose:true})){
    game.move(reply);opponent=Math.max(opponent,-evaluate(game));game.undo();
   }
   score=-opponent;
  }
  game.undo();
  if(score>bestScore){bestScore=score;best=move;}
 }
 return best?{from:best.from,to:best.to,promotion:best.promotion}:null;
}
