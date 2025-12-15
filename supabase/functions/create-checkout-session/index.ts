/**
 * create-checkout-session/index.ts
 * Stripe Checkout Sessionを作成するEdge Function
 * 
 * リクエスト:
 * {
 *   plan: 'premium',
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
import { createStripeClient, corsHeaders } from '../_shared/stripe.ts';

/**
 * URLが許可されたオリジンからのものかを検証（オープンリダイレクト対策）
 */
function isValidRedirectUrl(url: string, allowedOrigin: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const allowedUrl = new URL(allowedOrigin);
    // 同一オリジンのみ許可
    return parsedUrl.origin === allowedUrl.origin;
  } catch {
    return false;
  }
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // リクエストボディを取得
    const { plan, billingCycle, successUrl, cancelUrl } = await req.json();

    // バリデーション
    if (!plan || !billingCycle || !successUrl || !cancelUrl) {
      throw new Error('Missing required parameters');
    }

    // セキュリティ: リダイレクトURLの検証（オープンリダイレクト攻撃対策）
    const allowedOrigin = Deno.env.get('APP_URL') || Deno.env.get('SITE_URL');
    if (!allowedOrigin) {
      throw new Error('APP_URL environment variable not configured');
    }

    if (!isValidRedirectUrl(successUrl, allowedOrigin)) {
      throw new Error('Invalid successUrl: must be from the same origin');
    }

    if (!isValidRedirectUrl(cancelUrl, allowedOrigin)) {
      throw new Error('Invalid cancelUrl: must be from the same origin');
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

    // Price IDを取得
    const priceId = billingCycle === 'yearly'
      ? Deno.env.get('VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID')
      : Deno.env.get('VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID');

    if (!priceId) {
      throw new Error('Price ID not configured');
    }

    // Stripeクライアント初期化
    const stripe = createStripeClient();

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
    });

    // レスポンスを返す
    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});