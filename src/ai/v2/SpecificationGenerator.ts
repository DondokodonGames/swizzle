/**
 * Step 3: SpecificationGenerator
 *
 * ゲームデザインから詳細仕様を生成
 * エディターの機能を意識しつつ、実装の詳細は次ステップに委ねる
 *
 * 入力: GameDesign（どう遊ぶか）
 * 出力: GameSpecification（何がどう動くか）
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameConcept } from './types';
import { GameDesign } from './GameDesignGenerator';
import { GenerationLogger } from './GenerationLogger';

/**
 * ゲーム仕様（詳細な動作定義）
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

  // 成功パス（プレイヤーが勝利に至る道筋）
  successPath: {
    steps: string[];
    verification: string;
  };

  // 仕様決定の記録
  specDecisions: SpecDecision[];
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
  - 数える必要がない → カウンター不要
  - 数える必要がある → カウンターを使う
- 各カウンターには「変更するルール」と「チェックするルール」の両方が必要
- 片方だけのカウンターは作らない

## 3. ルール仕様
各インタラクションをルールとして定義:
- トリガー条件（何がきっかけか）
- アクション（何をするか）
- 目的（なぜ必要か）

### ルールの種類
- core-mechanic: ゲームの基本動作
- win-condition: 勝利判定
- lose-condition: 敗北判定
- feedback: プレイヤーへのフィードバック
- state-update: 状態更新

## 4. 音声仕様
必要な効果音とBGM:
- 最低限: タップ音(se_tap)、成功音(se_success)、失敗音(se_failure)
- ゲーム固有の効果音

## 5. 成功パス
プレイヤーが勝利に至る道筋を明記:
- step1 → step2 → ... → 勝利
- 各ステップが実際に実行可能か確認

## 6. 仕様決定の記録
重要な判断とその理由を記録

# コンセプト
{{CONCEPT}}

# ゲームデザイン
{{DESIGN}}

# 出力形式
以下のJSON構造のみを出力。

{
  "objects": [
    {
      "id": "object_id",
      "name": "表示名",
      "visualDescription": "見た目の詳細説明",
      "initialPosition": { "x": 0.0-1.0, "y": 0.0-1.0 },
      "size": "small/medium/large",
      "initiallyVisible": true/false,
      "physicsEnabled": false,
      "touchable": true/false
    }
  ],
  "stateManagement": {
    "counters": [
      {
        "id": "counter_id",
        "name": "カウンター名",
        "initialValue": 0,
        "purpose": "なぜ必要か",
        "modifiedBy": ["ルールID"],
        "checkedBy": ["ルールID"]
      }
    ],
    "flags": []
  },
  "rules": [
    {
      "id": "rule_id",
      "name": "ルール名",
      "description": "何をするルールか",
      "targetObject": "対象オブジェクトID（任意）",
      "trigger": {
        "type": "touch/time/counter/collision/flag/always",
        "description": "条件の説明",
        "parameters": {}
      },
      "actions": [
        {
          "type": "アクションタイプ",
          "description": "何をするか",
          "parameters": {}
        }
      ],
      "purpose": "core-mechanic/win-condition/lose-condition/feedback/state-update"
    }
  ],
  "audio": {
    "sounds": [
      { "id": "se_tap", "trigger": "タップ時", "type": "tap" },
      { "id": "se_success", "trigger": "成功時", "type": "success" },
      { "id": "se_failure", "trigger": "失敗時", "type": "failure" }
    ],
    "bgm": {
      "id": "bgm_main",
      "description": "BGMの説明",
      "mood": "upbeat/calm/tense/happy/mysterious/energetic"
    }
  },
  "successPath": {
    "steps": ["ステップ1", "ステップ2", "..."],
    "verification": "成功パスが実現可能な理由"
  },
  "specDecisions": [
    {
      "aspect": "何について",
      "decision": "どう決めたか",
      "reasoning": "なぜ"
    }
  ]
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
  async generate(concept: GameConcept, design: GameDesign): Promise<GameSpecification> {
    this.logger?.logInput('SpecificationGenerator', 'design', {
      coreLoop: design.coreLoop.description,
      objectCount: design.objects.length,
      interactionCount: design.interactions.length
    });

    if (this.config.dryRun) {
      return this.generateMockSpec(concept, design);
    }

    const prompt = SPEC_PROMPT
      .replace('{{CONCEPT}}', JSON.stringify(concept, null, 2))
      .replace('{{DESIGN}}', JSON.stringify(design, null, 2));

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

    // ログに記録
    this.logger?.logSpecificationGeneration({
      objects: spec.objects.map(o => ({ id: o.id, behavior: o.touchable ? 'interactive' : 'static' })),
      rules: spec.rules.map(r => ({ trigger: r.trigger.description, action: r.actions.map(a => a.type).join(', ') })),
      successPath: spec.successPath.steps.join(' → '),
      decisions: spec.specDecisions.map(d => `${d.aspect}: ${d.decision}`)
    });

    return spec;
  }

  /**
   * モック仕様生成（ドライラン用）
   */
  private generateMockSpec(concept: GameConcept, design: GameDesign): GameSpecification {
    const objects: ObjectSpecification[] = design.objects.map((obj, i) => ({
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
    targetObjects.forEach(obj => {
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
