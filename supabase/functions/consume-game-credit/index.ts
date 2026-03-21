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

    const token = authHeader.replace('Bearer ', '');

    // ユーザーの JWT を Authorization ヘッダーに含めることで auth.uid() が正しく機能する
    // サービスロールキーは RLS バイパスに使用し、JWT はユーザーコンテキスト確立に使用
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // レート制限（ゲーム作成はチェックアウトより緩め）
    const rateLimitResult = await checkRateLimit(`consume:${user.id}`, { maxRequests: 60, windowMs: 60_000 });
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // 事前チェックのみ（実際の消費は user_games INSERT トリガーが担当）
    // Edge Function + トリガーの二重消費を防ぐため check_wallet_can_play を使用
    const { data: canPlay, error: checkError } = await supabase.rpc('check_wallet_can_play');

    if (checkError) {
      console.error('check_wallet_can_play RPC error:', checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    // UI 表示用にウォレット残高も返す
    const { data: walletRow } = await supabase
      .from('user_wallets')
      .select('free_games_remaining, balance_yen')
      .eq('user_id', user.id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        allowed: canPlay,
        free_games_remaining: walletRow?.free_games_remaining ?? 0,
        balance_yen: walletRow?.balance_yen ?? 0,
      }),
      { headers: { ...headers, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in consume-game-credit:', error);
    return createErrorResponse(error, headers);
  }
});
