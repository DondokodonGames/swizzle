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
import { createStripeClient } from '../_shared/stripe.ts';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

serve(async (req) => {
  try {
    // Webhook署名検証
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      throw new Error('Missing webhook signature or secret');
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
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
      });
    }

    // Supabaseクライアント初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // イベントタイプに応じて処理
    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});

/**
 * Checkout完了時の処理
 */
async function handleCheckoutCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan || 'premium';

  if (!userId) {
    console.error('No user_id in session metadata');
    return;
  }

  // サブスクリプション情報を取得
  const subscriptionId = session.subscription as string;
  const stripe = createStripeClient();
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
      stripe_price_id: subscription.items.data[0].price.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      metadata: session.metadata,
    });

  if (subError) {
    console.error('Error upserting subscription:', subError);
  }

  console.log('Checkout completed for user:', userId);
}

/**
 * サブスクリプション作成/更新時の処理
 */
async function handleSubscriptionChange(
  supabase: any,
  subscription: Stripe.Subscription
) {
  // Stripe顧客IDからユーザーを特定
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (!existingSub) {
    console.error('No user found for customer:', subscription.customer);
    return;
  }

  // サブスクリプション情報を更新
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0].price.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
    })
    .eq('user_id', existingSub.user_id);

  if (error) {
    console.error('Error updating subscription:', error);
  }

  console.log('Subscription updated for user:', existingSub.user_id);
}

/**
 * サブスクリプション削除時の処理
 */
async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  // Stripe顧客IDからユーザーを特定
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (!existingSub) {
    console.error('No user found for customer:', subscription.customer);
    return;
  }

  // サブスクリプションをキャンセル済みに更新
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', existingSub.user_id);

  if (error) {
    console.error('Error canceling subscription:', error);
  }

  console.log('Subscription deleted for user:', existingSub.user_id);
}

/**
 * 支払い成功時の処理
 */
async function handlePaymentSucceeded(
  supabase: any,
  invoice: Stripe.Invoice
) {
  // Stripe顧客IDからユーザーを特定
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (!existingSub) {
    console.error('No user found for customer:', invoice.customer);
    return;
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
  }

  console.log('Payment succeeded for user:', existingSub.user_id);
}

/**
 * 支払い失敗時の処理
 */
async function handlePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  // Stripe顧客IDからユーザーを特定
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (!existingSub) {
    console.error('No user found for customer:', invoice.customer);
    return;
  }

  // 支払い失敗を記録
  const { error } = await supabase.from('payments').insert({
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

  if (error) {
    console.error('Error saving failed payment:', error);
  }

  // サブスクリプションステータスを更新
  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('user_id', existingSub.user_id);

  console.log('Payment failed for user:', existingSub.user_id);
}