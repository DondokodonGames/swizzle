/**
 * remove-billing-trigger/index.ts
 *
 * 一回限りの管理者用エッジファンクション。
 * ゲーム作成時のクレジット消費トリガーを削除し、カウンターのみのトリガーに置き換える。
 *
 * これは migration 20260506_remove_credit_on_game_create.sql と同等の処理を
 * Supabase CLI なしで適用するためのもの。
 *
 * 呼び出し方:
 *   curl -X POST https://<PROJECT>.supabase.co/functions/v1/remove-billing-trigger \
 *     -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
 *     -H "x-admin-secret: <ADMIN_SECRET>"
 *
 * ADMIN_SECRET は Supabase Dashboard → Edge Functions → Secrets で設定する。
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // 管理者シークレット確認
  const adminSecret = req.headers.get('x-admin-secret');
  const expectedSecret = Deno.env.get('ADMIN_SECRET');
  if (!expectedSecret || adminSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase configuration' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Migration SQL: ゲーム作成課金トリガーを削除し、カウンターのみのトリガーに置換
  const migrationSql = `
    -- 1. クレジット消費トリガー・関数を削除
    DROP TRIGGER IF EXISTS trg_on_game_created_consume_credit ON public.user_games;
    DROP FUNCTION IF EXISTS public.on_game_created_consume_credit();

    -- 2. カウンターのみのトリガーを追加（クレジット消費なし）
    CREATE OR REPLACE FUNCTION public.on_game_created_increment_count()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      INSERT INTO public.user_wallets (user_id, total_games_created)
      VALUES (NEW.creator_id, 1)
      ON CONFLICT (user_id) DO UPDATE
      SET
        total_games_created = user_wallets.total_games_created + 1,
        updated_at          = NOW();
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_on_game_created_increment_count ON public.user_games;
    CREATE TRIGGER trg_on_game_created_increment_count
      AFTER INSERT ON public.user_games
      FOR EACH ROW EXECUTE FUNCTION public.on_game_created_increment_count();
  `;

  try {
    const { error } = await supabase.rpc('exec_migration', { sql: migrationSql });
    if (error) {
      // exec_migration RPC が存在しない場合のフォールバック
      console.error('exec_migration RPC not found, trying direct approach:', error);
      return new Response(
        JSON.stringify({
          error: 'Could not apply migration automatically. Please run the SQL manually in Supabase Dashboard > SQL Editor.',
          sql: migrationSql,
          originalError: error.message,
        }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Billing trigger removed successfully.' }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: String(err),
        message: 'Please apply the migration manually via Supabase Dashboard > SQL Editor.',
        sql: migrationSql,
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
