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
    const { returnUrl } = await req.json();

    // バリデーション
    if (!returnUrl) {
      throw new Error('Missing returnUrl parameter');
    }

    // セキュリティ: リダイレクトURLの検証（オープンリダイレクト攻撃対策）
    const allowedOrigin = Deno.env.get('APP_URL') || Deno.env.get('SITE_URL');
    if (!allowedOrigin) {
      throw new Error('APP_URL environment variable not configured');
    }

    if (!isValidRedirectUrl(returnUrl, allowedOrigin)) {
      throw new Error('Invalid returnUrl: must be from the same origin');
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

    // ユーザーのStripe顧客IDを取得
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      throw new Error('No Stripe customer found for user');
    }

    // Stripeクライアント初期化
    const stripe = createStripeClient();

    // Customer Portal Sessionを作成
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    // レスポンスを返す
    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    
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