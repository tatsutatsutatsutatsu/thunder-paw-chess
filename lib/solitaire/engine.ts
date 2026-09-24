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
    if (card.suit !== suits[target.index]) return null;
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

export type Hint =
  | { kind: 'move'; source: Pile; target: Destination; card: Card }
  | { kind: 'seek'; card: Card }
  | { kind: 'stuck' }
  | { kind: 'won' };

function destinations(game: Game): Destination[] {
  return [
    ...game.foundations.map((_, index) => ({ kind: 'foundation' as const, index })),
    ...game.tableau.map((_, index) => ({ kind: 'tableau' as const, index })),
  ];
}

export function findHint(game: Game): Hint {
  if (isWon(game)) return { kind: 'won' };
  const targets = destinations(game);
  const candidate = (source: Pile, card: Card, allowed = targets): Hint | null => {
    const target = allowed.find((destination) => {
      if (source.kind === 'tableau' && source.cardIndex === 0 && destination.kind === 'tableau' && game.tableau[destination.index].length === 0) return false;
      return move(game, source, destination);
    });
    return target ? { kind: 'move', source, target, card } : null;
  };

  // Exposing a face-down card gives the player new information, so favor it.
  for (let index = 0; index < game.tableau.length; index++) {
    const pile = game.tableau[index];
    const firstFaceUp = pile.findIndex((card) => card.faceUp);
    if (firstFaceUp > 0) {
      const source = { kind: 'tableau' as const, index, cardIndex: firstFaceUp };
      const hint = candidate(source, pile[firstFaceUp]);
      if (hint) return hint;
    }
  }

  for (let index = 0; index < game.tableau.length; index++) {
    const pile = game.tableau[index];
    for (let cardIndex = pile.length - 1; cardIndex >= 0; cardIndex--) {
      if (!pile[cardIndex].faceUp) break;
      const hint = candidate({ kind: 'tableau', index, cardIndex }, pile[cardIndex]);
      if (hint) return hint;
    }
  }

  const wasteTop = game.waste.at(-1);
  if (wasteTop) {
    const hint = candidate({ kind: 'waste' }, wasteTop);
    if (hint) return hint;
  }

  // With one-card draw and unlimited passes, every remaining deck card can be
  // brought to the waste top. Check them before declaring the layout stuck.
  for (const card of [...game.stock, ...game.waste.slice(0, -1)]) {
    const simulated = { ...game, waste: [card] };
    if (targets.some((target) => move(simulated, { kind: 'waste' }, target))) return { kind: 'seek', card };
  }

  // Moving a foundation card back is occasionally necessary to unlock a row.
  for (let index = 0; index < game.foundations.length; index++) {
    const card = game.foundations[index].at(-1);
    if (!card) continue;
    const hint = candidate({ kind: 'foundation', index }, card, targets.filter((target) => target.kind === 'tableau'));
    if (hint) return hint;
  }
  return { kind: 'stuck' };
}
