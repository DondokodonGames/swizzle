import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';

// =====================================================
// 型定義
// =====================================================

interface GameInfo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  is_published: boolean;
}

interface PaymentConfig {
  price_yen: number | null;
  payment_link_id: string | null;
  payment_link_url: string | null;
  nfc_tag_ref: string | null;
}

type PageState = 'loading' | 'ready' | 'saving' | 'writing_nfc' | 'error';

// NDEFReader / NDEFWriter は TypeScript の型定義に含まれていないので宣言
declare global {
  interface Window {
    NDEFReader?: new () => {
      write(message: { records: Array<{ recordType: string; data: string }> }): Promise<void>;
    };
  }
}

const APP_URL = import.meta.env.VITE_APP_URL || 'https://playswizzle.com';

// =====================================================
// メインコンポーネント
// =====================================================

export function NfcSetupPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [game, setGame] = useState<GameInfo | null>(null);
  const [config, setConfig] = useState<PaymentConfig>({
    price_yen: null,
    payment_link_id: null,
    payment_link_url: null,
    nfc_tag_ref: null,
  });
  const [priceInput, setPriceInput] = useState('');
  const [tagRefInput, setTagRefInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [nfcStatus, setNfcStatus] = useState('');
  const [copyDone, setCopyDone] = useState(false);

  const sessionRef = useRef<string | null>(null);

  const playUrl = gameId ? `${APP_URL}/play/${gameId}` : '';

  // =====================================================
  // 初期ロード: ゲーム情報 + 課金設定 + 認証確認
  // =====================================================
  useEffect(() => {
    if (!gameId) {
      setErrorMsg('ゲームIDが指定されていません');
      setPageState('error');
      return;
    }

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      sessionRef.current = session.access_token;

      const { data: g, error: gErr } = await supabase
        .from('user_games')
        .select('id, title, thumbnail_url, is_published')
        .eq('id', gameId)
        .eq('creator_id', session.user.id)
        .maybeSingle();

      if (gErr || !g) {
        setErrorMsg('ゲームが見つからないか、アクセス権がありません');
        setPageState('error');
        return;
      }
      setGame(g as GameInfo);

      const { data: cfg } = await supabase
        .from('game_payment_config')
        .select('price_yen, payment_link_id, payment_link_url, nfc_tag_ref')
        .eq('game_id', gameId)
        .maybeSingle();

      if (cfg) {
        setConfig(cfg as PaymentConfig);
        setPriceInput(cfg.price_yen?.toString() ?? '');
        setTagRefInput(cfg.nfc_tag_ref ?? '');
      }

      setPageState('ready');
    };

    load().catch(() => {
      setErrorMsg('読み込みに失敗しました');
      setPageState('error');
    });
  }, [gameId, navigate]);

  // =====================================================
  // Payment Link を作成 / 更新
  // =====================================================
  const handleCreatePaymentLink = async () => {
    const price = parseInt(priceInput, 10);
    if (isNaN(price) || price < 1) {
      setErrorMsg('有効な価格（1円以上）を入力してください');
      return;
    }

    setPageState('saving');
    setErrorMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('create-payment-link', {
        body: { gameId, priceYen: price, gameTitle: game?.title },
        headers: { Authorization: `Bearer ${sessionRef.current}` },
      });

      if (error) throw new Error(error.message);

      setConfig((prev) => ({
        ...prev,
        price_yen: data.price_yen,
        payment_link_id: data.payment_link_id,
        payment_link_url: data.payment_link_url,
      }));
      setPriceInput(data.price_yen.toString());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Payment Link の作成に失敗しました');
    } finally {
      setPageState('ready');
    }
  };

  // =====================================================
  // タグ設置場所メモを保存
  // =====================================================
  const handleSaveTagRef = async () => {
    if (!gameId) return;
    setPageState('saving');
    await supabase
      .from('game_payment_config')
      .upsert({ game_id: gameId, nfc_tag_ref: tagRefInput, updated_at: new Date().toISOString() });
    setConfig((prev) => ({ ...prev, nfc_tag_ref: tagRefInput }));
    setPageState('ready');
  };

  // =====================================================
  // NFC タグへの書き込み（Web NFC API / Android Chrome）
  // =====================================================
  const handleWriteNfc = async (urlToWrite: string) => {
    if (!window.NDEFReader) {
      setNfcStatus('このブラウザは Web NFC API に対応していません。\nNFC Tools アプリで下記 URL を書き込んでください。');
      return;
    }

    setPageState('writing_nfc');
    setNfcStatus('NFC タグをデバイスに近づけてください...');

    try {
      const writer = new window.NDEFReader();
      await writer.write({
        records: [{ recordType: 'url', data: urlToWrite }],
      });
      setNfcStatus('書き込み完了！');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '不明なエラー';
      setNfcStatus(`書き込み失敗: ${msg}`);
    } finally {
      setPageState('ready');
    }
  };

  // =====================================================
  // URL コピー
  // =====================================================
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

  // =====================================================
  // UI
  // =====================================================

  const s = styles;

  if (pageState === 'error') {
    return (
      <div style={s.center}>
        <p style={{ color: '#f87171' }}>{errorMsg}</p>
        <button style={s.btn} onClick={() => navigate(-1)}>戻る</button>
      </div>
    );
  }

  if (pageState === 'loading') {
    return (
      <div style={s.center}>
        <div style={s.spinner} />
        <p style={{ color: '#94a3b8' }}>読み込み中...</p>
      </div>
    );
  }

  const hasPaymentLink = !!config.payment_link_url;
  const isBusy = pageState === 'saving' || pageState === 'writing_nfc';

  return (
    <div style={s.page}>
      {/* ヘッダー */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>← 戻る</button>
        <h1 style={s.title}>NFC / QR セットアップ</h1>
      </div>

      {/* ゲーム情報 */}
      {game && (
        <div style={s.card}>
          <div style={s.gameRow}>
            {game.thumbnail_url && (
              <img src={game.thumbnail_url} alt={game.title} style={s.thumb} />
            )}
            <div>
              <div style={s.gameTitle}>{game.title}</div>
              <div style={s.badge(game.is_published)}>
                {game.is_published ? '公開中' : '非公開'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* プレイ URL + QR コード */}
      <div style={s.card}>
        <h2 style={s.sectionTitle}>プレイ URL（無料公開用）</h2>
        <p style={s.hint}>NFC タグや QR コードに書き込む URL です。無料ゲームはこの URL でそのままプレイできます。</p>
        <div style={s.urlRow}>
          <code style={s.urlText}>{playUrl}</code>
          <button style={s.copyBtn} onClick={() => handleCopy(playUrl)}>
            {copyDone ? '✓ コピー済み' : 'コピー'}
          </button>
        </div>
        <div style={s.qrWrap}>
          <QRCodeSVG value={playUrl} size={180} bgColor="#1e293b" fgColor="#e2e8f0" />
        </div>
        <div style={s.nfcBtnRow}>
          <button
            style={s.nfcBtn}
            disabled={isBusy}
            onClick={() => handleWriteNfc(playUrl)}
          >
            📡 NFC タグに書き込む（Android Chrome）
          </button>
        </div>
        {nfcStatus && <p style={s.nfcStatus}>{nfcStatus}</p>}
      </div>

      {/* 有料設定 */}
      <div style={s.card}>
        <h2 style={s.sectionTitle}>有料設定（Stripe Payment Link）</h2>
        <p style={s.hint}>
          価格を設定すると Stripe Payment Link が作成されます。
          作成後は Payment Link の URL を NFC タグや QR コードに書き込んでください。
        </p>

        {hasPaymentLink && (
          <div style={s.existingConfig}>
            <span style={s.priceTag}>¥{config.price_yen?.toLocaleString()}</span>
            <span style={s.statusBadge}>Payment Link 作成済み</span>
          </div>
        )}

        <div style={s.formRow}>
          <label style={s.label}>価格（円）</label>
          <input
            style={s.input}
            type="number"
            min={1}
            step={1}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="例: 200"
            disabled={isBusy}
          />
          <button
            style={{ ...s.btn, ...s.primaryBtn }}
            disabled={isBusy || !priceInput}
            onClick={handleCreatePaymentLink}
          >
            {hasPaymentLink ? '価格を変更して再作成' : 'Payment Link を作成'}
          </button>
        </div>

        {errorMsg && <p style={s.errorMsg}>{errorMsg}</p>}

        {hasPaymentLink && config.payment_link_url && (
          <>
            <hr style={s.divider} />
            <h3 style={s.subTitle}>Payment Link URL（有料プレイ用）</h3>
            <p style={s.hint}>この URL を NFC タグ / QR コードに書き込むと、スキャン後に決済画面が表示されます。</p>
            <div style={s.urlRow}>
              <code style={s.urlText}>{config.payment_link_url}</code>
              <button style={s.copyBtn} onClick={() => handleCopy(config.payment_link_url!)}>
                コピー
              </button>
            </div>
            <div style={s.qrWrap}>
              <QRCodeSVG value={config.payment_link_url} size={180} bgColor="#1e293b" fgColor="#e2e8f0" />
            </div>
            <div style={s.nfcBtnRow}>
              <button
                style={s.nfcBtn}
                disabled={isBusy}
                onClick={() => handleWriteNfc(config.payment_link_url!)}
              >
                📡 NFC タグに書き込む（有料版）
              </button>
            </div>
          </>
        )}
      </div>

      {/* タグ設置場所メモ */}
      <div style={s.card}>
        <h2 style={s.sectionTitle}>タグ設置場所メモ</h2>
        <div style={s.formRow}>
          <input
            style={s.input}
            type="text"
            value={tagRefInput}
            onChange={(e) => setTagRefInput(e.target.value)}
            placeholder="例: 渋谷アーケード 2F 入口横"
            disabled={isBusy}
          />
          <button style={s.btn} disabled={isBusy} onClick={handleSaveTagRef}>
            保存
          </button>
        </div>
        {config.nfc_tag_ref && (
          <p style={s.savedRef}>保存済み: {config.nfc_tag_ref}</p>
        )}
      </div>

      {/* iOS 向けガイド */}
      <div style={{ ...s.card, ...s.guideCard }}>
        <h2 style={s.sectionTitle}>iOS での書き込み方法</h2>
        <ol style={s.guideList}>
          <li>「NFC Tools」または「NFC TagWriter by NXP」アプリをインストール</li>
          <li>上記の QR コードをスキャンして URL をコピー</li>
          <li>アプリで「Write」→「Add a record」→「URL / URI」を選択</li>
          <li>URL を貼り付けて NFC タグに書き込む</li>
        </ol>
      </div>
    </div>
  );
}

// =====================================================
// スタイル
// =====================================================

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f0f1a',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '0 0 48px',
  } as React.CSSProperties,
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f1a',
    color: '#e2e8f0',
    gap: 16,
  } as React.CSSProperties,
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #334155',
    borderTop: '3px solid #7c3aed',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px 24px 12px',
    borderBottom: '1px solid #1e293b',
    marginBottom: 8,
  } as React.CSSProperties,
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    padding: '4px 0',
  } as React.CSSProperties,
  title: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
  } as React.CSSProperties,
  card: {
    background: '#1a1a2e',
    border: '1px solid #1e293b',
    borderRadius: 16,
    padding: 24,
    margin: '12px 16px',
  } as React.CSSProperties,
  guideCard: {
    background: '#111827',
    borderColor: '#374151',
  } as React.CSSProperties,
  gameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  } as React.CSSProperties,
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    objectFit: 'cover' as const,
  } as React.CSSProperties,
  gameTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 6,
  } as React.CSSProperties,
  badge: (published: boolean): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 600,
    background: published ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
    color: published ? '#4ade80' : '#94a3b8',
  }),
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: '0 0 8px',
  } as React.CSSProperties,
  subTitle: {
    fontSize: 14,
    fontWeight: 600,
    margin: '16px 0 8px',
    color: '#cbd5e1',
  } as React.CSSProperties,
  hint: {
    color: '#64748b',
    fontSize: 13,
    margin: '0 0 16px',
    lineHeight: 1.6,
  } as React.CSSProperties,
  urlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  urlText: {
    flex: 1,
    fontSize: 12,
    color: '#a5b4fc',
    background: '#0f172a',
    padding: '8px 12px',
    borderRadius: 8,
    wordBreak: 'break-all' as const,
    minWidth: 0,
  } as React.CSSProperties,
  copyBtn: {
    padding: '8px 16px',
    background: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  qrWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 0',
    background: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
  } as React.CSSProperties,
  nfcBtnRow: {
    display: 'flex',
    justifyContent: 'center',
  } as React.CSSProperties,
  nfcBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
  nfcStatus: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center' as const,
    marginTop: 12,
    whiteSpace: 'pre-line' as const,
  } as React.CSSProperties,
  existingConfig: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  } as React.CSSProperties,
  priceTag: {
    fontSize: 24,
    fontWeight: 700,
    color: '#a5b4fc',
  } as React.CSSProperties,
  statusBadge: {
    fontSize: 12,
    padding: '3px 10px',
    borderRadius: 99,
    background: 'rgba(124,58,237,0.2)',
    color: '#a78bfa',
    border: '1px solid rgba(124,58,237,0.3)',
  } as React.CSSProperties,
  formRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  label: {
    fontSize: 13,
    color: '#94a3b8',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  input: {
    flex: 1,
    padding: '10px 14px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 10,
    color: '#e2e8f0',
    fontSize: 14,
    minWidth: 120,
  } as React.CSSProperties,
  btn: {
    padding: '10px 20px',
    background: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: 10,
    fontSize: 14,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  primaryBtn: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
    border: 'none',
    color: '#fff',
  } as React.CSSProperties,
  errorMsg: {
    color: '#f87171',
    fontSize: 13,
    marginTop: 8,
  } as React.CSSProperties,
  divider: {
    border: 'none',
    borderTop: '1px solid #1e293b',
    margin: '20px 0',
  } as React.CSSProperties,
  savedRef: {
    fontSize: 13,
    color: '#4ade80',
    marginTop: 8,
  } as React.CSSProperties,
  guideList: {
    paddingLeft: 20,
    margin: 0,
    lineHeight: 2,
    fontSize: 14,
    color: '#94a3b8',
  } as React.CSSProperties,
} as const;
