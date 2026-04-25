import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import EditorGameBridge from '../../services/editor/EditorGameBridge';
import { GameProject } from '../../types/editor/GameProject';

// =====================================================
// 型定義
// =====================================================

interface GamePaymentConfig {
  price_yen: number | null;
  payment_link_url: string | null;
}

type PageState =
  | 'loading'
  | 'payment_gate'  // 決済が必要
  | 'exchanging'    // session_id → token 引き換え中
  | 'playing'       // ゲームプレイ中
  | 'finished'      // ゲーム終了
  | 'error';

// =====================================================
// メインコンポーネント
// =====================================================

export function PlayGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [gameTitle, setGameTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<GamePaymentConfig>({ price_yen: null, payment_link_url: null });
  const [projectData, setProjectData] = useState<GameProject | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const canvasRef = useRef<HTMLDivElement>(null);
  const bridge = EditorGameBridge.getInstance();
  const TOKEN_KEY = `play_token_${gameId}`;

  // sessionStorage に保存したトークンの有効性を確認
  const getValidToken = useCallback((): string | null => {
    if (!gameId) return null;
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    try {
      const { token, expires_at } = JSON.parse(stored);
      if (new Date(expires_at) > new Date()) return token as string;
    } catch {
      // ignore
    }
    sessionStorage.removeItem(TOKEN_KEY);
    return null;
  }, [TOKEN_KEY, gameId]);

  // =====================================================
  // Step 1: ゲーム情報 & 課金設定を取得
  // =====================================================
  useEffect(() => {
    if (!gameId) {
      setErrorMsg('ゲームIDが指定されていません');
      setPageState('error');
      return;
    }

    const load = async () => {
      // ゲーム情報（公開済みのみ）
      const { data: game, error: gameErr } = await supabase
        .from('user_games')
        .select('title, thumbnail_url, project_data')
        .eq('id', gameId)
        .eq('is_published', true)
        .maybeSingle();

      if (gameErr || !game) {
        setErrorMsg('ゲームが見つかりません');
        setPageState('error');
        return;
      }

      setGameTitle(game.title);
      setThumbnailUrl(game.thumbnail_url ?? null);
      setProjectData(game.project_data as GameProject);

      // 課金設定（存在しない場合は無料扱い）
      const { data: cfg } = await supabase
        .from('game_payment_config')
        .select('price_yen, payment_link_url')
        .eq('game_id', gameId)
        .maybeSingle();

      const priceYen = cfg?.price_yen ?? null;
      const linkUrl = cfg?.payment_link_url ?? null;
      setConfig({ price_yen: priceYen, payment_link_url: linkUrl });

      // 無料ゲーム → 即プレイ
      if (!priceYen) {
        setPageState('playing');
        return;
      }

      // 決済完了リダイレクト → トークン引き換え
      if (sessionId) {
        setPageState('exchanging');
        return;
      }

      // 有効なトークンがあれば → プレイ
      if (getValidToken()) {
        setPageState('playing');
        return;
      }

      // 決済が必要
      setPageState('payment_gate');
    };

    load().catch(() => {
      setErrorMsg('読み込みに失敗しました');
      setPageState('error');
    });
  }, [gameId, sessionId, getValidToken]);

  // =====================================================
  // Step 2: session_id → token 引き換え
  // =====================================================
  useEffect(() => {
    if (pageState !== 'exchanging' || !sessionId || !gameId) return;

    let cancelled = false;

    const exchange = async () => {
      // Webhook 処理には数秒かかることがあるので最大 10 秒リトライ
      for (let i = 0; i < 5; i++) {
        try {
          const { data, error } = await supabase.functions.invoke('exchange-session-token', {
            body: { sessionId },
          });

          if (error) throw new Error(error.message);
          if (!data?.token) throw new Error('token_not_found');

          if (cancelled) return;

          // トークンを sessionStorage に保存
          sessionStorage.setItem(
            TOKEN_KEY,
            JSON.stringify({ token: data.token, expires_at: data.expires_at })
          );

          // URL から session_id を除去
          window.history.replaceState({}, '', `/play/${gameId}`);
          setPageState('playing');
          return;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          // token_not_found はリトライ対象（Webhook 未処理）
          if (msg === 'token_not_found' && i < 4) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          if (!cancelled) {
            console.error('Token exchange failed:', err);
            setErrorMsg('決済の確認に失敗しました。サポートにお問い合わせください。');
            setPageState('error');
          }
          return;
        }
      }
    };

    exchange();
    return () => { cancelled = true; };
  }, [pageState, sessionId, gameId, TOKEN_KEY]);

  // =====================================================
  // Step 3: ゲーム起動
  // =====================================================
  useEffect(() => {
    if (pageState !== 'playing' || !projectData || !canvasRef.current) return;

    bridge
      .launchFullGame(projectData, canvasRef.current, () => {
        setPageState('finished');
      })
      .catch((err: unknown) => {
        console.error('Game launch error:', err);
        setErrorMsg('ゲームの起動に失敗しました');
        setPageState('error');
      });

    return () => {
      bridge.stopGame();
    };
  }, [pageState, projectData, bridge]);

  // =====================================================
  // UI
  // =====================================================

  const s = styles;

  if (pageState === 'loading' || pageState === 'exchanging') {
    return (
      <div style={s.center}>
        <div style={s.spinner} />
        <p style={s.hint}>
          {pageState === 'exchanging' ? '決済を確認中...' : '読み込み中...'}
        </p>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div style={s.center}>
        <p style={{ color: '#f87171', fontSize: 16 }}>{errorMsg}</p>
        <button style={s.btn} onClick={() => window.history.back()}>
          戻る
        </button>
      </div>
    );
  }

  if (pageState === 'payment_gate') {
    return (
      <div style={s.center}>
        {thumbnailUrl && (
          <img src={thumbnailUrl} alt={gameTitle} style={s.thumbnail} />
        )}
        <h1 style={s.title}>{gameTitle}</h1>
        <p style={s.hint}>プレイするには決済が必要です</p>
        <a href={config.payment_link_url!} style={s.payBtn}>
          ¥{config.price_yen?.toLocaleString()} でプレイ
        </a>
      </div>
    );
  }

  if (pageState === 'finished') {
    return (
      <div style={s.center}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>🎉</p>
        <p style={{ fontSize: 20, color: '#e2e8f0' }}>ゲーム終了！</p>
        <button
          style={{ ...s.btn, marginTop: 24 }}
          onClick={() => setPageState('playing')}
        >
          もう一度プレイ
        </button>
      </div>
    );
  }

  // playing
  return (
    <div style={s.gameWrap}>
      <div ref={canvasRef} style={s.canvas} />
    </div>
  );
}

// =====================================================
// スタイル
// =====================================================

const styles = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f1a',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: 24,
    gap: 0,
  } as React.CSSProperties,
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #334155',
    borderTop: '3px solid #7c3aed',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: 16,
  } as React.CSSProperties,
  thumbnail: {
    width: 180,
    borderRadius: 16,
    marginBottom: 20,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  } as React.CSSProperties,
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: '0 0 8px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  hint: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 28,
    textAlign: 'center' as const,
  } as React.CSSProperties,
  payBtn: {
    display: 'inline-block',
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
    color: '#fff',
    borderRadius: 14,
    textDecoration: 'none',
    fontSize: 18,
    fontWeight: 700,
    boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
  } as React.CSSProperties,
  btn: {
    padding: '12px 32px',
    background: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: 10,
    fontSize: 15,
    cursor: 'pointer',
  } as React.CSSProperties,
  gameWrap: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  canvas: {
    width: '100%',
    height: '100%',
    maxWidth: 'calc(100vh * 9 / 16)',
    position: 'relative' as const,
  } as React.CSSProperties,
} as const;
