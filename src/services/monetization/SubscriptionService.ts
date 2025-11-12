/**
 * SubscriptionService.ts
 * Supabaseのサブスクリプション関連データを管理
 */

import { supabase } from '../../lib/supabase';
import type {
  Subscription,
  SubscriptionInsert,
  SubscriptionUpdate,
  MVPSubscriptionPlan,
} from '../../types/MonetizationTypes';

/**
 * ユーザーのサブスクリプション情報を取得
 */
export async function getUserSubscription(
  userId: string
): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合はnullを返す
        return null;
      }
      throw error;
    }

    return data as Subscription;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    throw error;
  }
}

/**
 * サブスクリプションを作成
 */
export async function createSubscription(
  subscription: SubscriptionInsert
): Promise<Subscription> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscription)
      .select()
      .single();

    if (error) throw error;

    return data as Subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

/**
 * サブスクリプションを更新
 */
export async function updateSubscription(
  userId: string,
  updates: SubscriptionUpdate
): Promise<Subscription> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data as Subscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * 現在のユーザーのプラン種類を取得
 */
export async function getCurrentUserPlan(): Promise<MVPSubscriptionPlan> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return 'free' as MVPSubscriptionPlan;
    }

    // profilesテーブルからプランを取得
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      return 'free' as MVPSubscriptionPlan;
    }

    return (data.subscription_plan as MVPSubscriptionPlan) || ('free' as MVPSubscriptionPlan);
  } catch (error) {
    console.error('Error getting current user plan:', error);
    return 'free' as MVPSubscriptionPlan;
  }
}

/**
 * サブスクリプションがアクティブかチェック
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === 'active' || subscription.status === 'trialing';
}

/**
 * プレミアムプランかチェック
 */
export async function isUserPremium(): Promise<boolean> {
  const plan = await getCurrentUserPlan();
  return plan === 'premium';
}