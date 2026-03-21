/**
 * useWallet.ts
 * ペイ・パー・プレイ課金モデルのウォレット状態管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../useAuth';
import type { UserWallet, WalletStatus, UseWalletResult } from '../../types/MonetizationTypes';
import { calcWalletStatus } from '../../types/MonetizationTypes';
import { getUserWallet } from '../../services/monetization/WalletService';

// モジュールレベルキャッシュ
let cachedWallet: UserWallet | null = null;
let cacheTimestamp = 0;
let fetchingWallet: Promise<void> | null = null;
const CACHE_DURATION = 60_000; // 1分

async function getCachedWallet(userId: string, force = false): Promise<UserWallet | null> {
  const now = Date.now();
  if (!force && cachedWallet && now - cacheTimestamp < CACHE_DURATION) {
    return cachedWallet;
  }

  if (fetchingWallet) {
    await fetchingWallet;
    return cachedWallet;
  }

  fetchingWallet = (async () => {
    try {
      cachedWallet = await getUserWallet(userId);
      cacheTimestamp = Date.now();
    } finally {
      fetchingWallet = null;
    }
  })();

  await fetchingWallet;
  return cachedWallet;
}

export function useWallet(): UseWalletResult {
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user, loading: authLoading } = useAuth();

  const fetchWallet = useCallback(async (userId: string, force = false) => {
    try {
      setLoading(true);
      setError(null);
      const w = await getCachedWallet(userId, force);
      setWallet(w);
    } catch (err) {
      console.error('[useWallet] fetch error:', err);
      setError(err as Error);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初期ロード
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setWallet(null);
      setLoading(false);
      return;
    }
    fetchWallet(user.id, true);
  }, [user, authLoading, fetchWallet]);

  // リアルタイム更新
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`wallet-changes-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_wallets', filter: `user_id=eq.${user.id}` },
        () => {
          fetchWallet(user.id, true);
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user, fetchWallet]);

  const refetch = useCallback(async () => {
    if (user) await fetchWallet(user.id, true);
  }, [user, fetchWallet]);

  const status: WalletStatus | null = wallet ? calcWalletStatus(wallet) : null;
  const canCreateGame = status?.canPlay ?? false;

  return { wallet, loading, error, refetch, status, canCreateGame };
}
