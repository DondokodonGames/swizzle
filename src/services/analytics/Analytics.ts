// src/services/analytics/Analytics.ts
//
// WP41: アナリティクス基盤（A案 = 自前イベントテーブル）
//
// クライアント計測フック。`track(eventType, props)` でイベントを記録し、
// `analytics_events` テーブル（supabase/migrations/20260612_analytics_events.sql）へ
// バッチ書き込みする。
//
// 設計原則:
//   - ベストエフォート: 計測の失敗は決して UX を壊さない（全パスで try/catch、例外を投げない）
//   - バッチ送信: イベントをキューに溜めて一定間隔 or しきい値でまとめて INSERT
//   - セッション管理: session_id は sessionStorage（タブ単位 = 1 セッション）で保持
//   - 離脱時フラッシュ: visibilitychange / pagehide で keepalive fetch により取りこぼしを防ぐ

import { supabase } from '../../lib/supabase';

// 計測ポイント（最小セット）。contract 的な単一の真実として型を集約する。
export type AnalyticsEventType =
  | 'session_start'
  | 'play_start'
  | 'play_end'
  | 'bridge_next'
  | 'like'
  | 'share'
  | 'signup'
  | 'topup_open'
  | 'topup_complete'
  | 'subscribe';

interface QueuedEvent {
  session_id: string;
  event_type: string;
  game_id: string | null;
  properties: Record<string, unknown>;
  created_at: string;
}

const SESSION_ID_KEY = 'swizzle_analytics_session_id';
const SESSION_START_KEY = 'swizzle_analytics_session_started';
const FLUSH_INTERVAL_MS = 4000;
const MAX_BATCH = 20;

// ---------------------------------------------------------------
// モジュール内状態
// ---------------------------------------------------------------
let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let memorySessionId: string | null = null;

// 認証状態は onAuthStateChange でキャッシュし、track 1 件ごとのネットワーク往復を避ける
let currentUserId: string | null = null;
let currentAccessToken: string | null = null;
let authSubscribed = false;
let lifecycleRegistered = false;

// ---------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------
function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** session_id を取得（無ければ生成）。sessionStorage が使えない環境ではメモリにフォールバック。 */
function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = generateId();
      sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    if (!memorySessionId) memorySessionId = generateId();
    return memorySessionId;
  }
}

function ensureAuthListener(): void {
  if (authSubscribed) return;
  authSubscribed = true;
  try {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        currentUserId = data.session?.user?.id ?? null;
        currentAccessToken = data.session?.access_token ?? null;
      })
      .catch(() => {});
    supabase.auth.onAuthStateChange((_event, session) => {
      currentUserId = session?.user?.id ?? null;
      currentAccessToken = session?.access_token ?? null;
    });
  } catch {
    // 認証購読に失敗しても計測自体は匿名で継続する
  }
}

function ensureLifecycle(): void {
  if (lifecycleRegistered || typeof window === 'undefined' || typeof document === 'undefined') return;
  lifecycleRegistered = true;
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') beaconFlush();
    });
    window.addEventListener('pagehide', () => beaconFlush());
  } catch {
    // ignore
  }
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

function drainQueue(): QueuedEvent[] {
  return queue.splice(0, queue.length);
}

/** 通常フラッシュ: supabase クライアント経由で INSERT。失敗してもイベントは捨てる（無限増殖防止）。 */
async function flush(): Promise<void> {
  if (queue.length === 0) return;
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const batch = drainQueue();
  try {
    const rows = batch.map((e) => ({ ...e, user_id: currentUserId }));
    await supabase.from('analytics_events').insert(rows);
  } catch {
    // ベストエフォート: 失敗時は黙って破棄する（UX を優先）
  }
}

/**
 * 離脱時フラッシュ: keepalive 付き fetch で PostgREST に直接 POST する。
 * ページ遷移・タブクローズ中でも送信を完了させるための手段。
 */
function beaconFlush(): void {
  if (queue.length === 0) return;
  const batch = drainQueue();
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return;
    const rows = batch.map((e) => ({ ...e, user_id: currentUserId }));
    void fetch(`${url}/rest/v1/analytics_events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${currentAccessToken ?? anonKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------

/**
 * イベントを記録する（ベストエフォート・例外を投げない）。
 * @param eventType 計測ポイント種別
 * @param properties 任意プロパティ。`gameId` を含めると専用カラムに振り分ける。
 */
export function track(
  eventType: AnalyticsEventType,
  properties: Record<string, unknown> & { gameId?: string | null } = {}
): void {
  try {
    ensureAuthListener();
    ensureLifecycle();

    const { gameId, ...rest } = properties;
    queue.push({
      session_id: getSessionId(),
      event_type: eventType,
      game_id: gameId ?? null,
      properties: rest,
      created_at: new Date().toISOString(),
    });

    if (queue.length >= MAX_BATCH) {
      void flush();
    } else {
      scheduleFlush();
    }
  } catch {
    // 計測がアプリを壊すことは決して許さない
  }
}

/**
 * セッション開始イベント。1 セッション（タブ）につき 1 回だけ発火する。
 * アプリのエントリポイント / 最初のフィード表示時に呼ぶ。
 */
export function startSession(properties: Record<string, unknown> = {}): void {
  try {
    if (sessionStorage.getItem(SESSION_START_KEY)) return;
    sessionStorage.setItem(SESSION_START_KEY, '1');
  } catch {
    // sessionStorage 不可: 二重発火の可能性はあるが計測は継続する
  }
  track('session_start', properties);
}

/** 現在の session_id を取得（デバッグ・相関付け用）。 */
export function getSessionId_public(): string {
  return getSessionId();
}

/** テスト用: キュー残数を確認する。 */
export function _queueSize(): number {
  return queue.length;
}

/** テスト用: 内部状態を初期化する。 */
export function _resetForTest(): void {
  queue = [];
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  memorySessionId = null;
  currentUserId = null;
  currentAccessToken = null;
  authSubscribed = false;
  lifecycleRegistered = false;
}

const analytics = { track, startSession, getSessionId: getSessionId_public };
export default analytics;
