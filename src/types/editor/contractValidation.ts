// src/types/editor/contractValidation.ts
// ゲームJSON(GameProject)を「単一の正解」contract.ts に照らして検証する。
// インポート時に実行し、Codex/AI が生成した壊れたゲームをサイレント保存せず
// 実行可能なエラーとして返すことを目的とする。

import type { GameProject } from './GameProject';
import { validateGameProject } from './GameProject';
import { ALL_ACTION_TYPES, ALL_CONDITION_TYPES } from './contract';

const ACTION_SET = new Set<string>(ALL_ACTION_TYPES);
const CONDITION_SET = new Set<string>(ALL_CONDITION_TYPES);

/**
 * ルールのアクション/条件タイプが契約に存在するかを検証する。
 * 例: 削除済みの 'showMessage' や typo を検出する。
 */
export function validateRulesAgainstContract(project: GameProject): string[] {
  const errors: string[] = [];
  const rules = project.script?.rules ?? [];

  rules.forEach((rule, i) => {
    const label = rule.name || rule.id || `#${i + 1}`;

    const conditions = rule.triggers?.conditions ?? [];
    conditions.forEach((c: any) => {
      if (c?.type && !CONDITION_SET.has(c.type)) {
        errors.push(`ルール "${label}": 無効な条件タイプ '${c.type}'（有効: ${ALL_CONDITION_TYPES.join(', ')}）`);
      }
    });

    const actions = rule.actions ?? [];
    actions.forEach((a: any) => {
      if (a?.type && !ACTION_SET.has(a.type)) {
        errors.push(`ルール "${label}": 無効なアクションタイプ '${a.type}'（有効: ${ALL_ACTION_TYPES.join(', ')}）`);
      }
    });
  });

  return errors;
}

/**
 * インポート時の総合検証。構造チェック(validateGameProject)と
 * 契約ベースのルール検証を統合し、ブロッキングエラーの配列を返す。
 * 返り値が空ならインポート可能。
 */
export function validateProjectForImport(project: GameProject): string[] {
  const errors: string[] = [];

  // 必須トップレベル構造の存在チェック(これが欠けると以降の検証が落ちる)
  if (!project?.settings) errors.push('project.settings がありません');
  if (!project?.assets) errors.push('project.assets がありません');
  if (!project?.script) errors.push('project.script がありません');
  if (errors.length > 0) return errors;

  // 構造検証(ゲーム名・アセット・サイズ等)。内部例外も明確なエラーに変換する
  try {
    const structural = validateGameProject(project);
    for (const e of structural.projectErrors) {
      if (e.severity === 'error') errors.push(e.message);
    }
  } catch (e) {
    errors.push(`構造検証に失敗しました: ${(e as Error)?.message ?? e}`);
  }

  // 契約ベースのルール検証(無効なアクション/条件タイプ)
  errors.push(...validateRulesAgainstContract(project));

  return errors;
}
