import { describe, it, expect } from 'vitest';
import { compilePhases, validatePhaseGraph, PhaseGraphError } from '../PhaseCompiler';
import { GamePhase, LogicGeneratorOutput, GameAction } from '../types';
import { LogicValidator } from '../LogicValidator';
import { DryRunSimulator } from '../DryRunSimulator';

/** timing_window型の3状態フィクスチャ: wait --2秒--> active --タップ--> success / --1秒--> failure */
function timingWindowPhases(): GamePhase[] {
  return [
    {
      id: 'wait',
      initial: true,
      transitions: [
        { afterSeconds: 2, to: 'active' },
        { when: { type: 'touch', target: 'obj_target', touchType: 'down' }, to: 'failure' }
      ]
    },
    {
      id: 'active',
      onEnter: [{ type: 'switchAnimation', targetId: 'obj_target', animationIndex: 1 }],
      transitions: [
        { when: { type: 'touch', target: 'obj_target', touchType: 'down' }, to: 'success' },
        { afterSeconds: 1, to: 'failure' }
      ]
    }
  ];
}

describe('PhaseCompiler – コンパイル形状', () => {
  it('初期フェーズのフラグだけ initialValue: true、phase_lock が存在する', () => {
    const { flags } = compilePhases(timingWindowPhases());
    const byId = new Map(flags.map(f => [f.id, f]));
    expect(byId.get('phase_wait')?.initialValue).toBe(true);
    expect(byId.get('phase_active')?.initialValue).toBe(false);
    expect(byId.get('phase_lock')?.initialValue).toBe(false);
  });

  it('遷移ルール: phaseフラグON + lockOFF + when のAND、アクション順序とboolean値', () => {
    const { rules } = compilePhases(timingWindowPhases());
    const rule = rules.find(r => r.id === 'phase_active__to__success')!;
    expect(rule).toBeDefined();
    expect(rule.targetObjectId).toBe('stage');
    expect(rule.triggers!.operator).toBe('AND');

    const conditions = rule.triggers!.conditions;
    expect(conditions).toContainEqual({ type: 'flag', flagId: 'phase_active', condition: 'ON' });
    expect(conditions).toContainEqual({ type: 'flag', flagId: 'phase_lock', condition: 'OFF' });
    expect(conditions).toContainEqual({ type: 'touch', target: 'obj_target', touchType: 'down' });

    const actions = rule.actions!;
    // [lock true, phase_active false, success]
    expect(actions[0]).toEqual({ type: 'setFlag', flagId: 'phase_lock', value: true });
    expect(actions[1]).toEqual({ type: 'setFlag', flagId: 'phase_active', value: false });
    expect(actions[actions.length - 1]).toEqual({ type: 'success' });
    // エンジンはstrict booleanを要求（1/0は不可）
    for (const a of actions) {
      if (a.type === 'setFlag') expect(typeof a.value).toBe('boolean');
    }
  });

  it('phase→phase遷移は遷移先フラグON + onEnterのインライン展開を含む', () => {
    const { rules } = compilePhases(timingWindowPhases());
    const rule = rules.find(r => r.id === 'phase_wait__to__active')!;
    const actions = rule.actions!;
    expect(actions).toContainEqual({ type: 'setFlag', flagId: 'phase_active', value: true });
    // active.onEnter（switchAnimation）がインラインされている
    expect(actions.some(a => a.type === 'switchAnimation' && a.targetId === 'obj_target')).toBe(true);
  });

  it('afterSeconds はタイマーarmルール（delay mode:ignore）+ elapsedフラグになる', () => {
    const { flags, rules } = compilePhases(timingWindowPhases());
    // wait の遷移#0 が afterSeconds:2
    expect(flags.some(f => f.id === 'phase_wait_t0_elapsed')).toBe(true);

    const timer = rules.find(r => r.id === 'phase_wait__timer_0')!;
    expect(timer).toBeDefined();
    const delayAction = timer.actions![0];
    expect(delayAction.type).toBe('delay');
    expect(delayAction.seconds).toBe(2);
    expect(delayAction.mode).toBe('ignore');
    expect(delayAction.cancelOnGameEnd).toBe(true);
    expect((delayAction.actions as GameAction[])[0]).toEqual(
      { type: 'setFlag', flagId: 'phase_wait_t0_elapsed', value: true }
    );

    // 遷移ルールは elapsed ON を条件に持ち、発火時にリセットする
    const transition = rules.find(r => r.id === 'phase_wait__to__active')!;
    expect(transition.triggers!.conditions).toContainEqual(
      { type: 'flag', flagId: 'phase_wait_t0_elapsed', condition: 'ON' }
    );
    expect(transition.actions).toContainEqual(
      { type: 'setFlag', flagId: 'phase_wait_t0_elapsed', value: false }
    );
  });

  it('priorityバンド: lock=1 / タイマー10-19 / phase→phase 80-89 / 終端 90-99', () => {
    const { rules } = compilePhases(timingWindowPhases());
    const get = (id: string) => rules.find(r => r.id === id)!.priority!;
    expect(get('phase__lock_reset')).toBe(1);
    expect(get('phase_wait__timer_0')).toBeGreaterThanOrEqual(10);
    expect(get('phase_wait__timer_0')).toBeLessThanOrEqual(19);
    expect(get('phase_wait__to__active')).toBeGreaterThanOrEqual(80);
    expect(get('phase_wait__to__active')).toBeLessThanOrEqual(89);
    for (const id of ['phase_active__to__success', 'phase_active__to__failure', 'phase_wait__to__failure']) {
      expect(get(id)).toBeGreaterThanOrEqual(90);
      expect(get(id)).toBeLessThanOrEqual(99);
    }
  });

  it('決定的: 同じ入力から同じ出力が得られる', () => {
    expect(compilePhases(timingWindowPhases())).toEqual(compilePhases(timingWindowPhases()));
  });

  it('初期フェーズのonEnterはフラグガード付きルールになる', () => {
    const phases: GamePhase[] = [
      {
        id: 'intro', initial: true,
        onEnter: [{ type: 'playSound', soundId: 'se_tap' }],
        transitions: [{ when: { type: 'touch', target: 'obj_a', touchType: 'down' }, to: 'success' }]
      }
    ];
    const { flags, rules } = compilePhases(phases);
    expect(flags.some(f => f.id === 'phase_intro_entered' && f.initialValue === false)).toBe(true);

    const enter = rules.find(r => r.id === 'phase_intro__enter_initial')!;
    expect(enter.priority).toBe(5);
    expect(enter.triggers!.conditions).toContainEqual({ type: 'flag', flagId: 'phase_intro', condition: 'ON' });
    expect(enter.triggers!.conditions).toContainEqual({ type: 'flag', flagId: 'phase_intro_entered', condition: 'OFF' });
    expect(enter.actions![0]).toEqual({ type: 'setFlag', flagId: 'phase_intro_entered', value: true });
    expect(enter.actions![1]).toEqual({ type: 'playSound', soundId: 'se_tap' });
  });
});

describe('PhaseCompiler – グラフ検証', () => {
  const touchTo = (to: string) => ({
    when: { type: 'touch' as const, target: 'obj_a', touchType: 'down' as const }, to
  });

  it('initialなし → NO_INITIAL_PHASE', () => {
    const { errors } = validatePhaseGraph([{ id: 'a', transitions: [touchTo('success')] }]);
    expect(errors.map(e => e.code)).toContain('NO_INITIAL_PHASE');
  });

  it('initial重複 → MULTIPLE_INITIAL_PHASES', () => {
    const { errors } = validatePhaseGraph([
      { id: 'a', initial: true, transitions: [touchTo('b')] },
      { id: 'b', initial: true, transitions: [touchTo('success')] }
    ]);
    expect(errors.map(e => e.code)).toContain('MULTIPLE_INITIAL_PHASES');
  });

  it('未知の遷移先 → UNKNOWN_TRANSITION_TARGET', () => {
    const { errors } = validatePhaseGraph([
      { id: 'a', initial: true, transitions: [touchTo('nowhere')] }
    ]);
    expect(errors.map(e => e.code)).toContain('UNKNOWN_TRANSITION_TARGET');
  });

  it('whenもafterSecondsもない遷移 → EMPTY_TRANSITION', () => {
    const { errors } = validatePhaseGraph([
      { id: 'a', initial: true, transitions: [{ to: 'success' }] }
    ]);
    expect(errors.map(e => e.code)).toContain('EMPTY_TRANSITION');
  });

  it('successに到達できないグラフ → SUCCESS_UNREACHABLE_IN_GRAPH', () => {
    const { errors } = validatePhaseGraph([
      { id: 'a', initial: true, transitions: [touchTo('failure')] }
    ]);
    expect(errors.map(e => e.code)).toContain('SUCCESS_UNREACHABLE_IN_GRAPH');
  });

  it('孤立フェーズ → ORPHAN_PHASE', () => {
    const { errors } = validatePhaseGraph([
      { id: 'a', initial: true, transitions: [touchTo('success')] },
      { id: 'island', transitions: [touchTo('success')] }
    ]);
    expect(errors.map(e => e.code)).toContain('ORPHAN_PHASE');
  });

  it('failure到達不能・出口なしフェーズは警告（エラーではない）', () => {
    const { errors, warnings } = validatePhaseGraph([
      { id: 'a', initial: true, transitions: [touchTo('success'), touchTo('b')] },
      { id: 'b', transitions: [] }
    ]);
    expect(errors).toEqual([]);
    expect(warnings.map(w => w.code)).toContain('FAILURE_UNREACHABLE_IN_GRAPH');
    expect(warnings.map(w => w.code)).toContain('DEAD_END_PHASE');
  });

  it('compilePhases は不正グラフで PhaseGraphError を投げる', () => {
    expect(() => compilePhases([{ id: 'a', transitions: [] }])).toThrow(PhaseGraphError);
    expect(() => compilePhases([{ id: 'a', transitions: [] }])).toThrow(/PHASE_GRAPH_INVALID/);
  });
});

describe('PhaseCompiler – パイプライン統合', () => {
  function makeOutputWithPhases(): LogicGeneratorOutput {
    const compiled = compilePhases(timingWindowPhases());
    return {
      script: {
        layout: { objects: [{ objectId: 'obj_target', position: { x: 0.5, y: 0.5 }, scale: { x: 1, y: 1 } }] },
        counters: [],
        flags: compiled.flags,
        rules: [...compiled.rules],
      },
      assetPlan: {
        objects: [{
          id: 'obj_target', name: 'ターゲット', purpose: 'タップ対象',
          visualDescription: '光る的', initialPosition: { x: 0.5, y: 0.5 }, size: 'medium'
        }],
        background: { description: 'シンプルな背景', mood: '緊張' },
        sounds: [
          { id: 'se_tap', trigger: 'タップ時', type: 'tap' },
          { id: 'se_success', trigger: '成功時', type: 'success' },
          { id: 'se_failure', trigger: '失敗時', type: 'failure' }
        ]
      },
      selfCheck: {
        hasPlayerActionOnSuccessPath: true,
        counterInitialValuesSafe: true,
        allObjectIdsValid: true,
        allCounterNamesValid: true,
        coordinatesInRange: true,
        onlyVerifiedFeaturesUsed: true,
      },
    };
  }

  it('コンパイル結果が LogicValidator の critical エラーなしで通る', () => {
    const output = makeOutputWithPhases();
    const result = new LogicValidator().validate(output);
    const criticals = result.errors.filter(e => e.type === 'critical');
    expect(criticals).toEqual([]);
  });

  it('コンパイル結果が DryRunSimulator で playable と判定される', () => {
    const output = makeOutputWithPhases();
    const report = new DryRunSimulator().simulate(output, undefined, 10);
    expect(report.summary.playable).toBe(true);
    expect(report.success.requiredTaps).toBeGreaterThanOrEqual(1);
  });
});
