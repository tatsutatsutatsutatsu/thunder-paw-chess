import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyOnlineMove, normalizeRoomCode } from '../lib/chess/online.ts';

test('room codes must contain exactly six digits', () => {
  assert.equal(normalizeRoomCode(' 012345 '), '012345');
  assert.equal(normalizeRoomCode('12345'), null);
  assert.equal(normalizeRoomCode('12A456'), null);
});

test('online moves enforce color and preserve a replayable PGN', () => {
  const afterWhite = applyOnlineMove('', 'w', { from: 'e2', to: 'e4' });
  assert.equal(afterWhite.turn(), 'b');
  assert.throws(
    () => applyOnlineMove(afterWhite.pgn(), 'w', { from: 'd2', to: 'd4' }),
    /NOT_YOUR_TURN/,
  );
  const afterBlack = applyOnlineMove(afterWhite.pgn(), 'b', { from: 'e7', to: 'e5' });
  assert.deepEqual(afterBlack.history(), ['e4', 'e5']);
});
