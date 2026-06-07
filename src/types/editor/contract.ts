// src/types/editor/contract.ts
// =============================================================================
// Swizzle ゲームJSON 契約（単一の正解 / Single Source of Truth）
// -----------------------------------------------------------------------------
// 「有効なゲームJSONとは何か」をここで一元的に定義する。
// 仕様書(SWIZZLE_JSON_SPEC.md)・platform_constraints.json・LogicValidator など
// すべての検証/生成はこのモジュールを唯一の正解として参照すること。
//
// これまで以下が独立して定義され互いにドリフトしていた:
//   - GameAction / TriggerCondition 型 (GameScript.ts)
//   - ActionExecutor / ConditionEvaluator の switch (ルールエンジン実装)
//   - LogicValidator の VALID_* 配列 (ai/v2)
//   - VerifiedActionType / VerifiedConditionType (ai/v2/types.ts)
//   - platform_constraints.json (ai/batch)
//   - SWIZZLE_JSON_SPEC.md (Codexが読む仕様)
// 本モジュール導入後はこれらを当モジュールから導出/検証する。
// =============================================================================

import type { GameAction, MovementPattern, EffectPattern, TriggerCondition } from './GameScript';
import type { CounterComparison, CounterOperation } from '../counterTypes';

// -----------------------------------------------------------------------------
// 型レベル整合チェック用ヘルパ
// 契約の配列が対応する union 型と完全一致しない場合、tsc(ビルド)が失敗する。
// これによりドリフトをコンパイル時に検出する。
// -----------------------------------------------------------------------------
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

// =============================================================================
// アクションタイプ
// =============================================================================

/**
 * エンジンが認識する全アクションタイプ。
 * GameAction union ⇔ ActionExecutor の switch ⇔ この配列 は常に一致させること。
 * (一致は contract.consistency.test.ts と下の型アサートで保証)
 */
export const ALL_ACTION_TYPES = [
  // ゲーム制御
  'success', 'failure', 'pause', 'restart',
  // 音響制御
  'playSound', 'stopSound', 'playBGM', 'stopBGM',
  // フラグ制御
  'setFlag', 'toggleFlag',
  // オブジェクト制御
  'show', 'hide', 'switchAnimation', 'playAnimation', 'setAnimationSpeed', 'setAnimationFrame',
  // 移動・追従・エフェクト
  'move', 'followDrag', 'effect',
  // 物理（エンジン内部用 / 生成非対象）
  'applyForce', 'applyImpulse', 'setGravity', 'setPhysics',
  // スコア・カウンター・ランダム
  'addScore', 'counter', 'randomAction',
  // ディレイ・アニメーション・入力ゾーン
  'delay', 'cancelDelay', 'setAnimationFromCounter', 'bindAnimationToCounter', 'setInputZoneEnabled',
] as const;
export type ActionType = typeof ALL_ACTION_TYPES[number];

/**
 * エンジン内部専用アクション（物理系）。実装済みだが Codex/AI による生成対象には含めない
 * (物理パラメータは不安定でゲーム品質を損ないやすいため)。
 */
export const ENGINE_INTERNAL_ACTIONS = ['setGravity', 'setPhysics'] as const;
export type EngineInternalAction = typeof ENGINE_INTERNAL_ACTIONS[number];

/**
 * AI生成では直接生成させないアクション。
 * - bindAnimationToCounter: 永続バインディングは生成より setAnimationFromCounter で代替する方が安全
 * - setInputZoneEnabled: ランタイム切り替え用。生成時は enabled フィールドで初期値を指定すれば十分
 */
export const AI_EXCLUDED_ACTIONS = [
  ...ENGINE_INTERNAL_ACTIONS,
  'bindAnimationToCounter',
  'setInputZoneEnabled',
] as const;
export type AiExcludedAction = typeof AI_EXCLUDED_ACTIONS[number];

/**
 * Codex/AI が生成してよいアクション(= 全アクション − AI除外アクション)。
 * LogicValidator / 仕様書 / platform_constraints はこれを正とする。
 *
 * AI生成で使えるアクション一覧（カテゴリ別）:
 *   ゲーム制御: success, failure, pause, restart
 *   音響制御:   playSound, stopSound, playBGM, stopBGM
 *   フラグ制御: setFlag, toggleFlag
 *   オブジェクト: show, hide, switchAnimation, playAnimation, setAnimationSpeed, setAnimationFrame
 *   移動・追従: move, followDrag, effect
 *   スコア等:   addScore, counter, randomAction
 *   ディレイ:   delay, cancelDelay
 *   アニメ同期: setAnimationFromCounter  ← カウンター→フレーム番号を1アクションで同期
 *   入力制御:   (setInputZoneEnabled は除外 — layout.inputZones で初期設定を推奨)
 */
export const GENERATABLE_ACTIONS: readonly ActionType[] = ALL_ACTION_TYPES.filter(
  (a): a is ActionType => !AI_EXCLUDED_ACTIONS.includes(a as AiExcludedAction)
);

// =============================================================================
// 条件タイプ
// =============================================================================

/**
 * エンジンが認識する全トリガー条件タイプ。
 * TriggerCondition union ⇔ ConditionEvaluator の switch ⇔ この配列 を一致させる。
 * 'always' は「常時成立」条件。以前は型・評価器に無く生成されても動作しなかったが、
 * AIパイプライン(EditorMapper/SpecificationGenerator)が生成するため正式に実装した。
 */
export const ALL_CONDITION_TYPES = [
  'touch', 'time', 'counter', 'collision', 'flag',
  'gameState', 'position', 'animation', 'random', 'objectState', 'always',
] as const;
export type ConditionType = typeof ALL_CONDITION_TYPES[number];

/** Codex/AI が生成してよい条件(現状は全条件が生成可能)。 */
export const GENERATABLE_CONDITIONS: readonly ConditionType[] = ALL_CONDITION_TYPES;

// =============================================================================
// パラメータ enum(各タイプの有効値)
// =============================================================================

export const TOUCH_TYPES = ['down', 'up', 'hold', 'drag', 'swipe', 'flick'] as const;
/** target は 'self' / 'stage' のほか、任意の objectId を指定可能 */
export const TOUCH_TARGETS = ['self', 'stage'] as const;
export const TIME_TYPES = ['exact', 'range', 'interval'] as const;
export const COLLISION_TYPES = ['enter', 'stay', 'exit'] as const;
export const COLLISION_CHECK_MODES = ['hitbox', 'pixel'] as const;
export const POSITION_AREAS = ['inside', 'outside', 'crossing'] as const;
export const ANIMATION_CONDITIONS = ['playing', 'stopped', 'frame', 'frameRange', 'loop', 'start', 'end'] as const;
export const RANDOM_SELECTION_MODES = ['uniform', 'probability', 'weighted'] as const;
export const FLAG_CONDITIONS = ['ON', 'OFF', 'CHANGED', 'ON_TO_OFF', 'OFF_TO_ON'] as const;

/** カウンター操作 (counterTypes.ts CounterOperation と一致) */
export const COUNTER_OPERATIONS = [
  'increment', 'decrement', 'set', 'reset', 'add', 'subtract', 'multiply', 'divide',
] as const satisfies readonly CounterOperation[];

/** カウンター比較演算子 (counterTypes.ts CounterComparison と一致。旧 platform_constraints の 'equal'/'notEqual' は誤り) */
export const COUNTER_COMPARISONS = [
  'equals', 'notEquals', 'greater', 'greaterOrEqual', 'less', 'lessOrEqual', 'between', 'notBetween', 'changed',
] as const satisfies readonly CounterComparison[];

/** 移動パターン (MovementPattern.type と一致。エンジンは9種すべて実装済み) */
export const MOVEMENT_TYPES = [
  'straight', 'teleport', 'wander', 'stop', 'swap', 'approach', 'orbit', 'bounce', 'arc',
] as const satisfies readonly MovementPattern['type'][];

/** エフェクト種別 (EffectPattern.type と一致) */
export const EFFECT_TYPES = [
  'flash', 'shake', 'scale', 'rotate', 'particles',
] as const satisfies readonly EffectPattern['type'][];

/** SuccessCondition の score/time 比較演算子(記号表記) */
export const SUCCESS_COMPARISONS = ['>=', '>', '==', '<', '<='] as const;

// =============================================================================
// アセット・サイズ・ゲーム設定の上限/選択肢
// =============================================================================

export const ASSET_LIMITS = {
  background: { max: 1, maxFrames: 4 },
  objects: { max: 15, maxFrames: 8 },
  texts: { max: 5, maxCharsPerText: 8 },
  bgm: { max: 1 },
  se: { max: 15 },
} as const;

export const SIZE_LIMITS = {
  imageCapacityMB: 50,
  audioCapacityMB: 50,
  totalCapacityMB: 50,
} as const;

export const GAME_DURATION = {
  fixedOptions: [5, 10, 15, 20, 30],
  unlimitedMaxSeconds: { min: 60, max: 300 },
} as const;

export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;

export const TEXT_LIMITS = {
  gameName: { minChars: 1, maxChars: 50 },
  description: { minChars: 0, maxChars: 200 },
} as const;

/** 正規化座標(0.0〜1.0)。x:0=左端 1=右端, y:0=上端 1=下端, 0.5=中央 */
export const COORDINATE_RANGE = { min: 0.0, max: 1.0 } as const;

// =============================================================================
// 型レベル整合アサート(ドリフト時はビルド失敗)
// =============================================================================

// 契約のアクション/条件一覧が、実際の union 型と完全一致することを保証する。
const _assertActionTypes: AssertExact<ActionType, GameAction['type']> = true;
const _assertConditionTypes: AssertExact<ConditionType, TriggerCondition['type']> = true;
// 参照のみ(未使用変数エラー回避)
void _assertActionTypes;
void _assertConditionTypes;
