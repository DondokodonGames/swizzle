/**
 * Step 3: LogicGenerator
 *
 * エディター仕様に厳密に従ってGameScriptを生成
 * 即成功/即失敗/型エラーは絶対に出さない
 */

import { ILLMProvider, createLLMProvider, LLMProviderType, DEFAULT_MODELS } from './llm';
import { GameConcept, LogicGeneratorOutput, AssetPlan } from './types';
import { robustParseJSON } from './jsonParser';

const EDITOR_SPEC = `
# Swizzle ゲームエンジン仕様

## 座標系
- 正規化座標: 0.0〜1.0
- x: 0.0=左端, 1.0=右端
- y: 0.0=上端, 1.0=下端
- 中央 = (0.5, 0.5)

## 速度（px/frame, 60FPS）
- 遅い: 1.0-2.0、普通: 2.0-4.0、速い: 4.0-8.0

## 使用可能な条件タイプ
| タイプ | 説明 | 主なパラメータ |
|--------|------|---------------|
| touch | タップ/スワイプ/ドラッグ検出 | target, touchType: 'down'/'up'/'hold'/'drag'/'swipe'/'flick' |
| time | 時間経過 | timeType: 'exact'/'interval', seconds, interval |
| counter | カウンター値判定 | counterName, comparison, value |
| collision | 衝突検出 | target, collisionType: 'enter'/'stay'/'exit' |
| flag | フラグ状態 | flagId, condition: 'ON'/'OFF' |
| position | エリア判定 | target, area: 'inside'/'outside'/'crossing', region |
| animation | アニメ状態 | target, condition: 'playing'/'stopped'/'frame'/'end' |
| random | 確率判定 | probability: 0.0-1.0, interval |
| gameState | ゲーム状態 | state: 'playing'/'paused' |
| objectState | オブジェクト状態 | target, stateType: 'visible'/'hidden'/'animation' |

## 使用可能なアクションタイプ
| タイプ | 説明 | 主なパラメータ |
|--------|------|---------------|
| success | ゲームクリア | score?, message? |
| failure | ゲームオーバー | message? |
| hide | オブジェクト非表示 | targetId |
| show | オブジェクト表示 | targetId |
| move | オブジェクト移動 | targetId, movement: { type, target/direction, speed } |
| followDrag | ドラッグ追従 | targetId, constraint?, smooth? |
| counter | カウンター操作 | counterName, operation, value |
| addScore | スコア加算 | points |
| effect | 視覚エフェクト | targetId, effect: { type: 'flash'/'shake'/'scale'/'rotate'/'particles' } |
| setFlag | フラグ設定 | flagId, value |
| toggleFlag | フラグ切替 | flagId |
| playSound | 効果音再生 | soundId |
| switchAnimation | アニメ切替 | targetId, animationIndex |
| applyForce | 継続的な力 | targetId, force: {x, y} |
| applyImpulse | 瞬間的な力 | targetId, impulse: {x, y} |
| randomAction | ランダム実行 | actions: [{action, weight}] |

## movement.typeの種類
- straight: 直線移動（target座標またはdirection方向へ）
- teleport: 瞬間移動
- wander: ランダム徘徊
- bounce: 壁で反射
- approach: 対象に接近
- orbit: 対象を周回

## movement.directionの種類
- 'up', 'down', 'left', 'right'
- 'up-left', 'up-right', 'down-left', 'down-right'
`;

const LOGIC_PROMPT = `あなたはSwizzleゲームエンジンのGameScriptを生成するエキスパートです。
ゲームコンセプトを読み、そのコンセプトを**忠実に**実装するゲームロジックを生成してください。

${EDITOR_SPEC}

# 最重要: コンセプトに忠実に実装する

**アイデアを勝手に変更しないでください。**
- playerGoal に書かれた目標をそのまま実装
- playerOperation に書かれた操作方法をそのまま実装
- 「岩を壊す」なら岩を壊すゲーム、「順番にタッチ」なら順番ゲーム
- 勝手にゲームを複雑にしたり、別のゲームに変えたりしない

# 必須要件

## 1. シンプルに作る（5-10秒のゲーム）
- オブジェクト数: コンセプトに必要な分だけ
- 複雑なロジックは不要。条件→アクションの1対1対応で良い

## 2. 成功/失敗パターンの選択

**まず「カウンターが本当に必要か」を判断してから実装する。**
デフォルトはパターンAを試みて、数え上げが必要な場合のみパターンBを使う。

### パターンA: 直接判定（カウンター不要・推奨）
1つの操作・状態変化で結果が決まる場合、counterを定義せず直接success/failureを発動。

例1: ドラッグしてゴールに重ねたら成功
  条件: collision(target="goal", enter) → アクション: success

例2: 正しいオブジェクトをタップしたら成功
  条件: touch(target="self", down) on targetObjectId="correct_item" → アクション: success

例3: 敵に触れたら失敗
  条件: collision(target="enemy", enter) → アクション: failure

例4: エリア外に出たら失敗
  条件: position(target="player", area="outside", region=ゾーン) → アクション: failure

例5: タイミングよくタップしたら成功
  条件: touch(down) AND position(area="inside", region=指定ゾーン) → アクション: success

### パターンB: カウント判定（カウンターが必要な場合のみ）
「N個集める」「N回成功する」という**数え上げが核心のゲームのみ**使う。
カウンターを定義した場合、操作ルールと判定ルールの両方を必ず作成する。

例: 5個タップしたら成功
  ルール1: touch(down) → counter(collected, add, 1)
  ルール2: counter(collected >= 5) → success

**判断基準（これで決める）:**
| ゲームの核心 | 使うパターン |
|------------|------------|
| 「N個/N回」という数え上げ | パターンB（カウンター） |
| 「特定の操作をしたら」 | パターンA（直接判定） |
| ドラッグ・回避・タイミング系 | パターンA（直接判定） |
| 「正解を選ぶ」「ゴールに運ぶ」 | パターンA（直接判定） |

## 3. ルールのコンフリクトを防ぐ
同一条件で矛盾するアクションを発動させない:
- show + hide を同時に発動
- success + failure を同時に発動
- 同じカウンターに add + subtract を同時実行

## 4. 成功条件は必ず到達可能にする
**原則**: プレイヤーの操作によって成功に到達できること
- ゲーム開始直後に成功/失敗しない
- time条件のみで成功させない（プレイヤー操作が必要）
- 成功に必要なアクションを実行できるルールが存在すること

## 5. ID整合性を保つ
- objectIdはassetPlanに定義したものを正確に使用
- counterNameはcountersに定義したものを使用
- soundIdはassetPlan.soundsに定義したものを使用（se_xxx形式）
- 座標は0.0〜1.0の範囲内

## 6. 音声を必ず生成
- sounds配列にはSEを3〜5個定義
- bgm配列にはBGMを1個定義
- 必須SE: タップ時(se_tap)、成功時(se_success)、失敗時(se_failure)

## 7. 衝突ターゲットには移動ルール必須

collision 条件の target に指定したオブジェクトは必ず独自のルールを持つこと。
「流れる障害物」「移動する敵」「転がるボール」等、全 collision 対象オブジェクトに以下2ルールが必要:

  ルール1 (起動): time(timeType="exact", seconds=0) → move(straight, direction="down", speed=3)
  ルール2 (リセット): collision(target="stageArea", collisionType="exit") → move(teleport, target={x: 元の位置, y: -0.1})

静止した壁・ゴールゾーン等を collision 対象にする場合: collision ターゲットから外して position 条件で代替。
collision ターゲットにしたオブジェクトで move ルールがないものは必ず追加すること（省略禁止）。

# ゲームコンセプト
{{CONCEPT}}

# 出力形式
以下のJSON構造のみを出力。説明文は不要。

{
  "script": {
    "layout": {
      "objects": [
        { "objectId": "string", "position": { "x": 0.0-1.0, "y": 0.0-1.0 }, "scale": { "x": 1.0, "y": 1.0 } }
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
          "operator": "AND" | "OR",
          "conditions": [ /* TriggerCondition[] */ ]
        },
        "actions": [ /* GameAction[] */ ]
      }
    ]
  },
  "assetPlan": {
    "objects": [
      {
        "id": "string",
        "name": "string",
        "purpose": "ゲーム内での役割",
        "visualDescription": "外見の詳細な説明",
        "initialPosition": { "x": 0.0-1.0, "y": 0.0-1.0 },
        "size": "small" | "medium" | "large"
      }
    ],
    "background": {
      "description": "背景の詳細な説明",
      "mood": "雰囲気"
    },
    "sounds": [
      { "id": "se_tap", "trigger": "タップ時", "type": "tap" },
      { "id": "se_success", "trigger": "成功時", "type": "success" },
      { "id": "se_failure", "trigger": "失敗時", "type": "failure" },
      { "id": "se_xxx", "trigger": "ゲーム固有のイベント時", "type": "collect/pop/bounce/ding等" }
    ],
    "bgm": {
      "id": "bgm_main",
      "description": "BGMの雰囲気説明",
      "mood": "upbeat/calm/tense/happy/mysterious/energetic のいずれか"
    }
  },
  "selfCheck": {
    "hasPlayerActionOnSuccessPath": boolean,
    "counterInitialValuesSafe": boolean,
    "allObjectIdsValid": boolean,
    "allCounterNamesValid": boolean,
    "coordinatesInRange": boolean,
    "onlyVerifiedFeaturesUsed": boolean,
    "noRuleConflicts": boolean,
    "counterUsedOnlyWhenNecessary": boolean  // 数え上げが核心の場合のみカウンターを使っているか
  }
}`;

export interface LogicGeneratorConfig {
  model?: string;
  dryRun?: boolean;
  apiKey?: string;
  llmProvider?: LLMProviderType;
}

export class LogicGenerator {
  private llmProvider: ILLMProvider;
  private config: Required<Omit<LogicGeneratorConfig, 'apiKey' | 'llmProvider'>>;
  private tokensUsed: number = 0;

  constructor(config?: LogicGeneratorConfig) {
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
  }

  /**
   * ゲームロジックを生成
   */
  async generate(concept: GameConcept, validationFeedback?: string): Promise<LogicGeneratorOutput> {
    if (this.config.dryRun) {
      return this.generateMockLogic(concept);
    }

    let prompt = LOGIC_PROMPT.replace('{{CONCEPT}}', JSON.stringify(concept, null, 2));

    // バリデーションフィードバックがある場合（修正時）
    if (validationFeedback) {
      prompt += `\n\n# 前回の問題点（必ず修正してください）\n${validationFeedback}`;
    }

    const response = await this.llmProvider.chat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 16384, model: this.config.model }
    );

    this.tokensUsed = (response.usage?.inputTokens || 0) + (response.usage?.outputTokens || 0);

    // JSONを抽出してパース
    const output = this.extractAndParseJSON(response.content);

    // 基本的な構造チェック
    if (!output.script?.rules || output.script.rules.length === 0) {
      console.log('      ❌ Parsed output missing rules:', JSON.stringify(output.script, null, 2).substring(0, 500));
      throw new Error('No rules generated');
    }
    if (!output.assetPlan?.objects || output.assetPlan.objects.length === 0) {
      console.log('      ❌ Parsed output missing assetPlan.objects:', JSON.stringify(output.assetPlan, null, 2).substring(0, 500));
      throw new Error('No objects in asset plan');
    }

    return output;
  }

  /**
   * モックロジック生成（ドライラン用）
   * 3パターンをランダム選択して多様性を担保
   */
  private generateMockLogic(concept: GameConcept): LogicGeneratorOutput {
    const patterns = ['direct', 'counter', 'drag'] as const;
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    switch (pattern) {
      case 'direct': return this.generateDirectMock(concept);
      case 'counter': return this.generateCounterMock(concept);
      case 'drag': return this.generateDragMock(concept);
    }
  }

  /** パターンA: タップ→直接success（カウンターなし） */
  private generateDirectMock(concept: GameConcept): LogicGeneratorOutput {
    const objects: AssetPlan['objects'] = [
      { id: 'correct', name: '正解', purpose: 'タップして成功', visualDescription: '正解オブジェクト', initialPosition: { x: 0.5, y: 0.5 }, size: 'large' },
      { id: 'wrong_1', name: 'ハズレ1', purpose: 'タップして失敗', visualDescription: 'ハズレオブジェクト', initialPosition: { x: 0.2, y: 0.3 }, size: 'medium' },
      { id: 'wrong_2', name: 'ハズレ2', purpose: 'タップして失敗', visualDescription: 'ハズレオブジェクト', initialPosition: { x: 0.8, y: 0.7 }, size: 'medium' },
    ];
    return {
      script: {
        layout: { objects: objects.map(o => ({ objectId: o.id, position: o.initialPosition, scale: { x: 1.0, y: 1.0 } })) },
        counters: [],
        rules: [
          { id: 'tap_correct', name: '正解タップ', targetObjectId: 'correct',
            triggers: { operator: 'AND' as const, conditions: [{ type: 'touch' as const, target: 'self', touchType: 'down' as const }] },
            actions: [{ type: 'success' as const, message: '正解！' }] },
          { id: 'tap_wrong_1', name: 'ハズレ1タップ', targetObjectId: 'wrong_1',
            triggers: { operator: 'AND' as const, conditions: [{ type: 'touch' as const, target: 'self', touchType: 'down' as const }] },
            actions: [{ type: 'failure' as const, message: 'ハズレ...' }] },
          { id: 'tap_wrong_2', name: 'ハズレ2タップ', targetObjectId: 'wrong_2',
            triggers: { operator: 'AND' as const, conditions: [{ type: 'touch' as const, target: 'self', touchType: 'down' as const }] },
            actions: [{ type: 'failure' as const, message: 'ハズレ...' }] },
        ]
      },
      assetPlan: {
        objects,
        background: { description: `${concept.theme}の背景`, mood: concept.visualStyle },
        sounds: [
          { id: 'se_tap', trigger: 'タップ時', type: 'tap' },
          { id: 'se_success', trigger: '成功時', type: 'success' },
          { id: 'se_failure', trigger: '失敗時', type: 'failure' },
        ],
        bgm: { id: 'bgm_main', description: `${concept.theme}のBGM`, mood: 'upbeat' as const }
      },
      selfCheck: { hasPlayerActionOnSuccessPath: true, counterInitialValuesSafe: true, allObjectIdsValid: true, allCounterNamesValid: true, coordinatesInRange: true, onlyVerifiedFeaturesUsed: true, noRuleConflicts: true, counterUsedOnlyWhenNecessary: true }
    };
  }

  /** パターンB: タップ→counter→success（数え上げ型） */
  private generateCounterMock(concept: GameConcept): LogicGeneratorOutput {
    const count = 4;
    const objects: AssetPlan['objects'] = Array.from({ length: count }, (_, i) => ({
      id: `target_${i + 1}`, name: `ターゲット${i + 1}`, purpose: 'タップ対象',
      visualDescription: 'タップ対象のオブジェクト',
      initialPosition: { x: 0.2 + (i % 2) * 0.6, y: 0.3 + Math.floor(i / 2) * 0.4 },
      size: 'medium' as const
    }));
    return {
      script: {
        layout: { objects: objects.map(o => ({ objectId: o.id, position: o.initialPosition, scale: { x: 1.0, y: 1.0 } })) },
        counters: [{ id: 'tapped', name: 'tapped', initialValue: 0 }],
        rules: [
          ...objects.map((obj, i) => ({
            id: `tap_${i + 1}`, name: `${obj.name}タップ`, targetObjectId: obj.id,
            triggers: { operator: 'AND' as const, conditions: [{ type: 'touch' as const, target: 'self', touchType: 'down' as const }] },
            actions: [
              { type: 'hide' as const, targetId: obj.id },
              { type: 'counter' as const, counterName: 'tapped', operation: 'add' as const, value: 1 },
            ]
          })),
          { id: 'win', name: '成功判定',
            triggers: { operator: 'AND' as const, conditions: [{ type: 'counter' as const, counterName: 'tapped', comparison: 'greaterOrEqual' as const, value: count }] },
            actions: [{ type: 'success' as const, message: 'クリア！' }] },
        ]
      },
      assetPlan: {
        objects,
        background: { description: `${concept.theme}の背景`, mood: concept.visualStyle },
        sounds: [
          { id: 'se_tap', trigger: 'タップ時', type: 'tap' },
          { id: 'se_success', trigger: '成功時', type: 'success' },
          { id: 'se_failure', trigger: '失敗時', type: 'failure' },
          { id: 'se_collect', trigger: '取得時', type: 'collect' },
        ],
        bgm: { id: 'bgm_main', description: `${concept.theme}のBGM`, mood: 'upbeat' as const }
      },
      selfCheck: { hasPlayerActionOnSuccessPath: true, counterInitialValuesSafe: true, allObjectIdsValid: true, allCounterNamesValid: true, coordinatesInRange: true, onlyVerifiedFeaturesUsed: true, noRuleConflicts: true, counterUsedOnlyWhenNecessary: true }
    };
  }

  /** パターンC: ドラッグ→position/collision→success（移動型） */
  private generateDragMock(concept: GameConcept): LogicGeneratorOutput {
    const objects: AssetPlan['objects'] = [
      { id: 'item', name: 'アイテム', purpose: 'ドラッグして運ぶ対象', visualDescription: 'ドラッグ可能なオブジェクト', initialPosition: { x: 0.5, y: 0.7 }, size: 'medium' },
      { id: 'goal', name: 'ゴール', purpose: 'アイテムを運ぶ先', visualDescription: 'ゴールエリア', initialPosition: { x: 0.5, y: 0.2 }, size: 'large' },
    ];
    return {
      script: {
        layout: { objects: objects.map(o => ({ objectId: o.id, position: o.initialPosition, scale: { x: 1.0, y: 1.0 } })) },
        counters: [],
        rules: [
          { id: 'drag_item', name: 'アイテムドラッグ', targetObjectId: 'item',
            triggers: { operator: 'AND' as const, conditions: [{ type: 'touch' as const, target: 'self', touchType: 'drag' as const }] },
            actions: [{ type: 'followDrag' as const, targetId: 'item' }] },
          { id: 'reach_goal', name: 'ゴール到達', targetObjectId: 'item',
            triggers: { operator: 'AND' as const, conditions: [{ type: 'collision' as const, target: 'goal', collisionType: 'enter' as const }] },
            actions: [{ type: 'success' as const, message: 'ゴール！' }] },
        ]
      },
      assetPlan: {
        objects,
        background: { description: `${concept.theme}の背景`, mood: concept.visualStyle },
        sounds: [
          { id: 'se_tap', trigger: 'タップ時', type: 'tap' },
          { id: 'se_success', trigger: '成功時', type: 'success' },
          { id: 'se_failure', trigger: '失敗時', type: 'failure' },
        ],
        bgm: { id: 'bgm_main', description: `${concept.theme}のBGM`, mood: 'upbeat' as const }
      },
      selfCheck: { hasPlayerActionOnSuccessPath: true, counterInitialValuesSafe: true, allObjectIdsValid: true, allCounterNamesValid: true, coordinatesInRange: true, onlyVerifiedFeaturesUsed: true, noRuleConflicts: true, counterUsedOnlyWhenNecessary: true }
    };
  }

  /**
   * JSONを抽出してパース（エラー回復機能付き）
   */
  private extractAndParseJSON(text: string): LogicGeneratorOutput {
    return robustParseJSON<LogicGeneratorOutput>(text);
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
