/**
 * Step 5: EditorMapper (強化版)
 *
 * 仕様をSwizzleエディター形式に変換
 * 創造的判断は前ステップで完了しているため、機械的な変換のみ行う
 *
 * 入力: GameSpecification（何がどう動くか）
 * 出力: EditorMapperOutput（LogicGeneratorOutput + MappingTable）
 */

import { ILLMProvider, createLLMProvider, LLMProviderType, DEFAULT_MODELS } from './llm';
import { GameConcept, LogicGeneratorOutput, AssetPlan, TriggerCondition, GameAction, GameRule } from './types';
import { GameSpecification } from './SpecificationGenerator';
import { GenerationLogger } from './GenerationLogger';

// ==========================================
// MappingTable Types (デバッグ・追跡用)
// ==========================================

/**
 * マッピングテーブル - 仕様からエディター形式への変換記録
 */
export interface MappingTable {
  // オブジェクトマッピング
  objects: ObjectMapping[];

  // カウンターマッピング
  counters: CounterMapping[];

  // サウンドマッピング
  sounds: SoundMapping[];

  // ルールマッピング
  rules: RuleMapping[];

  // 変換サマリー
  summary: {
    totalObjects: number;
    totalCounters: number;
    totalSounds: number;
    totalRules: number;
    mappingTimestamp: string;
  };
}

export interface ObjectMapping {
  specName: string;       // 仕様での名前
  editorId: string;       // エディターでのID
  purpose: string;        // 役割
}

export interface CounterMapping {
  specName: string;
  editorId: string;
  editorName: string;
}

export interface SoundMapping {
  specId: string;
  editorId: string;
  trigger: string;
}

export interface RuleMapping {
  specId: string;
  specName: string;
  editorId: string;
  purpose: string;
}

/**
 * EditorMapper出力（強化版）
 */
export interface EditorMapperOutput {
  logicOutput: LogicGeneratorOutput;
  mappingTable: MappingTable;
}

const EDITOR_SPEC = `
# Swizzle エディター仕様

## 座標系
- 正規化座標: 0.0〜1.0
- x: 0.0=左端, 1.0=右端
- y: 0.0=上端, 1.0=下端

## 条件タイプ

### touch（タッチ条件）★よく使う
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| target | 'self'/'stage'/objectId | タッチ対象 |
| touchType | 'down'/'up'/'hold'/'drag'/'swipe'/'flick' | タッチの種類 |
| region? | {shape:'rect'/'circle', x, y, width?, height?, radius?} | 領域指定（stage時） |
| dragType? | 'start'/'dragging'/'end' | ドラッグ詳細（drag時） |
| direction? | 'up'/'down'/'left'/'right' | 方向（swipe/flick時） |
| holdDuration? | number | 長押し時間（hold時、秒） |

### time（時間条件）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| timeType | 'exact'/'interval'/'after' | 判定タイプ |
| seconds | number | 秒数（exact/after時） |
| interval? | number | 間隔（interval時） |

### counter（カウンター条件）★よく使う
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| counterName | string | カウンター名 |
| comparison | 'equals'/'greaterOrEqual'/'greater'/'less'/'lessOrEqual' | 比較方法 |
| value | number | 比較値 |

### collision（衝突条件）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| target | 'any'/objectId | 衝突対象 |
| collisionType | 'enter'/'stay'/'exit' | 衝突タイプ |

### flag（フラグ条件）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| flagId | string | フラグID |
| value? | boolean | 期待値（省略時true） |

### position（位置条件）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| target | objectId | 対象オブジェクト |
| area | 'inside'/'outside' | 領域内/外 |
| region | {x, y, width, height} | 判定領域 |

### animation（アニメーション条件）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| condition | 'frame'/'end'/'start'/'loop'/'playing'/'stopped' | 判定タイプ |
| frame? | number | フレーム番号（frame時） |
| frameRange? | [number, number] | フレーム範囲 |
| loopCount? | number | ループ回数 |

### gameState（ゲーム状態条件）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| state | 'playing'/'paused'/'success'/'failure' | ゲーム状態 |
| became? | boolean | 状態変化時のみ発火 |

### random（確率条件）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| probability | number | 確率（0.0-1.0） |

## アクションタイプ

### success/failure（ゲーム終了）★よく使う
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| score? | number | スコア加算 |
| message? | string | 表示メッセージ |

### hide/show（表示切替）★よく使う
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| targetId | string | 対象オブジェクトID |
| fadeOut?/fadeIn? | boolean | フェード効果 |
| duration? | number | フェード時間 |

### move（移動）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| targetId | string | 対象オブジェクトID |
| movement.type | 'straight'/'teleport'/'wander'/'bounce'/'stop'/'swap'/'approach'/'orbit' | 移動タイプ |
| movement.target? | {x, y} | 目標座標 |
| movement.direction? | 'up'/'down'/'left'/'right'/'upLeft'/'upRight'/'downLeft'/'downRight' | 方向 |
| movement.speed? | number | 速度 |
| movement.duration? | number | 移動時間（秒） |
| movement.easing? | 'linear'/'ease-in'/'ease-out'/'bounce' | イージング |

### counter（カウンター操作）★よく使う
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| counterName | string | カウンター名 |
| operation | 'increment'/'decrement'/'set'/'add'/'subtract' | 操作 |
| value? | number | 値（set/add/subtract時） |

### effect（エフェクト）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| targetId | string | 対象オブジェクトID |
| effect.type | 'flash'/'shake'/'scale'/'rotate'/'particles' | エフェクト種類 |
| effect.duration | number | 持続時間（秒） |
| effect.intensity? | number | 強度 |

### playSound（効果音）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| soundId | string | 音声ID |
| volume? | number | 音量（0.0-1.0） |

### setFlag/toggleFlag（フラグ操作）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| flagId | string | フラグID |
| value? | boolean | 値（setFlag時） |

### addScore（スコア加算）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| points | number | 加算ポイント |

### switchAnimation（アニメーション切替）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| targetId | string | 対象オブジェクトID |
| animationIndex | number | アニメーション番号 |

### followDrag（ドラッグ追従）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| targetId | string | 対象オブジェクトID |
| enabled | boolean | 追従有効/無効 |

### applyForce/applyImpulse（物理演算）
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| targetId | string | 対象オブジェクトID |
| force/impulse | {x, y} | 力/衝撃の方向と大きさ |
`;

const MAPPING_PROMPT = `あなたはSwizzleエディターの仕様マッパーです。
与えられたゲーム仕様を、エディターのJSON形式に正確に変換してください。

# ⚠️⚠️⚠️ 緊急警告: カウンター参照エラー防止 ⚠️⚠️⚠️

**全エラーの80%がカウンター関連です！**

## 変換時の絶対ルール
1. 仕様の counters が空 [] → rulesで counter は一切使わない
2. rulesで counterName を使う → 必ず counters に同名の定義があることを確認
3. 勝手にカウンターを追加しない

## 禁止（全エラーの原因）
❌ counters: [] なのに actions: [{ type: "counter", counterName: "xxx" }]
❌ 仕様にないカウンターを勝手に作成

${EDITOR_SPEC}

# ★★★ 最重要: コンセプトと仕様を忠実に変換 ★★★

**仕様をそのままエディター形式に変換してください。**
勝手にゲーム内容を変えないでください。

## チェックリスト（必ず確認）
- [ ] 仕様の全オブジェクトがassetPlanに含まれているか？
- [ ] 仕様の全ルールがscript.rulesに含まれているか？
- [ ] オブジェクトIDが仕様と一致しているか？
- [ ] 成功/失敗条件が仕様と一致しているか？

## よくある間違い ❌
- 仕様にある具体的なオブジェクト（goldfish, star, catなど）を汎用的な「target」に変えてしまう
- 勝手にルールを追加・削除してしまう
- カウンターの値や判定条件を変えてしまう

# 絶対に守るべき制約

## ★★★ 成功ルールの必須要件 ★★★

### 必須: successアクションを含むルールが1つ以上必要
ゲームには必ずsuccessアクションを含むルールが必要です。
❌ successアクションがない → ゲームがクリアできない（NO_SUCCESS エラー）
✅ 正しい: conditions + successアクション のルールを定義

### 必須: 成功条件にプレイヤー操作（touch/collision/position）を含める
successアクションを発火させる条件には、必ずプレイヤー操作を含めてください：

✅ 有効なパターン（プレイヤー操作あり）:
- touch条件 → success: プレイヤーがタップして成功
- collision条件 → success: ドラッグしたオブジェクトが衝突して成功
- position条件 → success: ドラッグしたオブジェクトが特定位置に到達して成功
- touch → counter増加、counter条件 → success: タップでカウンター増加、閾値達成で成功

❌ 禁止パターン（NO_PLAYER_ACTION エラー）:
- time条件のみ → success: 時間経過だけでクリア（プレイヤー不要）
- counter条件のみ → success: カウンターを増やす操作がない
- 条件なし → success: ゲーム開始直後にクリア（INSTANT_WIN エラー）

### 最終チェック
出力前に以下を確認:
1. script.rules に successアクションを含むルールがあるか？
2. そのルールの条件に touch/collision/position が含まれているか？
3. カウンターで成功判定する場合、そのカウンターを増やすtouch条件があるか？

## 座標の制約 ★必須
- すべての座標は 0.0〜1.0 の範囲内
- 負の値は禁止（-0.1 などは NG → 0.0 に修正）
- 1.0を超える値も禁止（1.2 などは NG → 1.0 に修正）

## 必須サウンド ★必須
以下の3つは必ずsoundsに含める:
- { "id": "se_tap", "trigger": "タップ時", "type": "tap" }
- { "id": "se_success", "trigger": "成功時", "type": "success" }
- { "id": "se_failure", "trigger": "失敗時", "type": "failure" }

## カウンターの一貫性 ★★★最重要★★★

**カウンター参照エラーが最も多いエラーです！**
**rulesでカウンターを使うなら、先にcountersで定義が必須！**

### 変換前に必ず確認
1. 仕様のcountersをscript.countersにコピー
2. rulesで参照するcounterNameは必ずcountersのidと完全一致
3. countersが空なら、rulesでcounter条件/アクションを使わない

### 絶対にやってはいけない ❌
- countersが空なのにrulesで { type: "counter", counterName: "xxx" } を使う
- 仕様にない "game_timer" をrulesで勝手に追加
- カウンター名のtypo（"tapped_count" vs "tapped"）

### 最終チェック ✅
出力前に以下を確認:
1. script.counters に定義がないcounterNameがrulesにないか？
2. rulesの全counter条件/アクションのcounterNameがcountersに存在するか？
3. 不安ならカウンターを使わずシンプルなパターンに変更

## カウンター値の妥当性 ★必須（即座に成功/失敗を防ぐ）
タイマー/カウンターの初期値と判定条件を確認:

### 即失敗を防ぐ
❌ 間違い: initialValue=0, 失敗条件: lessOrEqual 0 → ゲーム開始直後に失敗
✅ 正しい: initialValue=500, 失敗条件: lessOrEqual 0 → 時間経過で失敗

### 即成功を防ぐ
❌ 間違い: initialValue=5, 成功条件: greaterOrEqual 3 → ゲーム開始直後に成功
✅ 正しい: initialValue=0, 成功条件: greaterOrEqual 3 → 操作で成功

## サウンドタイプの制限 ★必須
sound.type は効果音のカテゴリを表す以下のみ使用可能:
✅ 有効: 'tap', 'success', 'failure', 'collect', 'pop', 'whoosh', 'bounce', 'ding', 'buzz', 'splash'
❌ 無効: 'effect', 'bgm', 'se', 'indicator', 'warning', 'voice', 'ambient'

例:
- { "id": "se_tap", "type": "tap", ... }
- { "id": "se_success", "type": "success", ... }
- { "id": "se_failure", "type": "failure", ... }

## 時間条件のtimeType制限 ★必須
timeType は以下のみ使用可能:
✅ 有効: 'exact', 'range', 'interval'
❌ 無効: 'after', 'countdown', 'countup'

例: { "timeType": "exact", "seconds": 5 }  // 5秒経過で発火

## ★★★ 有効なタイプ一覧（これ以外は使用禁止）★★★

### 条件タイプ（type）
✅ 有効: 'touch', 'time', 'counter', 'collision', 'flag', 'gameState', 'position', 'animation', 'random', 'objectState'
❌ 無効: 'state', 'deviceTilt', 'sensor', 'gesture', 'proximity', 'orientation', 'accelerometer'

### アクションタイプ（type）
✅ 有効: 'success', 'failure', 'hide', 'show', 'move', 'counter', 'addScore', 'effect', 'setFlag', 'toggleFlag', 'playSound', 'stopSound', 'playBGM', 'stopBGM', 'switchAnimation', 'playAnimation', 'setAnimationSpeed', 'setAnimationFrame', 'followDrag', 'applyForce', 'applyImpulse', 'randomAction', 'pause', 'restart'
❌ 無効: 'changeState', 'adjustAngle', 'updateCounter', 'rotate', 'scale', 'fade', 'spawn', 'destroy', 'emit', 'trigger', 'conditional'

### エフェクトタイプ（effect.type）
✅ 有効: 'flash', 'shake', 'scale', 'rotate', 'particles'
❌ 無効: 'particle'（複数形の'particles'を使用）, 'glow', 'pulse', 'fade', 'blur', 'sparkle'

### 比較演算子（comparison）
✅ 有効: 'equals', 'greaterOrEqual', 'greater', 'less', 'lessOrEqual'
❌ 無効: 'lessThan'（'less'を使用）, 'greaterThan'（'greater'を使用）, 'eq', 'gte', 'lte', 'lt', 'gt', '=='

### カウンター操作（operation）
✅ 有効: 'increment', 'decrement', 'set', 'add', 'subtract'
❌ 無効: 'increase', 'decrease', 'reset', 'clear', 'multiply', 'divide'

### タッチタイプ（touchType）
✅ 有効: 'down', 'up', 'hold', 'drag', 'swipe', 'flick'
❌ 無効: 'tap', 'click', 'press', 'release', 'longPress', 'doubleTap'

### 移動タイプ（movement.type）
✅ 有効: 'straight', 'teleport', 'wander', 'stop'
❌ 無効: 'bounce', 'linear', 'jump', 'lerp', 'bezier', 'arc', 'zigzag'

### collision条件のtarget ★★★
collision条件のtargetには具体的なオブジェクトIDを指定:
✅ 正しい: { type: "collision", target: "goal" }
❌ 間違い: { type: "collision", target: "any" }（"any"は無効！）
❌ 間違い: { type: "collision", target: "all" }（"all"は無効！）

### applyImpulse/applyForceの必須パラメータ ★★★
applyImpulse/applyForce を使う場合は必ず impulse/force を指定:
✅ 正しい: { type: "applyImpulse", targetId: "ball", impulse: { x: 0, y: -5 } }
❌ 間違い: { type: "applyImpulse", targetId: "ball" }（impulseがない！）

## playSound アクションの必須パラメータ ★★★
playSound アクションには必ず soundId を指定:
✅ 正しい: { "type": "playSound", "soundId": "se_tap" }
❌ 間違い: { "type": "playSound" }（soundIdがない）
❌ 間違い: { "type": "playSound", "sound": "se_tap" }（soundではなくsoundId）

## オブジェクトID参照のルール ★★★
### ワイルドカードは使用禁止
❌ 無効: "penguin_*", "target_*", "enemy_*"（ワイルドカードは不可）
✅ 有効: "penguin_1", "penguin_2", "penguin_3"（具体的なIDを指定）

### "self" の使用ルール ★★★
- touch条件のtarget: ✅ "self" 使用可能（ルールがアタッチされたオブジェクト自身）
- targetObjectId: ❌ "self" 不可（具体的なオブジェクトIDを指定）
- アクションのtargetId: ❌ "self" 不可（具体的なオブジェクトIDを指定）

### "stage" の使用ルール ★★★
"stage"は画面全体を表す特殊な値で、使える場所が限定されています:
- touch条件のtarget: ✅ "stage" 使用可能（画面のどこをタッチしても発火）
- targetObjectId: ❌ "stage" 不可（アセット計画に存在しないためエラー）
- アクションのtargetId: ❌ "stage" 不可（アセット計画に存在しないためエラー）

✅ 正しい例:
{
  "targetObjectId": "player",  // 実際のオブジェクトID
  "conditions": [{ "type": "touch", "target": "stage" }],  // OK: stageはtouch条件で使用
  "actions": [{ "type": "hide", "targetId": "player" }]    // OK: 具体的なID
}

❌ 間違い例:
{
  "targetObjectId": "stage",  // NG: stageはtargetObjectIdに使えない
  "conditions": [{ "type": "touch", "target": "stage" }],
  "actions": [{ "type": "followDrag", "targetId": "stage" }]  // NG: targetIdにstageは不可
}

# 重要: 機械的な変換のみ行う
- 仕様に書かれていないことは追加しない
- 仕様の内容を勝手に変更しない
- **IDや名前は仕様のものをそのまま使用**（汎用的な名前に変えない）
- ただし座標が範囲外の場合は 0.0-1.0 に収める

# 変換ルール

## オブジェクト → assetPlan.objects
仕様のobjectsをそのままマッピング:
- id → id
- name → name
- visualDescription → visualDescription
- "ゲーム内での役割" → purpose
- initialPosition → initialPosition
- size → size

## オブジェクト → script.layout.objects
仕様のobjectsからレイアウト情報を変換:
- id → objectId
- initialPosition → position
- displayScale → scale（省略時は { x: 1.0, y: 1.0 }）
- zIndex → zIndex（省略時は配列順）

★重要: 縦長オブジェクト（人物、街灯、木など）は displayScale.y > displayScale.x で表現
★重要: 横長オブジェクト（車、ベンチ、橋など）は displayScale.x > displayScale.y で表現

## カウンター → script.counters
仕様のcountersをそのままマッピング:
- id → id
- name → name
- initialValue → initialValue

## ルール → script.rules
仕様のrulesをエディター形式に変換:

### trigger変換
- touch → { type: 'touch', target: 'self', touchType: パラメータから }
- time → { type: 'time', timeType: パラメータから, seconds/interval }
- counter → { type: 'counter', counterName, comparison, value }
- collision → { type: 'collision', target, collisionType }
- flag → { type: 'flag', flagId }

### action変換
- hide → { type: 'hide', targetId }
- show → { type: 'show', targetId }
- success → { type: 'success', message? }
- failure → { type: 'failure', message? }
- counter → { type: 'counter', counterName, operation, value? }
- playSound → { type: 'playSound', soundId }
- effect → { type: 'effect', targetId, effect }

# 入力

## コンセプト
{{CONCEPT}}

## 仕様
{{SPEC}}

# 出力形式
以下のJSON構造のみを出力。

{
  "script": {
    "layout": {
      "objects": [
        {
          "objectId": "string",
          "position": { "x": 0.0-1.0, "y": 0.0-1.0 },
          "scale": { "x": 0.5-2.0, "y": 0.5-2.0 },  // ★仕様のdisplayScaleから変換、縦長なら y>x
          "zIndex": 1  // 描画順（省略可）
        }
      ]
    },
    "counters": [
      { "id": "string", "name": "string", "initialValue": number }
    ],
    "rules": [
      {
        "id": "string",
        "name": "string",
        "targetObjectId": "string (optional)",
        "triggers": {
          "operator": "AND",
          "conditions": [ /* 条件配列 */ ]
        },
        "actions": [ /* アクション配列 */ ]
      }
    ]
  },
  "assetPlan": {
    "objects": [
      {
        "id": "string",
        "name": "string",
        "purpose": "string",
        "visualDescription": "string",
        "initialPosition": { "x": 0.0-1.0, "y": 0.0-1.0 },
        "size": "small/medium/large"
      }
    ],
    "background": {
      "description": "背景の説明",
      "mood": "雰囲気"
    },
    "sounds": [ /* 音声配列 */ ],
    "bgm": { /* BGM定義 */ }
  },
  "selfCheck": {
    "hasPlayerActionOnSuccessPath": true,
    "counterInitialValuesSafe": true,
    "allObjectIdsValid": true,
    "allCounterNamesValid": true,
    "coordinatesInRange": true,
    "onlyVerifiedFeaturesUsed": true,
    "noRuleConflicts": true,
    "allCountersFullyImplemented": true
  }
}`;

export interface EditorMapperConfig {
  model?: string;
  dryRun?: boolean;
  apiKey?: string;
  llmProvider?: LLMProviderType;
}

export class EditorMapper {
  private llmProvider: ILLMProvider;
  private config: Required<Omit<EditorMapperConfig, 'apiKey' | 'llmProvider'>>;
  private logger?: GenerationLogger;
  private tokensUsed: number = 0;

  constructor(config?: EditorMapperConfig, logger?: GenerationLogger) {
    const providerType = config?.llmProvider || (process.env.LLM_PROVIDER as LLMProviderType) || 'anthropic';
    const defaultModel = providerType === 'openai' ? DEFAULT_MODELS.openai : DEFAULT_MODELS.anthropic;

    this.llmProvider = createLLMProvider({
      provider: providerType,
      apiKey: config?.apiKey,
      model: config?.model || defaultModel
    });
    this.config = {
      model: config?.model || defaultModel,
      dryRun: config?.dryRun || false
    };
    this.logger = logger;
  }

  /**
   * 仕様をエディター形式に変換
   */
  async map(concept: GameConcept, spec: GameSpecification): Promise<EditorMapperOutput> {
    // 防御的入力検証
    if (!spec) {
      throw new Error('GameSpecification is undefined');
    }
    if (!spec.objects) {
      spec.objects = [];
    }
    if (!spec.rules) {
      spec.rules = [];
    }
    if (!spec.stateManagement) {
      spec.stateManagement = { counters: [], flags: [] };
    }
    if (!spec.stateManagement.counters) {
      spec.stateManagement.counters = [];
    }

    this.logger?.logInput('EditorMapper', 'specification', {
      objectCount: spec.objects?.length || 0,
      counterCount: spec.stateManagement?.counters?.length || 0,
      ruleCount: spec.rules?.length || 0
    });

    if (this.config.dryRun) {
      return this.mapMock(concept, spec);
    }

    const prompt = MAPPING_PROMPT
      .replace('{{CONCEPT}}', JSON.stringify(concept, null, 2))
      .replace('{{SPEC}}', JSON.stringify(spec, null, 2));

    const response = await this.llmProvider.chat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 8192, model: this.config.model }
    );

    this.tokensUsed = (response.usage?.inputTokens || 0) + (response.usage?.outputTokens || 0);

    let logicOutput = this.extractAndParseJSON(response.content);

    // ポスト処理: AIが指示に従わなくても安全にする
    logicOutput = this.postProcess(logicOutput);

    // マッピングテーブルを生成
    const mappingTable = this.createMappingTable(spec, logicOutput);

    // ログに記録（防御的にフィルタリング）
    const outputObjects = (logicOutput.assetPlan?.objects || []).filter(Boolean);
    const outputCounters = (logicOutput.script?.counters || []).filter(Boolean);
    const outputRules = (logicOutput.script?.rules || []).filter(Boolean);
    this.logger?.logEditorMapping({
      objectIds: outputObjects.map(o => o?.id).filter(Boolean),
      counterIds: outputCounters.map(c => c?.id).filter(Boolean),
      ruleCount: outputRules.length,
      mappingDecisions: [
        `Objects: ${outputObjects.length}`,
        `Counters: ${outputCounters.length}`,
        `Rules: ${outputRules.length}`
      ]
    });

    return { logicOutput, mappingTable };
  }

  /**
   * ポスト処理: 座標のクランプ、必須サウンドの追加など
   */
  private postProcess(output: LogicGeneratorOutput): LogicGeneratorOutput {
    // 0. 防御的初期化: script と assetPlan が存在することを保証
    if (!output.script) {
      console.warn('      [PostProcess] Missing script, creating empty structure');
      output.script = { layout: { objects: [] }, counters: [], rules: [] };
    }
    if (!output.script.counters) {
      output.script.counters = [];
    }
    if (!output.script.rules) {
      output.script.rules = [];
    }
    if (!output.script.layout) {
      output.script.layout = { objects: [] };
    }
    if (!output.script.layout.objects) {
      output.script.layout.objects = [];
    }

    // 1. 座標をクランプ (0.0-1.0)
    if (output.script?.layout?.objects) {
      for (const obj of output.script.layout.objects) {
        if (obj.position) {
          obj.position.x = Math.max(0, Math.min(1, obj.position.x));
          obj.position.y = Math.max(0, Math.min(1, obj.position.y));
        }
      }
    }

    if (output.assetPlan?.objects) {
      for (const obj of output.assetPlan.objects) {
        if (obj.initialPosition) {
          obj.initialPosition.x = Math.max(0, Math.min(1, obj.initialPosition.x));
          obj.initialPosition.y = Math.max(0, Math.min(1, obj.initialPosition.y));
        }
      }
    }

    // 2. 必須サウンドを確保
    if (!output.assetPlan) {
      output.assetPlan = { objects: [], background: { description: '', mood: '' }, sounds: [] };
    }
    if (!output.assetPlan.objects) {
      output.assetPlan.objects = [];
    }
    if (!output.assetPlan.sounds) {
      output.assetPlan.sounds = [];
    }

    const requiredSounds = [
      { id: 'se_tap', trigger: 'タップ時', type: 'tap' as const },
      { id: 'se_success', trigger: '成功時', type: 'success' as const },
      { id: 'se_failure', trigger: '失敗時', type: 'failure' as const }
    ];

    for (const required of requiredSounds) {
      const exists = output.assetPlan.sounds.some(s => s.id === required.id);
      if (!exists) {
        output.assetPlan.sounds.push(required);
        console.log(`      [PostProcess] Added missing sound: ${required.id}`);
      }
    }

    // 3. 未使用カウンターの削除
    if (output.script?.counters && output.script?.rules) {
      const usedCounterNames = new Set<string>();

      // カウンターアクションで使用されているもの
      for (const rule of output.script.rules) {
        for (const action of rule.actions || []) {
          if (action.type === 'counter' && action.counterName) {
            usedCounterNames.add(action.counterName);
          }
        }
        // カウンター条件で使用されているもの
        for (const condition of rule.triggers?.conditions || []) {
          if (condition.type === 'counter' && condition.counterName) {
            usedCounterNames.add(condition.counterName);
          }
        }
      }

      // 使用されていないカウンターを削除
      const originalCount = output.script.counters.length;
      output.script.counters = output.script.counters.filter(c => usedCounterNames.has(c.id));
      const removedCount = originalCount - output.script.counters.length;
      if (removedCount > 0) {
        console.log(`      [PostProcess] Removed ${removedCount} unused counters`);
      }
    }

    return output;
  }

  /**
   * マッピングテーブルを生成
   */
  private createMappingTable(spec: GameSpecification, output: LogicGeneratorOutput): MappingTable {
    // 安全にアクセス（undefinedの場合は空配列、さらにundefined要素をフィルタ）
    const specObjects = (spec.objects || []).filter(Boolean);
    const specCounters = (spec.stateManagement?.counters || []).filter(Boolean);
    const specSounds = (spec.audio?.sounds || []).filter(Boolean);
    const specRules = (spec.rules || []).filter(Boolean);
    const outputObjects = (output.assetPlan?.objects || []).filter(Boolean);
    const outputCounters = (output.script?.counters || []).filter(Boolean);
    const outputSounds = (output.assetPlan?.sounds || []).filter(Boolean);
    const outputRules = (output.script?.rules || []).filter(Boolean);

    const objectMappings: ObjectMapping[] = specObjects.map(specObj => {
      const editorObj = outputObjects.find(o => o?.id === specObj.id);
      return {
        specName: specObj.name || specObj.id,
        editorId: editorObj?.id || specObj.id,
        purpose: editorObj?.purpose || 'unknown'
      };
    });

    const counterMappings: CounterMapping[] = specCounters.map(specCounter => {
      const editorCounter = outputCounters.find(c => c?.id === specCounter.id || c?.name === specCounter.name);
      return {
        specName: specCounter.name || specCounter.id,
        editorId: editorCounter?.id || specCounter.id,
        editorName: editorCounter?.name || specCounter.name || specCounter.id
      };
    });

    const soundMappings: SoundMapping[] = specSounds.map(specSound => {
      const editorSound = outputSounds.find(s => s?.id === specSound.id);
      return {
        specId: specSound.id,
        editorId: editorSound?.id || specSound.id,
        trigger: specSound.trigger || 'unknown'
      };
    });

    const ruleMappings: RuleMapping[] = specRules.map(specRule => {
      const editorRule = outputRules.find(r => r?.id === specRule.id);
      return {
        specId: specRule.id,
        specName: specRule.name || specRule.id,
        editorId: editorRule?.id || specRule.id,
        purpose: specRule.purpose || 'unknown'
      };
    });

    return {
      objects: objectMappings,
      counters: counterMappings,
      sounds: soundMappings,
      rules: ruleMappings,
      summary: {
        totalObjects: objectMappings.length,
        totalCounters: counterMappings.length,
        totalSounds: soundMappings.length,
        totalRules: ruleMappings.length,
        mappingTimestamp: new Date().toISOString()
      }
    };
  }

  /**
   * モックマッピング（ドライラン用）
   */
  private mapMock(concept: GameConcept, spec: GameSpecification): EditorMapperOutput {
    // 安全にアクセス（undefinedの場合は空配列）
    const specObjects = spec.objects || [];
    const specCounters = spec.stateManagement?.counters || [];
    const specRules = spec.rules || [];
    const specSounds = spec.audio?.sounds || [];

    // オブジェクトをマッピング
    const objects: AssetPlan['objects'] = specObjects.map(obj => ({
      id: obj.id,
      name: obj.name,
      purpose: obj.touchable ? 'タップ対象' : '装飾',
      visualDescription: obj.visualDescription,
      initialPosition: obj.initialPosition || { x: 0.5, y: 0.5 },
      size: obj.size || 'medium'
    }));

    // レイアウトをマッピング（displayScale, zIndex を反映）
    const layoutObjects = specObjects.map((obj, index) => ({
      objectId: obj.id,
      position: obj.initialPosition || { x: 0.5, y: 0.5 },
      scale: obj.displayScale || { x: 1.0, y: 1.0 },
      zIndex: obj.zIndex ?? (index + 1)
    }));

    // カウンターをマッピング
    const counters = specCounters.map(c => ({
      id: c.id,
      name: c.name,
      initialValue: c.initialValue
    }));

    // ルールをマッピング
    const rules: GameRule[] = specRules.filter(rule => rule).map(rule => {
      const conditions = this.mapTriggerToConditions(rule.trigger);
      const actions = (rule.actions || []).map(a => this.mapActionToEditorAction(a));

      return {
        id: rule.id,
        name: rule.name,
        targetObjectId: rule.targetObject,
        triggers: {
          operator: 'AND' as const,
          conditions
        },
        actions
      };
    });

    // 音声をマッピング
    const sounds = specSounds.map(s => ({
      id: s.id,
      trigger: s.trigger,
      type: s.type
    }));

    const logicOutput: LogicGeneratorOutput = {
      script: {
        layout: { objects: layoutObjects },
        counters,
        rules
      },
      assetPlan: {
        objects,
        background: {
          description: `${concept.theme}をテーマにした背景`,
          mood: concept.visualStyle
        },
        sounds,
        bgm: spec.audio?.bgm
      },
      selfCheck: {
        hasPlayerActionOnSuccessPath: true,
        counterInitialValuesSafe: true,
        allObjectIdsValid: true,
        allCounterNamesValid: true,
        coordinatesInRange: true,
        onlyVerifiedFeaturesUsed: true,
        noRuleConflicts: true,
        allCountersFullyImplemented: true
      }
    };

    // マッピングテーブルを生成
    const mappingTable = this.createMappingTable(spec, logicOutput);

    return { logicOutput, mappingTable };
  }

  /**
   * トリガーを条件配列に変換
   */
  private mapTriggerToConditions(trigger: GameSpecification['rules'][0]['trigger']): TriggerCondition[] {
    // 防御的チェック: triggerがundefinedの場合は空の条件を返す
    if (!trigger) {
      console.warn('      [Warning] Rule has undefined trigger, using empty conditions');
      return [];
    }

    const params = trigger.parameters || {};

    switch (trigger.type) {
      case 'touch':
        // targetの正規化: 'stageArea' → 'stage' に変換
        let touchTarget = (params.target as string) || 'self';
        if (touchTarget === 'stageArea') {
          touchTarget = 'stage';
        }
        return [{
          type: 'touch' as const,
          target: touchTarget,
          touchType: (params.touchType as TriggerCondition['touchType']) || 'down',
          // regionがある場合は保持
          ...(params.region ? { region: params.region as TriggerCondition['region'] } : {})
        }];

      case 'time':
        return [{
          type: 'time' as const,
          timeType: (params.timeType as TriggerCondition['timeType']) || 'exact',
          seconds: params.seconds as number | undefined,
          interval: params.interval as number | undefined
        }];

      case 'counter':
        return [{
          type: 'counter' as const,
          counterName: params.counterName as string,
          comparison: (params.comparison as TriggerCondition['comparison']) || 'greaterOrEqual',
          value: params.value as number
        }];

      case 'collision':
        return [{
          type: 'collision' as const,
          target: params.target as string,
          collisionType: (params.collisionType as TriggerCondition['collisionType']) || 'enter'
        }];

      case 'flag':
        return [{
          type: 'flag' as const,
          flagId: params.flagId as string,
          ...(params.value !== undefined ? { flagValue: params.value as boolean } : {})
        }];

      case 'position':
        return [{
          type: 'position' as const,
          target: params.target as string,
          area: (params.area as 'inside' | 'outside') || 'inside',
          region: params.region as { x: number; y: number; width: number; height: number }
        }];

      case 'animation':
        return [{
          type: 'animation' as const,
          condition: (params.condition as TriggerCondition['condition']) || 'end',
          ...(params.frame !== undefined ? { frame: params.frame as number } : {}),
          ...(params.frameRange ? { frameRange: params.frameRange as [number, number] } : {}),
          ...(params.loopCount !== undefined ? { loopCount: params.loopCount as number } : {})
        }];

      case 'gameState':
        // Note: types.tsのTriggerConditionでは'gameState'型は未定義のプロパティを使う
        // 互換性のためas anyでキャスト
        return [{
          type: 'gameState' as const,
        } as TriggerCondition];

      case 'random':
        return [{
          type: 'random' as const,
          probability: (params.probability as number) || 0.5
        }];

      case 'always':
        return [{
          type: 'always' as const
        }];

      default:
        // 未知のタイプはそのまま渡す
        return [{
          type: trigger.type as any,
          ...params
        }];
    }
  }

  /**
   * アクションをエディター形式に変換
   */
  private mapActionToEditorAction(action: GameSpecification['rules'][0]['actions'][0]): GameAction {
    const params = action.parameters;

    switch (action.type) {
      case 'hide':
        return { type: 'hide' as const, targetId: params.targetId as string };

      case 'show':
        return { type: 'show' as const, targetId: params.targetId as string };

      case 'success':
        return { type: 'success' as const, message: params.message as string | undefined };

      case 'failure':
        return { type: 'failure' as const, message: params.message as string | undefined };

      case 'counter':
        return {
          type: 'counter' as const,
          counterName: params.counterName as string,
          operation: (params.operation as GameAction['operation']) || 'increment',
          value: (params.value as number) ?? 1
        };

      case 'playSound':
        return { type: 'playSound' as const, soundId: params.soundId as string };

      case 'effect':
        return {
          type: 'effect' as const,
          targetId: params.targetId as string,
          effect: params.effect as GameAction['effect']
        };

      case 'move':
        return {
          type: 'move' as const,
          targetId: params.targetId as string,
          movement: params.movement as GameAction['movement']
        };

      case 'addScore':
        return { type: 'addScore' as const, points: params.points as number };

      case 'setFlag':
        const setFlagResult: GameAction = {
          type: 'setFlag' as const,
          flagId: params.flagId as string,
          ...(params.value !== undefined && { flagValue: params.value as boolean })
        };
        // boolean値をnumber(1/0)に変換
        if (params.value !== undefined) {
          setFlagResult.value = params.value ? 1 : 0;
        }
        return setFlagResult;

      case 'toggleFlag':
        return {
          type: 'toggleFlag' as const,
          flagId: params.flagId as string
        };

      case 'switchAnimation':
        return {
          type: 'switchAnimation' as const,
          targetId: params.targetId as string,
          animationIndex: (params.animationIndex as number) || 0
        };

      case 'followDrag':
        return {
          type: 'followDrag' as const,
          targetId: params.targetId as string,
        };

      case 'applyForce':
        return {
          type: 'applyForce' as const,
          targetId: params.targetId as string,
          force: params.force as { x: number; y: number }
        };

      case 'applyImpulse':
        return {
          type: 'applyImpulse' as const,
          targetId: params.targetId as string,
          impulse: params.impulse as { x: number; y: number }
        };

      default:
        // Fallback: 未知のアクションタイプはそのまま渡す
        return {
          type: action.type as GameAction['type'],
          ...params
        } as GameAction;
    }
  }

  /**
   * JSONを抽出してパース
   */
  private extractAndParseJSON(text: string): LogicGeneratorOutput {
    let jsonStr = text;

    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    if (!jsonStr || !jsonStr.startsWith('{')) {
      throw new Error('No JSON found in response');
    }

    try {
      return JSON.parse(jsonStr) as LogicGeneratorOutput;
    } catch (error) {
      let repaired = jsonStr;
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
      repaired = repaired.replace(/\/\/[^\n]*/g, '');

      try {
        return JSON.parse(repaired) as LogicGeneratorOutput;
      } catch {
        this.logger?.logError('EditorMapper', `JSON parse failed: ${error}`);
        throw new Error(`JSON parse failed: ${error}`);
      }
    }
  }

  /**
   * トークン使用量を取得
   */
  getTokensUsed(): number {
    return this.tokensUsed;
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      config: this.config,
      tokensUsed: this.tokensUsed
    };
  }
}

export default EditorMapper;
