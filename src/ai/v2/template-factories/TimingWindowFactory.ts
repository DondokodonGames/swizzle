/**
 * TimingWindowFactory
 * 対象 mechanic: timing_window, two_step
 * パターン: 動くターゲットのタイミングでタップ
 */

import { TimingWindowParams, FactoryOutput } from './types.js';

export function buildTimingWindow(params: TimingWindowParams): FactoryOutput {
  const {
    requiredHits,
    duration,
    allowedMisses,
    movingSpeed,
    targetObjectDescription,
    backgroundDescription,
    successMessage,
    failureMessage,
  } = params;

  const hasMissLimit = allowedMisses > 0;

  const rules: unknown[] = [
    // ターゲットが左右を往復移動
    {
      id: 'rule_move_right',
      name: '右移動開始',
      targetObjectId: 'obj_target',
      priority: 1,
      triggers: {
        operator: 'AND',
        conditions: [
          { type: 'position', target: 'obj_target', area: 'inside', region: { shape: 'rect', x: 0.0, y: 0.0, width: 0.05, height: 1.0 } },
        ],
      },
      actions: [
        { type: 'move', targetId: 'obj_target', movement: { type: 'straight', direction: 'right', speed: movingSpeed } },
      ],
    },
    {
      id: 'rule_move_left',
      name: '左移動開始',
      targetObjectId: 'obj_target',
      priority: 1,
      triggers: {
        operator: 'AND',
        conditions: [
          { type: 'position', target: 'obj_target', area: 'inside', region: { shape: 'rect', x: 0.95, y: 0.0, width: 0.05, height: 1.0 } },
        ],
      },
      actions: [
        { type: 'move', targetId: 'obj_target', movement: { type: 'straight', direction: 'left', speed: movingSpeed } },
      ],
    },
    // 成功ゾーン内タップ
    {
      id: 'rule_hit',
      name: '成功タップ',
      targetObjectId: 'obj_zone',
      priority: 10,
      triggers: {
        operator: 'AND',
        conditions: [
          { type: 'touch', target: 'self', touchType: 'down' },
          { type: 'collision', target: 'obj_target', targetObjectId: 'obj_target', collisionType: 'stay', checkMode: 'hitbox' },
        ],
      },
      actions: [
        { type: 'counter', operation: 'increment', counterName: 'hitCount' },
        { type: 'effect', targetId: 'obj_target', effect: { type: 'flash', duration: 0.15, intensity: 0.8, flashColor: '#00ff00' } },
        { type: 'playSound', soundId: 'se_hit' },
      ],
    },
    // 成功ゾーン外タップ（ミス）
    {
      id: 'rule_miss',
      name: 'ミスタップ',
      targetObjectId: 'stage',
      priority: 9,
      triggers: {
        operator: 'AND',
        conditions: [
          { type: 'touch', target: 'stage', touchType: 'down' },
        ],
      },
      actions: [
        ...(hasMissLimit ? [{ type: 'counter', operation: 'increment', counterName: 'missCount' }] : []),
        { type: 'effect', targetId: 'obj_target', effect: { type: 'shake', duration: 0.2, intensity: 0.5, shakeDirection: 'horizontal' } },
        { type: 'playSound', soundId: 'se_miss' },
      ],
    },
    // 必要ヒット数達成で成功
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
        { type: 'effect', targetId: 'obj_target', effect: { type: 'particles', duration: 1.0, intensity: 1.0, particleType: 'confetti', particleCount: 25 } },
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
  ];

  // ミス上限あり → ミス超過で失敗ルール追加
  if (hasMissLimit) {
    rules.push({
      id: 'rule_miss_over',
      name: 'ミス超過',
      targetObjectId: 'stage',
      priority: 19,
      triggers: {
        operator: 'AND',
        conditions: [
          { type: 'counter', counterName: 'missCount', comparison: '>=', value: allowedMisses },
        ],
      },
      actions: [
        { type: 'failure', message: failureMessage },
      ],
    });
  }

  return {
    mechanic: 'timing_window',
    gameDuration: duration,
    script: {
      layout: {
        objects: [
          { objectId: 'obj_target', position: { x: 0.5, y: 0.5 }, scale: { x: 1.0, y: 1.0 } },
          { objectId: 'obj_zone', position: { x: 0.5, y: 0.5 }, scale: { x: 1.0, y: 1.0 } },
        ],
      },
      counters: [
        { id: 'cnt_hit', name: 'hitCount', initialValue: 0 },
        ...(hasMissLimit ? [{ id: 'cnt_miss', name: 'missCount', initialValue: 0 }] : []),
      ],
      rules: rules as FactoryOutput['script']['rules'],
    },
    assetPlan: {
      objects: [
        {
          id: 'obj_target',
          name: '動くターゲット',
          purpose: '左右を往復する当てるターゲット',
          visualDescription: targetObjectDescription,
          initialPosition: { x: 0.5, y: 0.5 },
          size: 'medium',
        },
        {
          id: 'obj_zone',
          name: '成功ゾーン',
          purpose: 'ターゲットがここにいるときにタップすると成功',
          visualDescription: '中央の半透明な四角形ゾーン。緑の枠線。',
          initialPosition: { x: 0.5, y: 0.5 },
          size: 'medium',
        },
      ],
      background: {
        description: backgroundDescription,
        mood: 'tense',
      },
      sounds: [
        { id: 'se_hit', trigger: '成功タップ時', type: 'ding' },
        { id: 'se_miss', trigger: 'ミスタップ時', type: 'buzz' },
        { id: 'se_success', trigger: '成功時', type: 'success' },
      ],
    },
  };
}
