/**
 * DragDropFactory
 * 対象 mechanic: drag
 * パターン: オブジェクトをドラッグして目標ゾーンに置く
 */

import { DragDropParams, FactoryOutput } from './types.js';

export function buildDragDrop(params: DragDropParams): FactoryOutput {
  const {
    itemCount,
    duration,
    dragObjectDescription,
    targetZoneDescription,
    backgroundDescription,
    successMessage,
    failureMessage,
  } = params;

  const count = Math.min(3, Math.max(1, itemCount));

  // アイテムを下段に配置、ゾーンを上段に配置
  const itemPositions = Array.from({ length: count }, (_, i) => ({
    x: count === 1 ? 0.5 : 0.25 + (i * 0.5 / (count - 1 || 1)),
    y: 0.75,
  }));

  const zonePositions = Array.from({ length: count }, (_, i) => ({
    x: count === 1 ? 0.5 : 0.25 + (i * 0.5 / (count - 1 || 1)),
    y: 0.3,
  }));

  const objectLayouts = [
    ...Array.from({ length: count }, (_, i) => ({
      objectId: `obj_item_${i}`,
      position: itemPositions[i],
      scale: { x: 1.0, y: 1.0 },
    })),
    ...Array.from({ length: count }, (_, i) => ({
      objectId: `obj_zone_${i}`,
      position: zonePositions[i],
      scale: { x: 1.0, y: 1.0 },
    })),
  ];

  // ドラッグルール（各アイテム）
  const dragRules = Array.from({ length: count }, (_, i) => ({
    id: `rule_drag_${i}`,
    name: `アイテム${i}ドラッグ`,
    targetObjectId: `obj_item_${i}`,
    priority: 10,
    triggers: {
      operator: 'AND' as const,
      conditions: [
        { type: 'touch', target: 'self', touchType: 'drag', dragType: 'dragging' },
      ],
    },
    actions: [
      { type: 'followDrag', targetId: `obj_item_${i}` },
    ],
  }));

  // ドロップ判定ルール（各アイテム × ゾーン）
  const dropRules = Array.from({ length: count }, (_, i) => ({
    id: `rule_drop_${i}`,
    name: `アイテム${i}ドロップ判定`,
    targetObjectId: `obj_item_${i}`,
    priority: 15,
    triggers: {
      operator: 'AND' as const,
      conditions: [
        { type: 'touch', target: 'self', touchType: 'drag', dragType: 'end' },
        { type: 'collision', target: `obj_zone_${i}`, targetObjectId: `obj_zone_${i}`, collisionType: 'enter', checkMode: 'hitbox' },
      ],
    },
    actions: [
      { type: 'move', targetId: `obj_item_${i}`, movement: { type: 'teleport', target: zonePositions[i] } },
      { type: 'setFlag', flagId: `placed_${i}`, value: true },
      { type: 'effect', targetId: `obj_item_${i}`, effect: { type: 'scale', duration: 0.2, intensity: 0.5, scaleAmount: 1.2 } },
      { type: 'playSound', soundId: 'se_drop' },
    ],
  }));

  // 全配置完了で成功
  const allPlacedConditions = Array.from({ length: count }, (_, i) => ({
    type: 'flag',
    flagId: `placed_${i}`,
    condition: 'ON',
  }));

  return {
    mechanic: 'drag_drop',
    gameDuration: duration,
    script: {
      layout: {
        objects: objectLayouts,
      },
      counters: [],
      rules: [
        ...dragRules,
        ...dropRules,
        {
          id: 'rule_success',
          name: '全配置完了',
          targetObjectId: 'stage',
          priority: 20,
          triggers: {
            operator: 'AND',
            conditions: allPlacedConditions,
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
      ],
    },
    assetPlan: {
      objects: [
        ...Array.from({ length: count }, (_, i) => ({
          id: `obj_item_${i}`,
          name: `ドラッグアイテム${i + 1}`,
          purpose: 'プレイヤーがドラッグするアイテム',
          visualDescription: dragObjectDescription,
          initialPosition: itemPositions[i],
          size: 'medium' as const,
        })),
        ...Array.from({ length: count }, (_, i) => ({
          id: `obj_zone_${i}`,
          name: `ターゲットゾーン${i + 1}`,
          purpose: 'アイテムを置く目標ゾーン',
          visualDescription: targetZoneDescription,
          initialPosition: zonePositions[i],
          size: 'medium' as const,
        })),
      ],
      background: {
        description: backgroundDescription,
        mood: 'calm',
      },
      sounds: [
        { id: 'se_drop', trigger: 'ドロップ成功時', type: 'pop' },
        { id: 'se_success', trigger: '全配置完了時', type: 'success' },
      ],
    },
  };
}
