/**
 * mechanics-v3.ts — PLAY_GRAMMAR_V3 の機械ゲート用・共通定数(単一の真実の源)。
 *
 * CodeGameValidator / CodeQualityScorer / scripts/build-game-ledger.ts が参照する。
 * ここを直せば3者が同時に追従する(WP63 の「同期義務」を import で担保)。
 *
 * 同期先:
 *   - メカニクスID/族      … MECHANICS_CATALOG_V2.md(A〜H族)
 *   - 尺帯域(DURATION_BAND)… docs/specifications/PLAY_GRAMMAR_V3.md §4(変更時は両方直す)
 *   - ONE_SHOT_OK          … PLAY_GRAMMAR_V3.md §5
 *   - SE/BGM 許可ID        … src/services/code-game/iframeTemplate.ts の SE_PRESETS /
 *                            BGM_PRESETS + エイリアス(se_correct/se_wrong/se_miss)
 */

export type MechanicFamily = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

/** メカニクスID → 族(MECHANICS_CATALOG_V2.md の40+ID / A〜H) */
export const MECHANIC_FAMILY: Record<string, MechanicFamily> = {
  timing_one_shot: 'A', timing_window: 'A', mash: 'A', alternate_tap: 'A', cooldown_tap: 'A',
  hold_charge: 'A', hold_duration: 'A', freeze: 'A', rhythm: 'A',
  aim_shoot: 'B', slingshot: 'B', flick_launch: 'B', trajectory: 'B', drop_timing: 'B',
  dodge: 'C', drag_follow: 'C', camera_climb: 'C', camera_run: 'C', balance: 'C',
  guide_path: 'C', chase: 'C',
  trace: 'D', slice: 'D', rub: 'D', rotate_gesture: 'D', swipe_direction: 'D', pinch_zone: 'D',
  stack: 'E', gap_fit: 'E', push_out: 'E', drag_sort: 'E', connect: 'E', count_exact: 'E',
  spot: 'F', judge: 'F', size_judge: 'F', memory_sequence: 'F', pair_match: 'F',
  counting: 'F', reaction_duel: 'F',
  duel_2p: 'G', coop_2zone: 'G', turn_attack: 'G',
  jackpot_combo: 'H', near_miss: 'H',
};

/** @mechanic ヘッダーとして有効なID集合(上記マップのキー) */
export const MECHANIC_IDS: ReadonlySet<string> = new Set(Object.keys(MECHANIC_FAMILY));

/** 族ごとの適正尺帯域(PLAY_GRAMMAR_V3 §4 と同期を保つこと) */
export const DURATION_BAND: Record<string, [number, number]> = {
  A: [8, 15], B: [10, 20], C: [15, 25], D: [8, 15], E: [15, 25], F: [8, 15], G: [15, 30],
};

/** F系のうち記憶系は上限を延長(PLAY_GRAMMAR_V3 §4 の注記) */
export const DURATION_BAND_OVERRIDE: Record<string, [number, number]> = {
  memory_sequence: [10, 20], pair_match: [10, 20],
};

/** NEEDED=1 が遊びとして正当なメカニクス(1つの行為そのものが遊び。PLAY_GRAMMAR_V3 §5) */
export const ONE_SHOT_OK: ReadonlySet<string> = new Set([
  'timing_one_shot', 'hold_charge', 'hold_duration', 'freeze', 'reaction_duel',
  'slingshot', 'flick_launch', 'trajectory', 'drop_timing', 'counting', 'size_judge',
]);

/** メカニクスに対応する尺帯域を返す(override 優先 → 族 → null) */
export function durationBandFor(mechanic: string): [number, number] | null {
  if (DURATION_BAND_OVERRIDE[mechanic]) return DURATION_BAND_OVERRIDE[mechanic];
  const fam = MECHANIC_FAMILY[mechanic];
  return fam ? DURATION_BAND[fam] : null;
}

/**
 * 許可される SE ID。iframeTemplate.ts の SE_PRESETS のキー + エイリアス。
 * ここに無い se_* は WARN(実行時)/ validator エラー(v3)になる。
 */
export const ALLOWED_SE_IDS: ReadonlySet<string> = new Set([
  'se_tap', 'se_good', 'se_bad', 'se_success', 'se_failure',
  'se_coin', 'se_jump', 'se_milestone', 'se_powerup', 'se_break',
  // エイリアス(iframeTemplate: SE_PRESETS.se_correct/se_wrong/se_miss)
  'se_correct', 'se_wrong', 'se_miss',
]);

/** 許可される BGM ID。iframeTemplate.ts の BGM_PRESETS のキー。 */
export const ALLOWED_BGM_IDS: ReadonlySet<string> = new Set([
  'bgm_main', 'bgm_tense', 'bgm_cute', 'bgm_dark',
]);
