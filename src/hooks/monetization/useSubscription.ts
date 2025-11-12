/**
 * useSubscription.ts
 * サブスクリプション状態管理のReact Hook
 * 
 * 機能:
 * - ユーザーのサブスクリプション情報取得
 * - リアルタイム更新対応
 * - プラン変更・キャンセル機能
 * - アクティブ状態チェック
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type {
  Subscription,
  MVPSubscriptionPlan,
  SubscriptionPeriod,
  UseSubscriptionResult,
} from '../../types/MonetizationTypes';
import {
  SubscriptionStatus,
  calculateDaysRemaining,
} from '../../types/MonetizationTypes';
import {
  getUserSubscription,
  updateSubscription,
  isSubscriptionActive,
} from '../../services/monetization/SubscriptionService';

/**
 * サブスクリプション管理Hook
 */
export function useSubscription(): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * サブスクリプション情報を取得
   */
  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 現在のユーザーを取得
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSubscription(null);
        return;
      }

      // サブスクリプション情報を取得
      const sub = await getUserSubscription(user.id);
      setSubscription(sub);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 初期ロード
   */
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  /**
   * リアルタイム更新を設定
   */
  useEffect(() => {
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchSubscription();
      } else if (event === 'SIGNED_OUT') {
        setSubscription(null);
      }
    });

    // Supabase Realtimeでサブスクリプションテーブルの変更を監視
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        (payload) => {
          console.log('Subscription changed:', payload);
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      authSubscription?.unsubscribe();
      channel.unsubscribe();
    };
  }, [fetchSubscription]);

  /**
   * プラン変更
   */
  const updatePlan = useCallback(
    async (newPlan: MVPSubscriptionPlan) => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('User not authenticated');
        }

        // サブスクリプションを更新
        const updated = await updateSubscription(user.id, {
          plan_type: newPlan,
        });

        setSubscription(updated);
      } catch (err) {
        console.error('Error updating plan:', err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * サブスクリプションをキャンセル
   */
  const cancelSubscription = useCallback(
    async (immediately: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('User not authenticated');
        }

        const now = new Date().toISOString();

        if (immediately) {
          // 即座にキャンセル
          await updateSubscription(user.id, {
            status: SubscriptionStatus.CANCELED,
            canceled_at: now,
            cancel_at: now,
          });
        } else {
          // 期間終了時にキャンセル
          const cancelAt = subscription?.current_period_end || now;
          await updateSubscription(user.id, {
            cancel_at: cancelAt,
            canceled_at: now,
          });
        }

        await fetchSubscription();
      } catch (err) {
        console.error('Error canceling subscription:', err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [subscription, fetchSubscription]
  );

  /**
   * サブスクリプション期間情報を計算
   */
  const period: SubscriptionPeriod | null = subscription?.current_period_start &&
    subscription?.current_period_end
    ? {
        start: new Date(subscription.current_period_start),
        end: new Date(subscription.current_period_end),
        daysRemaining: calculateDaysRemaining(subscription.current_period_end),
        isActive: isSubscriptionActive(subscription),
        willRenew: !subscription.cancel_at,
      }
    : null;

  /**
   * 便利なプロパティ
   */
  const isActive = isSubscriptionActive(subscription);
  const isPremium = subscription?.plan_type === 'premium';
  const isFree = subscription?.plan_type === 'free' || !subscription;

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    updatePlan,
    cancelSubscription,
    isActive,
    isPremium,
    isFree,
    period,
  };
}