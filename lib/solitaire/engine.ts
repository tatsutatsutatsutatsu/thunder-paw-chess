export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Card = { suit: Suit; rank: number; faceUp: boolean };
export type Pile = { kind: 'tableau'; index: number; cardIndex: number } | { kind: 'waste' } | { kind: 'foundation'; index: number };
export type Destination = { kind: 'tableau' | 'foundation'; index: number };
export type Game = { stock: Card[]; waste: Card[]; tableau: Card[][]; foundations: Card[][]; moves: number };

export const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const red = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

export function newGame(random: () => number = Math.random): Game {
  const deck = suits.flatMap((suit) => Array.from({ length: 13 }, (_, index) => ({ suit, rank: index + 1, faceUp: false })));
  for (let index = deck.length - 1; index > 0; index--) {
    const pick = Math.floor(random() * (index + 1));
    [deck[index], deck[pick]] = [deck[pick], deck[index]];
  }
  const tableau = Array.from({ length: 7 }, (_, index) => {
    const pile = deck.splice(0, index + 1);
    pile[pile.length - 1] = { ...pile[pile.length - 1], faceUp: true };
    return pile;
  });
  return { stock: deck, waste: [], tableau, foundations: suits.map(() => []), moves: 0 };
}

export function draw(game: Game): Game | null {
  if (game.stock.length) {
    const stock = game.stock.slice();
    const card = stock.pop()!;
    return { ...game, stock, waste: [...game.waste, { ...card, faceUp: true }], moves: game.moves + 1 };
  }
  if (!game.waste.length) return null;
  return { ...game, stock: game.waste.slice().reverse().map((card) => ({ ...card, faceUp: false })), waste: [], moves: game.moves + 1 };
}

export function move(game: Game, source: Pile, target: Destination): Game | null {
  const tableau = game.tableau.map((pile) => pile.slice());
  const foundations = game.foundations.map((pile) => pile.slice());
  const waste = game.waste.slice();
  let moving: Card[];
  if (source.kind === 'waste') {
    if (!waste.length) return null;
    moving = [waste[waste.length - 1]];
  } else if (source.kind === 'foundation') {
    if (!foundations[source.index]?.length || (target.kind === 'foundation' && target.index === source.index)) return null;
    moving = [foundations[source.index].at(-1)!];
  } else {
    const pile = tableau[source.index];
    if (!pile || !pile[source.cardIndex]?.faceUp || source.cardIndex < 0 || (target.kind === 'tableau' && target.index === source.index)) return null;
    moving = pile.slice(source.cardIndex);
  }
  const card = moving[0];
  if (target.kind === 'foundation') {
    if (moving.length !== 1 || !foundations[target.index]) return null;
    const top = foundations[target.index].at(-1);
    if (top ? top.suit !== card.suit || card.rank !== top.rank + 1 : card.rank !== 1) return null;
  } else {
    if (!tableau[target.index]) return null;
    const top = tableau[target.index].at(-1);
    if (top ? !top.faceUp || red(top.suit) === red(card.suit) || top.rank !== card.rank + 1 : card.rank !== 13) return null;
  }
  if (source.kind === 'waste') waste.pop();
  else if (source.kind === 'foundation') foundations[source.index].pop();
  else {
    tableau[source.index].splice(source.cardIndex);
    const revealed = tableau[source.index].at(-1);
    if (revealed && !revealed.faceUp) tableau[source.index][tableau[source.index].length - 1] = { ...revealed, faceUp: true };
  }
  if (target.kind === 'foundation') foundations[target.index].push(card);
  else tableau[target.index].push(...moving);
  return { ...game, stock: game.stock, waste, tableau, foundations, moves: game.moves + 1 };
}

export function autoFoundation(game: Game, source: Pile): Game | null {
  for (let index = 0; index < 4; index++) {
    const next = move(game, source, { kind: 'foundation', index });
    if (next) return next;
  }
  return null;
}

export function isWon(game: Game) { return game.foundations.every((pile) => pile.length === 13); }
