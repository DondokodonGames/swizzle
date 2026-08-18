/**
 * mechanicClassifier.ts — テキストからメカニクス(40+ID)を推定する共通分類器。
 *
 * 800本の台帳生成(scripts/build-game-ledger.ts)と、ネタ空間の在庫計測
 * (scripts/neta-space.ts)が同じ物差しを使うために切り出してある。
 * ここを直すと両方が同時に追従する。
 *
 * 推定は3系統の合議:
 *   - slug 語彙(ファイル名/英語スラグをトークン分解)
 *   - 日本語テキスト(操作行・勝敗行・ネタ本文)
 * 人間が確定した対応表は docs/work-plans/ledger/mechanic-overrides.json が上書きする。
 */

// ── メカニクス推定ルール ─────────────────────────────────────────────────
// ヘッダー3行目(操作:)+4行目(成功/失敗)の日本語に対するルール。重みは特異性。
const JP_RULES: Array<[RegExp, string, number]> = [
  [/順に|順番にタップ|光った順|同じ順/, 'memory_sequence', 3],
  [/(同じ絵|ペア|めくっ|神経衰弱)/, 'pair_match', 3],
  [/連打/, 'mash', 3],
  [/交互/, 'alternate_tap', 3],
  [/(だるまさん|見られて|触らない|動くな|触れずに)/, 'freeze', 3],
  [/(リズム|拍に|ビート|音符)/, 'rhythm', 2.5],
  [/なぞ/, 'trace', 3],
  [/(切る|切って|切り裂|切り落|切断|斬)/, 'slice', 3],
  [/(こす|磨い|削っ)/, 'rub', 3],
  [/(円を描|ダイヤル|ネジ)/, 'rotate_gesture', 3],
  [/(方向へスワイプ|方向にスワイプ|仕分け|振り分け)/, 'swipe_direction', 3],
  [/フリック/, 'flick_launch', 3],
  [/(引いて放|引っ張って|パチンコ)/, 'slingshot', 3],
  [/(長押し|押し続け|押している間|チャージ.*離)/, 'hold_charge', 2.5],
  [/(避け|かわし|よけ)/, 'dodge', 3],
  [/(狙って|照準|撃つ|撃って|射撃)/, 'aim_shoot', 2.5],
  [/(落とし|投下|落下させ)/, 'drop_timing', 2],
  [/(積み|積む|積んで|重ねて)/, 'stack', 2.5],
  [/(隙間|穴に|通して|通過させ)/, 'gap_fit', 2],
  [/押し出/, 'push_out', 3],
  [/(並べ|整列|並び替え)/, 'drag_sort', 2.5],
  [/(つなぐ|つないで|結ぶ|結んで|配線)/, 'connect', 3],
  [/(ちょうど|ぴったり)[^。]*回/, 'count_exact', 3],
  [/(探して|見つけて|見つけたら)/, 'spot', 3],
  [/(どちらが|多い方|大きい方|速い方)/, 'size_judge', 3],
  [/数えて/, 'counting', 3],
  [/(合図|早押し|フライング)/, 'reaction_duel', 2.5],
  [/(2人|二人|対戦)/, 'duel_2p', 3],
  [/(傾き|バランス|重心|傾け)/, 'balance', 2.5],
  [/(迷路|はみ出さ|コースに沿|線路)/, 'guide_path', 2.5],
  [/(登り|登って|上昇|高度)/, 'camera_climb', 2],
  [/(ジャンプ|走り|障害物を飛)/, 'camera_run', 2],
  [/(捕まえ|捕獲)/, 'chase', 1.5],
  [/(来た瞬間|重なった(ら|瞬間)|止め(る|て)|止まった瞬間|タイミングよく|タイミングで)/, 'timing_one_shot', 2],
  [/(ゾーン内|窓|範囲内で)/, 'timing_window', 1.5],
  [/(判定|選んで|正しい方)/, 'judge', 1.5],
  [/覚え/, 'memory_sequence', 2],
  [/(数字|番号|小さい順|大きい順)を?.*順/, 'spot', 2.5],
  [/押している間だけ/, 'hold_charge', 2.5],
  [/スワイプ.*(移動|回避)/, 'dodge', 2],
];

// slug 語彙ルール(スラグをトークン分解して照合)
const SLUG_RULES: Array<[RegExp, string, number]> = [
  [/^(mash|rush|frenzy)$/, 'mash', 3],
  [/^dodge$/, 'dodge', 3],
  [/^(memory|recall|simon|echo)$/, 'memory_sequence', 2],
  [/^(match|pairs?)$/, 'pair_match', 2],
  [/^(stack|tower|pile)$/, 'stack', 2.5],
  [/^balance$/, 'balance', 3],
  [/^(maze|path|route)$/, 'guide_path', 2],
  [/^(slice|cut|slash)$/, 'slice', 3],
  [/^trace$/, 'trace', 3],
  [/^(spin|rotate|dial|crank)$/, 'rotate_gesture', 2],
  [/^(swipe|flick)$/, 'swipe_direction', 2],
  [/^(jump|run|runner|dash)$/, 'camera_run', 2],
  [/^(climb|rise|ascent)$/, 'camera_climb', 2],
  [/^(aim|snipe|sniper|shot|shoot|target)$/, 'aim_shoot', 2.5],
  [/^(count|counting)$/, 'counting', 2.5],
  [/^(spot|find|hidden|seek)$/, 'spot', 2.5],
  [/^(react|reaction|reflex|signal|duel)$/, 'reaction_duel', 2],
  [/^freeze$/, 'freeze', 3],
  [/^(rhythm|beat|tempo)$/, 'rhythm', 3],
  [/^(sort|order)$/, 'drag_sort', 1.5],
  [/^(connect|link|wire)$/, 'connect', 2],
  [/^(catch|catcher)$/, 'chase', 1],
  [/^(pop|burst)$/, 'aim_shoot', 1.5],
  [/^(hold|charge)$/, 'hold_charge', 2.5],
  [/^drop$/, 'drop_timing', 2],
  [/^(judge|quiz|choice)$/, 'judge', 2],
  [/^tap$/, 'timing_one_shot', 0.5],
];

export function inferMechanic(
  slug: string,
  jpText: string
): { mech: string; conf: 'high' | 'med' | 'low'; source: string } {
  const slugScores: Record<string, number> = {};
  for (const token of slug.split('-')) {
    for (const [re, mech, w] of SLUG_RULES) {
      if (re.test(token)) slugScores[mech] = (slugScores[mech] || 0) + w;
    }
  }
  const jpScores: Record<string, number> = {};
  for (const [re, mech, w] of JP_RULES) {
    if (re.test(jpText)) jpScores[mech] = (jpScores[mech] || 0) + w;
  }
  const top = (s: Record<string, number>): [string, number] | null => {
    let best: [string, number] | null = null;
    for (const k in s) if (!best || s[k] > best[1]) best = [k, s[k]];
    return best;
  };
  const slugTop = top(slugScores);
  const jpTop = top(jpScores);

  if (slugTop && jpTop && slugTop[0] === jpTop[0]) {
    return { mech: slugTop[0], conf: 'high', source: 'slug+jp' };
  }
  if (jpTop && jpTop[1] >= 3) {
    return { mech: jpTop[0], conf: slugTop ? 'med' : 'med', source: 'jp' };
  }
  if (slugTop && slugTop[1] >= 2.5 && !jpTop) {
    return { mech: slugTop[0], conf: 'med', source: 'slug' };
  }
  if (jpTop) return { mech: jpTop[0], conf: 'low', source: 'jp-weak' };
  if (slugTop) return { mech: slugTop[0], conf: 'low', source: 'slug-weak' };
  return { mech: 'timing_one_shot', conf: 'low', source: 'default' };
}
