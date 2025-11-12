// vite-env.d.ts
// Vite環境変数の型定義 - TypeScriptエラー完全解決

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ENABLE_AUTH: string
  readonly VITE_ENABLE_GAME_MANAGEMENT: string
  
  // Phase M: Monetization 追加
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID: string;
  readonly VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID: string;
  
  // Google AdSense（将来用）
  readonly VITE_ADSENSE_CLIENT_ID?: string;
  readonly VITE_ADSENSE_SLOT_GAME_BRIDGE?: string;
  readonly VITE_ADSENSE_SLOT_GAME_LIST?: string;
  readonly VITE_ADSENSE_SLOT_EDITOR?: string;
  
  // その他の環境変数（必要に応じて追加）
  readonly VITE_AI_DRY_RUN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;

}

interface ImportMeta {
  readonly env: ImportMetaEnv
}