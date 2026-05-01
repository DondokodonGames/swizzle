/**
 * CounterTapFactory
 * 対象 mechanic: tap, tap_counter
 * パターン: N回タップして目標達成
 * 設計仕様参照: templates/neta_001_reference.json
 */

import { CounterTapParams, FactoryOutput } from './types.js';

export function buildCounterTap(params: CounterTapParams): FactoryOutput {
  const {
    targetCount,
    duration,
    targetObjectDescription,
    backgroundDescription,
    successMessage,
    failureMessage,
  } = params;

  return {
    mechanic: 'tap_counter',
    gameDuration: duration,
    script: {
      layout: {
        objects: [
          { objectId: 'obj_target', position: { x: 0.5, y: 0.5 }, scale: { x: 1.0, y: 1.0 } },
        ],
      },
      counters: [
        { id: 'cnt_tap', name: 'tapCount', initialValue: 0 },
      ],
      rules: [
        {
          id: 'rule_tap',
          name: 'タップ',
          targetObjectId: 'obj_target',
          priority: 10,
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'touch', target: 'self', touchType: 'down' },
            ],
          },
          actions: [
            { type: 'counter', operation: 'increment', counterName: 'tapCount' },
            { type: 'effect', targetId: 'obj_target', effect: { type: 'scale', duration: 0.1, intensity: 0.5, scaleAmount: 1.25 } },
            { type: 'playSound', soundId: 'se_tap' },
          ],
        },
        {
          id: 'rule_success',
          name: '目標達成',
          targetObjectId: 'stage',
          priority: 20,
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'counter', counterName: 'tapCount', comparison: '>=', value: targetCount },
            ],
          },
          actions: [
            { type: 'effect', targetId: 'obj_target', effect: { type: 'particles', duration: 1.0, intensity: 1.0, particleType: 'star', particleCount: 20 } },
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
      ],
    },
    assetPlan: {
      objects: [
        {
          id: 'obj_target',
          name: 'タップターゲット',
          purpose: 'プレイヤーがタップするメインターゲット',
          visualDescription: targetObjectDescription,
          initialPosition: { x: 0.5, y: 0.5 },
          size: 'medium',
        },
      ],
      background: {
        description: backgroundDescription,
        mood: 'energetic',
      },
      sounds: [
        { id: 'se_tap', trigger: 'タップ時', type: 'tap' },
        { id: 'se_success', trigger: '成功時', type: 'success' },
      ],
    },
  };
}
