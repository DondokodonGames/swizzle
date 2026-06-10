/**
 * PhaseCompiler — フェーズ（状態機械）→ フラグ+ルール コンパイラ
 *
 * GamePhase[] を既存エンジンがそのまま実行できる FlagDefinition[] + GameRule[] へ
 * 決定的に変換する。エンジン（src/services/rule-engine/）と contract.ts は不変。
 *
 * エンジン仕様に基づく設計判断:
 * - ルールはpriority昇順に逐次評価され、setFlagは即時書き込み（同tick内の後続ルールから可視）
 * - flag条件はエンジン形 `{type:'flag', flagId, condition:'ON'|'OFF'}` で出力する
 *   （v2の flagValue 形はエンジンで評価されない）
 * - setFlag.value は strict boolean（1/0 不可）
 * - FinalAssembler はルールの execution をドロップするため、once系セマンティクスは
 *   フラグガードで実現する（execution.once に依存しない）
 * - onEnter は遷移ルールのactionsへインライン展開する
 *   （OFF_TO_ON エッジ条件は previousFlags のフレーム頭更新によりpriority依存で脆いため不使用）
 * - 「フェーズ入りからN秒」は delay アクション（mode:'ignore'）で実装する
 *   （time条件はゲーム開始基準のため流用不可）
 *
 * 命名規約:
 * - フラグ: phase_<id> / phase_lock / phase_<id>_entered / phase_<id>_t<idx>_elapsed
 * - ルール: phase__lock_reset / phase_<id>__enter_initial /
 *           phase_<from>__to__<to>[_<idx>] / phase_<from>__timer_<idx>
 *
 * priorityバンド（昇順評価。既存慣行: ゲームプレイ≈30-79、勝敗チェック90-100）:
 * - 1:  lock_reset（tick頭でロック解除）
 * - 5:  初期フェーズ onEnter
 * - 10-19: タイマーarm
 * - 80-89: phase→phase 遷移
 * - 90-99: phase→success/failure 遷移
 */

import { GamePhase, TriggerCondition, GameAction, GameRule, FlagDefinition } from './types';
import { GENERATABLE_CONDITIONS } from '../../types/editor/contract';

export interface PhaseGraphIssue {
  code: string;
  message: string;
}

export interface PhaseGraphValidation {
  errors: PhaseGraphIssue[];
  warnings: PhaseGraphIssue[];
}

export interface PhaseCompileResult {
  flags: FlagDefinition[];
  rules: GameRule[];
  warnings: string[];
}

export class PhaseGraphError extends Error {
  readonly issues: PhaseGraphIssue[];
  constructor(issues: PhaseGraphIssue[]) {
    super(`PHASE_GRAPH_INVALID: ${issues.map(i => i.code).join(', ')}\n` +
      issues.map(i => `- [${i.code}] ${i.message}`).join('\n'));
    this.name = 'PhaseGraphError';
    this.issues = issues;
  }
}

const PHASE_ID_PATTERN = /^[a-z0-9_]+$/;
const TERMINALS = ['success', 'failure'] as const;

const flagId = (phaseId: string) => `phase_${phaseId}`;
const LOCK_FLAG = 'phase_lock';

/**
 * フェーズグラフを検証する（コンパイル前に実行）
 */
export function validatePhaseGraph(phases: GamePhase[]): PhaseGraphValidation {
  const errors: PhaseGraphIssue[] = [];
  const warnings: PhaseGraphIssue[] = [];

  if (!phases || phases.length === 0) {
    errors.push({ code: 'NO_PHASES', message: 'phases が空です' });
    return { errors, warnings };
  }

  // ID検証
  const ids = new Set<string>();
  for (const phase of phases) {
    if (!PHASE_ID_PATTERN.test(phase.id)) {
      errors.push({ code: 'INVALID_PHASE_ID', message: `フェーズID "${phase.id}" は [a-z0-9_]+ である必要があります` });
    }
    if ((TERMINALS as readonly string[]).includes(phase.id)) {
      errors.push({ code: 'RESERVED_PHASE_ID', message: `フェーズID "${phase.id}" は予約語です（success/failure は遷移先にのみ使用可）` });
    }
    if (ids.has(phase.id)) {
      errors.push({ code: 'DUPLICATE_PHASE_ID', message: `フェーズID "${phase.id}" が重複しています` });
    }
    ids.add(phase.id);
  }

  // initial検証
  const initials = phases.filter(p => p.initial);
  if (initials.length === 0) {
    errors.push({ code: 'NO_INITIAL_PHASE', message: 'initial: true のフェーズがありません（ちょうど1つ必要）' });
  } else if (initials.length > 1) {
    errors.push({ code: 'MULTIPLE_INITIAL_PHASES', message: `initial: true のフェーズが${initials.length}個あります（ちょうど1つ必要）: ${initials.map(p => p.id).join(', ')}` });
  }

  // 遷移検証
  for (const phase of phases) {
    for (const [idx, t] of (phase.transitions ?? []).entries()) {
      const label = `${phase.id} → ${t.to} (#${idx})`;
      if (!ids.has(t.to) && !(TERMINALS as readonly string[]).includes(t.to)) {
        errors.push({ code: 'UNKNOWN_TRANSITION_TARGET', message: `遷移先 "${t.to}" は未定義です（${label}）` });
      }
      const whenConditions = normalizeWhen(t.when);
      if (whenConditions.length === 0 && t.afterSeconds === undefined) {
        errors.push({ code: 'EMPTY_TRANSITION', message: `遷移に when も afterSeconds もありません（${label}）` });
      }
      if (t.afterSeconds !== undefined && (!Number.isFinite(t.afterSeconds) || t.afterSeconds <= 0)) {
        errors.push({ code: 'INVALID_AFTER_SECONDS', message: `afterSeconds は正の数である必要があります: ${t.afterSeconds}（${label}）` });
      }
      for (const cond of whenConditions) {
        if (!(GENERATABLE_CONDITIONS as readonly string[]).includes(cond.type)) {
          errors.push({ code: 'INVALID_WHEN_CONDITION', message: `when の条件タイプ "${cond.type}" は生成対象外です（${label}）` });
        }
        if (cond.type === 'flag' && typeof cond.flagId === 'string' && cond.flagId.startsWith('phase_')) {
          warnings.push({ code: 'PHASE_FLAG_IN_WHEN', message: `when 内で phase_* フラグを直接参照しています（${label}）。フェーズ遷移で表現してください` });
        }
      }
    }
  }

  // 到達可能性（BFS）— ID系エラーがあるとグラフが不定なのでスキップ
  if (errors.length === 0) {
    const initial = initials[0];
    const reached = new Set<string>([initial.id]);
    let reachSuccess = false;
    let reachFailure = false;
    const queue = [initial.id];
    const byId = new Map(phases.map(p => [p.id, p]));

    while (queue.length > 0) {
      const current = byId.get(queue.shift()!)!;
      for (const t of current.transitions ?? []) {
        if (t.to === 'success') { reachSuccess = true; continue; }
        if (t.to === 'failure') { reachFailure = true; continue; }
        if (!reached.has(t.to)) {
          reached.add(t.to);
          queue.push(t.to);
        }
      }
    }

    if (!reachSuccess) {
      errors.push({ code: 'SUCCESS_UNREACHABLE_IN_GRAPH', message: '初期フェーズから success に到達できません' });
    }
    if (!reachFailure) {
      warnings.push({ code: 'FAILURE_UNREACHABLE_IN_GRAPH', message: '初期フェーズから failure に到達できません（時間切れのみが失敗手段になります）' });
    }
    for (const phase of phases) {
      if (!reached.has(phase.id)) {
        errors.push({ code: 'ORPHAN_PHASE', message: `フェーズ "${phase.id}" は初期フェーズから到達できません` });
      }
      if ((phase.transitions ?? []).length === 0) {
        warnings.push({ code: 'DEAD_END_PHASE', message: `フェーズ "${phase.id}" に出口がありません（このフェーズでは時間切れでしか終了しません）` });
      }
    }
  }

  return { errors, warnings };
}

/**
 * フェーズをフラグ+ルールへコンパイルする
 * @throws PhaseGraphError グラフが不正な場合
 */
export function compilePhases(phases: GamePhase[]): PhaseCompileResult {
  const validation = validatePhaseGraph(phases);
  if (validation.errors.length > 0) {
    throw new PhaseGraphError(validation.errors);
  }

  const flags: FlagDefinition[] = [];
  const rules: GameRule[] = [];
  const byId = new Map(phases.map(p => [p.id, p]));

  // フェーズフラグ + ロックフラグ
  for (const phase of phases) {
    flags.push({
      id: flagId(phase.id),
      name: `Phase: ${phase.id}`,
      initialValue: !!phase.initial,
      description: `フェーズ「${phase.id}」がアクティブかどうか（PhaseCompiler生成）`
    });
  }
  flags.push({
    id: LOCK_FLAG,
    name: 'Phase: lock',
    initialValue: false,
    description: '同一tick内の二重フェーズ遷移を防ぐロック（PhaseCompiler生成）'
  });

  // ロック解除ルール（priority 1: tick頭で解除。遷移発火時にロックを立て、
  // 同tick内の後続遷移をブロックする）
  rules.push({
    id: 'phase__lock_reset',
    name: 'フェーズ遷移ロック解除',
    priority: 1,
    targetObjectId: 'stage',
    triggers: {
      operator: 'AND',
      conditions: [{ type: 'flag', flagId: LOCK_FLAG, condition: 'ON' }]
    },
    actions: [{ type: 'setFlag', flagId: LOCK_FLAG, value: false }]
  });

  // 初期フェーズの onEnter（フラグガードで初回のみ。FinalAssemblerが
  // execution をドロップするため execution.once は使えない）
  const initial = phases.find(p => p.initial)!;
  if (initial.onEnter && initial.onEnter.length > 0) {
    const enteredFlag = `phase_${initial.id}_entered`;
    flags.push({
      id: enteredFlag,
      name: `Phase: ${initial.id} entered`,
      initialValue: false,
      description: `初期フェーズ「${initial.id}」のonEnter実行済みガード（PhaseCompiler生成）`
    });
    rules.push({
      id: `phase_${initial.id}__enter_initial`,
      name: `フェーズ ${initial.id} 開始処理`,
      priority: 5,
      targetObjectId: 'stage',
      triggers: {
        operator: 'AND',
        conditions: [
          { type: 'flag', flagId: flagId(initial.id), condition: 'ON' },
          { type: 'flag', flagId: enteredFlag, condition: 'OFF' }
        ]
      },
      actions: [
        { type: 'setFlag', flagId: enteredFlag, value: true },
        ...initial.onEnter
      ]
    });
  }

  // 遷移ルール
  const warnings: string[] = [];
  const usedRuleIds = new Set<string>();
  let timerIndex = 0;
  let phaseTransitionPriority = 80;  // 80-89
  let terminalTransitionPriority = 90;  // 90-99

  for (const phase of phases) {
    for (const [idx, transition] of (phase.transitions ?? []).entries()) {
      const isTerminal = (TERMINALS as readonly string[]).includes(transition.to);
      const conditions: TriggerCondition[] = [
        { type: 'flag', flagId: flagId(phase.id), condition: 'ON' },
        { type: 'flag', flagId: LOCK_FLAG, condition: 'OFF' }
      ];
      const actions: GameAction[] = [];

      // afterSeconds: タイマーarmルール + elapsed フラグ
      if (transition.afterSeconds !== undefined) {
        const tIdx = timerIndex++;
        const elapsedFlag = `phase_${phase.id}_t${idx}_elapsed`;
        flags.push({
          id: elapsedFlag,
          name: `Phase: ${phase.id} timer ${idx}`,
          initialValue: false,
          description: `フェーズ「${phase.id}」入りから${transition.afterSeconds}秒経過（PhaseCompiler生成）`
        });
        rules.push({
          id: `phase_${phase.id}__timer_${idx}`,
          name: `フェーズ ${phase.id} タイマー${idx}`,
          priority: Math.min(19, 10 + tIdx),
          targetObjectId: 'stage',
          triggers: {
            operator: 'AND',
            conditions: [{ type: 'flag', flagId: flagId(phase.id), condition: 'ON' }]
          },
          actions: [{
            type: 'delay',
            delayId: `phase_${phase.id}_t${idx}`,
            seconds: transition.afterSeconds,
            mode: 'ignore',          // 毎tickの再armはキュー済みならno-op
            cancelOnGameEnd: true,
            actions: [{ type: 'setFlag', flagId: elapsedFlag, value: true }]
          }]
        });
        conditions.push({ type: 'flag', flagId: elapsedFlag, condition: 'ON' });
        // 再入時にタイマーがやり直しになるよう、遷移時にリセット
        actions.push({ type: 'setFlag', flagId: elapsedFlag, value: false });
      }

      // when条件
      conditions.push(...normalizeWhen(transition.when));

      // 遷移アクション: ロック→現フェーズOFF→（遷移先ON + onEnter | 終端アクション）
      actions.push(
        { type: 'setFlag', flagId: LOCK_FLAG, value: true },
        { type: 'setFlag', flagId: flagId(phase.id), value: false }
      );
      if (isTerminal) {
        actions.push({ type: transition.to as 'success' | 'failure' });
      } else {
        actions.push({ type: 'setFlag', flagId: flagId(transition.to), value: true });
        const target = byId.get(transition.to)!;
        if (target.onEnter) {
          actions.push(...target.onEnter);
        }
      }

      // ルールID（同一ペアの複数遷移は _<idx> で区別）
      let ruleId = `phase_${phase.id}__to__${transition.to}`;
      if (usedRuleIds.has(ruleId)) {
        ruleId = `${ruleId}_${idx}`;
      }
      usedRuleIds.add(ruleId);

      const priority = isTerminal
        ? Math.min(99, terminalTransitionPriority++)
        : Math.min(89, phaseTransitionPriority++);

      rules.push({
        id: ruleId,
        name: `フェーズ遷移: ${phase.id} → ${transition.to}`,
        priority,
        targetObjectId: 'stage',
        triggers: { operator: 'AND', conditions },
        actions
      });
    }
  }

  warnings.push(...validation.warnings.map(w => `[${w.code}] ${w.message}`));
  return { flags, rules, warnings };
}

function normalizeWhen(when?: TriggerCondition | TriggerCondition[]): TriggerCondition[] {
  if (!when) return [];
  return Array.isArray(when) ? when : [when];
}
