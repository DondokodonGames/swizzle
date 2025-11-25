/**
 * useCredits.ts
 * ゲーム作成クレジット管理のReact Hook
 * 
 * 🔧 修正版v2: モジュールレベルのキャッシュとフラグで複数コンポーネント対応
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../useAuth';
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

// ✅ モジュールレベルのキャッシュ（全コンポーネントで共有）
let cachedCredits: UserCredit | null = null;
let cachedUsage: CreditUsage | null = null;
let cachedCanCreate: boolean = false;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1分間キャッシュ

// ✅ 初回取得フラグ（全コンポーネントで共有）
let initialFetchDone = false;

// ✅ 実行中フラグ（並列実行防止）
let fetchingCredits: Promise<void> | null = null;

/**
 * キャッシュされたクレジット情報を取得（並列実行防止付き）
 */
async function getCachedCredits(userId: string, forceRefresh: boolean = false): Promise<{
  credits: UserCredit | null;
  usage: CreditUsage | null;
  canCreate: boolean;
}> {
  const now = Date.now();
  
  // ✅ キャッシュが有効な場合はキャッシュから返す
  if (!forceRefresh && cachedCredits && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('[useCredits] ✅ キャッシュからクレジット情報取得');
    return {
      credits: cachedCredits,
      usage: cachedUsage,
      canCreate: cachedCanCreate,
    };
  }
  
  // ✅ 既に実行中の場合は、その結果を待つ
  if (fetchingCredits) {
    console.log('[useCredits] ⏳ 実行中のクレジット取得を待機中...');
    await fetchingCredits;
    return {
      credits: cachedCredits,
      usage: cachedUsage,
      canCreate: cachedCanCreate,
    };
  }
  
  // ✅ 新規取得を開始（Promiseを保存）
  fetchingCredits = (async () => {
    try {
      console.log('[useCredits] 🔄 クレジット情報を新規取得中:', userId);
      
      // クレジット情報を取得
      const userCredits = await getUserCredits(userId);
      cachedCredits = userCredits;
      console.log('[useCredits] ✅ クレジット情報取得完了:', userCredits);

      // 使用状況を計算
      const creditUsage = await getCreditUsage(userId);
      cachedUsage = creditUsage;
      console.log('[useCredits] ✅ 使用状況取得完了:', creditUsage);

      // ゲーム作成可能かチェック
      const canCreateResult = await canCreateGame();
      cachedCanCreate = canCreateResult;
      console.log('[useCredits] ✅ 作成可否チェック完了:', canCreateResult);
      
      // キャッシュタイムスタンプを更新
      cacheTimestamp = now;
      
    } catch (err) {
      console.error('[useCredits] ❌ クレジット情報取得エラー:', err);
      throw err;
    } finally {
      fetchingCredits = null; // 実行完了フラグをクリア
    }
  })();
  
  await fetchingCredits;
  
  return {
    credits: cachedCredits,
    usage: cachedUsage,
    canCreate: cachedCanCreate,
  };
}

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

  /**
   * クレジット情報を取得してstateに反映
   */
  const fetchCredits = useCallback(async (userId: string, forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await getCachedCredits(userId, forceRefresh);
      
      setCredits(result.credits);
      setUsage(result.usage);
      setCanCreate(result.canCreate);
      
    } catch (err) {
      console.error('[useCredits] ❌ エラー:', err);
      setError(err as Error);
      setUsage(null);
      setCanCreate(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 初期ロード（全体で1回のみ実行）
   */
  useEffect(() => {
    let isMounted = true;
    
    const initCredits = async () => {
      // ✅ 認証読み込み中はスキップ
      if (authLoading) {
        console.log('[useCredits] ⏳ 認証情報読み込み中...');
        return;
      }
      
      // ✅ 既に初回取得済みの場合はスキップ（全体で1回のみ）
      if (initialFetchDone) {
        console.log('[useCredits] ⏭️ 初回取得済み、キャッシュから取得');
        if (user && isMounted) {
          // キャッシュから取得してstateに反映
          const result = await getCachedCredits(user.id, false);
          if (isMounted) {
            setCredits(result.credits);
            setUsage(result.usage);
            setCanCreate(result.canCreate);
            setLoading(false);
          }
        }
        return;
      }

      if (user && isMounted) {
        console.log('[useCredits] 🎬 初回クレジット取得開始');
        initialFetchDone = true; // ✅ 全体で1回のみのフラグ
        await fetchCredits(user.id, true); // 初回は強制リフレッシュ
        console.log('[useCredits] 🎉 初期化完了');
      } else if (!user && isMounted) {
        console.log('[useCredits] ⚠️ ユーザーなし（ゲスト状態）');
        setCredits(null);
        setUsage(null);
        setCanCreate(false);
        setLoading(false);
      }
    };
    
    initCredits();
    
    return () => {
      isMounted = false;
    };
  }, [user, authLoading, fetchCredits]);

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
      .channel(`credits-changes-${user.id}`) // ✅ ユーザーごとにチャンネル名を変える
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useCredits] 🔔 クレジット変更検知:', payload);
          fetchCredits(user.id, true); // 変更時は強制リフレッシュ
        }
      )
      .subscribe();

    return () => {
      console.log('[useCredits] 🛑 リアルタイム更新を停止');
      channel.unsubscribe();
    };
  }, [user, fetchCredits]);

  /**
   * 手動リフレッシュ用の関数
   */
  const refetch = useCallback(async () => {
    if (user) {
      console.log('[useCredits] 🔄 手動リフレッシュ');
      await fetchCredits(user.id, true); // 手動リフレッシュは強制
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
