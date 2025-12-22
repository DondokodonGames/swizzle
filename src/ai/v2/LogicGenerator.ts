/**
 * Step 3: LogicGenerator
 *
 * エディター仕様に厳密に従ってGameScriptを生成
 * 即成功/即失敗/型エラーは絶対に出さない
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameConcept, LogicGeneratorOutput, AssetPlan } from './types';

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
| showMessage | メッセージ表示 | text, duration |

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
ゲームコンセプトを読み、そのコンセプトを忠実に実装するゲームロジックを生成してください。

${EDITOR_SPEC}

# 必須要件

## 1. コンセプトを忠実に実装する（最重要）
- playerGoal: プレイヤーの目標を達成できる仕組みを実装
- playerOperation: 指定された操作方法を実際に機能させる
- successCondition: 成功条件が正しく判定される
- failureCondition: 失敗条件が正しく判定される

## 2. 即成功/即失敗を防ぐ
- ゲーム開始直後に成功/失敗しない
- time条件で成功する場合は最低3秒以上必要
- カウンター初期値は目標値より小さく設定

## 3. ID整合性を保つ
- objectIdはassetPlanに定義したものを正確に使用
- counterNameはcountersに定義したものを使用
- 座標は0.0〜1.0の範囲内

## 4. ゲームに動きを持たせる
コンセプトに応じてオブジェクトに動きを付ける：
- move アクションで移動（straight/wander/bounce など）
- time条件 + interval で定期的なイベント
- collision条件 で衝突判定
- effect で視覚フィードバック

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
      { "id": "se_xxx", "trigger": "いつ再生するか", "type": "tap"|"success"|"failure"|"collect"|"pop"|"whoosh"|"bounce" }
    ]
  },
  "selfCheck": {
    "hasPlayerActionOnSuccessPath": boolean,
    "counterInitialValuesSafe": boolean,
    "allObjectIdsValid": boolean,
    "allCounterNamesValid": boolean,
    "coordinatesInRange": boolean,
    "onlyVerifiedFeaturesUsed": boolean
  }
}`;

export interface LogicGeneratorConfig {
  model?: string;
  dryRun?: boolean;
  apiKey?: string;
}

export class LogicGenerator {
  private client: Anthropic;
  private config: Required<Omit<LogicGeneratorConfig, 'apiKey'>>;
  private tokensUsed: number = 0;

  constructor(config?: LogicGeneratorConfig) {
    this.client = new Anthropic({
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY
    });
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
      max_tokens: 16384,  // Further increased for complex game logic
      messages: [{ role: 'user', content: prompt }]
    });

    this.tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    // Check for truncation
    if (response.stop_reason === 'max_tokens') {
      console.log('      ⚠️ Response was truncated due to max_tokens limit');
    }

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // JSONを抽出してパース
    const output = this.extractAndParseJSON(content.text);

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
   * JSONを抽出してパース（エラー回復機能付き）
   */
  private extractAndParseJSON(text: string): LogicGeneratorOutput {
    // 1. JSONブロックを抽出
    let jsonStr = text;

    // ```json ... ``` ブロックを探す
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      // { から始まる最も外側のJSONオブジェクトを抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    if (!jsonStr || !jsonStr.startsWith('{')) {
      throw new Error('No JSON found in response');
    }

    // 2. まず直接パースを試みる
    try {
      return JSON.parse(jsonStr) as LogicGeneratorOutput;
    } catch (firstError) {
      console.log('      ⚠️ Initial JSON parse failed, attempting repair...');

      // 3. よくある問題を修正
      let repaired = jsonStr;

      // 末尾のカンマを削除
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

      // コメントを削除
      repaired = repaired.replace(/\/\/[^\n]*/g, '');
      repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '');

      // 制御文字を削除
      repaired = repaired.replace(/[\x00-\x1F\x7F]/g, (match) => {
        if (match === '\n' || match === '\r' || match === '\t') {
          return match;
        }
        return '';
      });

      // エスケープされていないクオートを修正（文字列値内）
      // これは複雑なので単純なケースのみ対応

      try {
        const result = JSON.parse(repaired) as LogicGeneratorOutput;
        console.log('      ✓ JSON repaired successfully');
        return result;
      } catch (secondError) {
        console.log('      ⚠️ JSON repair failed, attempting bracket balancing...');

        // 4. ブラケットのバランスを確認して修正
        repaired = this.balanceBrackets(repaired);

        try {
          const result = JSON.parse(repaired) as LogicGeneratorOutput;
          console.log('      ✓ JSON balanced successfully, keys:', Object.keys(result));
          return result;
        } catch (thirdError) {
          // 5. 最後の手段：最初のエラー位置を特定して切り詰め
          const errorMatch = String(thirdError).match(/position (\d+)/);
          if (errorMatch) {
            const position = parseInt(errorMatch[1]);
            console.log(`      ⚠️ Error at position ${position}, attempting truncation...`);
            console.log(`      ⚠️ JSON length: ${repaired.length}, truncating at: ${position}`);

            // エラー位置の前で閉じる
            const truncated = this.truncateAtValidPoint(repaired, position);
            try {
              const result = JSON.parse(truncated) as LogicGeneratorOutput;
              console.log('      ✓ JSON truncated successfully, keys:', Object.keys(result));
              return result;
            } catch (finalError) {
              console.log('      ❌ Final JSON (first 500 chars):', truncated.substring(0, 500));
              throw new Error(`JSON parse failed after all recovery attempts: ${firstError}`);
            }
          }

          console.log('      ❌ JSON (first 500 chars):', repaired.substring(0, 500));
          throw new Error(`JSON parse failed: ${firstError}`);
        }
      }
    }
  }

  /**
   * ブラケットのバランスを修正
   */
  private balanceBrackets(json: string): string {
    let openBraces = 0;
    let openBrackets = 0;

    for (const char of json) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }

    // 閉じ括弧を追加
    let result = json;
    while (openBrackets > 0) {
      result += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      result += '}';
      openBraces--;
    }

    return result;
  }

  /**
   * 有効なポイントで切り詰める
   */
  private truncateAtValidPoint(json: string, errorPosition: number): string {
    // エラー位置の少し前を見て、有効なJSONになる位置を探す
    let truncatePos = errorPosition;

    // 最後の完全なプロパティまで戻る
    for (let i = errorPosition - 1; i > 0; i--) {
      if (json[i] === '}' || json[i] === ']' || json[i] === '"') {
        truncatePos = i + 1;
        break;
      }
    }

    let truncated = json.substring(0, truncatePos);

    // 末尾のカンマを削除
    truncated = truncated.replace(/,\s*$/, '');

    // ブラケットのバランスを取る
    return this.balanceBrackets(truncated);
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
