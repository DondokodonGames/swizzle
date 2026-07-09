/**
 * send-notification-email/index.ts
 * WP60 P2-4: メール通知（フォロー/いいね/週間ダイジェスト）
 *
 * 呼び出し元(NotificationService)がフォロー/いいね発生時にベストエフォートで
 * invoke する。以下の場合は何もせず 200 skipped を返す（呼び出し元のUXを壊さない）:
 *   - RESEND_API_KEY 未設定（ローカル/プレビュー環境ではメール送信を完全にスキップ）
 *   - 宛先ユーザーが email_notifications_enabled = false（オプトイン未設定）
 *
 * 認証: サービスロールで呼ぶ想定だが、フロントエンドの認証済みユーザーからも
 * 呼べるよう匿名キーでも受け付ける（レート制限で濫用を抑止）。
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, checkRateLimit, createErrorResponse } from '../_shared/stripe.ts';

type NotificationEmailType = 'follow' | 'like' | 'weekly_digest';

interface EmailPayload {
  type: NotificationEmailType;
  to_user_id: string;
  from_user_name?: string;
  game_title?: string;
  digest_summary?: string;
}

function renderEmail(payload: EmailPayload): { subject: string; html: string } {
  const siteUrl = 'https://playswizzle.com';

  if (payload.type === 'follow') {
    return {
      subject: `${payload.from_user_name || 'Someone'} started following you on Swizzle`,
      html: `<p>${payload.from_user_name || 'Someone'} started following you on Swizzle.</p><p><a href="${siteUrl}">Open Swizzle</a></p>`,
    };
  }

  if (payload.type === 'like') {
    return {
      subject: `${payload.from_user_name || 'Someone'} liked your game "${payload.game_title || ''}"`,
      html: `<p>${payload.from_user_name || 'Someone'} liked your game "${payload.game_title || ''}" on Swizzle.</p><p><a href="${siteUrl}">Open Swizzle</a></p>`,
    };
  }

  return {
    subject: 'Your weekly Swizzle digest',
    html: `<p>${payload.digest_summary || 'Here is what happened this week on Swizzle.'}</p><p><a href="${siteUrl}">Open Swizzle</a></p>`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const headers = getCorsHeaders(req);

  try {
    const payload = (await req.json()) as EmailPayload;
    if (!payload?.to_user_id || !payload?.type) {
      throw new Error('to_user_id and type are required');
    }

    const rateLimitResult = await checkRateLimit(`send-notification-email:${payload.to_user_id}`, {
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ skipped: 'no_resend_api_key' }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabase
      .from('profiles')
      .select('email_notifications_enabled')
      .eq('id', payload.to_user_id)
      .maybeSingle();

    if (!profile?.email_notifications_enabled) {
      return new Response(JSON.stringify({ skipped: 'not_opted_in' }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(payload.to_user_id);
    const toEmail = userResult?.user?.email;
    if (userError || !toEmail) {
      return new Response(JSON.stringify({ skipped: 'no_email_on_file' }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const { subject, html } = renderEmail(payload);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Swizzle <notifications@playswizzle.com>',
        to: toEmail,
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      throw new Error(`Resend API error: ${resendResponse.status} ${errText}`);
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return createErrorResponse(error as Error, headers, 400);
  }
});
