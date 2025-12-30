/**
 * stripe-webhook/index.ts
 * Stripeからのwebhookイベントを処理するEdge Function
 *
 * 処理するイベント:
 * - checkout.session.completed: 新規サブスクリプション作成
 * - customer.subscription.created: サブスクリプション作成
 * - customer.subscription.updated: サブスクリプション更新
 * - customer.subscription.deleted: サブスクリプション削除
 * - invoice.payment_succeeded: 支払い成功
 * - invoice.payment_failed: 支払い失敗
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  createStripeClient,
  validateProductionEnvironment,
  logWebhookEvent,
  checkRateLimit,
  DEFAULT_RATE_LIMITS,
  getStripeMode,
} from '../_shared/stripe.ts';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

/**
 * Webhookエラークラス
 * 再試行可能なエラーと再試行不可能なエラーを区別
 */
class WebhookError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean = false,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

serve(async (req) => {
  const startTime = Date.now();

  try {
    // 本番環境の設定検証
    validateProductionEnvironment();

    // Webhook署名検証
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      throw new WebhookError('Missing webhook signature or secret', false, 401);
    }

    const stripe = createStripeClient();
    const body = await req.text();

    // イベントを検証
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      logWebhookEvent('signature_verification_failed', '', undefined, undefined, false, err.message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
      });
    }

    // レート制限チェック（イベントタイプ別）
    const rateLimitKey = `webhook:${event.type}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, DEFAULT_RATE_LIMITS.webhook);

    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for ${event.type}`);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      });
    }

    // Supabaseクライアント初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new WebhookError('Missing Supabase configuration', false, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // イベントタイプに応じて処理
    console.log(`[${getStripeMode().toUpperCase()}] Processing webhook event: ${event.type} (${event.id})`);

    let userId: string | undefined;
    let customerId: string | undefined;

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          customerId = session.customer as string;
          userId = session.metadata?.user_id;
          await handleCheckoutCompleted(supabase, stripe, session);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          customerId = subscription.customer as string;
          const result = await handleSubscriptionChange(supabase, subscription);
          userId = result?.userId;
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          customerId = subscription.customer as string;
          const result = await handleSubscriptionDeleted(supabase, subscription);
          userId = result?.userId;
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          customerId = invoice.customer as string;
          const result = await handlePaymentSucceeded(supabase, invoice);
          userId = result?.userId;
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          customerId = invoice.customer as string;
          const result = await handlePaymentFailed(supabase, invoice);
          userId = result?.userId;
          break;
        }

        default:
          console.log('Unhandled event type:', event.type);
      }

      // 成功をログ
      const processingTime = Date.now() - startTime;
      logWebhookEvent(event.type, event.id, userId, customerId, true);
      console.log(`Webhook processed successfully in ${processingTime}ms`);

      return new Response(JSON.stringify({ received: true }), { status: 200 });

    } catch (handlerError) {
      // ハンドラー内でのエラー
      logWebhookEvent(event.type, event.id, userId, customerId, false, handlerError.message);

      if (handlerError instanceof WebhookError) {
        throw handlerError;
      }

      // DB更新エラーなどは再試行可能
      throw new WebhookError(
        `Handler error: ${handlerError.message}`,
        true,  // 再試行可能
        500
      );
    }

  } catch (error) {
    console.error('Webhook error:', error);

    // WebhookErrorの場合は適切なステータスコードを返す
    if (error instanceof WebhookError) {
      const response: { error: string; retryable?: boolean } = { error: error.message };

      // 再試行可能なエラーの場合は500を返してStripeに再試行させる
      if (error.retryable) {
        response.retryable = true;
        return new Response(JSON.stringify(response), { status: 500 });
      }

      return new Response(JSON.stringify(response), { status: error.statusCode });
    }

    // 予期しないエラーは500を返す（Stripeが再試行する）
    return new Response(
      JSON.stringify({ error: 'Internal server error', retryable: true }),
      { status: 500 }
    );
  }
});

/**
 * Checkout完了時の処理
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan || 'premium';

  if (!userId) {
    throw new WebhookError('No user_id in session metadata', false);
  }

  // サブスクリプション情報を取得
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    throw new WebhookError('No subscription ID in session', false);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Supabaseに保存
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_type: plan,
      status: subscription.status,
      stripe_customer_id: session.customer,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      metadata: session.metadata,
      updated_at: new Date().toISOString(),
    });

  if (subError) {
    console.error('Error upserting subscription:', subError);
    throw new WebhookError(`Database error: ${subError.message}`, true);
  }

  console.log('Checkout completed for user:', userId);
}

/**
 * サブスクリプション作成/更新時の処理
 */
async function handleSubscriptionChange(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
): Promise<{ userId?: string }> {
  // Stripe顧客IDからユーザーを特定
  const { data: existingSub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = no rows found（これは新規顧客の可能性があるのでエラーではない）
    console.error('Error fetching subscription:', fetchError);
  }

  if (!existingSub) {
    // 新規顧客の場合はcheckout.session.completedで処理されるので、ここではスキップ
    console.log('No existing subscription found for customer:', subscription.customer);
    return {};
  }

  // サブスクリプション情報を更新
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', existingSub.user_id);

  if (error) {
    console.error('Error updating subscription:', error);
    throw new WebhookError(`Database error: ${error.message}`, true);
  }

  console.log('Subscription updated for user:', existingSub.user_id);
  return { userId: existingSub.user_id };
}

/**
 * サブスクリプション削除時の処理
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
): Promise<{ userId?: string }> {
  // Stripe顧客IDからユーザーを特定
  const { data: existingSub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (fetchError) {
    console.error('Error fetching subscription:', fetchError);
  }

  if (!existingSub) {
    console.error('No user found for customer:', subscription.customer);
    return {};
  }

  // サブスクリプションをキャンセル済みに更新
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', existingSub.user_id);

  if (error) {
    console.error('Error canceling subscription:', error);
    throw new WebhookError(`Database error: ${error.message}`, true);
  }

  console.log('Subscription deleted for user:', existingSub.user_id);
  return { userId: existingSub.user_id };
}

/**
 * 支払い成功時の処理
 */
async function handlePaymentSucceeded(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
): Promise<{ userId?: string }> {
  // Stripe顧客IDからユーザーを特定
  const { data: existingSub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (fetchError) {
    console.error('Error fetching subscription:', fetchError);
  }

  if (!existingSub) {
    console.error('No user found for customer:', invoice.customer);
    return {};
  }

  // 支払い履歴を保存
  const { error } = await supabase.from('payments').insert({
    user_id: existingSub.user_id,
    amount: invoice.amount_paid / 100, // セントからドルに変換
    currency: invoice.currency,
    payment_type: 'subscription',
    status: 'succeeded',
    stripe_payment_intent_id: invoice.payment_intent,
    stripe_invoice_id: invoice.id,
    description: invoice.description || 'Subscription payment',
    metadata: {},
  });

  if (error) {
    console.error('Error saving payment:', error);
    throw new WebhookError(`Database error: ${error.message}`, true);
  }

  console.log('Payment succeeded for user:', existingSub.user_id);
  return { userId: existingSub.user_id };
}

/**
 * 支払い失敗時の処理
 */
async function handlePaymentFailed(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
): Promise<{ userId?: string }> {
  // Stripe顧客IDからユーザーを特定
  const { data: existingSub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (fetchError) {
    console.error('Error fetching subscription:', fetchError);
  }

  if (!existingSub) {
    console.error('No user found for customer:', invoice.customer);
    return {};
  }

  // 支払い失敗を記録
  const { error: paymentError } = await supabase.from('payments').insert({
    user_id: existingSub.user_id,
    amount: invoice.amount_due / 100,
    currency: invoice.currency,
    payment_type: 'subscription',
    status: 'failed',
    stripe_payment_intent_id: invoice.payment_intent,
    stripe_invoice_id: invoice.id,
    description: invoice.description || 'Failed subscription payment',
    metadata: {},
  });

  if (paymentError) {
    console.error('Error saving failed payment:', paymentError);
    throw new WebhookError(`Database error: ${paymentError.message}`, true);
  }

  // サブスクリプションステータスを更新
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', existingSub.user_id);

  if (subError) {
    console.error('Error updating subscription status:', subError);
    throw new WebhookError(`Database error: ${subError.message}`, true);
  }

  console.log('Payment failed for user:', existingSub.user_id);
  return { userId: existingSub.user_id };
}
