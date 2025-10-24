// vite-env.d.ts
// Vite環境変数の型定義 - TypeScriptエラー完全解決

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ENABLE_AUTH: string
  readonly VITE_ENABLE_GAME_MANAGEMENT: string
  // 他の環境変数をここに追加
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}