/**
 * useCredits.ts
 * ゲーム作成クレジット管理のReact Hook
 * 
 * 機能:
 * - ユーザーの月間クレジット情報取得
 * - 使用状況の計算
 * - ゲーム作成可能チェック
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type {
  UserCredit,
  CreditUsage,
  UseCreditsResult,
} from '../../types/MonetizationTypes';
import {
  getUserCredits,
  getCreditUsage,
  canCreateGame,
} from '../../services/monetization/CreditService';

/**
 * クレジット管理Hook
 */
export function useCredits(): UseCreditsResult {
  const [credits, setCredits] = useState<UserCredit | null>(null);
  const [usage, setUsage] = useState<CreditUsage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [canCreate, setCanCreate] = useState<boolean>(false);

  /**
   * クレジット情報を取得
   */
  const fetchCredits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 現在のユーザーを取得
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCredits(null);
        setUsage(null);
        setCanCreate(false);
        return;
      }

      // クレジット情報を取得
      const userCredits = await getUserCredits(user.id);
      setCredits(userCredits);

      // 使用状況を計算
      const creditUsage = await getCreditUsage(user.id);
      setUsage(creditUsage);

      // ゲーム作成可能かチェック
      const canCreateResult = await canCreateGame();
      setCanCreate(canCreateResult);
    } catch (err) {
      console.error('Error fetching credits:', err);
      setError(err as Error);
      setUsage(null);
      setCanCreate(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 初期ロード
   */
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  /**
   * リアルタイム更新を設定
   */
  useEffect(() => {
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchCredits();
      } else if (event === 'SIGNED_OUT') {
        setCredits(null);
        setUsage(null);
        setCanCreate(false);
      }
    });

    // Supabase Realtimeでuser_creditsテーブルの変更を監視
    const channel = supabase
      .channel('credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
        },
        (payload) => {
          console.log('Credits changed:', payload);
          fetchCredits();
        }
      )
      .subscribe();

    return () => {
      authSubscription?.unsubscribe();
      channel.unsubscribe();
    };
  }, [fetchCredits]);

  return {
    credits,
    loading,
    error,
    refetch: fetchCredits,
    usage,
    canCreateGame: canCreate,
  };
}