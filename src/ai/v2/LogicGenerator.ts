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
- 安全エリア: x=0.1〜0.9, y=0.15〜0.85（端に置かない）

## オブジェクト配置パターン（重要）
ゲームテーマに応じて適切な配置パターンを使用：

### 円形配置（時計、ルーレット、花など）
- 中心: (0.5, 0.5)
- 半径: 0.25〜0.35が適切
- 計算式: x = 0.5 + radius * cos(angle), y = 0.5 + radius * sin(angle)
- 例: 12個を円形に配置
  - 12時: (0.5, 0.15), 3時: (0.85, 0.5), 6時: (0.5, 0.85), 9時: (0.15, 0.5)

### グリッド配置（パズル、記憶ゲーム）
- 3x3グリッド: 間隔0.25, 開始点(0.25, 0.25)
- 4x4グリッド: 間隔0.2, 開始点(0.2, 0.2)

### 縦並び配置（選択肢、メニュー）
- x=0.5で固定、yは0.25間隔

### ランダム散布（避けゲー、収集ゲー）
- 画面全体に適度に分散
- オブジェクト間の距離を0.15以上確保

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
| playSound | soundId（assetPlanで定義したse_xxxを使用） |

## 効果音の使用（推奨）
ゲームの体験を向上させるため、適切な場面で効果音を再生：
- タップ時: { "type": "playSound", "soundId": "se_tap" }
- 成功時: { "type": "playSound", "soundId": "se_success" }
- 失敗時: { "type": "playSound", "soundId": "se_failure" }
- 収集時: { "type": "playSound", "soundId": "se_collect" }
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

## 5. ゲームロジックの一貫性（重要）
ゲームの因果関係を明確に設計：

### 正しいゲームフローの例
1. プレイヤーがオブジェクトをタップ → 2. オブジェクトが反応（hide/effect） → 3. カウンターが更新 → 4. 条件達成で成功/失敗

### 各オブジェクトの役割を明確に
- 「タップ対象」: プレイヤーが直接操作
- 「障害物」: 触れると失敗/ダメージ
- 「収集物」: 集めるとスコア増加
- 「装飾」: 動きはあるが判定なし

### 成功までの道筋
- 必要なアクション数を明示（例: 5個タップで成功）
- 各アクションが確実にカウンターを更新
- カウンター条件で成功判定

### 失敗条件のバランス
- 時間制限: ゲーム設定のtimeLimitで対応（ルールでは不要）
- ミス回数: ミスカウンターが3以上で失敗など
- 失敗条件は成功より厳しくない設定に

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
          { "type": "counter", "counterName": "score", "operation": "add", "value": 1 },
          { "type": "playSound", "soundId": "se_tap" }
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
          { "type": "playSound", "soundId": "se_success" },
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
