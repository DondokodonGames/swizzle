/**
 * ProjectileFactory
 * 対象 mechanic: flick
 * パターン: フリックして飛ばし的に当てる
 */

import { ProjectileParams, FactoryOutput } from './types.js';

export function buildProjectile(params: ProjectileParams): FactoryOutput {
  const {
    requiredHits,
    duration,
    projectileDescription,
    targetDescription,
    backgroundDescription,
    successMessage,
    failureMessage,
  } = params;

  return {
    mechanic: 'projectile',
    gameDuration: duration,
    script: {
      layout: {
        objects: [
          { objectId: 'obj_projectile', position: { x: 0.5, y: 0.8 }, scale: { x: 1.0, y: 1.0 } },
          { objectId: 'obj_target', position: { x: 0.5, y: 0.25 }, scale: { x: 1.0, y: 1.0 } },
        ],
      },
      counters: [
        { id: 'cnt_hit', name: 'hitCount', initialValue: 0 },
      ],
      rules: [
        // フリックで投げる
        {
          id: 'rule_flick',
          name: 'フリック投げ',
          targetObjectId: 'obj_projectile',
          priority: 10,
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'touch', target: 'self', touchType: 'flick', direction: 'up' },
            ],
          },
          actions: [
            { type: 'move', targetId: 'obj_projectile', movement: { type: 'arc', target: { x: 0.5, y: 0.2 }, duration: 0.5, arcHeight: 80 } },
            { type: 'playSound', soundId: 'se_throw' },
          ],
        },
        // 的に命中
        {
          id: 'rule_hit',
          name: '命中',
          targetObjectId: 'obj_projectile',
          priority: 15,
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'collision', target: 'obj_target', targetObjectId: 'obj_target', collisionType: 'enter', checkMode: 'hitbox' },
            ],
          },
          actions: [
            { type: 'counter', operation: 'increment', counterName: 'hitCount' },
            { type: 'move', targetId: 'obj_projectile', movement: { type: 'teleport', target: { x: 0.5, y: 0.8 } } },
            { type: 'effect', targetId: 'obj_target', effect: { type: 'shake', duration: 0.2, intensity: 0.8, shakeDirection: 'both' } },
            { type: 'playSound', soundId: 'se_hit' },
          ],
        },
        // 的のランダム移動
        {
          id: 'rule_target_move',
          name: 'ターゲット移動',
          targetObjectId: 'obj_target',
          priority: 2,
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'time', timeType: 'interval', interval: 1.5 },
            ],
          },
          actions: [
            {
              type: 'randomAction',
              selectionMode: 'uniform',
              actions: [
                { action: { type: 'move', targetId: 'obj_target', movement: { type: 'teleport', target: { x: 0.2, y: 0.25 } } } },
                { action: { type: 'move', targetId: 'obj_target', movement: { type: 'teleport', target: { x: 0.5, y: 0.25 } } } },
                { action: { type: 'move', targetId: 'obj_target', movement: { type: 'teleport', target: { x: 0.8, y: 0.25 } } } },
              ],
            },
          ],
        },
        // 目標命中数達成で成功
        {
          id: 'rule_success',
          name: '目標達成',
          targetObjectId: 'stage',
          priority: 20,
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'counter', counterName: 'hitCount', comparison: '>=', value: requiredHits },
            ],
          },
          actions: [
            { type: 'effect', targetId: 'obj_target', effect: { type: 'particles', duration: 1.0, intensity: 1.0, particleType: 'explosion', particleCount: 20 } },
            { type: 'playSound', soundId: 'se_success' },
            { type: 'success', score: 100, message: successMessage },
          ],
        },
        // 時間切れ
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
      ],
    },
    assetPlan: {
      objects: [
        {
          id: 'obj_projectile',
          name: '飛び道具',
          purpose: 'フリックして投げるオブジェクト',
          visualDescription: projectileDescription,
          initialPosition: { x: 0.5, y: 0.8 },
          size: 'small',
        },
        {
          id: 'obj_target',
          name: '的',
          purpose: '当てるターゲット',
          visualDescription: targetDescription,
          initialPosition: { x: 0.5, y: 0.25 },
          size: 'medium',
        },
      ],
      background: {
        description: backgroundDescription,
        mood: 'energetic',
      },
      sounds: [
        { id: 'se_throw', trigger: 'フリック時', type: 'whoosh' },
        { id: 'se_hit', trigger: '命中時', type: 'pop' },
        { id: 'se_success', trigger: '成功時', type: 'success' },
      ],
    },
  };
}
