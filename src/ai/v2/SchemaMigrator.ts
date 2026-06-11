/**
 * SchemaMigrator — GameProject JSONスキーマ バージョン管理
 *
 * バージョン履歴:
 *   v1 (schemaVersion欠落): 初期生成形式。TriggerCondition の flag条件が
 *       { type:'flag', flagId, flagValue:boolean } の形で出力されていた。
 *   v2 (schemaVersion:2):   flag条件を { type:'flag', flagId, condition:'ON'|'OFF'|... }
 *       に正規化済み。FinalAssembler が全新規生成物に付与する。
 */

import type { GameProject } from '../../types/editor/GameProject';

export const CURRENT_SCHEMA_VERSION = 2;

function getVersion(project: Record<string, unknown>): number {
  const v = project['schemaVersion'];
  if (v == null) return 1;
  const n = Number(v);
  return Number.isFinite(n) ? n : 1;
}

function normalizeFlagConditions(conditions: unknown[]): unknown[] {
  return conditions.map(cond => {
    const c = cond as Record<string, unknown>;
    if (c['type'] === 'flag' && 'flagValue' in c && !('condition' in c)) {
      const { flagValue, ...rest } = c;
      return { ...rest, condition: flagValue ? 'ON' : 'OFF' };
    }
    return cond;
  });
}

function migrateV1toV2(project: Record<string, unknown>): Record<string, unknown> {
  const script = project['script'] as Record<string, unknown> | undefined;
  const rules = script?.['rules'] as unknown[] | undefined;

  const migratedRules = Array.isArray(rules)
    ? rules.map(rule => {
        const r = rule as Record<string, unknown>;
        const triggers = r['triggers'] as Record<string, unknown> | undefined;
        const conditions = triggers?.['conditions'];
        if (!Array.isArray(conditions)) return rule;
        return {
          ...r,
          triggers: { ...triggers, conditions: normalizeFlagConditions(conditions) },
        };
      })
    : rules;

  return {
    ...project,
    schemaVersion: 2,
    script: script ? { ...script, rules: migratedRules } : script,
  };
}

/**
 * 任意のGameProject（旧形式含む）を現行スキーマへ移行して返す。
 * 呼び出し元は DB / ファイルから読み込んだ生のオブジェクトを渡すこと。
 * schemaVersion欠落は v1 として扱う（後方互換フォールバック）。
 */
export function migrateGameProject(project: unknown): GameProject {
  let p = project as Record<string, unknown>;
  const version = getVersion(p);
  if (version < 2) {
    p = migrateV1toV2(p);
  }
  return p as unknown as GameProject;
}

/** project が現行スキーマかどうかを返す。false の場合は migrateGameProject を呼ぶこと。 */
export function isCurrentVersion(project: unknown): boolean {
  return getVersion(project as Record<string, unknown>) >= CURRENT_SCHEMA_VERSION;
}
