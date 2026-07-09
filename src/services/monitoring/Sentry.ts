// P0-4: エラートラッキング（Sentry）
//
// VITE_SENTRY_DSN が未設定の場合は何もしない（ローカル開発・DSN未発行環境でも安全）。
// GlobalHandlers インテグレーションが window.onerror / unhandledrejection を自動捕捉する。

import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || initialized) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
  });
  initialized = true;
}

export function captureError(error: unknown, extra?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}
