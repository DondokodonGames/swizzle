/**
 * テンプレートファクトリー エクスポート
 */

export { buildCounterTap } from './CounterTapFactory.js';
export { buildTimingWindow } from './TimingWindowFactory.js';
export { buildMultiChoice } from './MultiChoiceFactory.js';
export { buildDragDrop } from './DragDropFactory.js';
export { buildScrollDodge } from './ScrollDodgeFactory.js';
export { buildProjectile } from './ProjectileFactory.js';
export { buildHold } from './HoldFactory.js';

export type {
  FactoryScript,
  FactoryAssetPlan,
  FactoryOutput,
  CounterTapParams,
  TimingWindowParams,
  MultiChoiceParams,
  DragDropParams,
  ScrollDodgeParams,
  ProjectileParams,
  HoldParams,
} from './types.js';

// mechanic → ファクトリー関数のマッピング
export const MECHANIC_TO_FACTORY: Record<string, string> = {
  'tap':           'CounterTap',
  'tap_counter':   'CounterTap',
  'timing_window': 'TimingWindow',
  'two_step':      'TimingWindow',
  'multi_choice':  'MultiChoice',
  'reveal':        'MultiChoice',
  'drag':          'DragDrop',
  'swipe':         'ScrollDodge',
  'flick':         'Projectile',
  'hold':          'Hold',
};
