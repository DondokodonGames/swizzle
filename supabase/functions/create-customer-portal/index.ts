/**
 * create-customer-portal/index.ts
 * Stripe Customer Portal Sessionを作成するEdge Function
 *
 * リクエスト:
 * {
 *   returnUrl: string
 * }
 *
 * レスポンス:
 * {
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
  isValidRedirectUrl,
  checkRateLimit,
  DEFAULT_RATE_LIMITS,
  logAuditEvent,
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
    const { returnUrl } = await req.json();

    // バリデーション
    if (!returnUrl) {
      throw new Error('Missing returnUrl parameter');
    }

    // セキュリティ: リダイレクトURLの検証（オープンリダイレクト攻撃対策）
    if (!isValidRedirectUrl(returnUrl)) {
      throw new Error('Invalid returnUrl: must be from the same origin as APP_URL');
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
    const rateLimitResult = await checkRateLimit(`portal:${user.id}`, DEFAULT_RATE_LIMITS.customerPortal);

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

    // ユーザーのStripe顧客IDを取得（subscriptions → user_wallets の優先順位で検索）
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      throw new Error(`Subscription lookup failed: ${subError.message}`);
    }

    let stripeCustomerId: string | null = subscription?.stripe_customer_id ?? null;

    // subscriptions に stripe_customer_id がない場合は user_wallets を確認
    // （ペイ・パー・プレイのみのユーザーはここに customer_id が記録されている）
    if (!stripeCustomerId) {
      const { data: wallet, error: walletError } = await supabase
        .from('user_wallets')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) {
        throw new Error(`Wallet lookup failed: ${walletError.message}`);
      }
      stripeCustomerId = wallet?.stripe_customer_id ?? null;
    }

    if (!stripeCustomerId) {
      throw new Error('No Stripe customer found for user');
    }

    // Stripeクライアント初期化
    const stripe = createStripeClient();

    // 顧客が存在することを確認
    try {
      await stripe.customers.retrieve(stripeCustomerId);
    } catch (customerError) {
      console.error('Error retrieving customer:', customerError);
      throw new Error('Customer not found in Stripe');
    }

    // Customer Portal Sessionを作成
    console.log(`[${getStripeMode().toUpperCase()}] Creating customer portal session for user: ${user.id}`);

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    // 監査ログを記録
    logAuditEvent({
      eventType: 'customer_portal',
      userId: user.id,
      customerId: subscription.stripe_customer_id,
      action: 'session_created',
      details: {
        sessionId: session.id,
      },
    });

    // レスポンスを返す
    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return createErrorResponse(error, headers);
  }
});
