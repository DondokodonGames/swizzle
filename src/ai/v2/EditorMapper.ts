/**
 * Step 4: EditorMapper
 *
 * 仕様をSwizzleエディター形式に変換
 * 創造的判断は前ステップで完了しているため、機械的な変換のみ行う
 *
 * 入力: GameSpecification（何がどう動くか）
 * 出力: LogicGeneratorOutput（エディター用JSON）
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameConcept, LogicGeneratorOutput, AssetPlan, TriggerCondition, GameAction, GameRule } from './types';
import { GameSpecification } from './SpecificationGenerator';
import { GenerationLogger } from './GenerationLogger';

const EDITOR_SPEC = `
# Swizzle エディター仕様

## 座標系
- 正規化座標: 0.0〜1.0
- x: 0.0=左端, 1.0=右端
- y: 0.0=上端, 1.0=下端

## 条件タイプ
| タイプ | パラメータ |
|--------|------------|
| touch | target: 'self'/'stage'/objectId, touchType: 'down'/'up'/'hold'/'drag' |
| time | timeType: 'exact'/'interval', seconds, interval |
| counter | counterName, comparison: 'equals'/'greaterOrEqual'/'greater'/'less'/'lessOrEqual', value |
| collision | target, collisionType: 'enter'/'stay'/'exit' |
| flag | flagId |
| position | target, area: 'inside'/'outside', region: {x,y,width,height} |

## アクションタイプ
| タイプ | パラメータ |
|--------|------------|
| success | score?, message? |
| failure | message? |
| hide | targetId, fadeOut?, duration? |
| show | targetId |
| move | targetId, movement: {type, target?, direction?, speed?, duration?} |
| counter | counterName, operation: 'increment'/'decrement'/'set'/'add'/'subtract', value? |
| addScore | points |
| effect | targetId, effect: {type: 'flash'/'shake'/'scale'/'rotate'/'particles', duration, intensity?} |
| setFlag | flagId, value |
| playSound | soundId, volume? |
| switchAnimation | targetId, animationIndex |
| applyForce | targetId, force: {x,y} |
| applyImpulse | targetId, impulse: {x,y} |

## movement.type
- straight: 直線移動（target座標またはdirection方向へ）
- teleport: 瞬間移動
- wander: ランダム徘徊
- bounce: 壁で反射
- stop: 停止
`;

const MAPPING_PROMPT = `あなたはSwizzleエディターの仕様マッパーです。
与えられたゲーム仕様を、エディターのJSON形式に正確に変換してください。

${EDITOR_SPEC}

# 重要: 機械的な変換のみ行う
- 仕様に書かれていないことは追加しない
- 仕様の内容を勝手に変更しない
- IDや名前は仕様のものをそのまま使用

# 変換ルール

## オブジェクト → assetPlan.objects
仕様のobjectsをそのままマッピング:
- id → id
- name → name
- visualDescription → visualDescription
- "ゲーム内での役割" → purpose
- initialPosition → initialPosition
- size → size

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
    "counterCountReasonable": true
  }
}`;

export interface EditorMapperConfig {
  model?: string;
  dryRun?: boolean;
  apiKey?: string;
}

export class EditorMapper {
  private client: Anthropic;
  private config: Required<Omit<EditorMapperConfig, 'apiKey'>>;
  private logger?: GenerationLogger;
  private tokensUsed: number = 0;

  constructor(config?: EditorMapperConfig, logger?: GenerationLogger) {
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
   * 仕様をエディター形式に変換
   */
  async map(concept: GameConcept, spec: GameSpecification): Promise<LogicGeneratorOutput> {
    this.logger?.logInput('EditorMapper', 'specification', {
      objectCount: spec.objects.length,
      counterCount: spec.stateManagement.counters.length,
      ruleCount: spec.rules.length
    });

    if (this.config.dryRun) {
      return this.mapMock(concept, spec);
    }

    const prompt = MAPPING_PROMPT
      .replace('{{CONCEPT}}', JSON.stringify(concept, null, 2))
      .replace('{{SPEC}}', JSON.stringify(spec, null, 2));

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

    const output = this.extractAndParseJSON(content.text);

    // ログに記録
    this.logger?.logEditorMapping({
      objectIds: output.assetPlan.objects.map(o => o.id),
      counterIds: output.script.counters.map(c => c.id),
      ruleCount: output.script.rules.length,
      mappingDecisions: [
        `Objects: ${output.assetPlan.objects.length}`,
        `Counters: ${output.script.counters.length}`,
        `Rules: ${output.script.rules.length}`
      ]
    });

    return output;
  }

  /**
   * モックマッピング（ドライラン用）
   */
  private mapMock(concept: GameConcept, spec: GameSpecification): LogicGeneratorOutput {
    // オブジェクトをマッピング
    const objects: AssetPlan['objects'] = spec.objects.map(obj => ({
      id: obj.id,
      name: obj.name,
      purpose: obj.touchable ? 'タップ対象' : '装飾',
      visualDescription: obj.visualDescription,
      initialPosition: obj.initialPosition,
      size: obj.size
    }));

    // レイアウトをマッピング
    const layoutObjects = spec.objects.map(obj => ({
      objectId: obj.id,
      position: obj.initialPosition,
      scale: { x: 1.0, y: 1.0 }
    }));

    // カウンターをマッピング
    const counters = spec.stateManagement.counters.map(c => ({
      id: c.id,
      name: c.name,
      initialValue: c.initialValue
    }));

    // ルールをマッピング
    const rules: GameRule[] = spec.rules.map(rule => {
      const conditions = this.mapTriggerToConditions(rule.trigger);
      const actions = rule.actions.map(a => this.mapActionToEditorAction(a));

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
    const sounds = spec.audio.sounds.map(s => ({
      id: s.id,
      trigger: s.trigger,
      type: s.type
    }));

    return {
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
        bgm: spec.audio.bgm
      },
      selfCheck: {
        hasPlayerActionOnSuccessPath: true,
        counterInitialValuesSafe: true,
        allObjectIdsValid: true,
        allCounterNamesValid: true,
        coordinatesInRange: true,
        onlyVerifiedFeaturesUsed: true,
        noRuleConflicts: true,
        counterCountReasonable: true
      }
    };
  }

  /**
   * トリガーを条件配列に変換
   */
  private mapTriggerToConditions(trigger: GameSpecification['rules'][0]['trigger']): TriggerCondition[] {
    const params = trigger.parameters;

    switch (trigger.type) {
      case 'touch':
        return [{
          type: 'touch' as const,
          target: (params.target as string) || 'self',
          touchType: (params.touchType as TriggerCondition['touchType']) || 'down'
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
          flagId: params.flagId as string
        }];

      default:
        return [];
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
        return {
          type: 'setFlag' as const,
          flagId: params.flagId as string
        };

      default:
        // Fallback for unhandled action types
        return { type: action.type as GameAction['type'] };
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
