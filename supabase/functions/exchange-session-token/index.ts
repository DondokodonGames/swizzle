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
      return createErrorResponse('session_id required', 400, corsHeaders);
    }

    const stripe = createStripeClient();

    // Stripe でセッションを検証（偽造 session_id を防ぐ）
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return createErrorResponse('payment_not_completed', 402, corsHeaders);
    }

    // game_payment セッションであることを確認
    if (session.metadata?.game_payment !== 'true') {
      return createErrorResponse('invalid_session_type', 400, corsHeaders);
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
      return createErrorResponse('db_error', 500, corsHeaders);
    }

    if (!data) {
      // Webhook がまだ処理されていない可能性（数秒のラグ）
      return createErrorResponse('token_not_found', 404, corsHeaders);
    }

    if (new Date(data.expires_at) < new Date()) {
      return createErrorResponse('token_expired', 410, corsHeaders);
    }

    return new Response(
      JSON.stringify({ token: data.token, expires_at: data.expires_at }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('exchange-session-token error:', err);
    return createErrorResponse('internal_error', 500, corsHeaders);
  }
});
