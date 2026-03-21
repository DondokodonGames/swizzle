/**
 * consume-game-credit/index.ts
 * ゲーム作成時にクレジットを消費するEdge Function
 *
 * 処理:
 *   1. 無料枠が残っている → free_games_remaining を -1
 *   2. 無料枠なし + 残高あり → balance_yen を -1
 *   3. どちらも0 → false を返す（作成不可）
 *
 * レスポンス:
 *   { allowed: boolean, free_games_remaining: number, balance_yen: number }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  getCorsHeaders,
  checkRateLimit,
  DEFAULT_RATE_LIMITS,
  createErrorResponse,
} from '../_shared/stripe.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const headers = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase configuration');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // レート制限（ゲーム作成はチェックアウトより緩め）
    const rateLimitResult = checkRateLimit(`consume:${user.id}`, { maxRequests: 60, windowMs: 60_000 });
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // RPC でアトミックに消費
    const { data, error } = await supabase.rpc('consume_game_credit');

    if (error) {
      console.error('consume_game_credit RPC error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...headers, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in consume-game-credit:', error);
    return createErrorResponse(error, headers);
  }
});
