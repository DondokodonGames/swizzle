/**
 * create-checkout-session/index.ts
 * Stripe Checkout Session を作成するEdge Function
 *
 * 対応モード:
 *   mode = 'topup'  → 一回払い（クレジットチャージ）
 *   mode = 'subscription' (後方互換) → サブスクリプション
 *
 * チャージリクエスト:
 * {
 *   mode: 'topup',
 *   amount_yen: number,   // 100 | 500 | 1000 | 3000
 *   successUrl: string,
 *   cancelUrl: string
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
  logCheckoutEvent,
  createErrorResponse,
  getStripeMode,
} from '../_shared/stripe.ts';

const ALLOWED_TOPUP_AMOUNTS = [100, 500, 1000, 3000];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const headers = getCorsHeaders(req);

  try {
    validateProductionEnvironment();

    const body = await req.json();
    const { mode = 'topup', successUrl, cancelUrl } = body;

    if (!successUrl || !cancelUrl) {
      throw new Error('Missing required parameters: successUrl, cancelUrl');
    }
    if (!isValidRedirectUrl(successUrl) || !isValidRedirectUrl(cancelUrl)) {
      throw new Error('Invalid redirect URL');
    }

    // 認証
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase configuration');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // レート制限
    const rateLimitResult = await checkRateLimit(`checkout:${user.id}`, DEFAULT_RATE_LIMITS.checkout);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    const stripe = createStripeClient();

    // ---- Top-up モード ----
    if (mode === 'topup') {
      const amountYen: number = body.amount_yen;
      if (!amountYen || !ALLOWED_TOPUP_AMOUNTS.includes(amountYen)) {
        throw new Error(`Invalid amount_yen. Must be one of: ${ALLOWED_TOPUP_AMOUNTS.join(', ')}`);
      }

      // Stripe顧客を取得/作成
      const { data: walletRow } = await supabase
        .from('user_wallets')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let customerId: string | undefined = walletRow?.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;

        // ウォレットに顧客IDを保存（upsert）
        // 失敗すると次回チャージ時に重複 Customer が作成されるため、エラーは致命的として扱う
        const { error: walletUpsertError } = await supabase.from('user_wallets').upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        });
        if (walletUpsertError) {
          console.error('Failed to save stripe_customer_id to user_wallets:', walletUpsertError);
          throw new Error(`Failed to save customer info: ${walletUpsertError.message}`);
        }
      }

      console.log(`[${getStripeMode().toUpperCase()}] Creating topup session: user=${user.id} amount=${amountYen}¥`);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: 'jpy',
              product_data: {
                name: `Swizzle ゲームクレジット ${amountYen}円`,
                description: `${amountYen}ゲーム分のクレジット（1ゲーム=1円）`,
              },
              unit_amount: amountYen, // JPYは最小単位が円
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: user.id,
          topup_mode: 'true',
          amount_yen: String(amountYen),
        },
      });

      logCheckoutEvent('topup_session_created', user.id, session.id, 'topup', String(amountYen));

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ---- サブスクリプションモード（後方互換） ----
    const { plan, billingCycle } = body;
    if (!plan || !billingCycle) {
      throw new Error('Missing plan or billingCycle for subscription mode');
    }

    const priceId = billingCycle === 'yearly'
      ? Deno.env.get('VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID')
      : Deno.env.get('VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID');

    if (!priceId) throw new Error('Price ID not configured');

    const price = await stripe.prices.retrieve(priceId);
    if (!price.active) throw new Error('Selected price is no longer active');

    const { data: subscription, error: subLookupError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subLookupError) throw new Error(`Subscription lookup failed: ${subLookupError.message}`);

    let customerId = subscription?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, plan, billing_cycle: billingCycle },
      subscription_data: { metadata: { user_id: user.id, plan, billing_cycle: billingCycle } },
    });

    logCheckoutEvent('session_created', user.id, session.id, plan, billingCycle);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...headers, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return createErrorResponse(error, headers);
  }
});
