/**
 * HoldFactory
 * 対象 mechanic: hold
 * パターン: 長押しを指定時間維持する
 */

import { HoldParams, FactoryOutput } from './types.js';

export function buildHold(params: HoldParams): FactoryOutput {
  const {
    holdDuration,
    duration,
    holdObjectDescription,
    backgroundDescription,
    successMessage,
    failureMessage,
  } = params;

  const holdSeconds = holdDuration / 1000;

  return {
    mechanic: 'hold',
    gameDuration: duration,
    script: {
      layout: {
        objects: [
          { objectId: 'obj_button', position: { x: 0.5, y: 0.5 }, scale: { x: 1.0, y: 1.0 } },
        ],
      },
      counters: [],
      rules: [
        // ホールド開始でエフェクト
        {
          id: 'rule_hold_start',
          name: 'ホールド開始',
          targetObjectId: 'obj_button',
          priority: 10,
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'touch', target: 'self', touchType: 'hold', holdDuration: 0 },
            ],
          },
          actions: [
            { type: 'effect', targetId: 'obj_button', effect: { type: 'scale', duration: 0.2, intensity: 0.5, scaleAmount: 0.9 } },
            { type: 'playSound', soundId: 'se_hold' },
          ],
        },
        // 指定時間ホールドで成功
        {
          id: 'rule_hold_success',
          name: 'ホールド完了',
          targetObjectId: 'obj_button',
          priority: 20,
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'touch', target: 'self', touchType: 'hold', holdDuration: holdSeconds },
            ],
          },
          actions: [
            { type: 'effect', targetId: 'obj_button', effect: { type: 'particles', duration: 1.0, intensity: 1.0, particleType: 'sparkle', particleCount: 20 } },
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
          id: 'obj_button',
          name: '長押しボタン',
          purpose: 'プレイヤーが長押しするオブジェクト',
          visualDescription: holdObjectDescription,
          initialPosition: { x: 0.5, y: 0.5 },
          size: 'large',
        },
      ],
      background: {
        description: backgroundDescription,
        mood: 'tense',
      },
      sounds: [
        { id: 'se_hold', trigger: 'ホールド開始時', type: 'tap' },
        { id: 'se_success', trigger: 'ホールド完了時', type: 'success' },
      ],
    },
  };
}
