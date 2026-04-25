/**
 * create-payment-link/index.ts
 *
 * ゲームごとの Stripe Payment Link を作成し game_payment_config に保存する。
 * ゲームオーナーのみ呼び出し可能（Bearer トークンで認証）。
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
    // ユーザー認証
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(new Error('Unauthorized'), corsHeaders, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const anonSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await anonSupabase.auth.getUser();
    if (authError || !user) {
      return createErrorResponse(new Error('Unauthorized'), corsHeaders, 401);
    }

    const { gameId, priceYen, gameTitle } = await req.json();

    if (!gameId || typeof gameId !== 'string') {
      return createErrorResponse(new Error('gameId required'), corsHeaders, 400);
    }
    if (!priceYen || typeof priceYen !== 'number' || priceYen < 1) {
      return createErrorResponse(new Error('priceYen must be a positive integer'), corsHeaders, 400);
    }

    // ゲームオーナー確認
    const { data: game, error: gameErr } = await supabase
      .from('user_games')
      .select('id, title')
      .eq('id', gameId)
      .eq('creator_id', user.id)
      .maybeSingle();

    if (gameErr || !game) {
      return createErrorResponse(new Error('Game not found or not owned by user'), corsHeaders, 404);
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://playswizzle.com';
    const stripe = createStripeClient();

    // Price オブジェクト作成
    const price = await stripe.prices.create({
      currency: 'jpy',
      unit_amount: priceYen,
      product_data: {
        name: gameTitle || game.title || 'Swizzle ゲームプレイ',
        metadata: { game_id: gameId },
      },
    });

    // Payment Link 作成
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${appUrl}/play/${gameId}?session_id={CHECKOUT_SESSION_ID}`,
        },
      },
      metadata: {
        game_id: gameId,
        game_payment: 'true',
      },
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
    });

    // game_payment_config に upsert
    const { error: upsertErr } = await supabase
      .from('game_payment_config')
      .upsert({
        game_id: gameId,
        price_yen: priceYen,
        payment_link_id: paymentLink.id,
        payment_link_url: paymentLink.url,
        updated_at: new Date().toISOString(),
      });

    if (upsertErr) {
      console.error('DB upsert error:', upsertErr);
      return createErrorResponse(new Error('Failed to save payment config'), corsHeaders, 500);
    }

    return new Response(
      JSON.stringify({
        payment_link_id: paymentLink.id,
        payment_link_url: paymentLink.url,
        price_yen: priceYen,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-payment-link error:', err);
    return createErrorResponse(
      err instanceof Error ? err : new Error('internal_error'),
      corsHeaders,
      500,
    );
  }
});
