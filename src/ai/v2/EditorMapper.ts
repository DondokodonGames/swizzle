/**
 * Step 5: EditorMapper (強化版)
 *
 * 仕様をSwizzleエディター形式に変換
 * 創造的判断は前ステップで完了しているため、機械的な変換のみ行う
 *
 * 入力: GameSpecification（何がどう動くか）
 * 出力: EditorMapperOutput（LogicGeneratorOutput + MappingTable）
 */

import Anthropic from '@anthropic-ai/sdk';
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

## 座標の制約 ★必須
- すべての座標は 0.0〜1.0 の範囲内
- 負の値は禁止（-0.1 などは NG → 0.0 に修正）
- 1.0を超える値も禁止（1.2 などは NG → 1.0 に修正）

## 必須サウンド ★必須
以下の3つは必ずsoundsに含める:
- { "id": "se_tap", "trigger": "タップ時", "type": "tap" }
- { "id": "se_success", "trigger": "成功時", "type": "success" }
- { "id": "se_failure", "trigger": "失敗時", "type": "failure" }

## カウンターの一貫性 ★必須
定義するカウンターは必ず:
1. どこかのルールで操作される（counterアクション）
2. どこかのルールでチェックされる（counter条件）
両方を満たさないカウンターは定義しない。

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
    "allCountersFullyImplemented": true
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
  async map(concept: GameConcept, spec: GameSpecification): Promise<EditorMapperOutput> {
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

    let logicOutput = this.extractAndParseJSON(content.text);

    // ポスト処理: AIが指示に従わなくても安全にする
    logicOutput = this.postProcess(logicOutput);

    // マッピングテーブルを生成
    const mappingTable = this.createMappingTable(spec, logicOutput);

    // ログに記録
    const outputObjects = logicOutput.assetPlan?.objects || [];
    const outputCounters = logicOutput.script?.counters || [];
    const outputRules = logicOutput.script?.rules || [];
    this.logger?.logEditorMapping({
      objectIds: outputObjects.map(o => o.id),
      counterIds: outputCounters.map(c => c.id),
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
    // 安全にアクセス（undefinedの場合は空配列）
    const specObjects = spec.objects || [];
    const specCounters = spec.stateManagement?.counters || [];
    const specSounds = spec.audio?.sounds || [];
    const specRules = spec.rules || [];
    const outputObjects = output.assetPlan?.objects || [];
    const outputCounters = output.script?.counters || [];
    const outputSounds = output.assetPlan?.sounds || [];
    const outputRules = output.script?.rules || [];

    const objectMappings: ObjectMapping[] = specObjects.map(specObj => {
      const editorObj = outputObjects.find(o => o.id === specObj.id);
      return {
        specName: specObj.name,
        editorId: editorObj?.id || specObj.id,
        purpose: editorObj?.purpose || 'unknown'
      };
    });

    const counterMappings: CounterMapping[] = specCounters.map(specCounter => {
      const editorCounter = outputCounters.find(c => c.id === specCounter.id || c.name === specCounter.name);
      return {
        specName: specCounter.name,
        editorId: editorCounter?.id || specCounter.id,
        editorName: editorCounter?.name || specCounter.name
      };
    });

    const soundMappings: SoundMapping[] = specSounds.map(specSound => {
      const editorSound = outputSounds.find(s => s.id === specSound.id);
      return {
        specId: specSound.id,
        editorId: editorSound?.id || specSound.id,
        trigger: specSound.trigger
      };
    });

    const ruleMappings: RuleMapping[] = specRules.map(specRule => {
      const editorRule = outputRules.find(r => r.id === specRule.id);
      return {
        specId: specRule.id,
        specName: specRule.name,
        editorId: editorRule?.id || specRule.id,
        purpose: specRule.purpose
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

    // レイアウトをマッピング
    const layoutObjects = specObjects.map(obj => ({
      objectId: obj.id,
      position: obj.initialPosition || { x: 0.5, y: 0.5 },
      scale: { x: 1.0, y: 1.0 }
    }));

    // カウンターをマッピング
    const counters = specCounters.map(c => ({
      id: c.id,
      name: c.name,
      initialValue: c.initialValue
    }));

    // ルールをマッピング
    const rules: GameRule[] = specRules.map(rule => {
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
