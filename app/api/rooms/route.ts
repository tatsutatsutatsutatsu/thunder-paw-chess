import { createRoom, joinRoom, moveInRoom, readRoom, resignRoom } from '@/lib/server/rooms';

export const dynamic = 'force-dynamic';

function tokenFrom(request: Request) {
  return request.headers.get('x-player-token');
}

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : 'UNKNOWN';
  const status = code === 'UNAUTHORIZED' ? 401 : code === 'ROOM_NOT_FOUND' ? 404 : code === 'STALE_POSITION' || code === 'ROOM_FULL' ? 409 : 400;
  const messages: Record<string, string> = {
    INVALID_CODE: '対局番号は6桁で入力してください。',
    ROOM_NOT_FOUND: 'その対局番号は見つかりません。',
    ROOM_FULL: 'この対局にはすでに2人参加しています。',
    UNAUTHORIZED: 'この対局への接続情報を確認できません。',
    ROOM_NOT_PLAYING: '対局は開始前か、すでに終了しています。',
    NOT_YOUR_TURN: '相手の手番です。',
    STALE_POSITION: '盤面が更新されました。もう一度指してください。',
  };
  return Response.json({ error: messages[code] ?? '通信中に問題が発生しました。' }, { status });
}

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get('code');
    return Response.json(await readRoom(code, tokenFrom(request)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === 'create') return Response.json(await createRoom(), { status: 201 });
    if (body.action === 'join') return Response.json(await joinRoom(body.code, body.savedToken));
    if (body.action === 'move') {
      return Response.json(
        await moveInRoom(body.code, tokenFrom(request), body.version, body.move as never),
      );
    }
    if (body.action === 'resign') return Response.json(await resignRoom(body.code, tokenFrom(request)));
    return Response.json({ error: '操作を確認できません。' }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
