import assert from 'node:assert/strict';
import test from 'node:test';
import { draw, isWon, move, newGame } from './engine.ts';

const card = (suit, rank, faceUp = true) => ({ suit, rank, faceUp });
const empty = () => ({ stock: [], waste: [], tableau: Array.from({ length: 7 }, () => []), foundations: Array.from({ length: 4 }, () => []), moves: 0 });

test('a deal contains each card once and exposes only the tableau top cards', () => {
  const game = newGame(() => 0.37);
  const cards = [...game.stock, ...game.tableau.flat()];
  assert.equal(cards.length, 52);
  assert.equal(new Set(cards.map((item) => `${item.suit}-${item.rank}`)).size, 52);
  assert.deepEqual(game.tableau.map((pile) => pile.length), [1, 2, 3, 4, 5, 6, 7]);
  game.tableau.forEach((pile) => assert.deepEqual(pile.map((item) => item.faceUp), pile.map((_, index) => index === pile.length - 1)));
});

test('stock cycles in the same draw order after recycling waste', () => {
  let game = newGame(() => 0.2);
  const first = game.stock.at(-1);
  while (game.stock.length) game = draw(game);
  game = draw(game);
  game = draw(game);
  assert.equal(game.waste.at(-1).suit, first.suit);
  assert.equal(game.waste.at(-1).rank, first.rank);
});

test('tableau moves enforce alternating colors and reveal the card underneath', () => {
  const game = empty();
  game.tableau[0] = [card('spades', 8, false), card('hearts', 7)];
  game.tableau[1] = [card('clubs', 8)];
  game.tableau[2] = [card('diamonds', 8)];
  assert.equal(move(game, { kind: 'tableau', index: 0, cardIndex: 1 }, { kind: 'tableau', index: 2 }), null);
  const next = move(game, { kind: 'tableau', index: 0, cardIndex: 1 }, { kind: 'tableau', index: 1 });
  assert.equal(next.tableau[0][0].faceUp, true);
  assert.equal(next.tableau[1].at(-1).rank, 7);
  assert.equal(game.tableau[0][0].faceUp, false);
});

test('only an ace starts a foundation and only same-suit successors follow', () => {
  let game = empty();
  game.waste = [card('hearts', 2)];
  assert.equal(move(game, { kind: 'waste' }, { kind: 'foundation', index: 1 }), null);
  game = { ...game, waste: [card('hearts', 1)] };
  const next = move(game, { kind: 'waste' }, { kind: 'foundation', index: 1 });
  assert.equal(next.foundations[1].length, 1);
  assert.equal(move({ ...next, waste: [card('diamonds', 2)] }, { kind: 'waste' }, { kind: 'foundation', index: 1 }), null);
  assert.equal(move({ ...next, waste: [card('hearts', 2)] }, { kind: 'waste' }, { kind: 'foundation', index: 1 }).foundations[1].length, 2);
});

test('win requires all four complete foundations', () => {
  const game = empty();
  game.foundations = ['spades', 'hearts', 'diamonds', 'clubs'].map((suit) => Array.from({ length: 13 }, (_, index) => card(suit, index + 1)));
  assert.equal(isWon(game), true);
  game.foundations[0].pop();
  assert.equal(isWon(game), false);
});
