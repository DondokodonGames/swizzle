/**
 * MultiChoiceFactory
 * 対象 mechanic: multi_choice, reveal
 * パターン: 複数の選択肢から正解を選ぶ
 */

import { MultiChoiceParams, FactoryOutput } from './types.js';

export function buildMultiChoice(params: MultiChoiceParams): FactoryOutput {
  const {
    choiceCount,
    duration,
    questionDescription,
    correctDescription,
    wrongDescription,
    backgroundDescription,
    successMessage,
    failureMessage,
  } = params;

  const count = Math.min(4, Math.max(2, choiceCount));

  // 正解は先頭（index 0）に配置。ParameterExtractorがシャッフル位置を決める
  const objectLayouts = Array.from({ length: count }, (_, i) => ({
    objectId: `obj_choice_${i}`,
    position: {
      x: count === 2 ? (i === 0 ? 0.3 : 0.7) :
         count === 3 ? [0.2, 0.5, 0.8][i] :
         [0.2, 0.45, 0.7, 0.5][i] ?? 0.5,
      y: count <= 3 ? 0.5 : (i < 2 ? 0.35 : 0.65),
    },
    scale: { x: 1.0, y: 1.0 },
  }));

  const objectAssets = Array.from({ length: count }, (_, i) => ({
    id: `obj_choice_${i}`,
    name: i === 0 ? '正解' : `不正解${i}`,
    purpose: i === 0 ? '正解の選択肢' : '不正解の選択肢',
    visualDescription: i === 0 ? correctDescription : wrongDescription,
    initialPosition: objectLayouts[i].position,
    size: 'medium' as const,
  }));

  const tapRules = Array.from({ length: count }, (_, i) => ({
    id: `rule_tap_choice_${i}`,
    name: i === 0 ? '正解タップ' : `不正解タップ${i}`,
    targetObjectId: `obj_choice_${i}`,
    priority: 10,
    triggers: {
      operator: 'AND' as const,
      conditions: [
        { type: 'touch', target: 'self', touchType: 'down' },
      ],
    },
    actions: i === 0
      ? [
          { type: 'effect', targetId: `obj_choice_${i}`, effect: { type: 'scale', duration: 0.2, intensity: 0.8, scaleAmount: 1.3 } },
          { type: 'playSound', soundId: 'se_correct' },
          { type: 'success', score: 100, message: successMessage },
        ]
      : [
          { type: 'effect', targetId: `obj_choice_${i}`, effect: { type: 'shake', duration: 0.3, intensity: 0.8, shakeDirection: 'both' } },
          { type: 'playSound', soundId: 'se_wrong' },
          { type: 'failure', message: failureMessage },
        ],
  }));

  return {
    mechanic: 'multi_choice',
    gameDuration: duration,
    script: {
      layout: {
        objects: objectLayouts,
      },
      counters: [],
      rules: [
        ...tapRules,
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
      objects: objectAssets,
      background: {
        description: `${backgroundDescription}。問題: ${questionDescription}`,
        mood: 'calm',
      },
      sounds: [
        { id: 'se_correct', trigger: '正解タップ時', type: 'ding' },
        { id: 'se_wrong', trigger: '不正解タップ時', type: 'buzz' },
      ],
    },
  };
}
