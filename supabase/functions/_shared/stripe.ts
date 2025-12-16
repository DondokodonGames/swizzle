/**
 * _shared/stripe.ts
 * Edge Functions間で共有するStripeクライアント設定
 */

import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

/**
 * Stripeクライアントを初期化
 */
export function createStripeClient(): Stripe {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * CORS対応のヘッダー
 * セキュリティのため、許可するオリジンを明示的に指定
 */
const ALLOWED_ORIGINS = [
  'https://playswizzle.com',
  'https://www.playswizzle.com',
  'http://localhost:5173',  // 開発環境
  'http://localhost:3000',  // 開発環境
];

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

// 後方互換性のため維持（非推奨：getCorsHeadersを使用してください）
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://playswizzle.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};