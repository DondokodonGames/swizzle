/**
 * create-checkout-session/index.ts
 * Stripe Checkout Sessionを作成するEdge Function
 *
 * リクエスト:
 * {
 *   plan: 'premium' | 'pro',
 *   billingCycle: 'monthly' | 'yearly',
 *   successUrl: string,
 *   cancelUrl: string
 * }
 *
 * レスポンス:
 * {
 *   sessionId: string,
 *   url: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  createStripeClient,
  getCorsHeaders,
  corsHeaders,
  validateProductionEnvironment,
  isValidPlanType,
  isValidBillingCycle,
  isValidRedirectUrl,
  checkRateLimit,
  DEFAULT_RATE_LIMITS,
  logCheckoutEvent,
  createErrorResponse,
  getStripeMode,
} from '../_shared/stripe.ts';

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const headers = getCorsHeaders(req);

  try {
    // 本番環境の設定検証
    validateProductionEnvironment();

    // リクエストボディを取得
    const { plan, billingCycle, successUrl, cancelUrl } = await req.json();

    // 入力バリデーション
    if (!plan || !billingCycle || !successUrl || !cancelUrl) {
      throw new Error('Missing required parameters: plan, billingCycle, successUrl, cancelUrl');
    }

    // プランタイプのバリデーション
    if (!isValidPlanType(plan)) {
      throw new Error(`Invalid plan type: ${plan}. Must be one of: premium, pro`);
    }

    // 請求サイクルのバリデーション
    if (!isValidBillingCycle(billingCycle)) {
      throw new Error(`Invalid billing cycle: ${billingCycle}. Must be one of: monthly, yearly`);
    }

    // セキュリティ: リダイレクトURLの検証（オープンリダイレクト攻撃対策）
    if (!isValidRedirectUrl(successUrl)) {
      throw new Error('Invalid successUrl: must be from the same origin as APP_URL');
    }

    if (!isValidRedirectUrl(cancelUrl)) {
      throw new Error('Invalid cancelUrl: must be from the same origin as APP_URL');
    }

    // 認証チェック
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Supabaseクライアント初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ユーザー認証
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // レート制限チェック
    const rateLimitResult = checkRateLimit(`checkout:${user.id}`, DEFAULT_RATE_LIMITS.checkout);

    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for user: ${user.id}`);
      return new Response(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000),
        }),
        {
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString(),
          },
          status: 429,
        }
      );
    }

    // Price IDを取得
    const priceId = billingCycle === 'yearly'
      ? Deno.env.get('VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID')
      : Deno.env.get('VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID');

    if (!priceId) {
      throw new Error('Price ID not configured for this billing cycle');
    }

    // Stripeクライアント初期化
    const stripe = createStripeClient();

    // Price IDが有効か確認（本番環境では重要）
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active) {
        throw new Error('Selected price is no longer active');
      }
    } catch (priceError) {
      console.error('Error validating price:', priceError);
      throw new Error('Invalid price configuration');
    }

    // 既存のStripe顧客IDを取得
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // 顧客が存在しない場合は作成
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Checkout Sessionを作成
    console.log(`[${getStripeMode().toUpperCase()}] Creating checkout session for user: ${user.id}`);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
      },
      metadata: {
        user_id: user.id,
        plan: plan,
        billing_cycle: billingCycle,
      },
      // サブスクリプションにもメタデータを設定
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: plan,
          billing_cycle: billingCycle,
        },
      },
    });

    // 監査ログを記録
    logCheckoutEvent('session_created', user.id, session.id, plan, billingCycle);

    // レスポンスを返す
    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return createErrorResponse(error, headers);
  }
});
