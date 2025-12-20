/**
 * Step 3: LogicGenerator
 *
 * エディター仕様に厳密に従ってGameScriptを生成
 * 即成功/即失敗/型エラーは絶対に出さない
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameConcept, LogicGeneratorOutput, AssetPlan } from './types';

const EDITOR_SPEC = `
# Swizzle ゲームエンジン仕様（厳守）

## 座標系
- 正規化座標: 0.0〜1.0
- x: 0.0=左端, 1.0=右端
- y: 0.0=上端, 1.0=下端
- 中央 = (0.5, 0.5)

## 速度（px/frame, 60FPS）
- 非常に遅い: 0.5-1.0
- 遅い: 1.0-2.0
- 普通: 2.0-4.0
- 速い: 4.0-8.0

## 使用可能な条件（これ以外は使用禁止）
| タイプ | パラメータ |
|--------|-----------|
| touch | target: 'self'/'stage'/objectId, touchType: 'down'/'up'/'hold' |
| time | timeType: 'exact'/'interval', seconds?, interval? |
| counter | counterName, comparison: 'equals'/'greaterOrEqual'/'greater'/'less', value |
| collision | target: objectId, collisionType: 'enter'/'stay'/'exit', checkMode: 'hitbox' |
| flag | flagId, value: boolean |

## 使用可能なアクション（これ以外は使用禁止）
| タイプ | パラメータ |
|--------|-----------|
| success | score?, message? |
| failure | message? |
| hide | targetId |
| show | targetId |
| move | targetId, movement: { type: 'straight'/'teleport', target: {x,y}, speed? } |
| counter | counterName, operation: 'add'/'subtract'/'set', value |
| addScore | points |
| effect | targetId, effect: { type: 'scale'/'shake', duration, scaleAmount? } |
| setFlag | flagId, value |
`;

const LOGIC_PROMPT = `あなたはSwizzleゲームエンジンのGameScriptを生成するエキスパートです。

${EDITOR_SPEC}

# 絶対厳守事項

## 1. 即成功を出さない
- カウンター初期値は必ず目標値より小さくする（例: 目標5なら初期値0）
- 成功条件には必ずプレイヤー操作（touch条件）を経由するパスが必要

## 2. 即失敗を出さない
- ゲーム開始直後に失敗条件を満たさない
- 失敗カウンターの初期値は必ず閾値より小さくする

## 3. 型エラーを出さない
- objectIdはアセット計画に定義したものを正確に使用
- counterNameはcountersに定義したものを正確に使用
- 座標は0.0〜1.0の範囲内

## 4. 使用可能な機能のみ使う
- 上記の仕様書に記載された条件・アクションのみ使用
- position条件、playSound、randomActionなどは使用禁止

# ゲームコンセプト
{{CONCEPT}}

# 出力形式（JSON）

{
  "script": {
    "layout": {
      "objects": [
        { "objectId": "obj_1", "position": { "x": 0.5, "y": 0.5 }, "scale": { "x": 1.0, "y": 1.0 } }
      ]
    },
    "counters": [
      { "id": "score", "name": "スコア", "initialValue": 0 }
    ],
    "rules": [
      {
        "id": "rule_1",
        "name": "タップでカウント",
        "targetObjectId": "obj_1",
        "triggers": {
          "operator": "AND",
          "conditions": [
            { "type": "touch", "target": "self", "touchType": "down" }
          ]
        },
        "actions": [
          { "type": "hide", "targetId": "obj_1" },
          { "type": "counter", "counterName": "score", "operation": "add", "value": 1 }
        ]
      },
      {
        "id": "rule_win",
        "name": "勝利判定",
        "triggers": {
          "operator": "AND",
          "conditions": [
            { "type": "counter", "counterName": "score", "comparison": "greaterOrEqual", "value": 5 }
          ]
        },
        "actions": [
          { "type": "success", "message": "クリア！" }
        ]
      }
    ]
  },
  "assetPlan": {
    "objects": [
      {
        "id": "obj_1",
        "name": "ターゲット",
        "purpose": "プレイヤーがタップする対象",
        "visualDescription": "赤い丸いターゲット",
        "initialPosition": { "x": 0.5, "y": 0.5 },
        "size": "medium"
      }
    ],
    "background": {
      "description": "シンプルな背景",
      "mood": "明るい"
    },
    "sounds": [
      { "id": "se_tap", "trigger": "タップ時", "type": "tap" },
      { "id": "se_success", "trigger": "成功時", "type": "success" }
    ]
  },
  "selfCheck": {
    "hasPlayerActionOnSuccessPath": true,
    "counterInitialValuesSafe": true,
    "allObjectIdsValid": true,
    "allCounterNamesValid": true,
    "coordinatesInRange": true,
    "onlyVerifiedFeaturesUsed": true
  }
}

JSONのみを出力してください。`;

export interface LogicGeneratorConfig {
  model?: string;
  dryRun?: boolean;
}

export class LogicGenerator {
  private client: Anthropic;
  private config: Required<LogicGeneratorConfig>;
  private tokensUsed: number = 0;

  constructor(config?: LogicGeneratorConfig) {
    this.client = new Anthropic();
    this.config = {
      model: config?.model || 'claude-sonnet-4-20250514',
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

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    this.tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // JSONを抽出
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const output = JSON.parse(jsonMatch[0]) as LogicGeneratorOutput;

    // 基本的な構造チェック
    if (!output.script?.rules || output.script.rules.length === 0) {
      throw new Error('No rules generated');
    }
    if (!output.assetPlan?.objects || output.assetPlan.objects.length === 0) {
      throw new Error('No objects in asset plan');
    }

    return output;
  }

  /**
   * モックロジック生成（ドライラン用）
   */
  private generateMockLogic(concept: GameConcept): LogicGeneratorOutput {
    const objectCount = 5;
    const objects: AssetPlan['objects'] = [];
    const layoutObjects = [];

    for (let i = 0; i < objectCount; i++) {
      const id = `target_${i + 1}`;
      objects.push({
        id,
        name: `ターゲット${i + 1}`,
        purpose: 'タップする対象',
        visualDescription: 'タップ対象のオブジェクト',
        initialPosition: {
          x: 0.2 + (i % 3) * 0.3,
          y: 0.3 + Math.floor(i / 3) * 0.3
        },
        size: 'medium'
      });
      layoutObjects.push({
        objectId: id,
        position: { x: 0.2 + (i % 3) * 0.3, y: 0.3 + Math.floor(i / 3) * 0.3 },
        scale: { x: 1.0, y: 1.0 }
      });
    }

    return {
      script: {
        layout: { objects: layoutObjects },
        counters: [
          { id: 'tapped', name: 'タップ数', initialValue: 0 },
          { id: 'missed', name: 'ミス数', initialValue: 0 }
        ],
        rules: [
          // 各オブジェクトのタップルール
          ...objects.map((obj, i) => ({
            id: `tap_${i + 1}`,
            name: `${obj.name}タップ`,
            targetObjectId: obj.id,
            triggers: {
              operator: 'AND' as const,
              conditions: [
                { type: 'touch' as const, target: 'self', touchType: 'down' as const }
              ]
            },
            actions: [
              { type: 'hide' as const, targetId: obj.id },
              { type: 'counter' as const, counterName: 'tapped', operation: 'add' as const, value: 1 },
              { type: 'effect' as const, targetId: obj.id, effect: { type: 'scale' as const, scaleAmount: 1.3, duration: 0.1 } }
            ]
          })),
          // 成功判定
          {
            id: 'win',
            name: '成功判定',
            triggers: {
              operator: 'AND' as const,
              conditions: [
                { type: 'counter' as const, counterName: 'tapped', comparison: 'greaterOrEqual' as const, value: 5 }
              ]
            },
            actions: [
              { type: 'success' as const, message: 'クリア！' }
            ]
          },
          // 失敗判定（時間切れはエンジン側で処理）
          {
            id: 'lose',
            name: '失敗判定',
            triggers: {
              operator: 'AND' as const,
              conditions: [
                { type: 'counter' as const, counterName: 'missed', comparison: 'greaterOrEqual' as const, value: 3 }
              ]
            },
            actions: [
              { type: 'failure' as const, message: '失敗...' }
            ]
          }
        ]
      },
      assetPlan: {
        objects,
        background: {
          description: `${concept.theme}をテーマにした背景`,
          mood: concept.visualStyle
        },
        sounds: [
          { id: 'se_tap', trigger: 'タップ時', type: 'tap' },
          { id: 'se_success', trigger: '成功時', type: 'success' },
          { id: 'se_failure', trigger: '失敗時', type: 'failure' }
        ]
      },
      selfCheck: {
        hasPlayerActionOnSuccessPath: true,
        counterInitialValuesSafe: true,
        allObjectIdsValid: true,
        allCounterNamesValid: true,
        coordinatesInRange: true,
        onlyVerifiedFeaturesUsed: true
      }
    };
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
