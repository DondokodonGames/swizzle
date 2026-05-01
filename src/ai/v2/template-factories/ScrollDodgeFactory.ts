/**
 * ScrollDodgeFactory
 * 対象 mechanic: swipe
 * パターン: スワイプして障害物を避ける / アイテムを集める
 */

import { ScrollDodgeParams, FactoryOutput } from './types.js';

export function buildScrollDodge(params: ScrollDodgeParams): FactoryOutput {
  const {
    mode,
    duration,
    targetCount,
    playerDescription,
    obstacleDescription,
    backgroundDescription,
    successMessage,
    failureMessage,
  } = params;

  const isDodge = mode === 'dodge';

  const rules: unknown[] = [
    // プレイヤー：左スワイプで左移動
    {
      id: 'rule_swipe_left',
      name: '左スワイプ移動',
      targetObjectId: 'stage',
      priority: 10,
      triggers: {
        operator: 'AND',
        conditions: [
          { type: 'touch', target: 'stage', touchType: 'swipe', direction: 'left', minDistance: 30 },
        ],
      },
      actions: [
        { type: 'move', targetId: 'obj_player', movement: { type: 'straight', direction: 'left', speed: 400, duration: 0.25 } },
      ],
    },
    // プレイヤー：右スワイプで右移動
    {
      id: 'rule_swipe_right',
      name: '右スワイプ移動',
      targetObjectId: 'stage',
      priority: 10,
      triggers: {
        operator: 'AND',
        conditions: [
          { type: 'touch', target: 'stage', touchType: 'swipe', direction: 'right', minDistance: 30 },
        ],
      },
      actions: [
        { type: 'move', targetId: 'obj_player', movement: { type: 'straight', direction: 'right', speed: 400, duration: 0.25 } },
      ],
    },
    // 障害物/アイテムが上から流れてくる（定期リスポーン）
    {
      id: 'rule_spawn_obstacle',
      name: '障害物生成',
      targetObjectId: 'obj_obstacle',
      priority: 3,
      triggers: {
        operator: 'AND',
        conditions: [
          { type: 'time', timeType: 'interval', interval: 1.5 },
        ],
      },
      actions: [
        { type: 'move', targetId: 'obj_obstacle', movement: { type: 'teleport', target: { x: 0.5, y: 0.0 } } },
        { type: 'move', targetId: 'obj_obstacle', movement: { type: 'straight', direction: 'down', speed: 250 } },
      ],
    },
  ];

  if (isDodge) {
    // dodgeモード: 衝突で失敗、生存で成功
    rules.push(
      {
        id: 'rule_hit',
        name: '衝突',
        targetObjectId: 'obj_player',
        priority: 15,
        triggers: {
          operator: 'AND',
          conditions: [
            { type: 'collision', target: 'obj_obstacle', targetObjectId: 'obj_obstacle', collisionType: 'enter', checkMode: 'hitbox' },
          ],
        },
        actions: [
          { type: 'effect', targetId: 'obj_player', effect: { type: 'flash', duration: 0.3, intensity: 1.0, flashColor: '#ff0000' } },
          { type: 'playSound', soundId: 'se_hit' },
          { type: 'failure', message: failureMessage },
        ],
      },
      {
        id: 'rule_survive',
        name: '生存成功',
        targetObjectId: 'stage',
        priority: 20,
        triggers: {
          operator: 'AND',
          conditions: [
            { type: 'time', timeType: 'exact', seconds: duration },
          ],
        },
        actions: [
          { type: 'effect', targetId: 'obj_player', effect: { type: 'particles', duration: 1.0, intensity: 1.0, particleType: 'confetti', particleCount: 20 } },
          { type: 'playSound', soundId: 'se_success' },
          { type: 'success', score: 100, message: successMessage },
        ],
      },
    );
  } else {
    // collectモード: アイテムを集めて成功
    rules.push(
      {
        id: 'rule_collect',
        name: 'アイテム取得',
        targetObjectId: 'obj_player',
        priority: 15,
        triggers: {
          operator: 'AND',
          conditions: [
            { type: 'collision', target: 'obj_obstacle', targetObjectId: 'obj_obstacle', collisionType: 'enter', checkMode: 'hitbox' },
          ],
        },
        actions: [
          { type: 'counter', operation: 'increment', counterName: 'collectCount' },
          { type: 'move', targetId: 'obj_obstacle', movement: { type: 'teleport', target: { x: -0.1, y: -0.1 } } },
          { type: 'effect', targetId: 'obj_player', effect: { type: 'scale', duration: 0.1, intensity: 0.5, scaleAmount: 1.2 } },
          { type: 'playSound', soundId: 'se_collect' },
        ],
      },
      {
        id: 'rule_success',
        name: '収集目標達成',
        targetObjectId: 'stage',
        priority: 20,
        triggers: {
          operator: 'AND',
          conditions: [
            { type: 'counter', counterName: 'collectCount', comparison: '>=', value: targetCount },
          ],
        },
        actions: [
          { type: 'playSound', soundId: 'se_success' },
          { type: 'success', score: 100, message: successMessage },
        ],
      },
      {
        id: 'rule_timeout',
        name: '時間切れ',
        targetObjectId: 'stage',
        priority: 5,
        triggers: {
          operator: 'AND',
          conditions: [
            { type: 'time', timeType: 'exact', seconds: duration },
          ],
        },
        actions: [
          { type: 'failure', message: failureMessage },
        ],
      },
    );
  }

  return {
    mechanic: 'scroll_dodge',
    gameDuration: duration,
    script: {
      layout: {
        objects: [
          { objectId: 'obj_player', position: { x: 0.5, y: 0.8 }, scale: { x: 1.0, y: 1.0 } },
          { objectId: 'obj_obstacle', position: { x: 0.5, y: -0.1 }, scale: { x: 1.0, y: 1.0 } },
        ],
      },
      counters: isDodge ? [] : [
        { id: 'cnt_collect', name: 'collectCount', initialValue: 0 },
      ],
      rules: rules as FactoryOutput['script']['rules'],
    },
    assetPlan: {
      objects: [
        {
          id: 'obj_player',
          name: 'プレイヤー',
          purpose: 'プレイヤーが操作するキャラクター',
          visualDescription: playerDescription,
          initialPosition: { x: 0.5, y: 0.8 },
          size: 'medium',
        },
        {
          id: 'obj_obstacle',
          name: isDodge ? '障害物' : 'アイテム',
          purpose: isDodge ? '避けるべき障害物' : '集めるアイテム',
          visualDescription: obstacleDescription,
          initialPosition: { x: 0.5, y: 0.0 },
          size: 'small',
        },
      ],
      background: {
        description: backgroundDescription,
        mood: 'tense',
      },
      sounds: isDodge
        ? [
            { id: 'se_hit', trigger: '衝突時', type: 'bounce' },
            { id: 'se_success', trigger: '生存成功時', type: 'success' },
          ]
        : [
            { id: 'se_collect', trigger: 'アイテム取得時', type: 'collect' },
            { id: 'se_success', trigger: '収集完了時', type: 'success' },
          ],
    },
  };
}
