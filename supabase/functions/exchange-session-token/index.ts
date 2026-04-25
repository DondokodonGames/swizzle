/**
 * exchange-session-token/index.ts
 *
 * Stripe の session_id を one_time_access トークンに引き換える。
 * Payment Link 決済後のリダイレクト先から呼ばれる。
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  createStripeClient,
  getCorsHeaders,
  createErrorResponse,
} from '../_shared/stripe.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId || typeof sessionId !== 'string') {
      return createErrorResponse(new Error('session_id required'), corsHeaders, 400);
    }

    const stripe = createStripeClient();

    // Stripe でセッションを検証（偽造 session_id を防ぐ）
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return createErrorResponse(new Error('payment_not_completed'), corsHeaders, 402);
    }

    // game_payment セッションであることを確認
    if (session.metadata?.game_payment !== 'true') {
      return createErrorResponse(new Error('invalid_session_type'), corsHeaders, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase
      .from('one_time_access')
      .select('token, expires_at')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (error) {
      console.error('DB lookup error:', error);
      return createErrorResponse(new Error('db_error'), corsHeaders, 500);
    }

    if (!data) {
      // Webhook がまだ処理されていない可能性（数秒のラグ）
      return createErrorResponse(new Error('token_not_found'), corsHeaders, 404);
    }

    if (new Date(data.expires_at) < new Date()) {
      return createErrorResponse(new Error('token_expired'), corsHeaders, 410);
    }

    return new Response(
      JSON.stringify({ token: data.token, expires_at: data.expires_at }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('exchange-session-token error:', err);
    return createErrorResponse(
      err instanceof Error ? err : new Error('internal_error'),
      corsHeaders,
      500,
    );
  }
});
