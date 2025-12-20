/**
 * Step 4: LogicValidator
 *
 * 100%成功が前提。エディター仕様との完全整合性を検証
 * 全てのパラメータを同等にチェック
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

// ==========================================
// エディター仕様定義（動作確認済みのみ）
// ==========================================

// 使用可能な条件タイプ
const VALID_CONDITIONS: VerifiedConditionType[] = [
  'touch', 'time', 'counter', 'collision', 'flag', 'gameState',
  'position', 'animation', 'random'
];

// 使用可能なアクションタイプ
const VALID_ACTIONS: VerifiedActionType[] = [
  'success', 'failure', 'hide', 'show', 'move', 'counter', 'addScore', 'effect', 'setFlag', 'toggleFlag',
  'playSound', 'switchAnimation', 'applyForce', 'applyImpulse', 'randomAction'
];

// 各パラメータの有効値
const VALID_TOUCH_TYPES = ['down', 'up', 'hold', 'drag', 'swipe', 'flick'];
const VALID_TOUCH_TARGETS = ['self', 'stage']; // + objectId
const VALID_TIME_TYPES = ['exact', 'range', 'interval'];
const VALID_COMPARISONS = ['equals', 'greaterOrEqual', 'greater', 'less', 'lessOrEqual'];
const VALID_COLLISION_TYPES = ['enter', 'stay', 'exit'];
const VALID_CHECK_MODES = ['hitbox', 'pixel'];
const VALID_COUNTER_OPERATIONS = ['increment', 'decrement', 'set', 'add', 'subtract'];
const VALID_MOVEMENT_TYPES = ['straight', 'teleport', 'wander', 'stop'];
const VALID_EFFECT_TYPES = ['flash', 'shake', 'scale', 'rotate', 'particles'];
// 新規追加
const VALID_POSITION_AREAS = ['inside', 'outside'];  // 'crossing' は未対応
const VALID_ANIMATION_CONDITIONS = ['playing', 'stopped', 'frame', 'frameRange', 'loop'];  // 'start','end' は未実装
const VALID_RANDOM_SELECTION_MODES = ['uniform', 'probability', 'weighted'];

// 速度の推奨範囲
const SPEED_MIN = 0.5;
const SPEED_MAX = 15.0;

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

    // 6. 使用可能な条件・アクションタイプのチェック
    this.checkValidFeatures(output, errors);

    // 7. 条件パラメータの妥当性チェック
    this.checkConditionParameters(output, errors);

    // 8. アクションパラメータの妥当性チェック
    this.checkActionParameters(output, errors);

    // 9. 成功パスにプレイヤー操作が必要
    this.checkPlayerActionOnSuccessPath(output, errors);

    // 10. successとfailureアクションの存在チェック
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
      if (!rule.triggers?.conditions || rule.triggers.conditions.length === 0) {
        errors.push({
          type: 'critical',
          code: 'INSTANT_WIN',
          message: `ルール "${rule.id}" は条件なしでsuccessが発動します`,
          fix: `適切な条件を追加してください`
        });
        continue;
      }

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
      if (!rule.triggers?.conditions || rule.triggers.conditions.length === 0) {
        errors.push({
          type: 'critical',
          code: 'INSTANT_LOSE',
          message: `ルール "${rule.id}" は条件なしでfailureが発動します`,
          fix: `適切な条件を追加してください`
        });
        continue;
      }

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
   * 使用可能な条件・アクションタイプのチェック
   */
  private checkValidFeatures(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    for (const rule of output.script.rules) {
      for (const condition of rule.triggers?.conditions || []) {
        if (!VALID_CONDITIONS.includes(condition.type as VerifiedConditionType)) {
          errors.push({
            type: 'critical',
            code: 'INVALID_CONDITION_TYPE',
            message: `ルール "${rule.id}": 使用できない条件タイプ "${condition.type}"`,
            fix: `使用可能: ${VALID_CONDITIONS.join(', ')}`
          });
        }
      }

      for (const action of rule.actions || []) {
        if (!VALID_ACTIONS.includes(action.type as VerifiedActionType)) {
          errors.push({
            type: 'critical',
            code: 'INVALID_ACTION_TYPE',
            message: `ルール "${rule.id}": 使用できないアクションタイプ "${action.type}"`,
            fix: `使用可能: ${VALID_ACTIONS.join(', ')}`
          });
        }
      }
    }
  }

  /**
   * 条件パラメータの妥当性チェック
   */
  private checkConditionParameters(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const definedObjectIds = new Set(output.assetPlan.objects.map(o => o.id));

    for (const rule of output.script.rules) {
      for (const condition of rule.triggers?.conditions || []) {
        const ruleId = rule.id;

        switch (condition.type) {
          case 'touch':
            // touchTypeチェック
            if (condition.touchType && !VALID_TOUCH_TYPES.includes(condition.touchType)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_TOUCH_TYPE',
                message: `ルール "${ruleId}": 無効なtouchType "${condition.touchType}"`,
                fix: `有効な値: ${VALID_TOUCH_TYPES.join(', ')}`
              });
            }
            // targetチェック
            if (condition.target) {
              const isValidTarget = VALID_TOUCH_TARGETS.includes(condition.target) ||
                                    definedObjectIds.has(condition.target);
              if (!isValidTarget) {
                errors.push({
                  type: 'critical',
                  code: 'INVALID_TOUCH_TARGET',
                  message: `ルール "${ruleId}": 無効なtouch target "${condition.target}"`,
                  fix: `'self', 'stage', または定義済みのobjectIdを使用してください`
                });
              }
            }
            break;

          case 'time':
            // timeTypeチェック
            if (condition.timeType && !VALID_TIME_TYPES.includes(condition.timeType)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_TIME_TYPE',
                message: `ルール "${ruleId}": 無効なtimeType "${condition.timeType}"`,
                fix: `有効な値: ${VALID_TIME_TYPES.join(', ')}`
              });
            }
            // secondsチェック
            if (condition.seconds !== undefined && (condition.seconds < 0 || condition.seconds > 60)) {
              errors.push({
                type: 'warning',
                code: 'INVALID_TIME_SECONDS',
                message: `ルール "${ruleId}": seconds(${condition.seconds})が異常な値`,
                fix: `0〜60の範囲を推奨`
              });
            }
            // intervalチェック
            if (condition.interval !== undefined && (condition.interval <= 0 || condition.interval > 10)) {
              errors.push({
                type: 'warning',
                code: 'INVALID_TIME_INTERVAL',
                message: `ルール "${ruleId}": interval(${condition.interval})が異常な値`,
                fix: `0より大きく10以下を推奨`
              });
            }
            break;

          case 'counter':
            // comparisonチェック
            if (condition.comparison && !VALID_COMPARISONS.includes(condition.comparison)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_COMPARISON',
                message: `ルール "${ruleId}": 無効なcomparison "${condition.comparison}"`,
                fix: `有効な値: ${VALID_COMPARISONS.join(', ')}`
              });
            }
            // valueチェック
            if (condition.value === undefined) {
              errors.push({
                type: 'critical',
                code: 'MISSING_COUNTER_VALUE',
                message: `ルール "${ruleId}": counter条件にvalueがありません`,
                fix: `比較対象の数値を指定してください`
              });
            }
            break;

          case 'collision':
            // collisionTypeチェック
            if (condition.collisionType && !VALID_COLLISION_TYPES.includes(condition.collisionType)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_COLLISION_TYPE',
                message: `ルール "${ruleId}": 無効なcollisionType "${condition.collisionType}"`,
                fix: `有効な値: ${VALID_COLLISION_TYPES.join(', ')}`
              });
            }
            // checkModeチェック
            if (condition.checkMode && !VALID_CHECK_MODES.includes(condition.checkMode)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_CHECK_MODE',
                message: `ルール "${ruleId}": 無効なcheckMode "${condition.checkMode}"`,
                fix: `有効な値: ${VALID_CHECK_MODES.join(', ')}`
              });
            }
            // targetチェック（objectId）
            if (condition.target && !definedObjectIds.has(condition.target) &&
                condition.target !== 'stageArea' && condition.target !== 'other') {
              errors.push({
                type: 'critical',
                code: 'INVALID_COLLISION_TARGET',
                message: `ルール "${ruleId}": collision target "${condition.target}" が未定義`,
                fix: `定義済みのobjectIdを使用してください`
              });
            }
            break;

          case 'flag':
            // flagIdチェック（空でないか）
            if (!condition.flagId || condition.flagId.trim() === '') {
              errors.push({
                type: 'critical',
                code: 'MISSING_FLAG_ID',
                message: `ルール "${ruleId}": flag条件にflagIdがありません`,
                fix: `フラグIDを指定してください`
              });
            }
            break;

          case 'position':
            // areaチェック（inside/outsideのみ対応）
            if (condition.area && !VALID_POSITION_AREAS.includes(condition.area)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_POSITION_AREA',
                message: `ルール "${ruleId}": 無効なposition area "${condition.area}"`,
                fix: `有効な値: ${VALID_POSITION_AREAS.join(', ')} ('crossing'は未対応)`
              });
            }
            // targetチェック
            if (condition.target && !definedObjectIds.has(condition.target)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_POSITION_TARGET',
                message: `ルール "${ruleId}": position target "${condition.target}" が未定義`,
                fix: `定義済みのobjectIdを使用してください`
              });
            }
            // regionチェック（座標範囲）
            if (condition.region) {
              const { x, y, width, height } = condition.region;
              if (x !== undefined && (x < 0 || x > 1)) {
                errors.push({
                  type: 'warning',
                  code: 'INVALID_REGION_X',
                  message: `ルール "${ruleId}": region.x(${x})が0-1の範囲外`,
                  fix: `正規化座標(0.0-1.0)を使用してください`
                });
              }
              if (y !== undefined && (y < 0 || y > 1)) {
                errors.push({
                  type: 'warning',
                  code: 'INVALID_REGION_Y',
                  message: `ルール "${ruleId}": region.y(${y})が0-1の範囲外`,
                  fix: `正規化座標(0.0-1.0)を使用してください`
                });
              }
            }
            break;

          case 'animation':
            // conditionチェック（動作確認済みのもののみ）
            if (condition.condition && !VALID_ANIMATION_CONDITIONS.includes(condition.condition)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_ANIMATION_CONDITION',
                message: `ルール "${ruleId}": 無効なanimation condition "${condition.condition}"`,
                fix: `有効な値: ${VALID_ANIMATION_CONDITIONS.join(', ')} ('start','end'は未実装)`
              });
            }
            // targetチェック
            if (condition.target && !definedObjectIds.has(condition.target)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_ANIMATION_TARGET',
                message: `ルール "${ruleId}": animation target "${condition.target}" が未定義`,
                fix: `定義済みのobjectIdを使用してください`
              });
            }
            // frame条件の場合frameNumberが必要
            if (condition.condition === 'frame' && condition.frameNumber === undefined) {
              errors.push({
                type: 'critical',
                code: 'MISSING_FRAME_NUMBER',
                message: `ルール "${ruleId}": animation frame条件にframeNumberがありません`,
                fix: `チェックするフレーム番号を指定してください`
              });
            }
            // frameRange条件の場合frameRangeが必要
            if (condition.condition === 'frameRange' && (!condition.frameRange || condition.frameRange.length !== 2)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_FRAME_RANGE',
                message: `ルール "${ruleId}": animation frameRange条件にframeRangeがありません`,
                fix: `[開始フレーム, 終了フレーム]の形式で指定してください`
              });
            }
            // loop条件の場合loopCountが必要
            if (condition.condition === 'loop' && condition.loopCount === undefined) {
              errors.push({
                type: 'critical',
                code: 'MISSING_LOOP_COUNT',
                message: `ルール "${ruleId}": animation loop条件にloopCountがありません`,
                fix: `ループ回数を指定してください`
              });
            }
            break;

          case 'random':
            // probabilityチェック（0-1の範囲）
            if (condition.probability === undefined) {
              errors.push({
                type: 'critical',
                code: 'MISSING_PROBABILITY',
                message: `ルール "${ruleId}": random条件にprobabilityがありません`,
                fix: `0.0-1.0の確率値を指定してください`
              });
            } else if (condition.probability < 0 || condition.probability > 1) {
              errors.push({
                type: 'critical',
                code: 'INVALID_PROBABILITY',
                message: `ルール "${ruleId}": probability(${condition.probability})が0-1の範囲外`,
                fix: `0.0-1.0の範囲で指定してください`
              });
            }
            // intervalチェック（正の値）
            if (condition.interval !== undefined && condition.interval < 0) {
              errors.push({
                type: 'warning',
                code: 'INVALID_RANDOM_INTERVAL',
                message: `ルール "${ruleId}": random interval(${condition.interval})が負の値`,
                fix: `0以上のミリ秒値を指定してください`
              });
            }
            break;
        }
      }
    }
  }

  /**
   * アクションパラメータの妥当性チェック
   */
  private checkActionParameters(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const definedObjectIds = new Set(output.assetPlan.objects.map(o => o.id));

    for (const rule of output.script.rules) {
      for (const action of rule.actions || []) {
        const ruleId = rule.id;

        switch (action.type) {
          case 'counter':
            // operationチェック
            if (action.operation && !VALID_COUNTER_OPERATIONS.includes(action.operation)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_COUNTER_OPERATION',
                message: `ルール "${ruleId}": 無効なoperation "${action.operation}"`,
                fix: `有効な値: ${VALID_COUNTER_OPERATIONS.join(', ')}`
              });
            }
            // valueチェック（add/subtract/setの場合）
            if (['add', 'subtract', 'set'].includes(action.operation || '') && action.value === undefined) {
              errors.push({
                type: 'warning',
                code: 'MISSING_COUNTER_VALUE',
                message: `ルール "${ruleId}": counterアクション(${action.operation})にvalueがありません`,
                fix: `操作する値を指定してください（デフォルト: 1）`
              });
            }
            break;

          case 'move':
            if (action.movement) {
              // movement.typeチェック
              if (action.movement.type && !VALID_MOVEMENT_TYPES.includes(action.movement.type)) {
                errors.push({
                  type: 'critical',
                  code: 'INVALID_MOVEMENT_TYPE',
                  message: `ルール "${ruleId}": 無効なmovement.type "${action.movement.type}"`,
                  fix: `有効な値: ${VALID_MOVEMENT_TYPES.join(', ')}`
                });
              }
              // speedチェック
              if (action.movement.speed !== undefined) {
                if (action.movement.speed <= 0) {
                  errors.push({
                    type: 'critical',
                    code: 'INVALID_SPEED',
                    message: `ルール "${ruleId}": speed(${action.movement.speed})は正の値である必要があります`,
                    fix: `${SPEED_MIN}〜${SPEED_MAX}の範囲を推奨`
                  });
                } else if (action.movement.speed < SPEED_MIN || action.movement.speed > SPEED_MAX) {
                  errors.push({
                    type: 'warning',
                    code: 'UNUSUAL_SPEED',
                    message: `ルール "${ruleId}": speed(${action.movement.speed})が推奨範囲外`,
                    fix: `${SPEED_MIN}〜${SPEED_MAX}の範囲を推奨`
                  });
                }
              }
              // targetの座標チェック
              if (action.movement.target && typeof action.movement.target === 'object') {
                const target = action.movement.target as { x: number; y: number };
                if (target.x < 0 || target.x > 1 || target.y < 0 || target.y > 1) {
                  errors.push({
                    type: 'critical',
                    code: 'INVALID_MOVE_TARGET',
                    message: `ルール "${ruleId}": movement.target座標(${target.x}, ${target.y})が0.0〜1.0の範囲外`,
                    fix: `座標を0.0〜1.0の範囲に修正してください`
                  });
                }
              }
            }
            break;

          case 'effect':
            if (action.effect) {
              // effect.typeチェック
              if (action.effect.type && !VALID_EFFECT_TYPES.includes(action.effect.type)) {
                errors.push({
                  type: 'critical',
                  code: 'INVALID_EFFECT_TYPE',
                  message: `ルール "${ruleId}": 無効なeffect.type "${action.effect.type}"`,
                  fix: `有効な値: ${VALID_EFFECT_TYPES.join(', ')}`
                });
              }
              // durationチェック
              if (action.effect.duration !== undefined) {
                if (action.effect.duration <= 0) {
                  errors.push({
                    type: 'critical',
                    code: 'INVALID_EFFECT_DURATION',
                    message: `ルール "${ruleId}": effect.duration(${action.effect.duration})は正の値である必要があります`,
                    fix: `0より大きい値を指定してください`
                  });
                } else if (action.effect.duration > 5) {
                  errors.push({
                    type: 'warning',
                    code: 'LONG_EFFECT_DURATION',
                    message: `ルール "${ruleId}": effect.duration(${action.effect.duration})が長すぎる可能性があります`,
                    fix: `5秒以下を推奨`
                  });
                }
              }
              // scaleAmountチェック
              if (action.effect.scaleAmount !== undefined) {
                if (action.effect.scaleAmount <= 0) {
                  errors.push({
                    type: 'critical',
                    code: 'INVALID_SCALE_AMOUNT',
                    message: `ルール "${ruleId}": scaleAmount(${action.effect.scaleAmount})は正の値である必要があります`,
                    fix: `0より大きい値を指定してください`
                  });
                } else if (action.effect.scaleAmount > 5) {
                  errors.push({
                    type: 'warning',
                    code: 'LARGE_SCALE_AMOUNT',
                    message: `ルール "${ruleId}": scaleAmount(${action.effect.scaleAmount})が大きすぎる可能性があります`,
                    fix: `0.5〜3.0の範囲を推奨`
                  });
                }
              }
            }
            break;

          case 'addScore':
            // pointsチェック
            if (action.points === undefined) {
              errors.push({
                type: 'warning',
                code: 'MISSING_POINTS',
                message: `ルール "${ruleId}": addScoreにpointsがありません`,
                fix: `追加するポイント数を指定してください`
              });
            } else if (action.points < 0) {
              errors.push({
                type: 'warning',
                code: 'NEGATIVE_POINTS',
                message: `ルール "${ruleId}": points(${action.points})が負の値`,
                fix: `通常は正の値を使用します`
              });
            }
            break;

          case 'hide':
          case 'show':
            // targetIdが必須
            if (!action.targetId) {
              errors.push({
                type: 'critical',
                code: 'MISSING_TARGET_ID',
                message: `ルール "${ruleId}": ${action.type}アクションにtargetIdがありません`,
                fix: `対象のobjectIdを指定してください`
              });
            }
            break;

          case 'setFlag':
          case 'toggleFlag':
            // flagIdチェック
            if (!action.flagId || action.flagId.trim() === '') {
              errors.push({
                type: 'critical',
                code: 'MISSING_FLAG_ID',
                message: `ルール "${ruleId}": ${action.type}アクションにflagIdがありません`,
                fix: `フラグIDを指定してください`
              });
            }
            break;

          case 'playSound':
            // soundIdチェック
            if (!action.soundId || action.soundId.trim() === '') {
              errors.push({
                type: 'critical',
                code: 'MISSING_SOUND_ID',
                message: `ルール "${ruleId}": playSoundアクションにsoundIdがありません`,
                fix: `再生する音声のIDを指定してください`
              });
            }
            // volumeチェック
            if (action.volume !== undefined && (action.volume < 0 || action.volume > 1)) {
              errors.push({
                type: 'warning',
                code: 'INVALID_VOLUME',
                message: `ルール "${ruleId}": volume(${action.volume})が0-1の範囲外`,
                fix: `0.0-1.0の範囲で指定してください`
              });
            }
            break;

          case 'switchAnimation':
            // targetIdチェック
            if (!action.targetId) {
              errors.push({
                type: 'critical',
                code: 'MISSING_TARGET_ID',
                message: `ルール "${ruleId}": switchAnimationアクションにtargetIdがありません`,
                fix: `対象のobjectIdを指定してください`
              });
            } else if (!definedObjectIds.has(action.targetId)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_TARGET_ID',
                message: `ルール "${ruleId}": switchAnimation target "${action.targetId}" が未定義`,
                fix: `定義済みのobjectIdを使用してください`
              });
            }
            // animationIndexチェック
            if (action.animationIndex === undefined) {
              errors.push({
                type: 'critical',
                code: 'MISSING_ANIMATION_INDEX',
                message: `ルール "${ruleId}": switchAnimationにanimationIndexがありません`,
                fix: `切り替え先のアニメーションインデックスを指定してください`
              });
            } else if (action.animationIndex < 0) {
              errors.push({
                type: 'critical',
                code: 'INVALID_ANIMATION_INDEX',
                message: `ルール "${ruleId}": animationIndex(${action.animationIndex})が負の値`,
                fix: `0以上の値を指定してください`
              });
            }
            break;

          case 'applyForce':
            // targetIdチェック
            if (!action.targetId) {
              errors.push({
                type: 'critical',
                code: 'MISSING_TARGET_ID',
                message: `ルール "${ruleId}": applyForceアクションにtargetIdがありません`,
                fix: `対象のobjectIdを指定してください`
              });
            }
            // forceチェック
            if (!action.force) {
              errors.push({
                type: 'critical',
                code: 'MISSING_FORCE',
                message: `ルール "${ruleId}": applyForceにforceがありません`,
                fix: `{x: number, y: number}形式で力を指定してください`
              });
            } else {
              if (action.force.x === undefined || action.force.y === undefined) {
                errors.push({
                  type: 'critical',
                  code: 'INVALID_FORCE',
                  message: `ルール "${ruleId}": force.xまたはforce.yがありません`,
                  fix: `{x: number, y: number}形式で力を指定してください`
                });
              }
            }
            break;

          case 'applyImpulse':
            // targetIdチェック
            if (!action.targetId) {
              errors.push({
                type: 'critical',
                code: 'MISSING_TARGET_ID',
                message: `ルール "${ruleId}": applyImpulseアクションにtargetIdがありません`,
                fix: `対象のobjectIdを指定してください`
              });
            }
            // impulseチェック
            if (!action.impulse) {
              errors.push({
                type: 'critical',
                code: 'MISSING_IMPULSE',
                message: `ルール "${ruleId}": applyImpulseにimpulseがありません`,
                fix: `{x: number, y: number}形式で衝撃を指定してください`
              });
            } else {
              if (action.impulse.x === undefined || action.impulse.y === undefined) {
                errors.push({
                  type: 'critical',
                  code: 'INVALID_IMPULSE',
                  message: `ルール "${ruleId}": impulse.xまたはimpulse.yがありません`,
                  fix: `{x: number, y: number}形式で衝撃を指定してください`
                });
              }
            }
            break;

          case 'randomAction':
            // actionsチェック
            if (!action.actions || action.actions.length === 0) {
              errors.push({
                type: 'critical',
                code: 'MISSING_ACTIONS',
                message: `ルール "${ruleId}": randomActionにactionsがありません`,
                fix: `選択肢となるアクションの配列を指定してください`
              });
            }
            // selectionModeチェック
            if (action.selectionMode && !VALID_RANDOM_SELECTION_MODES.includes(action.selectionMode)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_SELECTION_MODE',
                message: `ルール "${ruleId}": 無効なselectionMode "${action.selectionMode}"`,
                fix: `有効な値: ${VALID_RANDOM_SELECTION_MODES.join(', ')}`
              });
            }
            break;
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

    let hasDirectTouchSuccess = successRules.some(r =>
      r.triggers?.conditions?.some(c => c.type === 'touch')
    );

    if (hasDirectTouchSuccess) return;

    for (const successRule of successRules) {
      const counterCondition = successRule.triggers?.conditions?.find(c => c.type === 'counter');
      if (counterCondition?.counterName) {
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
