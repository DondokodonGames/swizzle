/**
 * delete-account/index.ts
 * WP60 P0-2: アカウント削除（退会）
 *
 * 処理:
 *   1. 呼び出し元 JWT からユーザーを特定
 *   2. そのユーザーが作成した公開ゲームを非公開化（ハード削除はしない: 他ユーザーの
 *      いいね/プレイ履歴/決済履歴からの参照を壊さないため。削除方針は運用判断で見直し可）
 *   3. profiles 行を削除（cascadeに依存せず明示的に削除）
 *   4. auth.users を削除（以降ログイン不可になる。認可上の最終確定操作）
 *
 * 冪等性: 既に削除済みのリソースに対するエラーは無視して続行する。
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, checkRateLimit, createErrorResponse } from '../_shared/stripe.ts';

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const rateLimitResult = await checkRateLimit(`delete-account:${user.id}`, { maxRequests: 3, windowMs: 60_000 });
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // 1. 公開ゲームを非公開化（ベストエフォート）
    const { error: unpublishError } = await supabase
      .from('user_games')
      .update({ is_published: false })
      .eq('creator_id', user.id);
    if (unpublishError) {
      console.error('[delete-account] Failed to unpublish games (non-fatal):', unpublishError);
    }

    // 2. profiles 行を削除（ベストエフォート）
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);
    if (profileError) {
      console.error('[delete-account] Failed to delete profile (non-fatal):', profileError);
    }

    // 3. auth.users を削除（最終確定操作。失敗はクライアントに伝える）
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      throw new Error(`Failed to delete auth user: ${deleteUserError.message}`);
    }

    console.log(`[delete-account] Deleted account for user=${user.id}`);

    return new Response(JSON.stringify({ deleted: true }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return createErrorResponse(error as Error, headers, 400);
  }
});
