/**
 * _shared/sns-poster.ts
 * Deno-compatible SNS posting module.
 * Uses native fetch() and crypto.subtle — no npm packages needed.
 */

export interface GameRecord {
  id: string;
  title: string;
  thumbnail_url: string | null;
  tiktok_video_url?: string | null;
}

export interface PostResult {
  success: boolean;
  post_id?: string;
  error?: string;
}

interface TwitterCreds {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

// ──────────────────────────────────────────────
// Caption generation via Claude API
// ──────────────────────────────────────────────

async function generateCaption(game: GameRecord, platform: 'twitter' | 'instagram'): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const prompt = platform === 'twitter'
    ? `新作ゲーム紹介ツイートを1件作成してください。\nゲーム名: ${game.title}\n要件: 280文字以内・魅力的・絵文字3-5個・ハッシュタグ3個(#Swizzle必須)。\n出力: ツイート本文のみ。`
    : `Instagram投稿キャプションを作成してください。\nゲーム名: ${game.title}\n要件: 150-200文字・絵文字適度・CTA「プロフィールリンクから」・末尾にハッシュタグ20個(#swizzle #indiegame等)。\n出力: キャプション本文のみ。`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const json = await res.json();
  return (json.content[0] as { text: string }).text.trim();
}

// ──────────────────────────────────────────────
// Twitter OAuth 1.0a helpers
// ──────────────────────────────────────────────

async function hmacSha1Base64(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function oauthHeader(
  method: string,
  url: string,
  extraParams: Record<string, string>,
  creds: TwitterCreds,
): Promise<string> {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const ts = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: ts,
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  };

  const all = { ...extraParams, ...oauthParams };
  const sortedParamStr = Object.entries(all)
    .map(([k, v]) => [encodeURIComponent(k), encodeURIComponent(v)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const baseString = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(sortedParamStr)].join('&');
  const signingKey = `${encodeURIComponent(creds.apiSecret)}&${encodeURIComponent(creds.accessSecret)}`;
  const signature = await hmacSha1Base64(signingKey, baseString);

  oauthParams['oauth_signature'] = signature;
  return 'OAuth ' + Object.entries(oauthParams)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ');
}

// ──────────────────────────────────────────────
// Twitter posting
// ──────────────────────────────────────────────

async function uploadTwitterMedia(imageUrl: string, creds: TwitterCreds): Promise<string | null> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) return null;
  const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
  const base64 = btoa(String.fromCharCode(...imgBytes));

  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
  const params = { media_data: base64 };
  const auth = await oauthHeader('POST', uploadUrl, {}, creds);

  const form = new URLSearchParams();
  form.set('media_data', base64);

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  if (!res.ok) {
    console.error('Twitter media upload failed:', await res.text());
    return null;
  }
  const json = await res.json();
  return json.media_id_string as string;
}

export async function postToTwitter(game: GameRecord): Promise<PostResult> {
  const apiKey = Deno.env.get('TWITTER_API_KEY');
  const apiSecret = Deno.env.get('TWITTER_API_SECRET');
  const accessToken = Deno.env.get('TWITTER_ACCESS_TOKEN');
  const accessSecret = Deno.env.get('TWITTER_ACCESS_SECRET');

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return { success: false, error: 'Twitter credentials not configured' };
  }
  const creds: TwitterCreds = { apiKey, apiSecret, accessToken, accessSecret };

  try {
    const text = await generateCaption(game, 'twitter');

    let mediaId: string | null = null;
    if (game.thumbnail_url) {
      mediaId = await uploadTwitterMedia(game.thumbnail_url, creds);
    }

    const tweetUrl = 'https://api.twitter.com/2/tweets';
    const body: Record<string, unknown> = { text };
    if (mediaId) body.media = { media_ids: [mediaId] };

    const auth = await oauthHeader('POST', tweetUrl, {}, creds);
    const res = await fetch(tweetUrl, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `Twitter API error ${res.status}: ${err}` };
    }
    const json = await res.json();
    return { success: true, post_id: json.data?.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ──────────────────────────────────────────────
// Instagram posting (Graph API v18.0)
// ──────────────────────────────────────────────

export async function postToInstagram(game: GameRecord): Promise<PostResult> {
  const accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
  const businessId = Deno.env.get('INSTAGRAM_BUSINESS_ID');

  if (!accessToken || !businessId) {
    return { success: false, error: 'Instagram credentials not configured' };
  }
  if (!game.thumbnail_url) {
    return { success: false, error: 'No thumbnail_url for Instagram image post' };
  }

  try {
    const caption = await generateCaption(game, 'instagram');

    // Step 1: create media container
    const containerUrl = `https://graph.facebook.com/v18.0/${businessId}/media`;
    const containerParams = new URLSearchParams({
      image_url: game.thumbnail_url,
      caption,
      access_token: accessToken,
    });

    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerParams.toString(),
    });

    if (!containerRes.ok) {
      const err = await containerRes.text();
      return { success: false, error: `Instagram container error ${containerRes.status}: ${err}` };
    }
    const { id: creationId } = await containerRes.json();

    // Step 2: publish
    const publishUrl = `https://graph.facebook.com/v18.0/${businessId}/media_publish`;
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken,
    });

    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publishParams.toString(),
    });

    if (!publishRes.ok) {
      const err = await publishRes.text();
      return { success: false, error: `Instagram publish error ${publishRes.status}: ${err}` };
    }
    const { id: postId } = await publishRes.json();
    return { success: true, post_id: postId };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ──────────────────────────────────────────────
// TikTok posting (Content Posting API — PULL_FROM_URL)
// ──────────────────────────────────────────────

export async function postToTikTok(game: GameRecord): Promise<PostResult> {
  const accessToken = Deno.env.get('TIKTOK_ACCESS_TOKEN');
  if (!accessToken) return { success: false, error: 'TikTok access token not configured' };
  if (!game.tiktok_video_url) return { success: false, error: 'No tiktok_video_url' };

  try {
    const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: game.title,
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: game.tiktok_video_url,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `TikTok API error ${res.status}: ${err}` };
    }
    const json = await res.json();
    return { success: true, post_id: json.data?.publish_id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
