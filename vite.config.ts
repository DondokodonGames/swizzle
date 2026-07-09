import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/services/rule-engine/ConditionEvaluator.ts',
        'src/services/editor/EditorGameBridge.ts',
        'src/ai/v2/LogicValidator.ts',
      ],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // シェル(JS/CSS/HTML/アイコン)のみプリキャッシュ。API/Supabase呼び出しはSWを経由させない
      // (ランタイムキャッシュ設定なし = 非プリキャッシュのリクエストはネットワークにそのまま抜ける)。
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Swizzle - Short Game Platform',
        short_name: 'Swizzle',
        description: 'Create and play short games in seconds.',
        start_url: '/',
        display: 'standalone',
        background_color: '#fafaf7',
        theme_color: '#fafaf7',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: '/',
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
    alias: {
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom')
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/pixi.js')) {
            return 'vendor-pixijs';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          // qrcode.react has a TDZ bug when bundled by esbuild — keep it out of
          // the eagerly-preloaded vendor-other chunk so it only loads with NfcSetupPage
          if (id.includes('node_modules/qrcode.react')) {
            return undefined;
          }
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    host: true
  }
})