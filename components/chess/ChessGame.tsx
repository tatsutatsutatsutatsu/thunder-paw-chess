'use client';
/* oxlint-disable next/no-img-element -- Small pre-sized local alpha sprites are reused across the board without an image service. */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Chess, type Square, type Move, type PieceSymbol, type Color } from 'chess.js';
import {
  ArrowDownUp,
  BookOpen,
  ChevronRight,
  Copy,
  Flag,
  LoaderCircle,
  LogIn,
  Monitor,
  Plus,
  RotateCcw,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { characters, pieceImage, colorName } from '@/lib/chess/characters';
import { chooseCpuMove, gameResult } from '@/lib/chess/engine';
import { loadOnlineGame, type OnlineRoom, type RoomStatus } from '@/lib/chess/online';
import Board from './Board';

type Mode = 'cpu' | 'local' | 'online';
type Session = { code: string; token: string; color: Color };
type RoomPayload = OnlineRoom & { token?: string; room?: OnlineRoom };
const SESSION_KEY = 'thunder-paw-online-session';
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

async function roomRequest(body: Record<string, unknown>, token?: string) {
  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-player-token': token } : {}) },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as RoomPayload & { error?: string };
  if (!response.ok) throw new Error(payload.error || '通信中に問題が発生しました。');
  return payload;
}

export default function ChessGame() {
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const [game, setGame] = useState(() => new Chess());
  const [revision, setRevision] = useState(0);
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>('cpu');
  const [draftMode, setDraftMode] = useState<Mode>('cpu');
  const [selected, setSelected] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [last, setLast] = useState<Move | null>(null);
  const [capture, setCapture] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [dialog, setDialog] = useState<'new' | 'rules' | 'draw' | null>(null);
  const [agreedDraw, setAgreedDraw] = useState(false);
  const [notice, setNotice] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
  const [onlineResult, setOnlineResult] = useState<string | null>(null);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const moveLog = useRef<HTMLDivElement>(null);

  const history = game.history({ verbose: true });
  const result = onlineResult || (agreedDraw ? '引き分け — 両者の合意' : gameResult(game));
  const waiting = mode === 'online' && roomStatus === 'waiting';
  const thinking = started && mode === 'cpu' && game.turn() === 'b' && !result && dialog !== 'new';
  const myTurn = mode !== 'online' || (session?.color === game.turn() && roomStatus === 'playing');
  const legal = selected ? game.moves({ square: selected, verbose: true }).map((move) => move.to) : [];
  const selectedPiece = selected ? game.get(selected) : null;

  const applyRoom = useCallback((room: OnlineRoom) => {
    const next = loadOnlineGame(room.pgn);
    const latest = next.history({ verbose: true }).at(-1) ?? null;
    setGame(next);
    setLast(latest);
    setRoomStatus(room.status);
    setOnlineResult(room.result);
    setSelected(null);
    setPromotion(null);
    setNotice('');
    setRevision(room.version);
  }, []);

  const connect = useCallback(
    (room: OnlineRoom, token: string) => {
      const nextSession = { code: room.code, token, color: room.color };
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setMode('online');
      setDraftMode('online');
      setStarted(true);
      setFlipped(room.color === 'b');
      setDialog(null);
      applyRoom(room);
    },
    [applyRoom],
  );

  const syncRoom = useCallback(async () => {
    if (!session) return;
    const response = await fetch(`/api/rooms?code=${session.code}`, {
      headers: { 'x-player-token': session.token },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('対局との接続が切れました。');
    applyRoom((await response.json()) as OnlineRoom);
  }, [session, applyRoom]);

  useEffect(() => {
    if (!ready || session) return;
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const restored = JSON.parse(saved) as Session;
      queueMicrotask(() => {
        setSession(restored);
        setMode('online');
        setDraftMode('online');
        setStarted(true);
        setFlipped(restored.color === 'b');
        setRoomStatus('waiting');
      });
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [ready, session]);

  useEffect(() => {
    if (!session || !started || roomStatus === 'finished') return;
    let cancelled = false;
    const refresh = async () => {
      try {
        await syncRoom();
      } catch (error) {
        if (!cancelled) setNotice(error instanceof Error ? error.message : '接続を確認できません。');
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [session, started, roomStatus, syncRoom]);

  const makeMove = useCallback(
    async (move: { from: Square; to: Square; promotion?: string }) => {
      if (mode === 'online' && session) {
        setOnlineBusy(true);
        try {
          const room = (await roomRequest(
            { action: 'move', code: session.code, version: revision, move },
            session.token,
          )) as OnlineRoom;
          applyRoom(room);
        } catch (error) {
          setNotice(error instanceof Error ? error.message : '着手を送信できませんでした。');
          await syncRoom().catch(() => undefined);
        } finally {
          setOnlineBusy(false);
        }
        return;
      }
      try {
        const next = new Chess();
        next.loadPgn(game.pgn());
        const moved = next.move(move);
        setGame(next);
        setLast(moved);
        setSelected(null);
        setPromotion(null);
        setNotice('');
        setCapture(moved.captured ? moved.to : null);
        setRevision((value) => value + 1);
      } catch {
        setNotice('そのマスには移動できません。');
      }
    },
    [applyRoom, game, mode, revision, session, syncRoom],
  );

  useEffect(() => {
    if (!capture) return;
    const timer = setTimeout(() => setCapture(null), 650);
    return () => clearTimeout(timer);
  }, [capture, revision]);

  useEffect(() => {
    if (!thinking) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const isolated = new Chess();
      isolated.loadPgn(game.pgn());
      const move = chooseCpuMove(isolated);
      if (!cancelled && move) void makeMove(move);
    }, 420);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [thinking, game, makeMove]);

  useEffect(() => {
    if (moveLog.current) moveLog.current.scrollTop = moveLog.current.scrollHeight;
  }, [revision]);

  function resetLocalSession() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setRoomStatus(null);
    setOnlineResult(null);
  }

  function start() {
    if (draftMode === 'online') return;
    resetLocalSession();
    setGame(new Chess());
    setMode(draftMode);
    setStarted(true);
    setSelected(null);
    setLast(null);
    setCapture(null);
    setPromotion(null);
    setAgreedDraw(false);
    setNotice('');
    setDialog(null);
    setRevision((value) => value + 1);
  }

  async function createOnlineRoom() {
    setOnlineBusy(true);
    setNotice('');
    try {
      const payload = await roomRequest({ action: 'create' });
      connect(payload.room!, payload.token!);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '対局を作成できませんでした。');
    } finally {
      setOnlineBusy(false);
    }
  }

  async function joinOnlineRoom() {
    if (roomCode.length !== 6) {
      setNotice('対局番号を6桁で入力してください。');
      return;
    }
    setOnlineBusy(true);
    setNotice('');
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      const savedToken = saved ? (JSON.parse(saved) as Session).token : undefined;
      const payload = await roomRequest({ action: 'join', code: roomCode, savedToken });
      connect(payload.room!, payload.token!);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '対局に参加できませんでした。');
    } finally {
      setOnlineBusy(false);
    }
  }

  async function resign() {
    if (!session) return;
    setOnlineBusy(true);
    try {
      applyRoom((await roomRequest({ action: 'resign', code: session.code }, session.token)) as OnlineRoom);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '投了を送信できませんでした。');
    } finally {
      setOnlineBusy(false);
    }
  }

  function select(square: Square) {
    if (!started || result || promotion || thinking || onlineBusy || waiting || !myTurn || (mode === 'cpu' && game.turn() === 'b')) return;
    const piece = game.get(square);
    if (piece?.color === game.turn()) {
      setSelected(selected === square ? null : square);
      setNotice('');
      return;
    }
    if (selected && legal.includes(square)) {
      const options = game.moves({ square: selected, verbose: true }).filter((move) => move.to === square);
      if (options.some((move) => move.promotion)) setPromotion({ from: selected, to: square });
      else void makeMove({ from: selected, to: square });
    } else {
      setSelected(null);
      setNotice('自分の駒を選んでください。');
    }
  }

  function player(color: Color) {
    const active = started && !result && game.turn() === color && !waiting;
    const taken = history.filter((move) => move.color === color && move.captured);
    const owner = mode === 'online' && session?.color === color ? ' · あなた' : mode === 'cpu' && color === 'b' ? ' · CPU 初級' : '';
    return <div className={`player-strip ${active ? 'active' : ''}`}>
      <span className={`side-chip ${color}`}><img src={pieceImage('k', color)} alt="" /></span>
      <div><strong>{color === 'w' ? 'アイボリー' : 'チャコール'}</strong><span>{color === 'w' ? '白の駒' : '黒の駒'}{owner}</span></div>
      <div className="captured" aria-label={`${colorName(color)}が取った駒`}>{taken.map((move, index) => <img key={index} src={pieceImage(move.captured!, color === 'w' ? 'b' : 'w')} title={characters[move.captured!].name} alt={characters[move.captured!].name} />)}</div>
      {active && <span className="turn-pill">{thinking || onlineBusy ? '通信中' : '手番'}</span>}
    </div>;
  }

  const onlineSetup = <div className="online-setup">
    <button className="primary-button" disabled={onlineBusy} onClick={() => void createOnlineRoom()}>{onlineBusy ? <LoaderCircle className="spin" size={18} /> : <Wifi size={18} />}新しい対局番号を作る</button>
    <div className="online-divider"><span>または</span></div>
    <label className="room-code-label" htmlFor="room-code">相手から届いた6桁の番号</label>
    <InputOTP id="room-code" maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={roomCode} onChange={setRoomCode} disabled={onlineBusy} containerClassName="room-code-input" aria-label="対局番号"><InputOTPGroup>{Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} />)}</InputOTPGroup></InputOTP>
    <button className="secondary-button" disabled={onlineBusy || roomCode.length !== 6} onClick={() => void joinOnlineRoom()}><LogIn size={18} />この番号で参加</button>
    {notice && <p className="online-error" role="alert">{notice}</p>}
  </div>;

  const setup = <><p className="eyebrow">対局の準備</p><h2>猫たちの一局を、<br />はじめましょう。</h2><RadioGroup value={draftMode} onValueChange={(value) => { setDraftMode(value as Mode); setNotice(''); }} className="mode-options" aria-label="対戦モード">
    <label htmlFor="mode-cpu" className={draftMode === 'cpu' ? 'chosen' : ''}><RadioGroupItem id="mode-cpu" value="cpu" /><Monitor size={20} /><span><strong>CPUと対戦</strong><small>あなたは白の駒 · 初級</small></span></label>
    <label htmlFor="mode-local" className={draftMode === 'local' ? 'chosen' : ''}><RadioGroupItem id="mode-local" value="local" /><Users size={20} /><span><strong>ふたりで対戦</strong><small>同じ端末で交互に操作</small></span></label>
    <label htmlFor="mode-online" className={draftMode === 'online' ? 'chosen' : ''}><RadioGroupItem id="mode-online" value="online" /><Wifi size={20} /><span><strong>インターネット対戦</strong><small>6桁の番号で待ち合わせ</small></span></label>
  </RadioGroup>{draftMode === 'online' ? onlineSetup : <button className="primary-button" disabled={!ready} onClick={start}>{ready ? '対局をはじめる' : '読み込み中…'}<ChevronRight size={18} /></button>}<p className="setup-note">時間制限なし。白の駒から始まります。</p></>;

  const onlineBanner = session && <div className={`room-banner ${waiting ? 'waiting' : ''}`}><div><small>対局番号</small><strong>{session.code}</strong></div><button className="quiet-button" onClick={() => { void navigator.clipboard.writeText(session.code); setNotice('対局番号をコピーしました。'); }}><Copy size={16} />番号をコピー</button><span>{waiting ? '相手の参加を待っています…' : session.color === 'w' ? 'あなたは白です' : 'あなたは黒です'}</span></div>;

  return <main className="chess-app">
    <header className="site-header"><div className="wordmark" aria-label="THUNDER PAW CHESS"><span className="brand-icon"><Zap size={21} fill="currentColor" /></span><span>THUNDER PAW <b>CHESS</b></span></div><nav className="game-nav" aria-label="ゲームを選ぶ"><span aria-current="page">チェス</span><Link href="/solitaire">ソリティア</Link></nav><button className="quiet-button" onClick={() => setDialog('rules')}><BookOpen size={17} /><span>遊び方</span></button></header>
    <div className="game-layout"><section className="play-area" aria-label="対局エリア"><div className="board-heading"><h1>猫たちのチェス盤</h1><span>{started ? mode === 'cpu' ? 'CPU対戦 · 初級' : mode === 'online' ? `オンライン · ${session?.code ?? '接続中'}` : 'ふたりで対戦' : '対局前'}</span></div>
      {onlineBanner}{player(flipped ? 'w' : 'b')}
      <output className={`board-info ${game.isCheck() && !result ? 'checked' : ''}`} aria-live="polite"><strong>{!started ? '白の駒からスタート' : waiting ? '相手の参加待ち' : result || `${colorName(game.turn())}の番${thinking ? ' · 考え中' : game.isCheck() ? ' · チェック！' : ''}`}</strong><span>{selectedPiece ? `${characters[selectedPiece.type].name} · ${selected}` : waiting ? `対局番号 ${session?.code} を相手に伝えてください` : started && !result ? myTurn ? '駒を選んで移動先をタップ' : '相手の着手を待っています' : 'モードを選んで対局開始'}</span></output>
      <div className="board-frame"><Board game={game} selected={selected} legal={legal} last={last} flipped={flipped} onSquare={select} capture={capture} disabled={!started || !!result || thinking || onlineBusy || waiting || !myTurn || !!promotion} /></div>
      {player(flipped ? 'b' : 'w')}
      <div className="board-toolbar"><span><i className="legend-dot" />移動できるマス</span><button onClick={() => setFlipped((value) => !value)} className="quiet-button"><ArrowDownUp size={17} />盤面を反転</button></div>
    </section>
    <aside className="game-panel">{!started ? <section className="setup-panel">{setup}</section> : <>
      <section className={`status-panel ${game.isCheck() && !result ? 'check-status' : ''} ${result ? 'finished' : ''}`} aria-live="polite"><p className="eyebrow">{result ? '対局終了' : waiting ? '参加待ち' : thinking ? 'CPUが考えています' : mode === 'online' && !myTurn ? '相手の手番' : '現在の手番'}</p><h2 data-testid="status">{result || (waiting ? '相手を待っています' : `${colorName(game.turn())}の番です`)}</h2><p>{result ? '猫たちに、次の一局を。' : waiting ? `対局番号「${session?.code}」を相手に伝えてください。` : game.isCheck() ? 'チェック！ キングを守ってください。' : thinking ? 'チャコールの猫が次の一手を選んでいます。' : mode === 'online' && !myTurn ? '盤面は自動で更新されます。' : '駒を選び、光るマスをタップ。'}</p></section>
      <section className="selection-panel" aria-live="polite">{selectedPiece ? <><img src={pieceImage(selectedPiece.type, selectedPiece.color)} alt="" /><div><small>{selected} · {colorName(selectedPiece.color)}の駒</small><h3>{characters[selectedPiece.type].name}</h3><p>{characters[selectedPiece.type].hint}</p></div></> : <><span className="selection-symbol"><Zap size={22} /></span><div><h3>{notice || '一手ずつ、じっくりと。'}</h3><p>{mode === 'online' ? '対局番号が同じ相手と盤面を共有しています。' : '駒を選ぶと、名前と動き方を表示します。'}</p></div></>}</section>
      <section className="history-panel"><div className="section-label"><h3>棋譜</h3><span>{history.length} 手</span></div><div className="move-columns"><span>#</span><span>白</span><span>黒</span></div><div className="move-list" ref={moveLog} data-testid="move-list">{history.length === 0 ? <p className="empty-history">最初の一手を待っています。</p> : Array.from({ length: Math.ceil(history.length / 2) }, (_, index) => <div className="move-row" key={index}><span>{index + 1}.</span>{[history[index * 2], history[index * 2 + 1]].map((move, side) => <span className={move === history.at(-1) ? 'latest' : ''} key={side} title={move ? `${characters[move.piece].name} ${move.from} → ${move.to}` : ''}>{move?.san || '—'}</span>)}</div>)}</div></section>
      <div className="game-actions"><button className="primary-button" onClick={() => { setDraftMode(mode); setDialog('new'); }}><Plus size={18} />新しい対局</button>{mode === 'local' && !result && <button className="quiet-button" onClick={() => setDialog('draw')}><Flag size={16} />引き分けを提案</button>}{mode === 'online' && roomStatus === 'playing' && !result && <button className="quiet-button danger-button" disabled={onlineBusy} onClick={() => void resign()}><Flag size={16} />投了する</button>}</div>
    </>}<div className="collection-note"><span>✦</span><p>小さな猫たちの、大きな一手。</p></div></aside></div>
    <footer className="site-footer"><span>THUNDER PAW CHESS</span><span>時間を忘れて、ひと勝負。</span></footer>
    <Dialog open={!!promotion} onOpenChange={() => {}}><DialogContent showCloseButton={false} className="game-dialog promotion-dialog"><DialogTitle>ポーンを昇格</DialogTitle><DialogDescription>新しい駒を選んでください。</DialogDescription><div className="promotion-options">{(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((piece) => <button key={piece} onClick={() => promotion && void makeMove({ ...promotion, promotion: piece })}><img src={pieceImage(piece, game.turn())} alt="" /><span>{characters[piece].name}</span></button>)}</div></DialogContent></Dialog>
    <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }}><DialogContent showCloseButton={false} className="game-dialog">{dialog === 'new' ? <><DialogTitle>新しい対局</DialogTitle><DialogDescription>今の対局を終了し、初期配置から始めます。</DialogDescription>{setup}<button className="quiet-button centered" onClick={() => setDialog(null)}><RotateCcw size={16} />今の対局に戻る</button></> : dialog === 'draw' ? <><DialogTitle>引き分けにしますか？</DialogTitle><DialogDescription>相手の方が同意したら「同意して終了」を押してください。</DialogDescription><button className="primary-button" onClick={() => { setAgreedDraw(true); setSelected(null); setDialog(null); }}>同意して終了</button><button className="quiet-button centered" onClick={() => setDialog(null)}>対局を続ける</button></> : <><DialogTitle>遊び方</DialogTitle><DialogDescription>猫を選んで、移動先をタップ。ドラッグで視点を回せます。</DialogDescription><div className="rules-text"><p>インターネット対戦では、作成した6桁の対局番号を相手に伝えます。相手が同じ番号で参加すると対局開始です。</p><p>白が先手です。金色の枠は選択中の駒、丸い印は合法手、淡い金色のマスは直前の一手です。チェック中のキングは赤く光ります。</p><p>相手のキングを逃げられないチェックにすると勝ち。自分のキングをチェックにさらす手は指せません。</p><p>キャスリングはキングを2マス横に移動。アンパッサンは直前に2マス進んだポーンに対してのみ可能です。最終段に届いたポーンは4種類から昇格先を選べます。</p><p>ステイルメイト、戦力不足、同一局面3回、50手ルールで引き分け。棋譜は標準のSAN表記です。</p></div><button className="primary-button" onClick={() => setDialog(null)}>盤面に戻る</button></>}</DialogContent></Dialog>
  </main>;
}
