/**
 * on-game-published/index.ts
 *
 * Supabase Database Webhook で呼び出される。
 * user_games の is_published が false → true に変わった時に
 * Twitter / Instagram / TikTok に自動投稿する（管理者ゲームのみ）。
 *
 * Webhook 設定:
 *   Table: user_games  Event: UPDATE
 *   HTTP Header: x-webhook-secret: {WEBHOOK_SECRET}
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { postToTwitter, postToInstagram, postToTikTok, type GameRecord } from '../_shared/sns-poster.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Webhook シークレット検証
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (secret && req.headers.get('x-webhook-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();
    const record = payload.record as Record<string, unknown>;
    const oldRecord = payload.old_record as Record<string, unknown>;

    // is_published: false → true のイベントだけ処理
    if (!record.is_published || oldRecord.is_published === true) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 管理者チェック
    const creatorId = record.creator_id as string;
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', creatorId)
      .maybeSingle();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ skipped: 'not_admin' }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const game: GameRecord = {
      id: record.id as string,
      title: record.title as string,
      thumbnail_url: (record.thumbnail_url as string | null) ?? null,
      tiktok_video_url: (record.tiktok_video_url as string | null) ?? null,
    };

    // Twitter + Instagram を並行投稿
    const [twitterResult, instagramResult] = await Promise.all([
      postToTwitter(game),
      postToInstagram(game),
    ]);

    // TikTok は動画URLがある時だけ
    const tiktokResult = game.tiktok_video_url ? await postToTikTok(game) : null;

    // ログを marketing_post_log に記録
    const logs = [
      { platform: 'twitter', ...twitterResult },
      { platform: 'instagram', ...instagramResult },
      ...(tiktokResult ? [{ platform: 'tiktok', ...tiktokResult }] : []),
    ];

    await supabase.from('marketing_post_log').insert(
      logs.map(({ platform, success, post_id, error }) => ({
        game_id: game.id,
        platform,
        success,
        post_id: post_id ?? null,
        error_message: error ?? null,
      })),
    );

    return new Response(JSON.stringify({ twitter: twitterResult, instagram: instagramResult, tiktok: tiktokResult }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('on-game-published error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'internal_error' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
