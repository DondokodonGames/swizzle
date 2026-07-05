/**
 * BestScoreStore — 端末ローカルのゲーム別ベストスコア保存。
 *
 * localStorage キー: swizzle:best:<gameId>
 * サンドボックス(iframe)からは localStorage に触れないため、
 * 親側(CodeGameRunner)が INIT context で注入し GAME_END で更新する。
 * Supabase 同期(ログインユーザーのランキング等)は次フェーズ。
 */

const KEY_PREFIX = 'swizzle:best:';

function storageAvailable(): boolean {
  try {
    const k = '__swizzle_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export const BestScoreStore = {
  get(gameId: string | undefined | null): number {
    if (!gameId || !storageAvailable()) return 0;
    try {
      const raw = window.localStorage.getItem(KEY_PREFIX + gameId);
      const n = raw === null ? 0 : parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
      return 0;
    }
  },

  /**
   * スコアを記録し、更新結果を返す。
   * @returns { best, isNewRecord } — best は保存後のベスト値
   */
  record(gameId: string | undefined | null, score: number): { best: number; isNewRecord: boolean } {
    const prev = BestScoreStore.get(gameId);
    const s = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;
    if (!gameId || s <= prev) {
      return { best: prev, isNewRecord: false };
    }
    try {
      if (storageAvailable()) window.localStorage.setItem(KEY_PREFIX + gameId, String(s));
    } catch {
      // 保存失敗(容量超過等)でもゲーム進行は妨げない
    }
    // 初回プレイ(prev=0)は記録するがNEW RECORD演出はしない(既存記録の更新のみ祝う)
    return { best: s, isNewRecord: prev > 0 };
  },
};
