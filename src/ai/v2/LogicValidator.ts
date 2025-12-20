/**
 * Step 4: LogicValidator
 *
 * 100%成功が前提。エディター仕様との完全整合性を検証
 */

import {
  LogicGeneratorOutput,
  LogicValidationResult,
  LogicValidationError,
  GameRule,
  TriggerCondition,
  GameAction,
  VerifiedConditionType,
  VerifiedActionType
} from './types';

// 使用禁止の条件タイプ
const FORBIDDEN_CONDITIONS = ['position', 'animation', 'random'];

// 使用禁止のアクションタイプ
const FORBIDDEN_ACTIONS = ['playSound', 'switchAnimation', 'applyForce', 'applyImpulse', 'randomAction'];

// 使用可能な条件タイプ
const VALID_CONDITIONS: VerifiedConditionType[] = ['touch', 'time', 'counter', 'collision', 'flag', 'gameState'];

// 使用可能なアクションタイプ
const VALID_ACTIONS: VerifiedActionType[] = [
  'success', 'failure', 'hide', 'show', 'move', 'counter', 'addScore', 'effect', 'setFlag', 'toggleFlag'
];

export class LogicValidator {
  /**
   * ロジックを検証
   */
  validate(output: LogicGeneratorOutput): LogicValidationResult {
    const errors: LogicValidationError[] = [];

    // 1. オブジェクトID整合性
    this.checkObjectIdConsistency(output, errors);

    // 2. カウンター名整合性
    this.checkCounterNameConsistency(output, errors);

    // 3. 即成功チェック
    this.checkInstantWin(output, errors);

    // 4. 即失敗チェック
    this.checkInstantLose(output, errors);

    // 5. 座標範囲チェック
    this.checkCoordinateRange(output, errors);

    // 6. 使用禁止機能チェック
    this.checkForbiddenFeatures(output, errors);

    // 7. 成功パスにプレイヤー操作が必要
    this.checkPlayerActionOnSuccessPath(output, errors);

    // 8. successとfailureアクションの存在チェック
    this.checkSuccessFailureExists(output, errors);

    return {
      valid: errors.filter(e => e.type === 'critical').length === 0,
      errors
    };
  }

  /**
   * オブジェクトID整合性チェック
   */
  private checkObjectIdConsistency(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const definedObjectIds = new Set(output.assetPlan.objects.map(o => o.id));

    // layoutのオブジェクトチェック
    for (const layoutObj of output.script.layout.objects) {
      if (!definedObjectIds.has(layoutObj.objectId)) {
        errors.push({
          type: 'critical',
          code: 'INVALID_OBJECT_ID',
          message: `objectId "${layoutObj.objectId}" がアセット計画に存在しません`,
          fix: `アセット計画に "${layoutObj.objectId}" を追加するか、正しいIDに修正してください`
        });
      }
    }

    // rulesのtargetObjectIdチェック
    for (const rule of output.script.rules) {
      if (rule.targetObjectId && !definedObjectIds.has(rule.targetObjectId)) {
        errors.push({
          type: 'critical',
          code: 'INVALID_OBJECT_ID',
          message: `ルール "${rule.id}" のtargetObjectId "${rule.targetObjectId}" がアセット計画に存在しません`,
          fix: `正しいobjectIdに修正してください`
        });
      }

      // アクションのtargetIdチェック
      for (const action of rule.actions || []) {
        if (action.targetId && !definedObjectIds.has(action.targetId)) {
          errors.push({
            type: 'critical',
            code: 'INVALID_OBJECT_ID',
            message: `ルール "${rule.id}" のアクションtargetId "${action.targetId}" がアセット計画に存在しません`,
            fix: `正しいobjectIdに修正してください`
          });
        }
      }
    }
  }

  /**
   * カウンター名整合性チェック
   */
  private checkCounterNameConsistency(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const definedCounterNames = new Set(output.script.counters.map(c => c.id));

    for (const rule of output.script.rules) {
      // 条件のcounterNameチェック
      for (const condition of rule.triggers?.conditions || []) {
        if (condition.type === 'counter' && condition.counterName) {
          if (!definedCounterNames.has(condition.counterName)) {
            errors.push({
              type: 'critical',
              code: 'INVALID_COUNTER_NAME',
              message: `counterName "${condition.counterName}" がcountersに定義されていません`,
              fix: `countersに "${condition.counterName}" を追加してください`
            });
          }
        }
      }

      // アクションのcounterNameチェック
      for (const action of rule.actions || []) {
        if (action.type === 'counter' && action.counterName) {
          if (!definedCounterNames.has(action.counterName)) {
            errors.push({
              type: 'critical',
              code: 'INVALID_COUNTER_NAME',
              message: `counterName "${action.counterName}" がcountersに定義されていません`,
              fix: `countersに "${action.counterName}" を追加してください`
            });
          }
        }
      }
    }
  }

  /**
   * 即成功チェック
   */
  private checkInstantWin(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const successRules = output.script.rules.filter(r =>
      r.actions?.some(a => a.type === 'success')
    );

    for (const rule of successRules) {
      // 条件がないsuccessルール
      if (!rule.triggers?.conditions || rule.triggers.conditions.length === 0) {
        errors.push({
          type: 'critical',
          code: 'INSTANT_WIN',
          message: `ルール "${rule.id}" は条件なしでsuccessが発動します`,
          fix: `適切な条件を追加してください`
        });
        continue;
      }

      // カウンター条件のチェック
      const counterCondition = rule.triggers.conditions.find(c => c.type === 'counter');
      if (counterCondition && counterCondition.counterName && counterCondition.value !== undefined) {
        const counter = output.script.counters.find(c => c.id === counterCondition.counterName);
        if (counter) {
          const comparison = counterCondition.comparison || 'greaterOrEqual';
          let isInstantWin = false;

          switch (comparison) {
            case 'greaterOrEqual':
            case 'equals':
              isInstantWin = counter.initialValue >= counterCondition.value;
              break;
            case 'greater':
              isInstantWin = counter.initialValue > counterCondition.value;
              break;
            case 'less':
              isInstantWin = counter.initialValue < counterCondition.value;
              break;
            case 'lessOrEqual':
              isInstantWin = counter.initialValue <= counterCondition.value;
              break;
          }

          if (isInstantWin) {
            errors.push({
              type: 'critical',
              code: 'INSTANT_WIN',
              message: `即成功: カウンター "${counter.id}" の初期値(${counter.initialValue})が条件を満たしています`,
              fix: `initialValueを修正してください（目標値: ${counterCondition.value}）`
            });
          }
        }
      }
    }
  }

  /**
   * 即失敗チェック
   */
  private checkInstantLose(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const failureRules = output.script.rules.filter(r =>
      r.actions?.some(a => a.type === 'failure')
    );

    for (const rule of failureRules) {
      // 条件がないfailureルール
      if (!rule.triggers?.conditions || rule.triggers.conditions.length === 0) {
        errors.push({
          type: 'critical',
          code: 'INSTANT_LOSE',
          message: `ルール "${rule.id}" は条件なしでfailureが発動します`,
          fix: `適切な条件を追加してください`
        });
        continue;
      }

      // カウンター条件のチェック
      const counterCondition = rule.triggers.conditions.find(c => c.type === 'counter');
      if (counterCondition && counterCondition.counterName && counterCondition.value !== undefined) {
        const counter = output.script.counters.find(c => c.id === counterCondition.counterName);
        if (counter) {
          const comparison = counterCondition.comparison || 'greaterOrEqual';
          let isInstantLose = false;

          switch (comparison) {
            case 'greaterOrEqual':
            case 'equals':
              isInstantLose = counter.initialValue >= counterCondition.value;
              break;
            case 'greater':
              isInstantLose = counter.initialValue > counterCondition.value;
              break;
          }

          if (isInstantLose) {
            errors.push({
              type: 'critical',
              code: 'INSTANT_LOSE',
              message: `即失敗: カウンター "${counter.id}" の初期値(${counter.initialValue})が失敗閾値(${counterCondition.value})以上`,
              fix: `initialValueを${counterCondition.value - 1}以下に設定してください`
            });
          }
        }
      }
    }
  }

  /**
   * 座標範囲チェック
   */
  private checkCoordinateRange(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    for (const obj of output.script.layout.objects) {
      if (obj.position.x < 0 || obj.position.x > 1) {
        errors.push({
          type: 'critical',
          code: 'INVALID_COORDINATES',
          message: `座標範囲外: ${obj.objectId} のx座標(${obj.position.x})が0.0〜1.0の範囲外`,
          fix: `x座標を0.0〜1.0の範囲に修正してください`
        });
      }
      if (obj.position.y < 0 || obj.position.y > 1) {
        errors.push({
          type: 'critical',
          code: 'INVALID_COORDINATES',
          message: `座標範囲外: ${obj.objectId} のy座標(${obj.position.y})が0.0〜1.0の範囲外`,
          fix: `y座標を0.0〜1.0の範囲に修正してください`
        });
      }
    }

    // アセット計画の初期位置もチェック
    for (const obj of output.assetPlan.objects) {
      if (obj.initialPosition.x < 0 || obj.initialPosition.x > 1 ||
          obj.initialPosition.y < 0 || obj.initialPosition.y > 1) {
        errors.push({
          type: 'warning',
          code: 'INVALID_COORDINATES',
          message: `アセット "${obj.id}" の初期位置が範囲外`,
          fix: `初期位置を0.0〜1.0の範囲に修正してください`
        });
      }
    }
  }

  /**
   * 使用禁止機能チェック
   */
  private checkForbiddenFeatures(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    for (const rule of output.script.rules) {
      // 条件チェック
      for (const condition of rule.triggers?.conditions || []) {
        if (FORBIDDEN_CONDITIONS.includes(condition.type)) {
          errors.push({
            type: 'critical',
            code: 'FORBIDDEN_CONDITION',
            message: `使用禁止の条件タイプ: ${condition.type}`,
            fix: `動作確認済みの条件タイプ(${VALID_CONDITIONS.join(', ')})に置き換えてください`
          });
        }
        if (!VALID_CONDITIONS.includes(condition.type as VerifiedConditionType) &&
            !FORBIDDEN_CONDITIONS.includes(condition.type)) {
          errors.push({
            type: 'critical',
            code: 'UNKNOWN_CONDITION',
            message: `未知の条件タイプ: ${condition.type}`,
            fix: `動作確認済みの条件タイプ(${VALID_CONDITIONS.join(', ')})を使用してください`
          });
        }
      }

      // アクションチェック
      for (const action of rule.actions || []) {
        if (FORBIDDEN_ACTIONS.includes(action.type)) {
          errors.push({
            type: 'critical',
            code: 'FORBIDDEN_ACTION',
            message: `使用禁止のアクションタイプ: ${action.type}`,
            fix: `動作確認済みのアクションタイプ(${VALID_ACTIONS.join(', ')})に置き換えてください`
          });
        }
        if (!VALID_ACTIONS.includes(action.type as VerifiedActionType) &&
            !FORBIDDEN_ACTIONS.includes(action.type)) {
          errors.push({
            type: 'critical',
            code: 'UNKNOWN_ACTION',
            message: `未知のアクションタイプ: ${action.type}`,
            fix: `動作確認済みのアクションタイプ(${VALID_ACTIONS.join(', ')})を使用してください`
          });
        }
      }
    }
  }

  /**
   * 成功パスにプレイヤー操作が必要
   */
  private checkPlayerActionOnSuccessPath(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const successRules = output.script.rules.filter(r =>
      r.actions?.some(a => a.type === 'success')
    );

    // 直接touch条件でsuccessするルールがあるか
    let hasDirectTouchSuccess = successRules.some(r =>
      r.triggers?.conditions?.some(c => c.type === 'touch')
    );

    if (hasDirectTouchSuccess) return;

    // カウンター経由でsuccessする場合、そのカウンターを増やすルールにtouchがあるか
    for (const successRule of successRules) {
      const counterCondition = successRule.triggers?.conditions?.find(c => c.type === 'counter');
      if (counterCondition?.counterName) {
        // このカウンターを操作するルールを探す
        const counterModifyingRules = output.script.rules.filter(r =>
          r.actions?.some(a => a.type === 'counter' && a.counterName === counterCondition.counterName)
        );

        const hasTouchOnPath = counterModifyingRules.some(r =>
          r.triggers?.conditions?.some(c => c.type === 'touch')
        );

        if (hasTouchOnPath) return;
      }
    }

    errors.push({
      type: 'critical',
      code: 'NO_PLAYER_ACTION',
      message: '成功へのパスにプレイヤー操作（touch条件）が含まれていません',
      fix: 'タップでカウンターを増やし、そのカウンターで成功判定するルールを追加してください'
    });
  }

  /**
   * successとfailureアクションの存在チェック
   */
  private checkSuccessFailureExists(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const hasSuccess = output.script.rules.some(r =>
      r.actions?.some(a => a.type === 'success')
    );
    const hasFailure = output.script.rules.some(r =>
      r.actions?.some(a => a.type === 'failure')
    );

    if (!hasSuccess) {
      errors.push({
        type: 'critical',
        code: 'NO_SUCCESS',
        message: 'successアクションが存在しません',
        fix: '成功条件を満たした時にsuccessアクションを発動するルールを追加してください'
      });
    }

    if (!hasFailure) {
      errors.push({
        type: 'warning',
        code: 'NO_FAILURE',
        message: 'failureアクションが存在しません（時間切れのみで失敗となります）',
        fix: '明示的な失敗条件とfailureアクションを追加することを推奨します'
      });
    }
  }

  /**
   * エラーをフィードバック文字列に変換
   */
  formatFeedback(result: LogicValidationResult): string {
    if (result.valid) return '';

    const criticalErrors = result.errors.filter(e => e.type === 'critical');
    const feedback = criticalErrors.map(e => `- ${e.message}${e.fix ? ` (修正方法: ${e.fix})` : ''}`);

    return feedback.join('\n');
  }
}
