/**
 * Phase M: マネタイズ機能 - MVP版 TypeScript型定義
 * 作成日: 2025年11月12日
 * 
 * MVP範囲: Free/Premium プランのみ
 * 準備: Pro プラン（型定義は含むが使用しない）
 */

// ============================================
// MVP Enum Types
// ============================================

/**
 * MVPサブスクリプションプラン種類（Free/Premiumのみ）
 */
export enum MVPSubscriptionPlan {
  FREE = 'free',
  PREMIUM = 'premium',
}

/**
 * 完全なサブスクリプションプラン種類（将来の拡張用）
 */
export enum SubscriptionPlan {
  FREE = 'free',
  PREMIUM = 'premium',
  PRO = 'pro', // 準備のみ、MVP では使用しない
}

/**
 * サブスクリプションステータス
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  TRIALING = 'trialing',
}

/**
 * 決済タイプ
 */
export enum PaymentType {
  SUBSCRIPTION = 'subscription',
  ONE_TIME = 'one_time', // MVP では未使用（将来のアイテム課金用）
  REFUND = 'refund',
}

/**
 * 決済ステータス
 */
export enum PaymentStatus {
  SUCCEEDED = 'succeeded',
  PENDING = 'pending',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/**
 * 広告配置場所（MVP: 3箇所）
 */
export enum AdPlacement {
  GAME_BRIDGE = 'game-bridge-banner',
  GAME_LIST = 'game-list-banner',
  EDITOR_SIDEBAR = 'editor-sidebar-banner',
}

// ============================================
// Database Table Types
// ============================================

/**
 * Subscriptions テーブル型
 */
export interface Subscription {
  id: string;
  user_id: string;
  
  // プラン情報（MVP: 'free' | 'premium' のみ）
  plan_type: MVPSubscriptionPlan;
  status: SubscriptionStatus;
  
  // Stripe情報
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  
  // 期間情報
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  
  // メタデータ
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Subscriptions テーブル挿入用型
 */
export interface SubscriptionInsert {
  user_id: string;
  plan_type: MVPSubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_end?: string;
  metadata?: Record<string, any>;
}

/**
 * Subscriptions テーブル更新用型
 */
export interface SubscriptionUpdate {
  plan_type?: MVPSubscriptionPlan;
  status?: SubscriptionStatus;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_end?: string;
  cancel_at?: string;
  canceled_at?: string;
  metadata?: Record<string, any>;
}

/**
 * Payments テーブル型
 */
export interface Payment {
  id: string;
  user_id: string;
  
  // 決済情報
  amount: number;
  currency: string;
  payment_type: PaymentType;
  
  // Stripe情報
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_invoice_id: string | null;
  
  // ステータス
  status: PaymentStatus;
  
  // メタデータ
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * User Credits テーブル型
 */
export interface UserCredit {
  id: string;
  user_id: string;
  
  // クレジット情報
  games_created_this_month: number;
  month_year: string; // 'YYYY-MM'形式
  
  // プラン制限
  monthly_limit: number;
  
  // タイムスタンプ
  created_at: string;
  updated_at: string;
}

/**
 * Ad Revenue テーブル型
 */
export interface AdRevenue {
  id: string;
  date: string; // YYYY-MM-DD形式
  impressions: number;
  clicks: number;
  revenue: number;
  revenue_by_type: Record<string, number>;
  ad_provider: string;
  created_at: string;
}

// ============================================
// MVP Plan Configuration
// ============================================

/**
 * プラン制限設定（MVP版）
 */
export interface MVPPlanLimits {
  gamesPerMonth: number; // -1 = 無制限
  hasAds: boolean;
  templates: number; // アクセス可能なテンプレート数
}

/**
 * プラン詳細設定（MVP版）
 */
export interface MVPPlanDetails {
  id: MVPSubscriptionPlan;
  name: string;
  displayName: string;
  description: string;
  price: number; // USD/月
  yearlyPrice: number; // USD/年
  stripePriceId: string;
  stripeYearlyPriceId: string;
  limits: MVPPlanLimits;
  features: string[];
  recommended?: boolean;
}

/**
 * MVP プラン設定（Free/Premiumのみ）
 */
export const MVP_PLAN_CONFIGS: Record<MVPSubscriptionPlan, MVPPlanDetails> = {
  [MVPSubscriptionPlan.FREE]: {
    id: MVPSubscriptionPlan.FREE,
    name: 'free',
    displayName: 'Free',
    description: 'Perfect for trying out Swizzle',
    price: 0,
    yearlyPrice: 0,
    stripePriceId: '',
    stripeYearlyPriceId: '',
    limits: {
      gamesPerMonth: 3,
      hasAds: true,
      templates: 50,
    },
    features: [
      '月3ゲーム作成',
      '基本テンプレート50種類',
      '基本ゲームエディター',
      'ソーシャル機能',
      'ゲーム公開',
      'コミュニティサポート',
    ],
  },
  [MVPSubscriptionPlan.PREMIUM]: {
    id: MVPSubscriptionPlan.PREMIUM,
    name: 'premium',
    displayName: 'Premium',
    description: 'Unlimited creativity without ads',
    price: 4.99,
    yearlyPrice: 49.99,
    stripePriceId: '', // 実行時に取得
    stripeYearlyPriceId: '', // 実行時に取得
    limits: {
      gamesPerMonth: -1, // 無制限
      hasAds: false,
      templates: 225,
    },
    features: [
      '無制限ゲーム作成',
      '広告非表示',
      '全225テンプレート',
      '高度な編集機能',
      'カスタムアセット無制限',
      '分析ダッシュボード',
      'ゲームエクスポート（HTML5）',
      '優先サポート（24時間以内）',
    ],
    recommended: true,
  },
};

// ============================================
// Ad Configuration
// ============================================

/**
 * 広告ユニット設定
 */
export interface AdUnitConfig {
  placement: AdPlacement;
  format: 'horizontal' | 'rectangle';
  size: string; // 例: '320x50', '300x250'
  description: string;
}

/**
 * MVP 広告配置設定（3箇所）
 */
export const MVP_AD_CONFIGS: Record<AdPlacement, AdUnitConfig> = {
  [AdPlacement.GAME_BRIDGE]: {
    placement: AdPlacement.GAME_BRIDGE,
    format: 'horizontal',
    size: '320x50 または 320x100',
    description: 'ゲームブリッジ画面内バナー（ゲーム開始前/ゲームオーバー後）',
  },
  [AdPlacement.GAME_LIST]: {
    placement: AdPlacement.GAME_LIST,
    format: 'rectangle',
    size: '320x100 または 300x250',
    description: 'ゲーム一覧バナー（3ゲームごと）',
  },
  [AdPlacement.EDITOR_SIDEBAR]: {
    placement: AdPlacement.EDITOR_SIDEBAR,
    format: 'rectangle',
    size: '300x250',
    description: 'エディターサイドバーバナー',
  },
};

// ============================================
// Helper Types
// ============================================

/**
 * クレジット使用状況
 */
export interface CreditUsage {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  isLimited: boolean; // false = 無制限（Premium）
}

/**
 * サブスクリプション期間情報
 */
export interface SubscriptionPeriod {
  start: Date;
  end: Date;
  daysRemaining: number;
  isActive: boolean;
  willRenew: boolean;
}

// ============================================
// Component Props Types
// ============================================

/**
 * PricingTable コンポーネントProps（MVP版）
 */
export interface MVPPricingTableProps {
  currentPlan?: MVPSubscriptionPlan;
  onSelectPlan?: (plan: MVPSubscriptionPlan) => void;
  showAnnualToggle?: boolean;
}

/**
 * CheckoutButton コンポーネントProps
 */
export interface CheckoutButtonProps {
  plan: MVPSubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * AdUnit コンポーネントProps
 */
export interface AdUnitProps {
  placement: AdPlacement;
  className?: string;
}

/**
 * PaywallModal コンポーネントProps
 */
export interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsage?: CreditUsage;
}

/**
 * PremiumBadge コンポーネントProps
 */
export interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

// ============================================
// React Hook Types
// ============================================

/**
 * useSubscription Hook戻り値型
 */
export interface UseSubscriptionResult {
  subscription: Subscription | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updatePlan: (newPlan: MVPSubscriptionPlan) => Promise<void>;
  cancelSubscription: (immediately?: boolean) => Promise<void>;
  isActive: boolean;
  isPremium: boolean;
  isFree: boolean;
  period: SubscriptionPeriod | null;
}

/**
 * useCredits Hook戻り値型
 */
export interface UseCreditsResult {
  credits: UserCredit | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  usage: CreditUsage | null;
  canCreateGame: boolean;
}

/**
 * usePaywall Hook戻り値型
 */
export interface UsePaywallResult {
  shouldShowPaywall: boolean;
  reason: string | null;
  openPaywall: () => void;
  closePaywall: () => void;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Checkout Session作成リクエスト
 */
export interface CreateCheckoutSessionRequest {
  plan: MVPSubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

/**
 * Checkout Session作成レスポンス
 */
export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

/**
 * Customer Portal Session作成レスポンス
 */
export interface CreatePortalSessionResponse {
  url: string;
}

/**
 * ゲーム作成可能チェックレスポンス
 */
export interface CanCreateGameResponse {
  canCreate: boolean;
  reason?: string;
  usage?: CreditUsage;
  upgradeRequired?: boolean;
}

// ============================================
// Stripe Webhook Types
// ============================================

/**
 * Stripe Webhook Event型（MVP対応）
 */
export interface StripeWebhookEvent {
  id: string;
  type: 
    | 'checkout.session.completed'
    | 'customer.subscription.created'
    | 'customer.subscription.updated'
    | 'customer.subscription.deleted'
    | 'invoice.payment_succeeded'
    | 'invoice.payment_failed';
  data: {
    object: any;
  };
  created: number;
}

// ============================================
// Error Types
// ============================================

/**
 * マネタイズエラーコード
 */
export enum MonetizationErrorCode {
  // サブスクリプション関連
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  SUBSCRIPTION_ALREADY_EXISTS = 'SUBSCRIPTION_ALREADY_EXISTS',
  INVALID_PLAN = 'INVALID_PLAN',
  
  // 決済関連
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_METHOD_REQUIRED = 'PAYMENT_METHOD_REQUIRED',
  
  // クレジット関連
  CREDIT_LIMIT_EXCEEDED = 'CREDIT_LIMIT_EXCEEDED',
  
  // Stripe関連
  STRIPE_ERROR = 'STRIPE_ERROR',
  STRIPE_WEBHOOK_ERROR = 'STRIPE_WEBHOOK_ERROR',
  
  // 一般
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * マネタイズエラー型
 */
export class MonetizationError extends Error {
  constructor(
    message: string,
    public code: MonetizationErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'MonetizationError';
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * MVP プラン取得ヘルパー
 */
export function getMVPPlanDetails(plan: MVPSubscriptionPlan): MVPPlanDetails {
  return MVP_PLAN_CONFIGS[plan];
}

/**
 * プランがプレミアムかチェック
 */
export function isPremium(plan: MVPSubscriptionPlan | string): boolean {
  return plan === MVPSubscriptionPlan.PREMIUM || plan === 'premium';
}

/**
 * プランが無料かチェック
 */
export function isFree(plan: MVPSubscriptionPlan | string): boolean {
  return plan === MVPSubscriptionPlan.FREE || plan === 'free';
}

/**
 * 月間ゲーム制限取得
 */
export function getMonthlyGameLimit(plan: MVPSubscriptionPlan): number {
  return MVP_PLAN_CONFIGS[plan].limits.gamesPerMonth;
}

/**
 * 広告表示が必要かチェック
 */
export function shouldShowAds(plan: MVPSubscriptionPlan): boolean {
  return MVP_PLAN_CONFIGS[plan].limits.hasAds;
}

/**
 * 年月フォーマット取得（'YYYY-MM'）
 */
export function getCurrentMonthYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 残り日数計算
 */
export function calculateDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * クレジット使用率計算
 */
export function calculateCreditUsage(
  used: number,
  limit: number
): CreditUsage {
  if (limit === -1) {
    // 無制限（Premium）
    return {
      used,
      limit: -1,
      remaining: -1,
      percentage: 0,
      isLimited: false,
    };
  }

  const remaining = Math.max(0, limit - used);
  const percentage = limit > 0 ? (used / limit) * 100 : 0;

  return {
    used,
    limit,
    remaining,
    percentage: Math.min(100, percentage),
    isLimited: true,
  };
}

/**
 * Stripe Price ID取得（MVP版）
 */
export function getStripePriceId(
  plan: MVPSubscriptionPlan,
  billingCycle: 'monthly' | 'yearly'
): string {
  const planDetails = MVP_PLAN_CONFIGS[plan];
  return billingCycle === 'yearly'
    ? planDetails.stripeYearlyPriceId
    : planDetails.stripePriceId;
}

/**
 * 割引率計算
 */
export function calculateYearlyDiscount(plan: MVPSubscriptionPlan): number {
  const planDetails = MVP_PLAN_CONFIGS[plan];
  const monthlyTotal = planDetails.price * 12;
  const yearlySavings = monthlyTotal - planDetails.yearlyPrice;
  return Math.round((yearlySavings / monthlyTotal) * 100);
}

/**
 * 広告スロットID取得
 */
export function getAdSlotId(placement: AdPlacement): string {
  const envKey = {
    [AdPlacement.GAME_BRIDGE]: 'VITE_ADSENSE_SLOT_GAME_BRIDGE',
    [AdPlacement.GAME_LIST]: 'VITE_ADSENSE_SLOT_GAME_LIST',
    [AdPlacement.EDITOR_SIDEBAR]: 'VITE_ADSENSE_SLOT_EDITOR',
  }[placement];

  // @ts-ignore
  return import.meta.env[envKey] || '';
}

/**
 * 広告クライアントID取得
 */
export function getAdClientId(): string {
    // @ts-ignore
  return import.meta.env.VITE_ADSENSE_CLIENT_ID || '';
}

// ============================================
// Type Guards
// ============================================

/**
 * MVPプランの型ガード
 */
export function isMVPSubscriptionPlan(value: any): value is MVPSubscriptionPlan {
  return (
    value === MVPSubscriptionPlan.FREE ||
    value === MVPSubscriptionPlan.PREMIUM
  );
}

/**
 * サブスクリプションステータスの型ガード
 */
export function isActiveSubscription(status: SubscriptionStatus): boolean {
  return status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING;
}