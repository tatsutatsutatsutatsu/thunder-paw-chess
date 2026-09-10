import { env } from 'cloudflare:workers';
import type { Color } from 'chess.js';
import { gameResult } from '@/lib/chess/engine';
import {
  applyOnlineMove,
  normalizeRoomCode,
  type OnlineMove,
  type RoomStatus,
} from '@/lib/chess/online';

type RoomRow = {
  code: string;
  host_token: string;
  guest_token: string | null;
  pgn: string;
  version: number;
  status: RoomStatus;
  result: string | null;
};

const db = () => (env as unknown as { DB: D1Database }).DB;
const roomSelect = `
  SELECT code, host_token, guest_token, pgn, version, status, result
  FROM rooms WHERE code = ?
`;

function publicRoom(room: RoomRow, color: Color) {
  return {
    code: room.code,
    color,
    pgn: room.pgn,
    version: room.version,
    status: room.status,
    result: room.result,
  };
}

async function getRoom(code: string) {
  return db().prepare(roomSelect).bind(code).first<RoomRow>();
}

function playerColor(room: RoomRow, token: string | null): Color | null {
  if (token && token === room.host_token) return 'w';
  if (token && token === room.guest_token) return 'b';
  return null;
}

export async function createRoom() {
  const now = Date.now();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    const token = crypto.randomUUID();
    try {
      await db()
        .prepare(
          `INSERT INTO rooms
           (code, host_token, pgn, version, status, created_at, updated_at)
           VALUES (?, ?, '', 0, 'waiting', ?, ?)`,
        )
        .bind(code, token, now, now)
        .run();
      return { room: { code, color: 'w' as const, pgn: '', version: 0, status: 'waiting' as const, result: null }, token };
    } catch (error) {
      if (!String(error).includes('UNIQUE')) throw error;
    }
  }
  throw new Error('ROOM_CODE_UNAVAILABLE');
}

export async function joinRoom(rawCode: unknown, savedToken: unknown) {
  const code = normalizeRoomCode(rawCode);
  if (!code) throw new Error('INVALID_CODE');
  let room = await getRoom(code);
  if (!room) throw new Error('ROOM_NOT_FOUND');

  const previousToken = typeof savedToken === 'string' ? savedToken : null;
  const previousColor = playerColor(room, previousToken);
  if (previousColor) return { room: publicRoom(room, previousColor), token: previousToken };
  if (room.guest_token) throw new Error('ROOM_FULL');

  const token = crypto.randomUUID();
  const changed = await db()
    .prepare(
      `UPDATE rooms SET guest_token = ?, status = 'playing', updated_at = ?
       WHERE code = ? AND guest_token IS NULL AND status = 'waiting'`,
    )
    .bind(token, Date.now(), code)
    .run();
  if (!changed.meta.changes) throw new Error('ROOM_FULL');
  room = await getRoom(code);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  return { room: publicRoom(room, 'b'), token };
}

export async function readRoom(rawCode: unknown, token: string | null) {
  const code = normalizeRoomCode(rawCode);
  if (!code) throw new Error('INVALID_CODE');
  const room = await getRoom(code);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  const color = playerColor(room, token);
  if (!color) throw new Error('UNAUTHORIZED');
  return publicRoom(room, color);
}

export async function moveInRoom(
  rawCode: unknown,
  token: string | null,
  expectedVersion: unknown,
  move: OnlineMove,
) {
  const code = normalizeRoomCode(rawCode);
  if (!code) throw new Error('INVALID_CODE');
  const room = await getRoom(code);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  const color = playerColor(room, token);
  if (!color) throw new Error('UNAUTHORIZED');
  if (room.status !== 'playing') throw new Error('ROOM_NOT_PLAYING');
  if (!Number.isInteger(expectedVersion) || expectedVersion !== room.version) throw new Error('STALE_POSITION');

  const game = applyOnlineMove(room.pgn, color, move);
  const result = gameResult(game);
  const status: RoomStatus = result ? 'finished' : 'playing';
  const updated = await db()
    .prepare(
      `UPDATE rooms SET pgn = ?, version = version + 1, status = ?, result = ?, updated_at = ?
       WHERE code = ? AND version = ? AND status = 'playing'`,
    )
    .bind(game.pgn(), status, result, Date.now(), code, room.version)
    .run();
  if (!updated.meta.changes) throw new Error('STALE_POSITION');
  return {
    code,
    color,
    pgn: game.pgn(),
    version: room.version + 1,
    status,
    result,
  };
}

export async function resignRoom(rawCode: unknown, token: string | null) {
  const code = normalizeRoomCode(rawCode);
  if (!code) throw new Error('INVALID_CODE');
  const room = await getRoom(code);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  const color = playerColor(room, token);
  if (!color) throw new Error('UNAUTHORIZED');
  if (room.status !== 'playing') throw new Error('ROOM_NOT_PLAYING');
  const result = `${color === 'w' ? '黒' : '白'}の勝ち — 相手が投了`;
  await db()
    .prepare(
      `UPDATE rooms SET status = 'finished', result = ?, version = version + 1, updated_at = ?
       WHERE code = ? AND status = 'playing'`,
    )
    .bind(result, Date.now(), code)
    .run();
  return { ...publicRoom({ ...room, status: 'finished', result, version: room.version + 1 }, color) };
}
