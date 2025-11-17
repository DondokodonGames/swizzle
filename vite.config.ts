import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // 問題30・31対応: チャンク分割で初回読み込みを最適化
        manualChunks: (id) => {
          // React関連を別チャンクに
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Supabase関連を別チャンクに
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          // PixiJS関連を別チャンクに（エディター用）
          if (id.includes('node_modules/pixi.js')) {
            return 'vendor-pixijs';
          }
          // その他の大きなライブラリを別チャンクに
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        },
      },
    },
    // チャンクサイズ警告の閾値を上げる
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    host: true
  }
})