/**
 * StripeService.ts
 * Stripe API呼び出しを管理するサービス
 * Stripe.js v2025対応（redirectToCheckout廃止対応）
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from '../../lib/supabase';
import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionResponse,
  MVPSubscriptionPlan,
} from '../../types/MonetizationTypes';

// Stripeクライアントのシングルトンインスタンス
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Stripeクライアントを取得（シングルトン）
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    // @ts-ignore
    const publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    if (!publicKey) {
      console.error('VITE_STRIPE_PUBLIC_KEY is not defined');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publicKey);
  }
  return stripePromise;
};

/**
 * Checkout Session を作成してStripe Checkoutページにリダイレクト
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse | null> {
  try {
    // 現在のセッションからアクセストークンを取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated. Please sign in.');
    }

    // Supabase Edge Functionを呼び出してCheckout Session作成
    const response = await fetch(
      // @ts-ignore
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ユーザーのアクセストークンを使用
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Checkout session creation failed:', error);
      throw new Error(error.error || error.message || 'Failed to create checkout session');
    }

    const data: CreateCheckoutSessionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Stripe Checkoutページにリダイレクト
 * 
 * 修正: Stripe.js v2025対応
 * - redirectToCheckout() は廃止
 * - Checkout Session の URL に直接リダイレクト
 */
export async function redirectToCheckout(
  plan: MVPSubscriptionPlan,
  billingCycle: 'monthly' | 'yearly'
): Promise<void> {
  try {
    // Checkout Session作成
    const session = await createCheckoutSession({
      plan,
      billingCycle,
      successUrl: `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/pricing?canceled=true`,
    });

    if (!session) {
      throw new Error('Failed to create checkout session');
    }

    // Stripe.js v2025: URLに直接リダイレクト（修正）
    if (session.url) {
      console.log('✅ Redirecting to Stripe Checkout:', session.url);
      window.location.href = session.url;
    } else {
      throw new Error('No checkout URL returned from session');
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
}

/**
 * Customer Portal Session を作成してポータルにリダイレクト
 * （サブスクリプション管理・キャンセル・プラン変更用）
 */
export async function redirectToCustomerPortal(): Promise<void> {
  try {
    // 現在のセッションからアクセストークンを取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated. Please sign in.');
    }

    // Supabase Edge Functionを呼び出してCustomer Portal Session作成
    const response = await fetch(
      // @ts-ignore
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-customer-portal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ユーザーのアクセストークンを使用
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/profile`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Portal session creation failed:', error);
      throw new Error(error.error || error.message || 'Failed to create portal session');
    }

    const data: CreatePortalSessionResponse = await response.json();

    // Customer Portalにリダイレクト
    console.log('✅ Redirecting to Stripe Customer Portal:', data.url);
    window.location.href = data.url;
  } catch (error) {
    console.error('Error redirecting to customer portal:', error);
    throw error;
  }
}

/**
 * Stripe Price IDを取得
 */
export function getStripePriceId(
  plan: MVPSubscriptionPlan,
  billingCycle: 'monthly' | 'yearly'
): string {
  if (plan === 'free') {
    return '';
  }

  const envKey =
    billingCycle === 'yearly'
      ? 'VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID'
      : 'VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID';

  // @ts-ignore
  return import.meta.env[envKey] || '';
}