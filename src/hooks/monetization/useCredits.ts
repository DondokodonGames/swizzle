/**
 * useCredits.ts
 * ゲーム作成クレジット管理のReact Hook
 * 
 * 🔧 修正版: useAuthから認証情報を取得してキャッシュ不要に
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../useAuth'; // ✅ 追加
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
  
  // ✅ useAuthから認証情報を取得（キャッシュ済み）
  const { user, loading: authLoading } = useAuth();
  
  // ✅ 初回実行フラグ（useEffectの重複実行を防ぐ）
  const initialFetchDone = useRef(false);

  /**
   * クレジット情報を取得
   */
  const fetchCredits = useCallback(async (userId: string) => {
    try {
      console.log('[useCredits] 📊 クレジット情報取得開始:', userId);
      setLoading(true);
      setError(null);

      // クレジット情報を取得
      const userCredits = await getUserCredits(userId);
      setCredits(userCredits);
      console.log('[useCredits] ✅ クレジット情報取得完了:', userCredits);

      // 使用状況を計算
      const creditUsage = await getCreditUsage(userId);
      setUsage(creditUsage);
      console.log('[useCredits] ✅ 使用状況取得完了:', creditUsage);

      // ゲーム作成可能かチェック
      const canCreateResult = await canCreateGame();
      setCanCreate(canCreateResult);
      console.log('[useCredits] ✅ 作成可否チェック完了:', canCreateResult);
      
    } catch (err) {
      console.error('[useCredits] ❌ クレジット情報取得エラー:', err);
      setError(err as Error);
      setUsage(null);
      setCanCreate(false);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ 依存配列は空（userIdは引数で受け取る）

  /**
   * 初期ロード（useAuthのuserが確定してから実行）
   */
  useEffect(() => {
    // ✅ 認証読み込み中はスキップ
    if (authLoading) {
      console.log('[useCredits] ⏳ 認証情報読み込み中...');
      return;
    }
    
    // ✅ 既に実行済みの場合はスキップ
    if (initialFetchDone.current) {
      return;
    }

    if (user) {
      console.log('[useCredits] 🎬 初回クレジット取得開始');
      initialFetchDone.current = true;
      fetchCredits(user.id);
    } else {
      console.log('[useCredits] ⚠️ ユーザーなし（ゲスト状態）');
      setCredits(null);
      setUsage(null);
      setCanCreate(false);
      setLoading(false);
    }
  }, [user, authLoading, fetchCredits]); // ✅ user, authLoadingが変わった時のみ実行

  /**
   * リアルタイム更新を設定
   */
  useEffect(() => {
    // ✅ ユーザーがいない場合は何もしない
    if (!user) {
      return;
    }

    console.log('[useCredits] 🔄 リアルタイム更新を設定');

    // Supabase Realtimeでuser_creditsテーブルの変更を監視
    const channel = supabase
      .channel('credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`, // ✅ 自分のデータのみ監視
        },
        (payload) => {
          console.log('[useCredits] 🔔 クレジット変更検知:', payload);
          fetchCredits(user.id);
        }
      )
      .subscribe();

    return () => {
      console.log('[useCredits] 🛑 リアルタイム更新を停止');
      channel.unsubscribe();
    };
  }, [user, fetchCredits]); // ✅ userが変わった時のみ再設定

  /**
   * 手動リフレッシュ用の関数
   */
  const refetch = useCallback(() => {
    if (user) {
      console.log('[useCredits] 🔄 手動リフレッシュ');
      fetchCredits(user.id);
    }
  }, [user, fetchCredits]);

  return {
    credits,
    loading,
    error,
    refetch,
    usage,
    canCreateGame: canCreate,
  };
}
