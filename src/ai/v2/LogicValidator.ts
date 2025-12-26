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

// 使用可能な条件タイプ（すべて使用可能）
const VALID_CONDITIONS: VerifiedConditionType[] = [
  'touch', 'time', 'counter', 'collision', 'flag', 'gameState',
  'position', 'animation', 'random', 'objectState'
];

// 使用可能なアクションタイプ（すべて使用可能）
const VALID_ACTIONS: VerifiedActionType[] = [
  'success', 'failure', 'hide', 'show', 'move', 'counter', 'addScore', 'effect', 'setFlag', 'toggleFlag',
  'playSound', 'stopSound', 'playBGM', 'stopBGM', 'switchAnimation', 'playAnimation', 'setAnimationSpeed',
  'setAnimationFrame', 'followDrag', 'applyForce', 'applyImpulse',
  'randomAction', 'pause', 'restart'
  // 使用禁止: showMessage, setGravity, setPhysics
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
const VALID_POSITION_AREAS = ['inside', 'outside', 'crossing'];
const VALID_ANIMATION_CONDITIONS = ['playing', 'stopped', 'frame', 'frameRange', 'loop', 'start', 'end'];
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

    // 3.5 自動成功チェック（プレイヤー操作なしで成功してしまう）
    this.checkAutoSuccess(output, errors);

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

    // 11. ルールコンフリクト検出
    this.checkRuleConflicts(output, errors);

    // 12. カウンター使用状況チェック（未使用カウンター検出）
    this.checkExcessiveCounters(output, errors);

    // 14. 成功条件到達可能性チェック
    this.checkSuccessPathReachability(output, errors);

    // 13. サウンド/BGM整合性チェック
    this.checkSoundAndBgm(output, errors);

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
   * 自動成功/失敗チェック（プレイヤー操作の意味がない状態を検出）
   *
   * ★修正: 失敗条件の有無を確認して判定を分岐
   * - OK: time成功 + touch失敗（落とさなければ成功パターン）
   * - NG: time成功 + 失敗条件なし（絶対クリア）
   * - NG: time失敗 + 成功にプレイヤー操作なし（自動失敗）
   */
  private checkAutoSuccess(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const successRules = output.script.rules.filter(r =>
      r.actions?.some(a => a.type === 'success')
    );
    const failureRules = output.script.rules.filter(r =>
      r.actions?.some(a => a.type === 'failure')
    );

    // プレイヤー操作を必要とする条件タイプ
    const playerActionTypes = ['touch', 'collision', 'position'];

    // 失敗条件にプレイヤー操作が含まれているか
    const hasPlayerActionInFailure = failureRules.some(rule => {
      const conditions = rule.triggers?.conditions || [];
      return conditions.some(c => playerActionTypes.includes(c.type));
    });

    // 成功条件にプレイヤー操作が含まれているか
    const hasPlayerActionInSuccess = successRules.some(rule => {
      const conditions = rule.triggers?.conditions || [];
      return conditions.some(c => playerActionTypes.includes(c.type));
    });

    for (const rule of successRules) {
      const conditions = rule.triggers?.conditions || [];

      // time/gameState条件のみで成功する場合
      const hasOnlyAutoCondition = conditions.length > 0 &&
        conditions.every(c => c.type === 'time' || c.type === 'gameState' || c.type === 'counter' || c.type === 'flag');

      if (hasOnlyAutoCondition) {
        // ★修正: 失敗条件にプレイヤー操作がある場合は許容（落とさなければ成功パターン）
        if (hasPlayerActionInFailure) {
          // OK: プレイヤー操作で失敗できる = ゲームとして成立
          continue;
        }

        // 失敗条件がない、または失敗条件もプレイヤー操作がない = 絶対クリア
        errors.push({
          type: 'critical',
          code: 'AUTO_SUCCESS',
          message: `自動成功: ルール "${rule.id}" はプレイヤー操作なしで成功し、失敗条件もありません`,
          fix: `プレイヤー操作による失敗条件を追加するか、成功条件にプレイヤー操作を追加してください`
        });
      }
    }

    // 自動失敗チェック（time条件のみで失敗 + 成功にプレイヤー操作がない）
    for (const rule of failureRules) {
      const conditions = rule.triggers?.conditions || [];

      // time条件のみで失敗する場合
      const hasOnlyTimeFailure = conditions.length > 0 &&
        conditions.every(c => c.type === 'time');

      if (hasOnlyTimeFailure && !hasPlayerActionInSuccess) {
        errors.push({
          type: 'critical',
          code: 'AUTO_FAILURE',
          message: `自動失敗: ルール "${rule.id}" は時間経過で失敗し、成功にプレイヤー操作がありません`,
          fix: `成功条件にプレイヤー操作（touch, collision, position）を追加してください`
        });
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
            // areaチェック
            if (condition.area && !VALID_POSITION_AREAS.includes(condition.area)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_POSITION_AREA',
                message: `ルール "${ruleId}": 無効なposition area "${condition.area}"`,
                fix: `有効な値: ${VALID_POSITION_AREAS.join(', ')}`
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
            // conditionチェック
            if (condition.condition && !VALID_ANIMATION_CONDITIONS.includes(condition.condition)) {
              errors.push({
                type: 'critical',
                code: 'INVALID_ANIMATION_CONDITION',
                message: `ルール "${ruleId}": 無効なanimation condition "${condition.condition}"`,
                fix: `有効な値: ${VALID_ANIMATION_CONDITIONS.join(', ')}`
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
   *
   * プレイヤー操作とみなす条件/アクション:
   * - touch条件: タッチ操作
   * - collision条件: オブジェクト衝突（ドラッグ中のオブジェクトを含む）
   * - position条件: 位置条件（ドラッグ移動後の位置判定に使用される）
   * - followDragアクション: ドラッグ追従
   */
  private checkPlayerActionOnSuccessPath(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const successRules = output.script.rules.filter(r =>
      r.actions?.some(a => a.type === 'success')
    );

    // プレイヤー操作に関連する条件タイプ
    const playerActionConditionTypes = ['touch', 'collision', 'position'];

    // followDragを持つルールが存在する場合、それに関連するオブジェクトの
    // collision/positionは自動的にプレイヤー操作とみなす
    const hasDraggableObject = output.script.rules.some(r =>
      r.actions?.some(a => a.type === 'followDrag')
    );

    // 直接プレイヤー操作条件を持つ成功ルール
    let hasDirectPlayerAction = successRules.some(r =>
      r.triggers?.conditions?.some(c => playerActionConditionTypes.includes(c.type))
    );

    if (hasDirectPlayerAction) return;

    // followDragがある場合、collision/positionベースの成功はプレイヤー操作とみなす
    if (hasDraggableObject) {
      const hasCollisionOrPositionSuccess = successRules.some(r =>
        r.triggers?.conditions?.some(c => c.type === 'collision' || c.type === 'position')
      );
      if (hasCollisionOrPositionSuccess) return;
    }

    for (const successRule of successRules) {
      const counterCondition = successRule.triggers?.conditions?.find(c => c.type === 'counter');
      if (counterCondition?.counterName) {
        const counterModifyingRules = output.script.rules.filter(r =>
          r.actions?.some(a => a.type === 'counter' && a.counterName === counterCondition.counterName)
        );

        // カウンター操作にプレイヤー操作条件があるか
        const hasPlayerActionOnPath = counterModifyingRules.some(r =>
          r.triggers?.conditions?.some(c => playerActionConditionTypes.includes(c.type))
        );

        if (hasPlayerActionOnPath) return;

        // followDragがある場合、collision/positionベースのカウンター操作はプレイヤー操作とみなす
        if (hasDraggableObject) {
          const hasCollisionOrPositionOnPath = counterModifyingRules.some(r =>
            r.triggers?.conditions?.some(c => c.type === 'collision' || c.type === 'position')
          );
          if (hasCollisionOrPositionOnPath) return;
        }
      }
    }

    errors.push({
      type: 'warning',
      code: 'NO_PLAYER_ACTION',
      message: '成功へのパスにプレイヤー操作（touch/collision/position条件）が含まれていない可能性があります',
      fix: 'ゲームコンセプトの操作方法に合わせてルールを確認してください'
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
   * ルールコンフリクト検出
   * - 同一オブジェクトに対してshow + hide
   * - 同一条件でsuccess + failure
   * - 同一カウンターに対してincrement + decrement
   */
  private checkRuleConflicts(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    // 条件のシグネチャを生成（同一条件の検出用）
    // ★修正: ruleを引数に追加し、target="self"の場合はtargetObjectIdを使用
    const getConditionSignature = (rule: GameRule): string => {
      const conditions = rule.triggers?.conditions;
      if (!conditions || conditions.length === 0) return '';
      return conditions
        .map(c => {
          const parts: string[] = [c.type];

          // ★修正: "self"の場合はrule.targetObjectIdを使用
          if (c.target) {
            const effectiveTarget = (c.target === 'self')
              ? (rule.targetObjectId || 'self')
              : c.target;
            parts.push(`target:${effectiveTarget}`);
          } else if (c.type === 'touch' || c.type === 'collision' || c.type === 'position' || c.type === 'animation') {
            // targetがない場合もtargetObjectIdをデフォルトとして使用
            parts.push(`target:${rule.targetObjectId || 'unknown'}`);
          }

          if (c.counterName) parts.push(`counter:${c.counterName}`);
          if (c.touchType) parts.push(`touch:${c.touchType}`);
          // ★追加: swipeDirectionを含めてスワイプ方向を区別
          if (c.swipeDirection) parts.push(`swipeDir:${c.swipeDirection}`);
          if (c.timeType) parts.push(`time:${c.timeType}`);
          if (c.seconds !== undefined) parts.push(`sec:${c.seconds}`);
          // collisionType を含めることで enter/exit/stay を区別
          if (c.collisionType) parts.push(`collisionType:${c.collisionType}`);
          // ★追加: flagIdを含める
          if (c.flagId) parts.push(`flag:${c.flagId}`);
          // ★追加: regionを含める（positionの場合）
          if (c.region) parts.push(`region:${c.region.x?.toFixed(2)},${c.region.y?.toFixed(2)}`);
          // ★追加: frameNumberを含める（animationの場合）
          if (c.frameNumber !== undefined) parts.push(`frame:${c.frameNumber}`);

          return parts.join('_');
        })
        .sort()
        .join('|');
    };

    // 1. success + failure コンフリクト検出
    const successRules = output.script.rules.filter(r =>
      r.actions?.some(a => a.type === 'success')
    );
    const failureRules = output.script.rules.filter(r =>
      r.actions?.some(a => a.type === 'failure')
    );

    for (const successRule of successRules) {
      const successSig = getConditionSignature(successRule);
      for (const failureRule of failureRules) {
        const failureSig = getConditionSignature(failureRule);
        if (successSig && failureSig && successSig === failureSig) {
          errors.push({
            type: 'critical',
            code: 'SUCCESS_FAILURE_CONFLICT',
            message: `コンフリクト: ルール "${successRule.id}" と "${failureRule.id}" が同一条件で success/failure を発動`,
            fix: `条件を変更するか、どちらか一方を削除してください`
          });
        }
      }
    }

    // 2. show + hide コンフリクト検出（同一オブジェクト）
    const showActions: { ruleId: string; targetId: string; sig: string }[] = [];
    const hideActions: { ruleId: string; targetId: string; sig: string }[] = [];

    for (const rule of output.script.rules) {
      const sig = getConditionSignature(rule);
      for (const action of rule.actions || []) {
        if (action.type === 'show' && action.targetId) {
          showActions.push({ ruleId: rule.id, targetId: action.targetId, sig });
        }
        if (action.type === 'hide' && action.targetId) {
          hideActions.push({ ruleId: rule.id, targetId: action.targetId, sig });
        }
      }
    }

    for (const show of showActions) {
      for (const hide of hideActions) {
        if (show.targetId === hide.targetId && show.sig === hide.sig && show.sig !== '') {
          errors.push({
            type: 'critical',
            code: 'SHOW_HIDE_CONFLICT',
            message: `コンフリクト: オブジェクト "${show.targetId}" が同一条件で show/hide される（ルール: ${show.ruleId}, ${hide.ruleId}）`,
            fix: `条件を変更するか、どちらか一方を削除してください`
          });
        }
      }
    }

    // 3. カウンター increment + decrement コンフリクト検出
    const counterIncrements: { ruleId: string; counterName: string; sig: string }[] = [];
    const counterDecrements: { ruleId: string; counterName: string; sig: string }[] = [];

    for (const rule of output.script.rules) {
      const sig = getConditionSignature(rule);
      for (const action of rule.actions || []) {
        if (action.type === 'counter' && action.counterName) {
          if (action.operation === 'increment' || action.operation === 'add') {
            counterIncrements.push({ ruleId: rule.id, counterName: action.counterName, sig });
          }
          if (action.operation === 'decrement' || action.operation === 'subtract') {
            counterDecrements.push({ ruleId: rule.id, counterName: action.counterName, sig });
          }
        }
      }
    }

    for (const inc of counterIncrements) {
      for (const dec of counterDecrements) {
        if (inc.counterName === dec.counterName && inc.sig === dec.sig && inc.sig !== '') {
          errors.push({
            type: 'critical',
            code: 'COUNTER_CONFLICT',
            message: `コンフリクト: カウンター "${inc.counterName}" が同一条件で increment/decrement される（ルール: ${inc.ruleId}, ${dec.ruleId}）`,
            fix: `条件を変更するか、どちらか一方を削除してください`
          });
        }
      }
    }

    // 4. 同一ルール内でのコンフリクト検出
    for (const rule of output.script.rules) {
      const actions = rule.actions || [];
      const hasSuccess = actions.some(a => a.type === 'success');
      const hasFailure = actions.some(a => a.type === 'failure');
      if (hasSuccess && hasFailure) {
        errors.push({
          type: 'critical',
          code: 'SAME_RULE_SUCCESS_FAILURE',
          message: `コンフリクト: ルール "${rule.id}" が同時に success と failure を発動`,
          fix: `success と failure は別々のルールに分離してください`
        });
      }

      // 同一ルール内で同一オブジェクトにshow/hide
      const showTargets = actions.filter(a => a.type === 'show').map(a => a.targetId);
      const hideTargets = actions.filter(a => a.type === 'hide').map(a => a.targetId);
      for (const target of showTargets) {
        if (target && hideTargets.includes(target)) {
          errors.push({
            type: 'critical',
            code: 'SAME_RULE_SHOW_HIDE',
            message: `コンフリクト: ルール "${rule.id}" が同一オブジェクト "${target}" に show/hide を同時実行`,
            fix: `show と hide は別々のルールに分離してください`
          });
        }
      }
    }
  }

  /**
   * カウンター使用状況チェック（未使用カウンター検出）
   */
  private checkExcessiveCounters(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const definedCounters = output.script.counters.map(c => c.id);

    // 各カウンターの使用状況を追跡
    const counterUsage: Record<string, {
      modified: boolean;  // increment/decrement/add/subtract/set されているか
      checked: boolean;   // 条件でチェックされているか
      modifyingRules: string[];
      checkingRules: string[];
    }> = {};

    for (const counterId of definedCounters) {
      counterUsage[counterId] = {
        modified: false,
        checked: false,
        modifyingRules: [],
        checkingRules: []
      };
    }

    // ルールを走査してカウンター使用状況を収集
    for (const rule of output.script.rules) {
      // 条件でのカウンターチェック
      for (const condition of rule.triggers?.conditions || []) {
        if (condition.type === 'counter' && condition.counterName) {
          if (counterUsage[condition.counterName]) {
            counterUsage[condition.counterName].checked = true;
            counterUsage[condition.counterName].checkingRules.push(rule.id);
          }
        }
      }

      // アクションでのカウンター操作
      for (const action of rule.actions || []) {
        if (action.type === 'counter' && action.counterName) {
          if (counterUsage[action.counterName]) {
            counterUsage[action.counterName].modified = true;
            counterUsage[action.counterName].modifyingRules.push(rule.id);
          }
        }
      }
    }

    // 問題のあるカウンターを検出
    for (const [counterId, usage] of Object.entries(counterUsage)) {
      if (!usage.modified && !usage.checked) {
        // 完全に未使用
        errors.push({
          type: 'warning',
          code: 'UNUSED_COUNTER',
          message: `カウンター "${counterId}" は定義されていますが、どこでも使用されていません`,
          fix: `不要なカウンターを削除するか、ルールで使用してください`
        });
      } else if (usage.modified && !usage.checked) {
        // 操作されているがチェックされていない（無意味な操作）
        errors.push({
          type: 'warning',
          code: 'COUNTER_NEVER_CHECKED',
          message: `カウンター "${counterId}" は操作されていますが、条件でチェックされていません（操作ルール: ${usage.modifyingRules.join(', ')}）`,
          fix: `カウンターを成功/失敗条件で使用するか、削除してください`
        });
      } else if (!usage.modified && usage.checked) {
        // チェックされているが操作されていない（初期値のまま）
        const counter = output.script.counters.find(c => c.id === counterId);
        errors.push({
          type: 'critical',
          code: 'COUNTER_NEVER_MODIFIED',
          message: `カウンター "${counterId}" は条件でチェックされていますが、どのルールでも操作されていません（初期値: ${counter?.initialValue}）`,
          fix: `カウンターを操作するルールを追加してください`
        });
      }
    }
  }

  /**
   * 成功条件到達可能性チェック
   * - 成功条件に到達するためのルールが存在するか
   * - プレイヤー操作で到達可能か
   */
  private checkSuccessPathReachability(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const successRules = output.script.rules.filter(r =>
      r.actions?.some(a => a.type === 'success')
    );

    if (successRules.length === 0) {
      return; // checkSuccessFailureExists で既にチェック済み
    }

    // 成功ルールの条件タイプを分析
    for (const successRule of successRules) {
      const conditions = successRule.triggers?.conditions || [];

      // 条件が空の場合は別のチェックで検出される
      if (conditions.length === 0) continue;

      // 各条件タイプごとにチェック
      for (const condition of conditions) {
        // カウンター条件: 操作ルールが存在するか
        if (condition.type === 'counter' && condition.counterName) {
          const hasModifyingRule = output.script.rules.some(r =>
            r.actions?.some(a =>
              a.type === 'counter' &&
              a.counterName === condition.counterName
            )
          );

          if (!hasModifyingRule) {
            errors.push({
              type: 'critical',
              code: 'UNREACHABLE_SUCCESS',
              message: `成功条件到達不可: カウンター "${condition.counterName}" を操作するルールがありません`,
              fix: `カウンター "${condition.counterName}" を操作するルールを追加してください`
            });
          }
        }

        // objectState条件: 該当オブジェクトの状態を変更するルールがあるか
        if (condition.type === 'objectState' && condition.target) {
          const targetId = condition.target;
          const hasStateChangingRule = output.script.rules.some(r =>
            r.actions?.some(a =>
              (a.type === 'hide' || a.type === 'show') &&
              a.targetId === targetId
            )
          );

          if (!hasStateChangingRule) {
            errors.push({
              type: 'warning',
              code: 'SUCCESS_STATE_CHECK',
              message: `成功条件確認要: オブジェクト "${targetId}" の状態チェックがありますが、状態を変更するルールが見つかりません`,
              fix: `hide/showアクションを追加するか、条件を確認してください`
            });
          }
        }

        // flag条件: フラグを設定するルールがあるか
        if (condition.type === 'flag' && condition.flagId) {
          const hasSetFlagRule = output.script.rules.some(r =>
            r.actions?.some(a =>
              (a.type === 'setFlag' || a.type === 'toggleFlag') &&
              a.flagId === condition.flagId
            )
          );

          if (!hasSetFlagRule) {
            errors.push({
              type: 'critical',
              code: 'UNREACHABLE_SUCCESS',
              message: `成功条件到達不可: フラグ "${condition.flagId}" を設定するルールがありません`,
              fix: `setFlag/toggleFlagアクションを追加してください`
            });
          }
        }
      }

      // 全体的なプレイヤー操作パスチェック
      // 成功条件に到達するまでのどこかにプレイヤー操作があるか
      // プレイヤー操作: touch, collision, position (followDragと連携)
      const playerActionConditionTypes = ['touch', 'collision', 'position'];
      const hasDirectPlayerAction = conditions.some(c => playerActionConditionTypes.includes(c.type));

      // followDragを持つルールが存在する場合、collision/positionはプレイヤー操作とみなす
      const hasDraggableObject = output.script.rules.some(r =>
        r.actions?.some(a => a.type === 'followDrag')
      );

      if (!hasDirectPlayerAction) {
        // 間接的にでもプレイヤー操作が関係しているか確認
        // (カウンターやフラグを経由する場合)
        let hasIndirectPlayerAction = false;

        for (const condition of conditions) {
          if (condition.type === 'counter' && condition.counterName) {
            // このカウンターを操作するルールにプレイヤー操作があるか
            hasIndirectPlayerAction = output.script.rules.some(r => {
              const hasCounterAction = r.actions?.some(a =>
                a.type === 'counter' && a.counterName === condition.counterName
              );
              const hasPlayerActionCondition = r.triggers?.conditions?.some(c =>
                playerActionConditionTypes.includes(c.type)
              );
              // followDragがある場合、collision/positionもプレイヤー操作とみなす
              const hasCollisionOrPosition = hasDraggableObject && r.triggers?.conditions?.some(c =>
                c.type === 'collision' || c.type === 'position'
              );
              return hasCounterAction && (hasPlayerActionCondition || hasCollisionOrPosition);
            });
            if (hasIndirectPlayerAction) break;
          }

          if (condition.type === 'flag' && condition.flagId) {
            hasIndirectPlayerAction = output.script.rules.some(r => {
              const hasFlagAction = r.actions?.some(a =>
                (a.type === 'setFlag' || a.type === 'toggleFlag') && a.flagId === condition.flagId
              );
              const hasPlayerActionCondition = r.triggers?.conditions?.some(c =>
                playerActionConditionTypes.includes(c.type)
              );
              // followDragがある場合、collision/positionもプレイヤー操作とみなす
              const hasCollisionOrPosition = hasDraggableObject && r.triggers?.conditions?.some(c =>
                c.type === 'collision' || c.type === 'position'
              );
              return hasFlagAction && (hasPlayerActionCondition || hasCollisionOrPosition);
            });
            if (hasIndirectPlayerAction) break;
          }
        }

        if (!hasIndirectPlayerAction) {
          errors.push({
            type: 'warning',
            code: 'SUCCESS_NO_PLAYER_ACTION',
            message: `成功パス確認要: ルール "${successRule.id}" の成功条件がプレイヤー操作に依存していない可能性があります`,
            fix: `touch/collision/position条件を含むルールチェーンを確認してください`
          });
        }
      }
    }
  }

  /**
   * サウンド/BGM整合性チェック
   */
  private checkSoundAndBgm(output: LogicGeneratorOutput, errors: LogicValidationError[]): void {
    const sounds = output.assetPlan.sounds || [];
    const bgm = output.assetPlan.bgm;

    // 有効なサウンドタイプ
    const validSoundTypes = ['tap', 'success', 'failure', 'collect', 'pop', 'whoosh', 'bounce', 'ding', 'buzz', 'splash'];

    // 必須SEの確認
    const soundIds = sounds.map(s => s.id);
    const requiredSounds = ['se_tap', 'se_success', 'se_failure'];
    for (const required of requiredSounds) {
      if (!soundIds.includes(required)) {
        errors.push({
          type: 'warning',
          code: 'MISSING_REQUIRED_SOUND',
          message: `必須効果音 "${required}" がありません`,
          fix: `sounds配列に ${required} を追加してください`
        });
      }
    }

    // サウンドタイプの検証
    for (const sound of sounds) {
      if (!sound.id || typeof sound.id !== 'string') {
        errors.push({
          type: 'critical',
          code: 'INVALID_SOUND_ID',
          message: `無効なsound.id: ${sound.id}`,
          fix: `sound.idは文字列である必要があります`
        });
      }
      if (!sound.type || !validSoundTypes.includes(sound.type)) {
        errors.push({
          type: 'warning',
          code: 'INVALID_SOUND_TYPE',
          message: `無効なsound.type "${sound.type}" (id: ${sound.id})`,
          fix: `有効な値: ${validSoundTypes.join(', ')}`
        });
      }
    }

    // BGMの検証
    if (bgm) {
      const validBgmMoods = ['upbeat', 'calm', 'tense', 'happy', 'mysterious', 'energetic'];
      if (!bgm.id || typeof bgm.id !== 'string') {
        errors.push({
          type: 'warning',
          code: 'INVALID_BGM_ID',
          message: `無効なbgm.id: ${bgm.id}`,
          fix: `bgm.idは文字列である必要があります`
        });
      }
      if (!bgm.mood || !validBgmMoods.includes(bgm.mood)) {
        errors.push({
          type: 'warning',
          code: 'INVALID_BGM_MOOD',
          message: `無効なbgm.mood "${bgm.mood}"`,
          fix: `有効な値: ${validBgmMoods.join(', ')}`
        });
      }
    } else {
      errors.push({
        type: 'warning',
        code: 'MISSING_BGM',
        message: 'BGMが定義されていません',
        fix: 'assetPlanにbgmを追加してください'
      });
    }

    // playSoundアクションで参照されるsoundIdの整合性
    for (const rule of output.script.rules) {
      for (const action of rule.actions || []) {
        if (action.type === 'playSound' && action.soundId) {
          if (!soundIds.includes(action.soundId)) {
            errors.push({
              type: 'critical',
              code: 'UNDEFINED_SOUND_ID',
              message: `ルール "${rule.id}": soundId "${action.soundId}" がsoundsに定義されていません`,
              fix: `sounds配列に "${action.soundId}" を追加するか、正しいsoundIdに修正してください`
            });
          }
        }
      }
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
