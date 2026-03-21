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

// モジュールレベルキャッシュ（ユーザーIDをキーにする）
// Map は挿入順を保持するため、先頭エントリが最も古い（LRU eviction に利用）
const walletCache = new Map<string, { wallet: UserWallet | null; timestamp: number }>();
const fetchingMap = new Map<string, Promise<void>>();
const CACHE_DURATION = 60_000; // 1分
const MAX_CACHE_SIZE = 50;     // 最大エントリ数（超過時に最古エントリを削除）

function setCacheEntry(userId: string, wallet: UserWallet | null): void {
  // 既存エントリを一度削除してから追加することで「最近使用」を末尾に移動
  walletCache.delete(userId);
  if (walletCache.size >= MAX_CACHE_SIZE) {
    // Map.keys() は挿入順を返す → 先頭 = 最も古いエントリ
    const oldestKey = walletCache.keys().next().value as string;
    walletCache.delete(oldestKey);
  }
  walletCache.set(userId, { wallet, timestamp: Date.now() });
}

async function getCachedWallet(userId: string, force = false): Promise<UserWallet | null> {
  const now = Date.now();
  const cached = walletCache.get(userId);

  if (!force && cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.wallet;
  }

  const existing = fetchingMap.get(userId);
  if (existing) {
    await existing;
    return walletCache.get(userId)?.wallet ?? null;
  }

  const fetching = (async () => {
    try {
      const wallet = await getUserWallet(userId);
      setCacheEntry(userId, wallet);
    } finally {
      fetchingMap.delete(userId);
    }
  })();
  fetchingMap.set(userId, fetching);

  await fetching;
  return walletCache.get(userId)?.wallet ?? null;
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
