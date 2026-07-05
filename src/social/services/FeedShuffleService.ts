/**
 * FeedShuffleService — 発見性・パーソナライズの純関数群。
 *
 * 目的: 800〜2000本のゲームで「ユーザーごとに毎日違う出会い」を作る。
 * - 端末シード + 日付による決定的シャッフル(全員が異なる並び、毎日入れ替わる)
 * - ローカルプレイ履歴による未プレイ優先
 * - 同一メカニクス/カテゴリの連続を避けるインターリーブ
 *
 * すべて副作用なしの純関数(シード/履歴の読み書きだけ localStorage)。
 * サーバー同期(game_playsテーブル)は次フェーズ。
 */

const SEED_KEY = 'swizzle:seed';
const PLAYED_KEY = 'swizzle:played';
const PLAYED_CAP = 500;

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // プライベートモード等では単に永続化されないだけにする
  }
}

/** FNV-1a 32bit — 依存なしの決定的文字列ハッシュ */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * 端末シードを取得(なければ生成して保存)。
 * ログインユーザーは user.id を渡すとアカウント単位のシードになる。
 */
export function getUserSeed(userId?: string | null): string {
  if (userId) return userId;
  let seed = storageGet(SEED_KEY);
  if (!seed) {
    seed = Math.random().toString(36).slice(2) + Date.now().toString(36);
    storageSet(SEED_KEY, seed);
  }
  return seed;
}

/** その日のシャッフルキー(日付が変わると並びも変わる) */
export function dailyKey(seed: string, date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${seed}:${y}-${m}-${d}`;
}

/**
 * 決定的シャッフル: hash(id + dailyKey) 順にソート。
 * 同じシード・同じ日なら常に同じ並び、シードか日付が違えば別の並び。
 */
export function dailyShuffle<T extends { id: string }>(
  items: T[],
  seed: string,
  date: Date = new Date()
): T[] {
  const key = dailyKey(seed, date);
  return [...items].sort(
    (a, b) => hashString(a.id + key) - hashString(b.id + key)
  );
}

/** プレイ済みID集合を取得 */
export function getPlayedIds(): Set<string> {
  const raw = storageGet(PLAYED_KEY);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/** プレイ済みとして記録(直近 PLAYED_CAP 件のみ保持) */
export function markPlayed(gameId: string): void {
  if (!gameId) return;
  const ids = [...getPlayedIds()].filter((id) => id !== gameId);
  ids.push(gameId);
  while (ids.length > PLAYED_CAP) ids.shift();
  storageSet(PLAYED_KEY, JSON.stringify(ids));
}

/** 未プレイを前に、プレイ済みを後ろに(それぞれの相対順序は維持) */
export function prioritizeUnplayed<T extends { id: string }>(
  items: T[],
  playedIds: Set<string>
): T[] {
  const unplayed: T[] = [];
  const played: T[] = [];
  for (const item of items) {
    (playedIds.has(item.id) ? played : unplayed).push(item);
  }
  return [...unplayed, ...played];
}

/**
 * 同一キーの連続を避けるインターリーブ。
 * 貪欲法: 直前と同じキーになる場合、以降から異なるキーの最初の要素を引き上げる。
 * キーが偏っていて回避不能な場合はそのまま並べる(要素は失わない)。
 */
export function interleaveByKey<T>(
  items: T[],
  keyFn: (item: T) => string | undefined | null
): T[] {
  const pool = [...items];
  const result: T[] = [];
  let prevKey: string | undefined | null = undefined;
  while (pool.length > 0) {
    let pick = 0;
    if (prevKey != null) {
      const alt = pool.findIndex((item) => (keyFn(item) ?? null) !== prevKey);
      if (alt >= 0) pick = alt;
    }
    const [item] = pool.splice(pick, 1);
    result.push(item);
    prevKey = keyFn(item) ?? null;
  }
  return result;
}

/**
 * フィード/プレイ列の標準パーソナライズ:
 * 日替わり決定的シャッフル → 未プレイ優先 → 同一キー連続回避。
 */
export function personalizeOrder<T extends { id: string }>(
  items: T[],
  opts?: {
    userId?: string | null;
    date?: Date;
    keyFn?: (item: T) => string | undefined | null;
    playedIds?: Set<string>;
  }
): T[] {
  const seed = getUserSeed(opts?.userId);
  const played = opts?.playedIds ?? getPlayedIds();
  let ordered = dailyShuffle(items, seed, opts?.date);
  ordered = prioritizeUnplayed(ordered, played);
  if (opts?.keyFn) ordered = interleaveByKey(ordered, opts.keyFn);
  return ordered;
}
