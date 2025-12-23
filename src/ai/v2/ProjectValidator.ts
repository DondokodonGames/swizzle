/**
 * Step 6.5: ProjectValidator
 *
 * Assembly前の全体整合チェック
 * 参照ズレ、必須データ欠落、layout初期化不一致を検出
 *
 * 入力: LogicGeneratorOutput + AssetPlan + GameSpecification
 * 出力: ProjectValidationResult
 */

import { LogicGeneratorOutput, GameRule, TriggerCondition, GameAction } from './types';
import { EnhancedAssetPlan } from './AssetPlanner';
import { GameSpecification } from './SpecificationGenerator';
import { GenerationLogger } from './GenerationLogger';

// ==========================================
// Validation Types
// ==========================================

export interface ProjectValidationError {
  severity: 'error' | 'warning';
  category: 'reference' | 'layout' | 'priority' | 'termination' | 'policy' | 'logic';
  code: string;
  message: string;
  details?: Record<string, unknown>;
  fix?: string;
}

export interface ProjectValidationResult {
  valid: boolean;
  errors: ProjectValidationError[];
  warnings: ProjectValidationError[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

// ==========================================
// ProjectValidator
// ==========================================

export class ProjectValidator {
  private logger?: GenerationLogger;

  constructor(logger?: GenerationLogger) {
    this.logger = logger;
  }

  /**
   * プロジェクト全体の整合性を検証
   */
  validate(
    logicOutput: LogicGeneratorOutput,
    assetPlan?: EnhancedAssetPlan,
    specification?: GameSpecification
  ): ProjectValidationResult {
    const allIssues: ProjectValidationError[] = [];
    let totalChecks = 0;

    // 1. 参照整合チェック
    totalChecks += this.checkReferenceIntegrity(logicOutput, allIssues);

    // 2. レイアウト整合チェック
    totalChecks += this.checkLayoutIntegrity(logicOutput, allIssues);

    // 3. Priority整合チェック
    totalChecks += this.checkPriorityIntegrity(logicOutput, allIssues);

    // 4. 終了性チェック（success/failureへの到達可能性）
    totalChecks += this.checkTermination(logicOutput, allIssues);

    // 5. アセットポリシー整合チェック
    if (assetPlan) {
      totalChecks += this.checkAssetPolicyIntegrity(logicOutput, assetPlan, allIssues);
    }

    // 6. 仕様との整合チェック
    if (specification) {
      totalChecks += this.checkSpecificationIntegrity(logicOutput, specification, allIssues);
    }

    // 7. ルール間の競合チェック
    totalChecks += this.checkRuleConflicts(logicOutput, allIssues);

    // 結果を分類
    const errors = allIssues.filter(i => i.severity === 'error');
    const warnings = allIssues.filter(i => i.severity === 'warning');

    const result: ProjectValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalChecks,
        passed: totalChecks - errors.length - warnings.length,
        failed: errors.length,
        warnings: warnings.length
      }
    };

    // ログに記録
    this.logger?.log('ProjectValidator', 'validation',
      result.valid ? 'Project validation passed' : 'Project validation failed',
      {
        totalChecks: result.summary.totalChecks,
        errors: errors.length,
        warnings: warnings.length,
        errorCodes: errors.map(e => e.code)
      }
    );

    return result;
  }

  /**
   * 1. 参照整合チェック
   */
  private checkReferenceIntegrity(
    output: LogicGeneratorOutput,
    issues: ProjectValidationError[]
  ): number {
    let checks = 0;

    // 定義済みID一覧
    const definedObjectIds = new Set(output.assetPlan.objects.map(o => o.id));
    const definedCounterNames = new Set(output.script.counters.map(c => c.name));
    const definedCounterIds = new Set(output.script.counters.map(c => c.id));
    const definedSoundIds = new Set(output.assetPlan.sounds.map(s => s.id));
    const layoutObjectIds = new Set(output.script.layout.objects.map(o => o.objectId));

    // ルールから参照されているIDを収集
    for (const rule of output.script.rules) {
      checks++;

      // targetObjectIdの参照チェック
      if (rule.targetObjectId) {
        checks++;
        if (!definedObjectIds.has(rule.targetObjectId) && rule.targetObjectId !== 'stage') {
          issues.push({
            severity: 'error',
            category: 'reference',
            code: 'UNDEFINED_TARGET_OBJECT',
            message: `Rule "${rule.name}" references undefined object: ${rule.targetObjectId}`,
            details: { ruleId: rule.id, targetObjectId: rule.targetObjectId },
            fix: `Add object "${rule.targetObjectId}" to assetPlan.objects or fix the reference`
          });
        }
      }

      // トリガー条件の参照チェック
      if (rule.triggers?.conditions) {
        for (const condition of rule.triggers.conditions) {
          checks++;
          this.checkConditionReferences(condition, definedObjectIds, definedCounterNames, issues, rule);
        }
      }

      // アクションの参照チェック
      if (rule.actions) {
        for (const action of rule.actions) {
          checks++;
          this.checkActionReferences(action, definedObjectIds, definedCounterNames, definedSoundIds, issues, rule);
        }
      }
    }

    // レイアウトのオブジェクトがassetPlanに存在するか
    for (const layoutObj of output.script.layout.objects) {
      checks++;
      if (!definedObjectIds.has(layoutObj.objectId)) {
        issues.push({
          severity: 'error',
          category: 'reference',
          code: 'LAYOUT_UNDEFINED_OBJECT',
          message: `Layout references undefined object: ${layoutObj.objectId}`,
          details: { objectId: layoutObj.objectId },
          fix: `Add object "${layoutObj.objectId}" to assetPlan.objects`
        });
      }
    }

    // assetPlanのオブジェクトがレイアウトに存在するか（警告）
    for (const obj of output.assetPlan.objects) {
      checks++;
      if (!layoutObjectIds.has(obj.id)) {
        issues.push({
          severity: 'warning',
          category: 'reference',
          code: 'ASSET_NOT_IN_LAYOUT',
          message: `Object "${obj.id}" is defined but not placed in layout`,
          details: { objectId: obj.id }
        });
      }
    }

    return checks;
  }

  /**
   * 条件の参照チェック
   */
  private checkConditionReferences(
    condition: TriggerCondition,
    objectIds: Set<string>,
    counterNames: Set<string>,
    issues: ProjectValidationError[],
    rule: GameRule
  ): void {
    // touch条件のtarget
    if (condition.type === 'touch' && condition.target) {
      if (condition.target !== 'self' && condition.target !== 'stage' && !objectIds.has(condition.target)) {
        issues.push({
          severity: 'error',
          category: 'reference',
          code: 'CONDITION_UNDEFINED_TARGET',
          message: `Touch condition in rule "${rule.name}" references undefined object: ${condition.target}`,
          details: { ruleId: rule.id, target: condition.target }
        });
      }
    }

    // counter条件
    if (condition.type === 'counter' && condition.counterName) {
      if (!counterNames.has(condition.counterName)) {
        issues.push({
          severity: 'error',
          category: 'reference',
          code: 'CONDITION_UNDEFINED_COUNTER',
          message: `Counter condition in rule "${rule.name}" references undefined counter: ${condition.counterName}`,
          details: { ruleId: rule.id, counterName: condition.counterName }
        });
      }
    }

    // collision条件のtarget
    if (condition.type === 'collision' && condition.target) {
      if (!objectIds.has(condition.target)) {
        issues.push({
          severity: 'error',
          category: 'reference',
          code: 'CONDITION_UNDEFINED_COLLISION_TARGET',
          message: `Collision condition in rule "${rule.name}" references undefined object: ${condition.target}`,
          details: { ruleId: rule.id, target: condition.target }
        });
      }
    }
  }

  /**
   * アクションの参照チェック
   */
  private checkActionReferences(
    action: GameAction,
    objectIds: Set<string>,
    counterNames: Set<string>,
    soundIds: Set<string>,
    issues: ProjectValidationError[],
    rule: GameRule
  ): void {
    // hide/show/move/effectのtargetId
    if (action.targetId) {
      if (!objectIds.has(action.targetId)) {
        issues.push({
          severity: 'error',
          category: 'reference',
          code: 'ACTION_UNDEFINED_TARGET',
          message: `Action "${action.type}" in rule "${rule.name}" references undefined object: ${action.targetId}`,
          details: { ruleId: rule.id, targetId: action.targetId }
        });
      }
    }

    // counterアクション
    if (action.type === 'counter' && action.counterName) {
      if (!counterNames.has(action.counterName)) {
        issues.push({
          severity: 'error',
          category: 'reference',
          code: 'ACTION_UNDEFINED_COUNTER',
          message: `Counter action in rule "${rule.name}" references undefined counter: ${action.counterName}`,
          details: { ruleId: rule.id, counterName: action.counterName }
        });
      }
    }

    // playSoundアクション
    if (action.type === 'playSound' && action.soundId) {
      if (!soundIds.has(action.soundId)) {
        issues.push({
          severity: 'warning',
          category: 'reference',
          code: 'ACTION_UNDEFINED_SOUND',
          message: `PlaySound action in rule "${rule.name}" references undefined sound: ${action.soundId}`,
          details: { ruleId: rule.id, soundId: action.soundId }
        });
      }
    }
  }

  /**
   * 2. レイアウト整合チェック
   */
  private checkLayoutIntegrity(
    output: LogicGeneratorOutput,
    issues: ProjectValidationError[]
  ): number {
    let checks = 0;

    for (const layoutObj of output.script.layout.objects) {
      checks++;

      // 座標範囲チェック
      if (layoutObj.position.x < 0 || layoutObj.position.x > 1 ||
          layoutObj.position.y < 0 || layoutObj.position.y > 1) {
        issues.push({
          severity: 'error',
          category: 'layout',
          code: 'POSITION_OUT_OF_RANGE',
          message: `Object "${layoutObj.objectId}" has position outside valid range (0-1)`,
          details: { objectId: layoutObj.objectId, position: layoutObj.position },
          fix: 'Adjust position to be within 0.0-1.0 range'
        });
      }

      // スケール妥当性チェック
      if (layoutObj.scale.x <= 0 || layoutObj.scale.y <= 0) {
        issues.push({
          severity: 'error',
          category: 'layout',
          code: 'INVALID_SCALE',
          message: `Object "${layoutObj.objectId}" has invalid scale`,
          details: { objectId: layoutObj.objectId, scale: layoutObj.scale }
        });
      }

      // 極端なスケール警告
      if (layoutObj.scale.x > 3 || layoutObj.scale.y > 3) {
        issues.push({
          severity: 'warning',
          category: 'layout',
          code: 'EXTREME_SCALE',
          message: `Object "${layoutObj.objectId}" has very large scale`,
          details: { objectId: layoutObj.objectId, scale: layoutObj.scale }
        });
      }
    }

    // オブジェクト重複チェック
    const objectIdCount = new Map<string, number>();
    for (const layoutObj of output.script.layout.objects) {
      objectIdCount.set(layoutObj.objectId, (objectIdCount.get(layoutObj.objectId) || 0) + 1);
    }
    for (const [objectId, count] of objectIdCount) {
      checks++;
      if (count > 1) {
        issues.push({
          severity: 'warning',
          category: 'layout',
          code: 'DUPLICATE_LAYOUT_OBJECT',
          message: `Object "${objectId}" appears ${count} times in layout`,
          details: { objectId, count }
        });
      }
    }

    return checks;
  }

  /**
   * 3. Priority整合チェック
   */
  private checkPriorityIntegrity(
    output: LogicGeneratorOutput,
    issues: ProjectValidationError[]
  ): number {
    let checks = 0;

    // 成功/失敗ルールのインデックスを取得
    const successRuleIndices: number[] = [];
    const failureRuleIndices: number[] = [];

    output.script.rules.forEach((rule, index) => {
      checks++;
      if (rule.actions?.some(a => a.type === 'success')) {
        successRuleIndices.push(index);
      }
      if (rule.actions?.some(a => a.type === 'failure')) {
        failureRuleIndices.push(index);
      }
    });

    // 成功ルールより前にカウンター増加ルールがあるか確認
    for (const successIndex of successRuleIndices) {
      const successRule = output.script.rules[successIndex];

      // カウンター条件を持つ成功ルールの場合
      const counterCondition = successRule.triggers?.conditions?.find(c => c.type === 'counter');
      if (counterCondition?.counterName) {
        checks++;

        // このカウンターを増加させるルールを探す
        const incrementRuleIndex = output.script.rules.findIndex(r =>
          r.actions?.some(a =>
            a.type === 'counter' &&
            a.counterName === counterCondition.counterName &&
            (a.operation === 'increment' || a.operation === 'add')
          )
        );

        if (incrementRuleIndex === -1) {
          issues.push({
            severity: 'error',
            category: 'priority',
            code: 'NO_COUNTER_INCREMENT',
            message: `Success rule "${successRule.name}" checks counter "${counterCondition.counterName}" but no rule increments it`,
            details: { ruleId: successRule.id, counterName: counterCondition.counterName }
          });
        }
      }
    }

    return checks;
  }

  /**
   * 4. 終了性チェック（success/failureへの到達可能性）
   */
  private checkTermination(
    output: LogicGeneratorOutput,
    issues: ProjectValidationError[]
  ): number {
    let checks = 0;

    // successルールの存在確認
    checks++;
    const hasSuccessRule = output.script.rules.some(r =>
      r.actions?.some(a => a.type === 'success')
    );
    if (!hasSuccessRule) {
      issues.push({
        severity: 'error',
        category: 'termination',
        code: 'NO_SUCCESS_RULE',
        message: 'No success rule defined - game cannot be won',
        fix: 'Add a rule with success action'
      });
    }

    // failureルールまたはタイムアウトの存在確認（警告のみ）
    checks++;
    const hasFailureRule = output.script.rules.some(r =>
      r.actions?.some(a => a.type === 'failure')
    );
    if (!hasFailureRule) {
      issues.push({
        severity: 'warning',
        category: 'termination',
        code: 'NO_FAILURE_RULE',
        message: 'No failure rule defined - game relies on timeout only',
        details: {}
      });
    }

    // カウンター条件の到達可能性
    for (const rule of output.script.rules) {
      if (!rule.triggers?.conditions) continue;

      for (const condition of rule.triggers.conditions) {
        if (condition.type === 'counter' && condition.counterName && condition.value !== undefined) {
          checks++;

          const counter = output.script.counters.find(c => c.name === condition.counterName);
          if (counter) {
            // カウンターを変更するルールがあるか
            const hasModifyingRule = output.script.rules.some(r =>
              r.actions?.some(a =>
                a.type === 'counter' && a.counterName === condition.counterName
              )
            );

            if (!hasModifyingRule && counter.initialValue !== condition.value) {
              // 条件の比較タイプに応じて判定
              const comparison = condition.comparison || 'equals';
              let isUnreachable = false;

              if (comparison === 'equals' && counter.initialValue !== condition.value) {
                isUnreachable = true;
              } else if (comparison === 'greaterOrEqual' && counter.initialValue < (condition.value as number)) {
                isUnreachable = true;
              } else if (comparison === 'greater' && counter.initialValue <= (condition.value as number)) {
                isUnreachable = true;
              }

              if (isUnreachable) {
                issues.push({
                  severity: 'error',
                  category: 'termination',
                  code: 'UNREACHABLE_COUNTER_CONDITION',
                  message: `Counter condition "${condition.counterName} ${comparison} ${condition.value}" is unreachable (initial: ${counter.initialValue}, no modifying rules)`,
                  details: {
                    ruleId: rule.id,
                    counterName: condition.counterName,
                    requiredValue: condition.value,
                    initialValue: counter.initialValue
                  }
                });
              }
            }
          }
        }
      }
    }

    return checks;
  }

  /**
   * 5. アセットポリシー整合チェック
   */
  private checkAssetPolicyIntegrity(
    output: LogicGeneratorOutput,
    assetPlan: EnhancedAssetPlan,
    issues: ProjectValidationError[]
  ): number {
    let checks = 0;

    // オブジェクト数の整合性
    checks++;
    if (output.assetPlan.objects.length !== assetPlan.objects.length) {
      issues.push({
        severity: 'warning',
        category: 'policy',
        code: 'OBJECT_COUNT_MISMATCH',
        message: `Object count mismatch: LogicOutput has ${output.assetPlan.objects.length}, AssetPlan has ${assetPlan.objects.length}`,
        details: {
          logicOutputCount: output.assetPlan.objects.length,
          assetPlanCount: assetPlan.objects.length
        }
      });
    }

    // 必須サウンドの存在確認
    const requiredSounds = assetPlan.audio.sounds.filter(s => s.priority === 'required');
    for (const sound of requiredSounds) {
      checks++;
      if (!output.assetPlan.sounds.some(s => s.id === sound.id)) {
        issues.push({
          severity: 'error',
          category: 'policy',
          code: 'MISSING_REQUIRED_SOUND',
          message: `Required sound "${sound.id}" from AssetPlan is missing in LogicOutput`,
          details: { soundId: sound.id }
        });
      }
    }

    // touchableオブジェクトがルールで使用されているか
    const touchableObjects = assetPlan.objects.filter(o => o.touchable);
    for (const obj of touchableObjects) {
      checks++;
      const hasRule = output.script.rules.some(r =>
        r.targetObjectId === obj.id ||
        r.triggers?.conditions?.some(c => c.target === obj.id)
      );
      if (!hasRule) {
        issues.push({
          severity: 'warning',
          category: 'policy',
          code: 'UNUSED_TOUCHABLE_OBJECT',
          message: `Touchable object "${obj.id}" has no associated rules`,
          details: { objectId: obj.id }
        });
      }
    }

    return checks;
  }

  /**
   * 6. 仕様との整合チェック
   */
  private checkSpecificationIntegrity(
    output: LogicGeneratorOutput,
    spec: GameSpecification,
    issues: ProjectValidationError[]
  ): number {
    let checks = 0;

    // 仕様のカウンターがすべて実装されているか
    for (const counter of spec.stateManagement.counters) {
      checks++;
      if (!output.script.counters.some(c => c.id === counter.id || c.name === counter.name)) {
        issues.push({
          severity: 'error',
          category: 'logic',
          code: 'SPEC_COUNTER_NOT_IMPLEMENTED',
          message: `Counter "${counter.id}" from specification is not implemented`,
          details: { counterId: counter.id, counterName: counter.name }
        });
      }
    }

    // 仕様のルールがすべて実装されているか
    for (const specRule of spec.rules) {
      checks++;
      if (!output.script.rules.some(r => r.id === specRule.id)) {
        issues.push({
          severity: 'warning',
          category: 'logic',
          code: 'SPEC_RULE_NOT_IMPLEMENTED',
          message: `Rule "${specRule.id}" from specification may not be implemented`,
          details: { ruleId: specRule.id, ruleName: specRule.name }
        });
      }
    }

    return checks;
  }

  /**
   * 7. ルール間の競合チェック
   */
  private checkRuleConflicts(
    output: LogicGeneratorOutput,
    issues: ProjectValidationError[]
  ): number {
    let checks = 0;

    // 同一条件でsuccess/failureが両方発火する可能性
    for (let i = 0; i < output.script.rules.length; i++) {
      for (let j = i + 1; j < output.script.rules.length; j++) {
        const rule1 = output.script.rules[i];
        const rule2 = output.script.rules[j];

        checks++;

        // 同一条件シグネチャをチェック
        const sig1 = this.getConditionSignature(rule1);
        const sig2 = this.getConditionSignature(rule2);

        if (sig1 === sig2 && sig1 !== '') {
          const hasSuccess1 = rule1.actions?.some(a => a.type === 'success');
          const hasFailure1 = rule1.actions?.some(a => a.type === 'failure');
          const hasSuccess2 = rule2.actions?.some(a => a.type === 'success');
          const hasFailure2 = rule2.actions?.some(a => a.type === 'failure');

          if ((hasSuccess1 && hasFailure2) || (hasFailure1 && hasSuccess2)) {
            issues.push({
              severity: 'error',
              category: 'logic',
              code: 'CONFLICTING_TERMINATION',
              message: `Rules "${rule1.name}" and "${rule2.name}" can trigger both success and failure with same condition`,
              details: { rule1Id: rule1.id, rule2Id: rule2.id, condition: sig1 }
            });
          }
        }
      }
    }

    return checks;
  }

  /**
   * 条件のシグネチャを生成（比較用）
   */
  private getConditionSignature(rule: GameRule): string {
    if (!rule.triggers?.conditions || rule.triggers.conditions.length === 0) {
      return '';
    }

    return rule.triggers.conditions
      .map(c => {
        if (c.type === 'counter') {
          return `counter:${c.counterName}:${c.comparison}:${c.value}`;
        }
        if (c.type === 'touch') {
          return `touch:${c.target || 'self'}:${c.touchType || 'down'}`;
        }
        if (c.type === 'time') {
          return `time:${c.seconds}`;
        }
        return `${c.type}`;
      })
      .sort()
      .join('|');
  }

  /**
   * フィードバックをフォーマット
   */
  formatFeedback(result: ProjectValidationResult): string {
    const parts: string[] = [];

    for (const error of result.errors) {
      parts.push(`[${error.code}] ${error.message}${error.fix ? ` (Fix: ${error.fix})` : ''}`);
    }

    return parts.join('\n');
  }
}

export default ProjectValidator;
