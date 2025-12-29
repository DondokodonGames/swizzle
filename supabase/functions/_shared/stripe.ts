/**
 * _shared/stripe.ts
 * Edge Functions間で共有するStripeクライアント設定とセキュリティユーティリティ
 */

import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

// ============================================
// Stripe モード判定
// ============================================

/**
 * 現在のStripeモードを取得
 */
export type StripeMode = 'test' | 'live';

export function getStripeMode(): StripeMode {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
  return secretKey.startsWith('sk_live_') ? 'live' : 'test';
}

/**
 * テストモードかどうかを判定
 */
export function isTestMode(): boolean {
  return getStripeMode() === 'test';
}

/**
 * 本番モードかどうかを判定
 */
export function isLiveMode(): boolean {
  return getStripeMode() === 'live';
}

/**
 * 本番環境で必須の環境変数をチェック
 * 本番モードの場合のみエラーをスローする
 */
export function validateProductionEnvironment(): void {
  if (!isLiveMode()) {
    console.log('[Stripe] Running in TEST mode');
    return;
  }

  console.log('[Stripe] Running in LIVE mode - validating environment');

  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID',
    'VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'APP_URL',
  ];

  const missing = requiredEnvVars.filter(key => !Deno.env.get(key));

  if (missing.length > 0) {
    throw new Error(`[PRODUCTION] Missing required environment variables: ${missing.join(', ')}`);
  }
}

// ============================================
// Stripe クライアント
// ============================================

/**
 * Stripeクライアントを初期化
 */
export function createStripeClient(): Stripe {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  // APIバージョンを最新に更新（2024-06-20）
  return new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

// ============================================
// CORS設定
// ============================================

/**
 * 許可されるオリジンのリスト
 */
const ALLOWED_ORIGINS = [
  'https://playswizzle.com',
  'https://www.playswizzle.com',
  'http://localhost:5173',  // 開発環境
  'http://localhost:3000',  // 開発環境
];

/**
 * CORS対応のヘッダーを取得（動的オリジン対応）
 */
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

// ============================================
// 入力バリデーション
// ============================================

/**
 * 許可されるプランタイプ
 */
export const VALID_PLAN_TYPES = ['premium', 'pro'] as const;
export type PlanType = typeof VALID_PLAN_TYPES[number];

/**
 * 許可される請求サイクル
 */
export const VALID_BILLING_CYCLES = ['monthly', 'yearly'] as const;
export type BillingCycle = typeof VALID_BILLING_CYCLES[number];

/**
 * プランタイプが有効かチェック
 */
export function isValidPlanType(plan: string): plan is PlanType {
  return VALID_PLAN_TYPES.includes(plan as PlanType);
}

/**
 * 請求サイクルが有効かチェック
 */
export function isValidBillingCycle(cycle: string): cycle is BillingCycle {
  return VALID_BILLING_CYCLES.includes(cycle as BillingCycle);
}

/**
 * URLが許可されたオリジンからのものかを検証（オープンリダイレクト対策）
 */
export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const allowedOrigin = Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || '';

    if (!allowedOrigin) {
      console.error('APP_URL environment variable not configured');
      return false;
    }

    const allowedUrl = new URL(allowedOrigin);
    return parsedUrl.origin === allowedUrl.origin;
  } catch {
    return false;
  }
}

// ============================================
// レート制限
// ============================================

/**
 * シンプルなインメモリレート制限
 * Edge Functionsはステートレスなので、分散環境では
 * Upstash Redis等の外部ストレージを使用することを推奨
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  maxRequests: number;  // 許可される最大リクエスト数
  windowMs: number;     // 時間ウィンドウ（ミリ秒）
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * レート制限をチェック
 * @param key レート制限のキー（通常はユーザーIDまたはIPアドレス）
 * @param config レート制限の設定
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // 古いエントリをクリーンアップ（メモリリーク対策）
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  // レコードが存在しない、または期限切れの場合
  if (!record || record.resetAt < now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(resetAt),
    };
  }

  // レート制限をチェック
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetAt),
    };
  }

  // カウントを増加
  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: new Date(record.resetAt),
  };
}

/**
 * デフォルトのレート制限設定
 */
export const DEFAULT_RATE_LIMITS = {
  checkout: { maxRequests: 10, windowMs: 60 * 1000 },       // 1分間に10リクエスト
  customerPortal: { maxRequests: 5, windowMs: 60 * 1000 },  // 1分間に5リクエスト
  webhook: { maxRequests: 100, windowMs: 60 * 1000 },       // 1分間に100リクエスト
};

// ============================================
// 監査ログ
// ============================================

export interface AuditLogEntry {
  timestamp: string;
  eventType: string;
  userId?: string;
  customerId?: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  stripeMode: StripeMode;
}

/**
 * 監査ログを記録
 * 本番環境ではSupabaseの監査テーブルに保存することを推奨
 */
export function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp' | 'stripeMode'>): void {
  const fullEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    stripeMode: getStripeMode(),
  };

  // 構造化ログとして出力（本番環境では外部ログサービスと連携）
  console.log('[AUDIT]', JSON.stringify(fullEntry));
}

/**
 * Webhookイベントを監査ログに記録
 */
export function logWebhookEvent(
  eventType: string,
  eventId: string,
  userId?: string,
  customerId?: string,
  success: boolean = true,
  errorMessage?: string
): void {
  logAuditEvent({
    eventType: 'webhook',
    userId,
    customerId,
    action: eventType,
    details: {
      eventId,
      success,
      errorMessage,
    },
  });
}

/**
 * Checkout操作を監査ログに記録
 */
export function logCheckoutEvent(
  action: 'session_created' | 'session_completed' | 'session_expired',
  userId: string,
  sessionId: string,
  plan?: string,
  billingCycle?: string
): void {
  logAuditEvent({
    eventType: 'checkout',
    userId,
    action,
    details: {
      sessionId,
      plan,
      billingCycle,
    },
  });
}

// ============================================
// エラーハンドリング
// ============================================

/**
 * Stripeエラーの種類
 */
export enum StripeErrorCode {
  CARD_DECLINED = 'card_declined',
  EXPIRED_CARD = 'expired_card',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  INVALID_CVC = 'invalid_cvc',
  PROCESSING_ERROR = 'processing_error',
  RATE_LIMIT = 'rate_limit',
  AUTHENTICATION_REQUIRED = 'authentication_required',
  UNKNOWN = 'unknown',
}

/**
 * Stripeエラーをユーザーフレンドリーなメッセージに変換
 */
export function getStripeErrorMessage(error: Stripe.StripeError): { code: StripeErrorCode; message: string } {
  const code = error.code || '';

  switch (code) {
    case 'card_declined':
      return { code: StripeErrorCode.CARD_DECLINED, message: 'カードが拒否されました。別のカードをお試しください。' };
    case 'expired_card':
      return { code: StripeErrorCode.EXPIRED_CARD, message: 'カードの有効期限が切れています。' };
    case 'insufficient_funds':
      return { code: StripeErrorCode.INSUFFICIENT_FUNDS, message: '残高が不足しています。' };
    case 'invalid_cvc':
      return { code: StripeErrorCode.INVALID_CVC, message: 'セキュリティコードが正しくありません。' };
    case 'processing_error':
      return { code: StripeErrorCode.PROCESSING_ERROR, message: '処理中にエラーが発生しました。しばらくしてから再度お試しください。' };
    case 'rate_limit':
      return { code: StripeErrorCode.RATE_LIMIT, message: 'リクエストが多すぎます。しばらくしてから再度お試しください。' };
    case 'authentication_required':
      return { code: StripeErrorCode.AUTHENTICATION_REQUIRED, message: '追加の認証が必要です。' };
    default:
      return { code: StripeErrorCode.UNKNOWN, message: 'お支払いの処理中にエラーが発生しました。' };
  }
}

/**
 * エラーレスポンスを生成
 */
export function createErrorResponse(
  error: Error | Stripe.StripeError,
  headers: Record<string, string>,
  statusCode: number = 400
): Response {
  let responseBody: { error: string; code?: string; details?: string };

  if ('type' in error && error.type === 'StripeError') {
    const { code, message } = getStripeErrorMessage(error as Stripe.StripeError);
    responseBody = { error: message, code };
  } else {
    responseBody = { error: error.message || 'Internal server error' };
  }

  // 本番環境では詳細なエラー情報を隠す
  if (isLiveMode()) {
    delete responseBody.details;
  }

  return new Response(JSON.stringify(responseBody), {
    headers: { ...headers, 'Content-Type': 'application/json' },
    status: statusCode,
  });
}
