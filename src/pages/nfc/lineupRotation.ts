// 拠点ラインナップの出題順ロジック（UIから独立した純ロジック）。
// NfcSpotPage から切り出してあるのは、Supabase クライアントを読み込まずに
// 単体テストできるようにするため。

const ROTATION_KEY_PREFIX = 'swizzle_spot_rotation_';

/**
 * 拠点ラインナップからの出題順を決める。
 *
 * 端末ごとに **ランダムな開始位置** を1度だけ決めて localStorage に持ち、以後タップの
 * たびに +1 で巡回する。狙いは2つ:
 *   - 一見客(1端末1タップ)が多い店舗でも、先頭のゲームに露出が偏らない
 *   - 常連(同一端末で複数回)には毎回違うゲームが出る
 * どちらも「その拠点でどれが当たるか」を比較可能な露出量で計測するための条件。
 */
export function pickLineupIndex(spotId: string, length: number): number {
  if (length <= 0) return 0;
  const key = ROTATION_KEY_PREFIX + spotId;
  let next: number;
  try {
    const stored = localStorage.getItem(key);
    const current = stored === null ? Math.floor(Math.random() * length) : Number(stored);
    next = Number.isFinite(current) ? ((current % length) + length) % length : 0;
    localStorage.setItem(key, String((next + 1) % length));
  } catch {
    // localStorage 不可(プライベートブラウズ等)ではランダム出題にフォールバック
    next = Math.floor(Math.random() * length);
  }
  return next;
}
