/**
 * validate-play-token/index.ts
 *
 * プレイトークンをサーバーサイドで検証し、play_count をインクリメントする。
 * ゲーム起動前に必ず呼び出すことで不正利用を防ぐ。
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, createErrorResponse } from '../_shared/stripe.ts';

const DEFAULT_MAX_PLAY_COUNT = 3;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, gameId } = await req.json();

    if (!token || typeof token !== 'string') {
      return createErrorResponse(new Error('token required'), corsHeaders, 400);
    }
    if (!gameId || typeof gameId !== 'string') {
      return createErrorResponse(new Error('gameId required'), corsHeaders, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // トークン取得
    const { data: access, error: fetchErr } = await supabase
      .from('one_time_access')
      .select('id, game_id, expires_at, used_at, play_count')
      .eq('token', token)
      .maybeSingle();

    if (fetchErr) {
      console.error('DB fetch error:', fetchErr);
      return createErrorResponse(new Error('db_error'), corsHeaders, 500);
    }

    if (!access) {
      return createErrorResponse(new Error('token_not_found'), corsHeaders, 404);
    }

    // ゲームID の一致確認（別ゲームへのトークン転用を防ぐ）
    if (access.game_id !== gameId) {
      return createErrorResponse(new Error('token_game_mismatch'), corsHeaders, 403);
    }

    // 有効期限チェック
    if (new Date(access.expires_at) < new Date()) {
      return createErrorResponse(new Error('token_expired'), corsHeaders, 410);
    }

    // ゲームごとの上限取得
    const { data: cfg } = await supabase
      .from('game_payment_config')
      .select('max_play_count')
      .eq('game_id', gameId)
      .maybeSingle();

    const maxPlayCount: number = cfg?.max_play_count ?? DEFAULT_MAX_PLAY_COUNT;

    // play_count 上限チェック
    if (access.play_count >= maxPlayCount) {
      return createErrorResponse(new Error('play_limit_reached'), corsHeaders, 403);
    }

    const now = new Date().toISOString();

    // play_count インクリメント + 初回アクセス時刻を記録
    const { error: updateErr } = await supabase
      .from('one_time_access')
      .update({
        play_count: access.play_count + 1,
        used_at: access.used_at ?? now,
      })
      .eq('id', access.id);

    if (updateErr) {
      console.error('DB update error:', updateErr);
      return createErrorResponse(new Error('db_error'), corsHeaders, 500);
    }

    const playsRemaining = maxPlayCount - (access.play_count + 1);

    return new Response(
      JSON.stringify({
        valid: true,
        plays_used: access.play_count + 1,
        plays_remaining: playsRemaining,
        max_play_count: maxPlayCount,
        expires_at: access.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('validate-play-token error:', err);
    return createErrorResponse(
      err instanceof Error ? err : new Error('internal_error'),
      corsHeaders,
      500,
    );
  }
});
