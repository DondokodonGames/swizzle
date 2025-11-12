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
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};