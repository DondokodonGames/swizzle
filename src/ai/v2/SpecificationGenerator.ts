/**
 * Step 4: SpecificationGenerator (強化版)
 *
 * ゲームデザインから詳細仕様を生成
 * エディターの機能を意識しつつ、実装の詳細は次ステップに委ねる
 *
 * 入力: GameConcept + GameDesign + AssetPlan
 * 出力: GameSpecification（強化版：UI/視認性、フィードバック、終了演出、priority含む）
 */

import { ILLMProvider, createLLMProvider, LLMProviderType, DEFAULT_MODELS } from './llm';
import { GameConcept } from './types';
import { GameDesign } from './GameDesignGenerator';
import { EnhancedAssetPlan } from './AssetPlanner';
import { GenerationLogger } from './GenerationLogger';

/**
 * ゲーム仕様（詳細な動作定義）- 強化版
 */
export interface GameSpecification {
  // オブジェクト仕様
  objects: ObjectSpecification[];

  // 状態管理（カウンター、フラグなど）
  stateManagement: StateManagement;

  // ルール仕様
  rules: RuleSpecification[];

  // 音声仕様
  audio: AudioSpecification;

  // ★NEW: UI/視認性仕様
  uiVisibility: UIVisibilitySpec;

  // ★NEW: フィードバック仕様
  feedbackSpec: FeedbackSpec;

  // ★NEW: 終了演出仕様
  endingSpec: EndingSpec;

  // ★NEW: Priority設計
  priorityDesign: PriorityDesign;

  // 成功パス（プレイヤーが勝利に至る道筋）
  successPath: {
    steps: string[];
    verification: string;
  };

  // 仕様決定の記録
  specDecisions: SpecDecision[];
}

// ★NEW: UI/視認性仕様
export interface UIVisibilitySpec {
  touchTargetMinSize: 'small' | 'medium' | 'large';
  contrastRequirement: 'low' | 'medium' | 'high';
  layoutStrategy: 'centered' | 'distributed' | 'clustered' | 'random';
  overlapPolicy: 'allow' | 'avoid' | 'prevent';
  safeZone: {
    top: number;      // 0.0-1.0 (画面上部の安全マージン)
    bottom: number;
    left: number;
    right: number;
  };
}

// ★NEW: フィードバック仕様
export interface FeedbackSpec {
  triggers: FeedbackTrigger[];
}

export interface FeedbackTrigger {
  event: string;                    // 'tap', 'collect', 'hit', 'success', 'failure'など
  visual: {
    type: 'flash' | 'scale' | 'shake' | 'particle' | 'color' | 'none';
    intensity: 'subtle' | 'normal' | 'strong';
    duration: number;               // 秒
  };
  audio: {
    soundId: string;
    volume: 'low' | 'normal' | 'high';
  };
  haptic?: boolean;                 // バイブレーション
}

// ★NEW: 終了演出仕様
export interface EndingSpec {
  success: {
    duration: number;               // 演出の持続時間（秒）
    effects: string[];              // 'confetti', 'flash', 'zoom', 'message'など
    soundId: string;
    message?: string;
  };
  failure: {
    duration: number;
    effects: string[];
    soundId: string;
    message?: string;
  };
  transitionDelay: number;          // 終了後の遷移までの待機時間
}

// ★NEW: Priority設計
export interface PriorityDesign {
  rulePriorities: RulePrioritySpec[];
  conflictResolution: 'first' | 'last' | 'highest-priority';
  notes: string[];
}

export interface RulePrioritySpec {
  ruleId: string;
  priority: number;                 // 数値が大きいほど優先
  reason: string;
}

export interface ObjectSpecification {
  id: string;
  name: string;
  visualDescription: string;
  initialPosition: { x: number; y: number };  // 0.0-1.0正規化座標
  size: 'small' | 'medium' | 'large';
  initiallyVisible: boolean;
  physicsEnabled: boolean;
  touchable: boolean;
}

export interface StateManagement {
  counters: CounterSpec[];
  flags: FlagSpec[];
}

export interface CounterSpec {
  id: string;
  name: string;
  initialValue: number;
  purpose: string;           // なぜこのカウンターが必要か
  modifiedBy: string[];      // どのルールが変更するか
  checkedBy: string[];       // どのルールがチェックするか
}

export interface FlagSpec {
  id: string;
  name: string;
  initialValue: boolean;
  purpose: string;
}

export interface RuleSpecification {
  id: string;
  name: string;
  description: string;       // 何をするルールか（自然言語）
  targetObject?: string;     // 対象オブジェクト（あれば）

  // トリガー条件
  trigger: {
    type: 'touch' | 'time' | 'counter' | 'collision' | 'flag' | 'always' | 'position' | 'animation' | 'gameState' | 'random' | 'objectState';
    description: string;     // 条件の説明
    parameters: Record<string, unknown>;  // 詳細パラメータ
  };

  // アクション
  actions: {
    type: string;
    description: string;
    parameters: Record<string, unknown>;
  }[];

  // このルールの目的
  purpose: 'core-mechanic' | 'win-condition' | 'lose-condition' | 'feedback' | 'state-update';
}

export interface AudioSpecification {
  sounds: {
    id: string;
    trigger: string;
    type: 'tap' | 'success' | 'failure' | 'collect' | 'pop' | 'whoosh' | 'bounce' | 'ding' | 'buzz' | 'splash';
  }[];
  bgm?: {
    id: string;
    description: string;
    mood: 'upbeat' | 'calm' | 'tense' | 'happy' | 'mysterious' | 'energetic';
  };
}

export interface SpecDecision {
  aspect: string;
  decision: string;
  reasoning: string;
}

const SPEC_PROMPT = `あなたはゲームの仕様書を作成するエンジニアです。
ゲームデザインを、実装可能な詳細仕様に変換してください。

# ★★★ 最重要: 「核心体験」を実現するルールを作る ★★★

デザインの coreExperience.keyMechanic を必ずルールとして実装してください。

## 核心メカニクスの実装例

**例1: 「回転操作で位置を合わせる」**
→ ルールに必要なもの:
- オブジェクトの回転状態を管理
- ドラッグ/スワイプで回転角度を変更するルール
- 正しい角度で成功判定するルール

**例2: 「ポイで金魚をすくい上げる」**
→ ルールに必要なもの:
- ドラッグでポイを移動するルール
- 金魚との接触判定ルール
- すくい上げ動作（上方向へのドラッグ）で成功判定

**例3: 「星座の形を見出す」**
→ ルールに必要なもの:
- 星をタップして選択状態にするルール
- 選択した星の組み合わせが正解パターンかチェック
- 正しい組み合わせで成功判定

## 核心メカニクス実装チェック ★必須
仕様を出力する前に、以下を確認してください:
1. coreExperience.keyMechanic に対応するルールが存在するか？
2. そのルールは「その操作」を受け付けているか？（回転なら回転、ドラッグならドラッグ）
3. 成功時のフィードバックは「核心体験」を強化しているか？

## よくある間違い ❌
- 「回転させる」コンセプトなのにタップだけのルールになっている
- 「すくう」動作なのに単なる接触判定になっている
- 核心メカニクスが実装されていない（ただタップして消すだけ）

## 正しい仕様作成 ✅
- 核心メカニクスを実現する操作タイプを正しく選択（rotation, drag, swipe等）
- その操作に対する適切な条件とアクションを設計
- 成功時に「気持ちいい瞬間」を演出するフィードバック

# 入力
- コンセプト: ゲームの概要（★これがゲームの「正解」）
- デザイン: ゲームの設計
- アセットプラン: 利用可能なアセット（★オブジェクトIDはこれに合わせる）

# 絶対に守るべき制約

## 座標の制約 ★必須
- すべての座標は 0.0〜1.0 の範囲内
- 負の値は禁止（-0.1 などは NG）
- 1.0を超える値も禁止（1.2 などは NG）
- 中央 = (0.5, 0.5)、左上 = (0.0, 0.0)、右下 = (1.0, 1.0)

## カウンターの一貫性 ★必須
カウンターを定義する場合、必ず以下の両方が必要:
1. **変更するルール**: counterアクションでカウンターを操作
2. **チェックするルール**: counter条件でカウンターを判定

例:
- ✅ tapped_count: タップで+1、5以上で成功 → 両方ある
- ❌ game_time: 失敗条件でチェックするが、どこでも操作しない → NG
- ❌ wind_timer: 定義したが使わない → NG（定義しない）

**カウンターが不要な場合は定義しない**
- 「特定オブジェクトをタップしたら成功」→ touch条件で直接success
- 「ゴールに到達したら成功」→ collision/position条件で直接success

## 必須サウンド ★必須
以下の3つは必ず含める:
- se_tap: タップ時の効果音
- se_success: 成功時の効果音
- se_failure: 失敗時の効果音

# 出力する仕様

## 1. オブジェクト仕様
各オブジェクトの詳細を定義:
- ID（英数字、スネークケース）
- 位置（0.0-1.0の正規化座標、中央=(0.5, 0.5)）★範囲外禁止
- サイズ（small/medium/large）
- 初期表示状態
- タッチ可能かどうか

## 2. 状態管理
カウンターとフラグを定義:
- **カウンターを使う判断基準**: 「何かを数える必要があるか？」
- 各カウンターには「変更するルール」と「チェックするルール」の両方が必要
- modifiedBy と checkedBy フィールドに具体的なルールIDを記載

## 3. ルール仕様
各インタラクションをルールとして定義

### タッチ条件の書き方 ★重要
タッチ条件では必ず target と touchType を指定:
- target: タッチ対象
  - "self": このルールがtargetObjectに設定されたオブジェクト自身
  - "stage": 画面全体（どこをタッチしても発火）
  - オブジェクトID: 特定のオブジェクトをタッチしたとき
- touchType: タッチの種類
  - "down": タップ開始
  - "up": タップ終了
  - "drag": ドラッグ中
  - "hold": 長押し

**例:**
{
  "trigger": {
    "type": "touch",
    "parameters": {
      "target": "self",
      "touchType": "down"
    }
  }
}

## 4. 音声仕様
必須: タップ音(se_tap)、成功音(se_success)、失敗音(se_failure)

## 5. UI/視認性仕様 ★重要
操作対象が一目で分かるようにする:
- タッチ対象の最小サイズ
- コントラスト要件
- レイアウト戦略
- 安全マージン

## 6. フィードバック仕様 ★重要
主要トリガーごとに視覚＋聴覚のセットを必ず定義:
- tap: タップ時の反応
- collect/hit: 獲得/被弾時
- success/failure: 終了時
各フィードバックには duration（秒）を明示

## 7. 終了演出仕様 ★重要
- success: 成功演出の持続時間と効果
- failure: 失敗演出の持続時間と効果
- transitionDelay: 次画面への遷移待機

## 8. Priority設計 ★重要
ルール発火順で問題が起きないように:
- 各ルールの優先度（数値大=優先）
- win-conditionが永遠に発火しない構造を防ぐ

## 9. 成功パス
プレイヤーが勝利に至る道筋と検証

# コンセプト
{{CONCEPT}}

# ゲームデザイン
{{DESIGN}}

# アセットプラン（参考）
{{ASSET_PLAN}}

# 出力形式（JSON）
{
  "objects": [
    {
      "id": "target_1",
      "name": "ターゲット1",
      "visualDescription": "...",
      "initialPosition": { "x": 0.3, "y": 0.4 },  // ★必ず0.0-1.0の範囲
      "size": "medium",
      "initiallyVisible": true,
      "physicsEnabled": false,
      "touchable": true
    }
  ],
  "stateManagement": {
    "counters": [
      {
        "id": "tapped_count",
        "name": "タップ数",
        "initialValue": 0,
        "purpose": "タップした数を数える",
        "modifiedBy": ["tap_target_1", "tap_target_2"],  // ★操作するルール
        "checkedBy": ["check_win"]                       // ★チェックするルール
      }
    ],
    "flags": []
  },
  "rules": [
    {
      "id": "tap_target_1",
      "name": "ターゲット1タップ",
      "description": "ターゲット1をタップしたら消える",
      "targetObject": "target_1",
      "trigger": {
        "type": "touch",
        "description": "ターゲット1をタップ",
        "parameters": {
          "target": "self",
          "touchType": "down"
        }
      },
      "actions": [
        { "type": "hide", "description": "消す", "parameters": { "targetId": "target_1" } },
        { "type": "playSound", "description": "効果音", "parameters": { "soundId": "se_tap" } },
        { "type": "counter", "description": "カウント+1", "parameters": { "counterName": "tapped_count", "operation": "increment" } }
      ],
      "purpose": "core-mechanic"
    },
    {
      "id": "check_win",
      "name": "勝利判定",
      "description": "タップ数が目標に達したら成功",
      "trigger": {
        "type": "counter",
        "description": "タップ数が2以上",
        "parameters": {
          "counterName": "tapped_count",
          "comparison": "greaterOrEqual",
          "value": 2
        }
      },
      "actions": [
        { "type": "success", "description": "ゲームクリア", "parameters": {} },
        { "type": "playSound", "description": "成功音", "parameters": { "soundId": "se_success" } }
      ],
      "purpose": "win-condition"
    }
  ],
  "audio": {
    "sounds": [
      { "id": "se_tap", "trigger": "タップ時", "type": "tap" },       // ★必須
      { "id": "se_success", "trigger": "成功時", "type": "success" }, // ★必須
      { "id": "se_failure", "trigger": "失敗時", "type": "failure" }  // ★必須
    ],
    "bgm": { "id": "bgm_main", "description": "...", "mood": "upbeat" }
  },
  "uiVisibility": {
    "touchTargetMinSize": "medium",
    "contrastRequirement": "high",
    "layoutStrategy": "distributed",
    "overlapPolicy": "prevent",
    "safeZone": { "top": 0.1, "bottom": 0.1, "left": 0.05, "right": 0.05 }
  },
  "feedbackSpec": {
    "triggers": [
      {
        "event": "tap",
        "visual": { "type": "scale", "intensity": "normal", "duration": 0.15 },
        "audio": { "soundId": "se_tap", "volume": "normal" }
      },
      {
        "event": "success",
        "visual": { "type": "particle", "intensity": "strong", "duration": 1.5 },
        "audio": { "soundId": "se_success", "volume": "high" }
      },
      {
        "event": "failure",
        "visual": { "type": "shake", "intensity": "normal", "duration": 0.5 },
        "audio": { "soundId": "se_failure", "volume": "normal" }
      }
    ]
  },
  "endingSpec": {
    "success": { "duration": 1.5, "effects": ["confetti", "flash"], "soundId": "se_success" },
    "failure": { "duration": 1.0, "effects": ["shake"], "soundId": "se_failure" },
    "transitionDelay": 2.0
  },
  "priorityDesign": {
    "rulePriorities": [
      { "ruleId": "check_win", "priority": 100, "reason": "勝利判定は最優先" },
      { "ruleId": "tap_target", "priority": 50, "reason": "基本操作" }
    ],
    "conflictResolution": "highest-priority",
    "notes": ["成功判定はカウンター増加後に評価される"]
  },
  "successPath": { "steps": [...], "verification": "..." },
  "specDecisions": [...]
}`;

export interface SpecificationGeneratorConfig {
  model?: string;
  dryRun?: boolean;
  apiKey?: string;
  llmProvider?: LLMProviderType;
}

export class SpecificationGenerator {
  private llmProvider: ILLMProvider;
  private config: Required<Omit<SpecificationGeneratorConfig, 'apiKey' | 'llmProvider'>>;
  private logger?: GenerationLogger;
  private tokensUsed: number = 0;

  constructor(config?: SpecificationGeneratorConfig, logger?: GenerationLogger) {
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
   * ゲームデザインから仕様を生成
   */
  async generate(
    concept: GameConcept,
    design: GameDesign,
    assetPlan?: EnhancedAssetPlan
  ): Promise<GameSpecification> {
    this.logger?.logInput('SpecificationGenerator', 'design', {
      coreLoop: design.coreLoop?.description || 'unknown',
      objectCount: design.objects?.length || 0,
      interactionCount: design.interactions?.length || 0,
      hasAssetPlan: !!assetPlan
    });

    if (this.config.dryRun) {
      return this.generateMockSpec(concept, design, assetPlan);
    }

    const prompt = SPEC_PROMPT
      .replace('{{CONCEPT}}', JSON.stringify(concept, null, 2))
      .replace('{{DESIGN}}', JSON.stringify(design, null, 2))
      .replace('{{ASSET_PLAN}}', assetPlan ? JSON.stringify(assetPlan, null, 2) : 'なし');

    const response = await this.llmProvider.chat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 8192, model: this.config.model }
    );

    this.tokensUsed = (response.usage?.inputTokens || 0) + (response.usage?.outputTokens || 0);

    const spec = this.extractAndParseJSON(response.content);

    // ログに記録（nullチェック付き）
    this.logger?.logSpecificationGeneration({
      objects: (spec.objects || []).map(o => ({ id: o.id, behavior: o.touchable ? 'interactive' : 'static' })),
      rules: (spec.rules || []).map(r => ({ trigger: r.trigger?.description || 'unknown', action: (r.actions || []).map(a => a.type).join(', ') })),
      successPath: (spec.successPath?.steps || []).join(' → '),
      decisions: (spec.specDecisions || []).map(d => `${d.aspect}: ${d.decision}`)
    });

    return spec;
  }

  /**
   * モック仕様生成（ドライラン用）
   */
  private generateMockSpec(
    concept: GameConcept,
    design: GameDesign,
    _assetPlan?: EnhancedAssetPlan
  ): GameSpecification {
    const designObjects = design.objects || [];
    const objects: ObjectSpecification[] = designObjects.map((obj, i) => ({
      id: obj.id,
      name: obj.name,
      visualDescription: obj.appearance,
      initialPosition: {
        x: 0.2 + (i % 3) * 0.3,
        y: 0.3 + Math.floor(i / 3) * 0.3
      },
      size: 'medium' as const,
      initiallyVisible: true,
      physicsEnabled: false,
      touchable: obj.role === 'target' || obj.role === 'collectible'
    }));

    const counters: CounterSpec[] = [];
    const targetObjects = objects.filter(o => o.touchable);
    if (targetObjects.length > 1) {
      counters.push({
        id: 'progress',
        name: '進捗',
        initialValue: 0,
        purpose: `タップした${targetObjects[0].name}の数を数える`,
        modifiedBy: targetObjects.map(o => `tap_${o.id}`),
        checkedBy: ['check_win']
      });
    }

    const rules: RuleSpecification[] = [];

    // タップルール
    targetObjects.forEach((obj, idx) => {
      rules.push({
        id: `tap_${obj.id}`,
        name: `${obj.name}タップ`,
        description: `${obj.name}をタップしたら消える`,
        targetObject: obj.id,
        trigger: {
          type: 'touch',
          description: `${obj.name}をタップ`,
          parameters: { target: 'self', touchType: 'down' }
        },
        actions: [
          { type: 'hide', description: 'オブジェクトを消す', parameters: { targetId: obj.id } },
          { type: 'playSound', description: '効果音', parameters: { soundId: 'se_tap' } },
          { type: 'effect', description: '拡大縮小エフェクト', parameters: { targetId: obj.id, effect: { type: 'scale', duration: 0.15 } } },
          ...(counters.length > 0 ? [{
            type: 'counter',
            description: 'カウンター+1',
            parameters: { counterName: 'progress', operation: 'increment' }
          }] : [])
        ],
        purpose: 'core-mechanic' as const
      });
    });

    // 勝利判定
    rules.push({
      id: 'check_win',
      name: '勝利判定',
      description: design.winCondition.description,
      trigger: counters.length > 0
        ? { type: 'counter', description: `カウンターが${targetObjects.length}に達した`, parameters: { counterName: 'progress', comparison: 'greaterOrEqual', value: targetObjects.length } }
        : { type: 'always', description: '常時チェック', parameters: {} },
      actions: [
        { type: 'success', description: 'ゲームクリア', parameters: {} },
        { type: 'playSound', description: '成功音', parameters: { soundId: 'se_success' } }
      ],
      purpose: 'win-condition' as const
    });

    // Priority設計を生成
    const rulePriorities: RulePrioritySpec[] = rules.map((rule, idx) => ({
      ruleId: rule.id,
      priority: rule.purpose === 'win-condition' ? 100 : rule.purpose === 'lose-condition' ? 90 : 50 - idx,
      reason: rule.purpose === 'win-condition' ? '勝利判定は最優先' :
              rule.purpose === 'lose-condition' ? '敗北判定は高優先' : '基本操作'
    }));

    return {
      objects,
      stateManagement: {
        counters,
        flags: []
      },
      rules,
      audio: {
        sounds: [
          { id: 'se_tap', trigger: 'タップ時', type: 'tap' },
          { id: 'se_success', trigger: '成功時', type: 'success' },
          { id: 'se_failure', trigger: '失敗時', type: 'failure' }
        ],
        bgm: {
          id: 'bgm_main',
          description: `${concept.theme}に合ったBGM`,
          mood: 'upbeat' as const
        }
      },
      // ★NEW: UI/視認性仕様
      uiVisibility: {
        touchTargetMinSize: 'medium',
        contrastRequirement: 'high',
        layoutStrategy: 'distributed',
        overlapPolicy: 'prevent',
        safeZone: { top: 0.1, bottom: 0.1, left: 0.05, right: 0.05 }
      },
      // ★NEW: フィードバック仕様
      feedbackSpec: {
        triggers: [
          {
            event: 'tap',
            visual: { type: 'scale', intensity: 'normal', duration: 0.15 },
            audio: { soundId: 'se_tap', volume: 'normal' }
          },
          {
            event: 'success',
            visual: { type: 'particle', intensity: 'strong', duration: 1.5 },
            audio: { soundId: 'se_success', volume: 'high' }
          },
          {
            event: 'failure',
            visual: { type: 'shake', intensity: 'normal', duration: 0.5 },
            audio: { soundId: 'se_failure', volume: 'normal' }
          }
        ]
      },
      // ★NEW: 終了演出仕様
      endingSpec: {
        success: {
          duration: 1.5,
          effects: ['confetti', 'flash'],
          soundId: 'se_success',
          message: 'クリア！'
        },
        failure: {
          duration: 1.0,
          effects: ['shake'],
          soundId: 'se_failure',
          message: '残念...'
        },
        transitionDelay: 2.0
      },
      // ★NEW: Priority設計
      priorityDesign: {
        rulePriorities,
        conflictResolution: 'highest-priority',
        notes: [
          '勝利判定はカウンター増加後に評価される',
          'タップルールは同時発火を許可'
        ]
      },
      successPath: {
        steps: [
          `プレイヤーが${targetObjects[0]?.name || 'オブジェクト'}をタップ`,
          ...(counters.length > 0 ? ['カウンターが増加'] : []),
          `全て消すと勝利`
        ],
        verification: 'タップ→非表示→カウンター→判定の流れが実現可能'
      },
      specDecisions: [
        {
          aspect: 'カウンター使用',
          decision: counters.length > 0 ? '使用する' : '使用しない',
          reasoning: counters.length > 0
            ? `${targetObjects.length}個のオブジェクトを数える必要があるため`
            : '数える必要がないため直接判定'
        },
        {
          aspect: 'フィードバック設計',
          decision: 'タップ時scale、成功時particle、失敗時shake',
          reasoning: '視覚的フィードバックで操作感を向上'
        }
      ]
    };
  }

  /**
   * JSONを抽出してパース
   */
  private extractAndParseJSON(text: string): GameSpecification {
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
      return JSON.parse(jsonStr) as GameSpecification;
    } catch (error) {
      let repaired = jsonStr;
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
      repaired = repaired.replace(/\/\/[^\n]*/g, '');

      try {
        return JSON.parse(repaired) as GameSpecification;
      } catch {
        this.logger?.logError('SpecificationGenerator', `JSON parse failed: ${error}`);
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

export default SpecificationGenerator;
