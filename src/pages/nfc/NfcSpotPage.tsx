import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

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

      // スポットに紐づいたゲームを取得
      const { data: spot, error: spotErr } = await supabase
        .from('nfc_spots')
        .select('game_id')
        .eq('id', spotId)
        .maybeSingle();

      if (spotErr || !spot) {
        setErrorMsg('このスポットは見つかりませんでした');
        setState('error');
        return;
      }

      if (!spot.game_id) {
        setErrorMsg('このスポットにはゲームが設定されていません');
        setState('error');
        return;
      }

      navigate(`/play/${spot.game_id}`, { replace: true });
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
