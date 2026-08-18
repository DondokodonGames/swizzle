import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { track, setSpotContext } from '../../services/analytics/Analytics';
import { pickLineupIndex } from './lineupRotation';

type State = 'loading' | 'ready' | 'error';

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
    gap: 16,
    padding: 24,
  } as React.CSSProperties,
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #334155',
    borderTop: '3px solid #7c3aed',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  } as React.CSSProperties,
  hint: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center' as const,
    margin: 0,
  } as React.CSSProperties,
  error: {
    color: '#f87171',
    fontSize: 16,
    textAlign: 'center' as const,
    margin: 0,
  } as React.CSSProperties,
};

export function NfcSpotPage() {
  const { spotId } = useParams<{ spotId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!spotId) {
      setErrorMsg('スポットIDが指定されていません');
      setState('error');
      return;
    }

    // 以後このタブセッションの全イベントに spot_id が付く(拠点別集計の起点)
    setSpotContext(spotId);

    const run = async () => {
      // セッションがなければ匿名で自動ログイン
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error: signInErr } = await supabase.auth.signInAnonymously();
        if (signInErr) {
          console.error('Anonymous sign-in failed:', signInErr);
          // サインイン失敗でもゲーム取得は試みる（無料ゲームなら遊べる）
        }
      }

      // スポットとラインナップを取得
      const [{ data: spot, error: spotErr }, { data: lineup }] = await Promise.all([
        supabase.from('nfc_spots').select('game_id, active').eq('id', spotId).maybeSingle(),
        supabase
          .from('nfc_spot_games')
          .select('game_id, sort_order, enabled')
          .eq('spot_id', spotId)
          .eq('enabled', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (spotErr || !spot) {
        setErrorMsg('このスポットは見つかりませんでした');
        setState('error');
        return;
      }

      // ラインナップがあれば巡回出題、無ければ従来の単体ゲーム設定にフォールバック
      const games = (lineup ?? []).map((r) => r.game_id as string).filter(Boolean);
      let gameId: string | null = null;
      let index = 0;
      if (games.length > 0) {
        index = pickLineupIndex(spotId, games.length);
        gameId = games[index];
      } else {
        gameId = spot.game_id ?? null;
      }

      if (!gameId) {
        setErrorMsg('このスポットにはゲームが設定されていません');
        setState('error');
        return;
      }

      // 到着を計測（プレイに至らなかったタップも母数として残す）
      track('spot_enter', {
        gameId,
        lineupSize: games.length,
        lineupIndex: games.length > 0 ? index : null,
        active: spot.active !== false,
      });

      navigate(`/play/${gameId}`, { replace: true });
    };

    run().catch((err) => {
      console.error('NfcSpotPage error:', err);
      setErrorMsg('読み込みに失敗しました');
      setState('error');
    });
  }, [spotId, navigate]);

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={styles.center}>
        {state === 'loading' && (
          <>
            <div style={styles.spinner} />
            <p style={styles.hint}>ゲームを起動中...</p>
          </>
        )}
        {state === 'error' && (
          <p style={styles.error}>{errorMsg}</p>
        )}
      </div>
    </>
  );
}
