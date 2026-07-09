/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID: string;
  readonly VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID: string;
  readonly VITE_ADSENSE_CLIENT_ID: string;
  readonly VITE_ADSENSE_SLOT_GAME_BRIDGE: string;
  readonly VITE_ADSENSE_SLOT_GAME_LIST: string;
  readonly VITE_ADSENSE_SLOT_EDITOR: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
