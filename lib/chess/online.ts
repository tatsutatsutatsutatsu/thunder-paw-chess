import { Chess, type Color, type Square } from 'chess.js';

export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type OnlineRoom = {
  code: string;
  color: Color;
  pgn: string;
  version: number;
  status: RoomStatus;
  result: string | null;
};

export type OnlineMove = {
  from: Square;
  to: Square;
  promotion?: string;
};

export function normalizeRoomCode(value: unknown) {
  return typeof value === 'string' && /^\d{6}$/.test(value.trim())
    ? value.trim()
    : null;
}

export function loadOnlineGame(pgn: string) {
  const game = new Chess();
  if (pgn) game.loadPgn(pgn);
  return game;
}

export function applyOnlineMove(pgn: string, color: Color, move: OnlineMove) {
  const game = loadOnlineGame(pgn);
  if (game.turn() !== color) throw new Error('NOT_YOUR_TURN');
  game.move(move);
  return game;
}
