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

interface PlayValidation {
  plays_remaining: number;
  max_play_count: number;
}

type PageState =
  | 'loading'
  | 'payment_gate'   // 決済が必要
  | 'exchanging'     // session_id → token 引き換え中
  | 'validating'     // サーバーサイドトークン検証中
  | 'playing'        // ゲームプレイ中
  | 'finished'       // ゲーム終了
  | 'limit_reached'  // プレイ回数上限
  | 'error';

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
    position: 'relative' as const,
  } as React.CSSProperties,
  canvas: {
    width: '100%',
    height: '100%',
    maxWidth: 'calc(100vh * 9 / 16)',
    position: 'relative' as const,
  } as React.CSSProperties,
  playsBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    background: 'rgba(0,0,0,0.6)',
    color: '#94a3b8',
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 99,
    backdropFilter: 'blur(4px)',
  } as React.CSSProperties,
} as const;

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
  const [validation, setValidation] = useState<PlayValidation | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const bridge = EditorGameBridge.getInstance();
  const TOKEN_KEY = `play_token_${gameId}`;

  // sessionStorage に保存したトークンを取得（期限チェックはサーバーに委ねる）
  const getStoredToken = useCallback((): string | null => {
    if (!gameId) return null;
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    try {
      const { token, expires_at } = JSON.parse(stored);
      // クライアント側では有効期限が切れていないことだけ確認（サーバーが最終判断）
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

      const { data: cfg } = await supabase
        .from('game_payment_config')
        .select('price_yen, payment_link_url')
        .eq('game_id', gameId)
        .maybeSingle();

      const priceYen = cfg?.price_yen ?? null;
      const linkUrl = cfg?.payment_link_url ?? null;
      setConfig({ price_yen: priceYen, payment_link_url: linkUrl });

      // 無料ゲーム → 即プレイ（トークン検証不要）
      if (!priceYen) {
        setPageState('playing');
        return;
      }

      // 決済完了リダイレクト → トークン引き換え
      if (sessionId) {
        setPageState('exchanging');
        return;
      }

      // 保存済みトークンがあれば → サーバー検証へ
      const token = getStoredToken();
      if (token) {
        setPageState('validating');
        return;
      }

      // 決済が必要
      setPageState('payment_gate');
    };

    load().catch(() => {
      setErrorMsg('読み込みに失敗しました');
      setPageState('error');
    });
  }, [gameId, sessionId, getStoredToken]);

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

          sessionStorage.setItem(
            TOKEN_KEY,
            JSON.stringify({ token: data.token, expires_at: data.expires_at })
          );

          window.history.replaceState({}, '', `/play/${gameId}`);
          setPageState('validating');
          return;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
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
  // Step 3: サーバーサイドトークン検証
  // =====================================================
  useEffect(() => {
    if (pageState !== 'validating' || !gameId) return;

    let cancelled = false;

    const validate = async () => {
      const token = getStoredToken();
      if (!token) {
        setPageState('payment_gate');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('validate-play-token', {
          body: { token, gameId },
        });

        if (cancelled) return;

        if (error) {
          const msg = error.message || '';
          if (msg.includes('play_limit_reached')) {
            setPageState('limit_reached');
          } else if (msg.includes('token_expired')) {
            sessionStorage.removeItem(TOKEN_KEY);
            setPageState('payment_gate');
          } else {
            setErrorMsg('アクセス検証に失敗しました');
            setPageState('error');
          }
          return;
        }

        if (!data?.valid) {
          sessionStorage.removeItem(TOKEN_KEY);
          setPageState('payment_gate');
          return;
        }

        setValidation({
          plays_remaining: data.plays_remaining,
          max_play_count: data.max_play_count,
        });
        setPageState('playing');
      } catch (err) {
        if (!cancelled) {
          console.error('Token validation error:', err);
          setErrorMsg('アクセス検証に失敗しました');
          setPageState('error');
        }
      }
    };

    validate();
    return () => { cancelled = true; };
  }, [pageState, gameId, getStoredToken, TOKEN_KEY]);

  // =====================================================
  // Step 4: ゲーム起動
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

  if (pageState === 'loading' || pageState === 'exchanging' || pageState === 'validating') {
    const hint =
      pageState === 'exchanging' ? '決済を確認中...' :
      pageState === 'validating' ? 'アクセスを確認中...' :
      '読み込み中...';
    return (
      <div style={s.center}>
        <div style={s.spinner} />
        <p style={s.hint}>{hint}</p>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div style={s.center}>
        <p style={{ color: '#f87171', fontSize: 16 }}>{errorMsg}</p>
        <button style={s.btn} onClick={() => window.history.back()}>戻る</button>
      </div>
    );
  }

  if (pageState === 'limit_reached') {
    return (
      <div style={s.center}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>🔒</p>
        <p style={{ fontSize: 18, color: '#e2e8f0', marginBottom: 8 }}>プレイ回数の上限に達しました</p>
        <p style={s.hint}>このチケットで遊べる回数をすべて使い切りました。</p>
        {config.payment_link_url && (
          <a href={config.payment_link_url} style={s.payBtn}>
            もう一度購入する
          </a>
        )}
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
        <p style={{ fontSize: 20, color: '#e2e8f0', marginBottom: 8 }}>ゲーム終了！</p>
        {validation && validation.plays_remaining > 0 && (
          <p style={s.hint}>あと {validation.plays_remaining} 回プレイできます</p>
        )}
        {validation && validation.plays_remaining > 0 ? (
          <button
            style={{ ...s.btn, marginTop: 24 }}
            onClick={() => setPageState('validating')}
          >
            もう一度プレイ
          </button>
        ) : (
          <>
            <p style={s.hint}>このチケットのプレイ回数をすべて使いました</p>
            {config.payment_link_url && (
              <a href={config.payment_link_url} style={{ ...s.payBtn, marginTop: 24 }}>
                もう一度購入する
              </a>
            )}
          </>
        )}
      </div>
    );
  }

  // playing
  return (
    <div style={s.gameWrap}>
      <div ref={canvasRef} style={s.canvas} />
      {validation && (
        <div style={s.playsBadge}>
          残り {validation.plays_remaining} 回
        </div>
      )}
    </div>
  );
}
