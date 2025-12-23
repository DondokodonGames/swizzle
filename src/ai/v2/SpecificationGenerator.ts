/**
 * Step 4: SpecificationGenerator (強化版)
 *
 * ゲームデザインから詳細仕様を生成
 * エディターの機能を意識しつつ、実装の詳細は次ステップに委ねる
 *
 * 入力: GameConcept + GameDesign + AssetPlan
 * 出力: GameSpecification（強化版：UI/視認性、フィードバック、終了演出、priority含む）
 */

import Anthropic from '@anthropic-ai/sdk';
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
    type: 'touch' | 'time' | 'counter' | 'collision' | 'flag' | 'always';
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

# 入力
- コンセプト: ゲームの概要
- デザイン: ゲームの設計
- アセットプラン: 利用可能なアセット（任意）

# 出力する仕様

## 1. オブジェクト仕様
各オブジェクトの詳細を定義:
- ID（英数字、スネークケース）
- 位置（0.0-1.0の正規化座標、中央=(0.5, 0.5)）
- サイズ（small/medium/large）
- 初期表示状態
- タッチ可能かどうか

## 2. 状態管理
カウンターとフラグを定義:
- **カウンターを使う判断基準**: 「何かを数える必要があるか？」
- 各カウンターには「変更するルール」と「チェックするルール」の両方が必要

## 3. ルール仕様
各インタラクションをルールとして定義

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
  "objects": [...],
  "stateManagement": { "counters": [...], "flags": [...] },
  "rules": [...],
  "audio": { "sounds": [...], "bgm": {...} },
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
}

export class SpecificationGenerator {
  private client: Anthropic;
  private config: Required<Omit<SpecificationGeneratorConfig, 'apiKey'>>;
  private logger?: GenerationLogger;
  private tokensUsed: number = 0;

  constructor(config?: SpecificationGeneratorConfig, logger?: GenerationLogger) {
    this.client = new Anthropic({
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.config = {
      model: config?.model || 'claude-sonnet-4-20250514',
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
      coreLoop: design.coreLoop.description,
      objectCount: design.objects.length,
      interactionCount: design.interactions.length,
      hasAssetPlan: !!assetPlan
    });

    if (this.config.dryRun) {
      return this.generateMockSpec(concept, design, assetPlan);
    }

    const prompt = SPEC_PROMPT
      .replace('{{CONCEPT}}', JSON.stringify(concept, null, 2))
      .replace('{{DESIGN}}', JSON.stringify(design, null, 2))
      .replace('{{ASSET_PLAN}}', assetPlan ? JSON.stringify(assetPlan, null, 2) : 'なし');

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    });

    this.tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const spec = this.extractAndParseJSON(content.text);

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
          parameters: { touchType: 'down' }
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
