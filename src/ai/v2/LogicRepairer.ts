/**
 * LogicRepairer
 *
 * ロジック検証エラーを修復するコンポーネント
 *
 * 修復戦略:
 * 1. 自動修復可能なエラー → 直接修正
 * 2. 部分的な再生成が必要 → 該当部分のみ再生成
 * 3. 構造的な問題 → 全体再生成を要求
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  LogicGeneratorOutput,
  LogicValidationResult,
  LogicValidationError,
  GameRule,
  GameConcept
} from './types';
import { GameSpecification } from './SpecificationGenerator';
import { GenerationLogger } from './GenerationLogger';

// エラーカテゴリ
type ErrorCategory =
  | 'auto_fixable'      // 自動修復可能
  | 'partial_regen'     // 部分再生成が必要
  | 'full_regen';       // 全体再生成が必要

// 修復結果
export interface RepairResult {
  success: boolean;
  repairedOutput: LogicGeneratorOutput;
  repairsApplied: RepairAction[];
  remainingErrors: LogicValidationError[];
  requiresFullRegeneration: boolean;
  regenerationFeedback?: string;
}

// 修復アクション
interface RepairAction {
  errorCode: string;
  action: string;
  target: string;
  before?: unknown;
  after?: unknown;
}

// 設定
interface RepairerConfig {
  dryRun?: boolean;
  apiKey?: string;
  maxAutoRepairs?: number;
}

export class LogicRepairer {
  private config: RepairerConfig;
  private client: Anthropic | null = null;
  private logger?: GenerationLogger;

  constructor(config: RepairerConfig = {}, logger?: GenerationLogger) {
    this.config = {
      maxAutoRepairs: 10,
      ...config
    };
    this.logger = logger;

    if (!config.dryRun) {
      this.client = new Anthropic({
        apiKey: config.apiKey
      });
    }
  }

  /**
   * エラーを修復
   */
  async repair(
    output: LogicGeneratorOutput,
    validationResult: LogicValidationResult,
    concept: GameConcept,
    spec: GameSpecification
  ): Promise<RepairResult> {
    const errors = validationResult.errors;
    const repairsApplied: RepairAction[] = [];
    let repairedOutput = this.deepClone(output);

    this.log('info', `Repairing ${errors.length} errors`);

    // エラーをカテゴリ分け
    const categorizedErrors = this.categorizeErrors(errors);

    // 1. 自動修復可能なエラーを処理
    for (const error of categorizedErrors.autoFixable) {
      const repair = this.autoRepair(repairedOutput, error);
      if (repair) {
        repairsApplied.push(repair);
        this.log('info', `Auto-repaired: ${error.code} - ${repair.action}`);
      }
    }

    // 2. 部分再生成が必要なエラー
    if (categorizedErrors.partialRegen.length > 0 && !this.config.dryRun) {
      const partialResult = await this.partialRegenerate(
        repairedOutput,
        categorizedErrors.partialRegen,
        concept,
        spec
      );
      if (partialResult.success) {
        repairedOutput = partialResult.output;
        repairsApplied.push(...partialResult.repairs);
        this.log('info', `Partial regeneration: ${partialResult.repairs.length} repairs`);
      }
    }

    // 3. 構造的な問題がある場合は全体再生成を推奨
    const requiresFullRegeneration = categorizedErrors.fullRegen.length > 0;
    let regenerationFeedback: string | undefined;

    if (requiresFullRegeneration) {
      regenerationFeedback = this.buildRegenerationFeedback(categorizedErrors.fullRegen);
      this.log('warning', `Full regeneration required: ${categorizedErrors.fullRegen.length} structural errors`);
    }

    // 残存エラーを計算
    const remainingErrors = this.getRemainingErrors(errors, repairsApplied, categorizedErrors.fullRegen);

    return {
      success: remainingErrors.length === 0 && !requiresFullRegeneration,
      repairedOutput,
      repairsApplied,
      remainingErrors,
      requiresFullRegeneration,
      regenerationFeedback
    };
  }

  /**
   * エラーをカテゴリ分け
   */
  private categorizeErrors(errors: LogicValidationError[]): {
    autoFixable: LogicValidationError[];
    partialRegen: LogicValidationError[];
    fullRegen: LogicValidationError[];
  } {
    const autoFixable: LogicValidationError[] = [];
    const partialRegen: LogicValidationError[] = [];
    const fullRegen: LogicValidationError[] = [];

    for (const error of errors) {
      const category = this.getErrorCategory(error);
      switch (category) {
        case 'auto_fixable':
          autoFixable.push(error);
          break;
        case 'partial_regen':
          partialRegen.push(error);
          break;
        case 'full_regen':
          fullRegen.push(error);
          break;
      }
    }

    return { autoFixable, partialRegen, fullRegen };
  }

  /**
   * エラーのカテゴリを判定
   */
  private getErrorCategory(error: LogicValidationError): ErrorCategory {
    switch (error.code) {
      // 自動修復可能
      case 'INVALID_COORDINATES':
      case 'INVALID_SPEED':
      case 'UNUSUAL_SPEED':
      case 'INVALID_TIME_SECONDS':
      case 'INVALID_TIME_INTERVAL':
      case 'INVALID_VOLUME':
      case 'INVALID_PROBABILITY':
      case 'NEGATIVE_POINTS':
      case 'LONG_EFFECT_DURATION':
      case 'LARGE_SCALE_AMOUNT':
      case 'MISSING_POINTS':
        return 'auto_fixable';

      // 部分再生成
      case 'INVALID_OBJECT_ID':
      case 'INVALID_COUNTER_NAME':
      case 'UNDEFINED_SOUND_ID':
      case 'MISSING_COUNTER_VALUE':
      case 'MISSING_TARGET_ID':
      case 'MISSING_SOUND_ID':
      case 'MISSING_FLAG_ID':
      case 'MISSING_FORCE':
      case 'MISSING_IMPULSE':
      case 'MISSING_ANIMATION_INDEX':
      case 'UNUSED_COUNTER':
      case 'COUNTER_NEVER_CHECKED':
      case 'NO_PLAYER_ACTION':    // warningなので部分再生成（collisionなど他の操作も有効）
      case 'NO_FAILURE':          // warningなので部分再生成（時間切れのみで失敗も有効）
      // ProjectValidatorからのエラー
      case 'ACTION_UNDEFINED_COUNTER':
      case 'CONDITION_UNDEFINED_COUNTER':
      case 'ACTION_UNDEFINED_OBJECT':
      case 'CONDITION_UNDEFINED_OBJECT':
      case 'ACTION_UNDEFINED_SOUND':
      case 'LAYOUT_UNDEFINED_OBJECT':
        return 'partial_regen';

      // 全体再生成が必要
      case 'INSTANT_WIN':
      case 'INSTANT_LOSE':
      case 'AUTO_SUCCESS':
      case 'NO_SUCCESS':
      case 'SUCCESS_FAILURE_CONFLICT':
      case 'SHOW_HIDE_CONFLICT':
      case 'COUNTER_CONFLICT':
      case 'SAME_RULE_SUCCESS_FAILURE':
      case 'UNREACHABLE_SUCCESS':
      case 'COUNTER_NEVER_MODIFIED':
        return 'full_regen';

      default:
        return error.type === 'critical' ? 'full_regen' : 'partial_regen';
    }
  }

  /**
   * 自動修復を適用
   */
  private autoRepair(output: LogicGeneratorOutput, error: LogicValidationError): RepairAction | null {
    switch (error.code) {
      case 'INVALID_COORDINATES':
        return this.repairCoordinates(output, error);

      case 'INVALID_SPEED':
      case 'UNUSUAL_SPEED':
        return this.repairSpeed(output, error);

      case 'INVALID_TIME_SECONDS':
        return this.repairTimeSeconds(output, error);

      case 'INVALID_TIME_INTERVAL':
        return this.repairTimeInterval(output, error);

      case 'INVALID_VOLUME':
        return this.repairVolume(output, error);

      case 'INVALID_PROBABILITY':
        return this.repairProbability(output, error);

      case 'NEGATIVE_POINTS':
        return this.repairNegativePoints(output, error);

      case 'LONG_EFFECT_DURATION':
        return this.repairEffectDuration(output, error);

      case 'LARGE_SCALE_AMOUNT':
        return this.repairScaleAmount(output, error);

      case 'MISSING_POINTS':
        return this.repairMissingPoints(output, error);

      default:
        return null;
    }
  }

  /**
   * 座標を修復
   */
  private repairCoordinates(output: LogicGeneratorOutput, error: LogicValidationError): RepairAction | null {
    const match = error.message.match(/(\w+)\s+の([xy])座標\(([\d.-]+)\)/);
    if (!match) return null;

    const [, objectId, axis, valueStr] = match;
    const value = parseFloat(valueStr);
    const clampedValue = Math.max(0, Math.min(1, value));

    // layout.objectsを検索
    const layoutObj = output.script.layout.objects.find(o => o.objectId === objectId);
    if (layoutObj) {
      const before = layoutObj.position[axis as 'x' | 'y'];
      layoutObj.position[axis as 'x' | 'y'] = clampedValue;
      return {
        errorCode: error.code,
        action: `Clamped ${axis} coordinate`,
        target: `layout.objects.${objectId}`,
        before,
        after: clampedValue
      };
    }

    // assetPlan.objectsを検索
    const assetObj = output.assetPlan.objects.find(o => o.id === objectId);
    if (assetObj) {
      const before = assetObj.initialPosition[axis as 'x' | 'y'];
      assetObj.initialPosition[axis as 'x' | 'y'] = clampedValue;
      return {
        errorCode: error.code,
        action: `Clamped initial ${axis} coordinate`,
        target: `assetPlan.objects.${objectId}`,
        before,
        after: clampedValue
      };
    }

    return null;
  }

  /**
   * 速度を修復
   */
  private repairSpeed(output: LogicGeneratorOutput, error: LogicValidationError): RepairAction | null {
    const match = error.message.match(/ルール "(\w+)".*speed\(([\d.-]+)\)/);
    if (!match) return null;

    const [, ruleId, speedStr] = match;
    const speed = parseFloat(speedStr);
    const clampedSpeed = Math.max(0.5, Math.min(15, Math.abs(speed)));

    const rule = output.script.rules.find(r => r.id === ruleId);
    if (rule) {
      for (const action of rule.actions || []) {
        if (action.type === 'move' && action.movement?.speed !== undefined) {
          const before = action.movement.speed;
          action.movement.speed = clampedSpeed;
          return {
            errorCode: error.code,
            action: 'Clamped movement speed',
            target: `rules.${ruleId}.move.speed`,
            before,
            after: clampedSpeed
          };
        }
      }
    }

    return null;
  }

  /**
   * 時間秒を修復
   */
  private repairTimeSeconds(output: LogicGeneratorOutput, error: LogicValidationError): RepairAction | null {
    const match = error.message.match(/ルール "(\w+)".*seconds\(([\d.-]+)\)/);
    if (!match) return null;

    const [, ruleId, secondsStr] = match;
    const seconds = parseFloat(secondsStr);
    const clampedSeconds = Math.max(0, Math.min(60, seconds));

    const rule = output.script.rules.find(r => r.id === ruleId);
    if (rule) {
      for (const condition of rule.triggers?.conditions || []) {
        if (condition.type === 'time' && condition.seconds !== undefined) {
          const before = condition.seconds;
          condition.seconds = clampedSeconds;
          return {
            errorCode: error.code,
            action: 'Clamped time seconds',
            target: `rules.${ruleId}.time.seconds`,
            before,
            after: clampedSeconds
          };
        }
      }
    }

    return null;
  }

  /**
   * インターバルを修復
   */
  private repairTimeInterval(output: LogicGeneratorOutput, error: LogicValidationError): RepairAction | null {
    const match = error.message.match(/ルール "(\w+)".*interval\(([\d.-]+)\)/);
    if (!match) return null;

    const [, ruleId, intervalStr] = match;
    const interval = parseFloat(intervalStr);
    const clampedInterval = Math.max(0.1, Math.min(10, interval));

    const rule = output.script.rules.find(r => r.id === ruleId);
    if (rule) {
      for (const condition of rule.triggers?.conditions || []) {
        if (condition.type === 'time' && condition.interval !== undefined) {
          const before = condition.interval;
          condition.interval = clampedInterval;
          return {
            errorCode: error.code,
            action: 'Clamped time interval',
            target: `rules.${ruleId}.time.interval`,
            before,
            after: clampedInterval
          };
        }
      }
    }

    return null;
  }

  /**
   * ボリュームを修復
   */
  private repairVolume(output: LogicGeneratorOutput, error: LogicValidationError): RepairAction | null {
    const match = error.message.match(/ルール "(\w+)".*volume\(([\d.-]+)\)/);
    if (!match) return null;

    const [, ruleId, volumeStr] = match;
    const volume = parseFloat(volumeStr);
    const clampedVolume = Math.max(0, Math.min(1, volume));

    const rule = output.script.rules.find(r => r.id === ruleId);
    if (rule) {
      for (const action of rule.actions || []) {
        if (action.type === 'playSound' && action.volume !== undefined) {
          const before = action.volume;
          action.volume = clampedVolume;
          return {
            errorCode: error.code,
            action: 'Clamped volume',
            target: `rules.${ruleId}.playSound.volume`,
            before,
            after: clampedVolume
          };
        }
      }
    }

    return null;
  }

  /**
   * 確率を修復
   */
  private repairProbability(output: LogicGeneratorOutput, error: LogicValidationError): RepairAction | null {
    const match = error.message.match(/ルール "(\w+)".*probability\(([\d.-]+)\)/);
    if (!match) return null;

    const [, ruleId, probStr] = match;
    const prob = parseFloat(probStr);
    const clampedProb = Math.max(0, Math.min(1, prob));

    const rule = output.script.rules.find(r => r.id === ruleId);
    if (rule) {
      for (const condition of rule.triggers?.conditions || []) {
        if (condition.type === 'random' && condition.probability !== undefined) {
          const before = condition.probability;
          condition.probability = clampedProb;
          return {
            errorCode: error.code,
            action: 'Clamped probability',
            target: `rules.${ruleId}.random.probability`,
            before,
            after: clampedProb
          };
        }
      }
    }

    return null;
  }

  /**
   * 負のポイントを修復
   */
  private repairNegativePoints(output: LogicGeneratorOutput, error: LogicValidationError): RepairAction | null {
    const match = error.message.match(/ルール "(\w+)".*points\(([\d.-]+)\)/);
    if (!match) return null;

    const [, ruleId, pointsStr] = match;
    const points = parseFloat(pointsStr);
    const absPoints = Math.abs(points);

    const rule = output.script.rules.find(r => r.id === ruleId);
    if (rule) {
      for (const action of rule.actions || []) {
        if (action.type === 'addScore') {
          const before = action.points;
          action.points = absPoints;
          return {
            errorCode: error.code,
            action: 'Made points positive',
            target: `rules.${ruleId}.addScore.points`,
            before,
            after: absPoints
          };
        }
      }
    }

    return null;
  }

  /**
   * エフェクト持続時間を修復
   */
  private repairEffectDuration(output: LogicGeneratorOutput, error: LogicValidationError): RepairAction | null {
    const match = error.message.match(/ルール "(\w+)".*duration\(([\d.-]+)\)/);
    if (!match) return null;

    const [, ruleId, durationStr] = match;
    const duration = parseFloat(durationStr);
    const clampedDuration = Math.min(5, duration);

    const rule = output.script.rules.find(r => r.id === ruleId);
    if (rule) {
      for (const action of rule.actions || []) {
        if (action.type === 'effect' && action.effect?.duration !== undefined) {
          const before = action.effect.duration;
          action.effect.duration = clampedDuration;
          return {
            errorCode: error.code,
            action: 'Clamped effect duration',
            target: `rules.${ruleId}.effect.duration`,
            before,
            after: clampedDuration
          };
        }
      }
    }

    return null;
  }

  /**
   * スケール量を修復
   */
  private repairScaleAmount(output: LogicGeneratorOutput, error: LogicValidationError): RepairAction | null {
    const match = error.message.match(/ルール "(\w+)".*scaleAmount\(([\d.-]+)\)/);
    if (!match) return null;

    const [, ruleId, scaleStr] = match;
    const scale = parseFloat(scaleStr);
    const clampedScale = Math.max(0.1, Math.min(3, scale));

    const rule = output.script.rules.find(r => r.id === ruleId);
    if (rule) {
      for (const action of rule.actions || []) {
        if (action.type === 'effect' && action.effect?.scaleAmount !== undefined) {
          const before = action.effect.scaleAmount;
          action.effect.scaleAmount = clampedScale;
          return {
            errorCode: error.code,
            action: 'Clamped scale amount',
            target: `rules.${ruleId}.effect.scaleAmount`,
            before,
            after: clampedScale
          };
        }
      }
    }

    return null;
  }

  /**
   * ポイント欠損を修復
   */
  private repairMissingPoints(output: LogicGeneratorOutput, error: LogicValidationError): RepairAction | null {
    const match = error.message.match(/ルール "(\w+)"/);
    if (!match) return null;

    const [, ruleId] = match;

    const rule = output.script.rules.find(r => r.id === ruleId);
    if (rule) {
      for (const action of rule.actions || []) {
        if (action.type === 'addScore' && action.points === undefined) {
          action.points = 100; // デフォルト値
          return {
            errorCode: error.code,
            action: 'Added default points',
            target: `rules.${ruleId}.addScore.points`,
            before: undefined,
            after: 100
          };
        }
      }
    }

    return null;
  }

  /**
   * 部分再生成
   */
  private async partialRegenerate(
    output: LogicGeneratorOutput,
    errors: LogicValidationError[],
    concept: GameConcept,
    spec: GameSpecification
  ): Promise<{ success: boolean; output: LogicGeneratorOutput; repairs: RepairAction[] }> {
    if (!this.client) {
      return { success: false, output, repairs: [] };
    }

    const repairs: RepairAction[] = [];

    // 欠損カウンターを追加（LogicValidator形式）
    for (const error of errors.filter(e => e.code === 'INVALID_COUNTER_NAME')) {
      const match = error.message.match(/counterName "(\w+)"/);
      if (match) {
        const counterName = match[1];
        if (!output.script.counters.find(c => c.id === counterName)) {
          output.script.counters.push({
            id: counterName,
            name: counterName,
            initialValue: 0
          });
          repairs.push({
            errorCode: error.code,
            action: 'Added missing counter',
            target: `counters.${counterName}`,
            before: undefined,
            after: { id: counterName, name: counterName, initialValue: 0 }
          });
        }
      }
    }

    // 欠損カウンターを追加（ProjectValidator形式）
    for (const error of errors.filter(e =>
      e.code === 'ACTION_UNDEFINED_COUNTER' || e.code === 'CONDITION_UNDEFINED_COUNTER'
    )) {
      // "references undefined counter: counter_name" からカウンター名を抽出
      const match = error.message.match(/undefined counter: (\w+)/);
      if (match) {
        const counterName = match[1];
        if (!output.script.counters.find(c => c.id === counterName)) {
          output.script.counters.push({
            id: counterName,
            name: counterName,
            initialValue: 0
          });
          repairs.push({
            errorCode: error.code,
            action: 'Added missing counter (from ProjectValidator)',
            target: `counters.${counterName}`,
            before: undefined,
            after: { id: counterName, name: counterName, initialValue: 0 }
          });
        }
      }
    }

    // 欠損サウンドを追加（LogicValidator形式）
    for (const error of errors.filter(e => e.code === 'UNDEFINED_SOUND_ID')) {
      const match = error.message.match(/soundId "(\w+)"/);
      if (match) {
        const soundId = match[1];
        if (!output.assetPlan.sounds.find(s => s.id === soundId)) {
          output.assetPlan.sounds.push({
            id: soundId,
            trigger: 'touch',
            type: 'tap'
          });
          repairs.push({
            errorCode: error.code,
            action: 'Added missing sound',
            target: `sounds.${soundId}`,
            before: undefined,
            after: { id: soundId, trigger: 'touch', type: 'tap' }
          });
        }
      }
    }

    // 欠損サウンドを追加（ProjectValidator形式）
    for (const error of errors.filter(e => e.code === 'ACTION_UNDEFINED_SOUND')) {
      const match = error.message.match(/undefined sound: (\w+)/);
      if (match) {
        const soundId = match[1];
        if (!output.assetPlan.sounds.find(s => s.id === soundId)) {
          output.assetPlan.sounds.push({
            id: soundId,
            trigger: 'touch',
            type: 'tap'
          });
          repairs.push({
            errorCode: error.code,
            action: 'Added missing sound (from ProjectValidator)',
            target: `sounds.${soundId}`,
            before: undefined,
            after: { id: soundId, trigger: 'touch', type: 'tap' }
          });
        }
      }
    }

    // 未使用カウンターを削除
    for (const error of errors.filter(e => e.code === 'UNUSED_COUNTER')) {
      const match = error.message.match(/カウンター "(\w+)"/);
      if (match) {
        const counterName = match[1];
        const index = output.script.counters.findIndex(c => c.id === counterName);
        if (index !== -1) {
          const removed = output.script.counters.splice(index, 1)[0];
          repairs.push({
            errorCode: error.code,
            action: 'Removed unused counter',
            target: `counters.${counterName}`,
            before: removed,
            after: undefined
          });
        }
      }
    }

    // 複雑なエラーはAIで修復
    const complexErrors = errors.filter(e =>
      ['COUNTER_NEVER_CHECKED', 'MISSING_TARGET_ID', 'MISSING_FLAG_ID'].includes(e.code)
    );

    if (complexErrors.length > 0) {
      try {
        const repairPrompt = this.buildPartialRepairPrompt(output, complexErrors, concept, spec);
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: repairPrompt }]
        });

        const content = response.content[0];
        if (content.type === 'text') {
          const repairedRules = this.parseRepairedRules(content.text);
          if (repairedRules.length > 0) {
            // 修復されたルールで置き換え
            for (const repairedRule of repairedRules) {
              const index = output.script.rules.findIndex(r => r.id === repairedRule.id);
              if (index !== -1) {
                const before = output.script.rules[index];
                output.script.rules[index] = repairedRule;
                repairs.push({
                  errorCode: 'AI_REPAIR',
                  action: 'Repaired rule via AI',
                  target: `rules.${repairedRule.id}`,
                  before,
                  after: repairedRule
                });
              }
            }
          }
        }
      } catch (error) {
        this.log('error', `AI repair failed: ${(error as Error).message}`);
      }
    }

    return { success: repairs.length > 0, output, repairs };
  }

  /**
   * 部分修復用プロンプトを構築
   */
  private buildPartialRepairPrompt(
    output: LogicGeneratorOutput,
    errors: LogicValidationError[],
    concept: GameConcept,
    spec: GameSpecification
  ): string {
    const errorDescriptions = errors.map(e =>
      `- [${e.code}] ${e.message}${e.fix ? ` (修正方法: ${e.fix})` : ''}`
    ).join('\n');

    const affectedRuleIds = new Set<string>();
    for (const error of errors) {
      const match = error.message.match(/ルール "(\w+)"/);
      if (match) {
        affectedRuleIds.add(match[1]);
      }
    }

    const affectedRules = output.script.rules.filter(r => affectedRuleIds.has(r.id));

    return `ゲーム「${concept.title}」のロジックに以下のエラーがあります。
該当ルールを修正してください。

## エラー一覧
${errorDescriptions}

## 影響を受けるルール
\`\`\`json
${JSON.stringify(affectedRules, null, 2)}
\`\`\`

## 利用可能なオブジェクト
${output.assetPlan.objects.map(o => `- ${o.id}: ${o.name}`).join('\n')}

## 利用可能なカウンター
${output.script.counters.map(c => `- ${c.id}: 初期値${c.initialValue}`).join('\n')}

## 利用可能なサウンド
${output.assetPlan.sounds.map(s => `- ${s.id}: ${s.type}`).join('\n')}

修正されたルールをJSON配列で返してください。
\`\`\`json
[
  { "id": "rule_xxx", ... },
  ...
]
\`\`\``;
  }

  /**
   * AIからの修復ルールをパース
   */
  private parseRepairedRules(text: string): GameRule[] {
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      // JSONブロックがない場合は配列として直接パース
      return JSON.parse(text);
    } catch {
      return [];
    }
  }

  /**
   * 再生成用フィードバックを構築
   */
  private buildRegenerationFeedback(errors: LogicValidationError[]): string {
    const grouped: Record<string, string[]> = {};

    for (const error of errors) {
      if (!grouped[error.code]) {
        grouped[error.code] = [];
      }
      grouped[error.code].push(error.message);
    }

    const feedback: string[] = ['以下の構造的な問題を修正してください:'];

    for (const [code, messages] of Object.entries(grouped)) {
      feedback.push(`\n## ${code}`);
      for (const msg of messages) {
        feedback.push(`- ${msg}`);
      }

      // コードに応じた修正ガイダンス
      switch (code) {
        case 'INSTANT_WIN':
          feedback.push('→ カウンターの初期値を目標値より低く設定するか、成功条件を変更してください');
          break;
        case 'INSTANT_LOSE':
          feedback.push('→ カウンターの初期値を失敗閾値より低く設定してください');
          break;
        case 'AUTO_SUCCESS':
          feedback.push('→ 成功条件にタッチやコリジョンなどのプレイヤー操作を必須にしてください');
          break;
        case 'NO_SUCCESS':
          feedback.push('→ successアクションを含むルールを追加してください');
          break;
        case 'SUCCESS_FAILURE_CONFLICT':
          feedback.push('→ 成功と失敗の条件を明確に分離してください');
          break;
        case 'UNREACHABLE_SUCCESS':
          feedback.push('→ 成功条件に到達するためのルールパスを確認してください');
          break;
        case 'COUNTER_NEVER_MODIFIED':
          feedback.push('→ カウンターを操作するルールを追加してください');
          break;
      }
    }

    return feedback.join('\n');
  }

  /**
   * 残存エラーを取得
   */
  private getRemainingErrors(
    originalErrors: LogicValidationError[],
    repairsApplied: RepairAction[],
    fullRegenErrors: LogicValidationError[]
  ): LogicValidationError[] {
    const repairedCodes = new Set(repairsApplied.map(r => r.errorCode));
    const fullRegenCodes = new Set(fullRegenErrors.map(e => e.code));

    return originalErrors.filter(e =>
      !repairedCodes.has(e.code) && !fullRegenCodes.has(e.code)
    );
  }

  /**
   * 深いクローン
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * ログ出力
   */
  private log(level: 'info' | 'warning' | 'error', message: string): void {
    if (this.logger) {
      this.logger.log('LogicRepairer', level === 'error' ? 'error' : 'decision', message);
    }
    console.log(`   [LogicRepairer] ${message}`);
  }
}
