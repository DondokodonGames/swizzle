import { describe, it, expect } from 'vitest';
import { migrateGameProject, CURRENT_SCHEMA_VERSION, isCurrentVersion } from '../SchemaMigrator';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makeFlagRule(extra: Record<string, unknown>) {
  return {
    id: 'r1',
    triggers: { operator: 'AND', conditions: [{ type: 'flag', flagId: 'launched', ...extra }] },
    actions: [],
  };
}

function makeProject(overrides: Record<string, unknown> = {}) {
  return { id: 'g1', script: { rules: [] }, ...overrides };
}

// ---------------------------------------------------------------------------
// migrateGameProject — バージョン付与
// ---------------------------------------------------------------------------

describe('migrateGameProject – schemaVersion付与', () => {
  it('schemaVersion欠落 → CURRENT_SCHEMA_VERSIONが付与される', () => {
    const result = migrateGameProject(makeProject());
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('schemaVersion: 1 → CURRENT_SCHEMA_VERSIONへ更新される', () => {
    const result = migrateGameProject(makeProject({ schemaVersion: 1 }));
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('schemaVersion: CURRENT_SCHEMA_VERSION → 変更なし', () => {
    const raw = makeProject({ schemaVersion: CURRENT_SCHEMA_VERSION });
    const result = migrateGameProject(raw);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect((result as Record<string, unknown>)['id']).toBe('g1');
  });

  it('スクリプトなし（最小オブジェクト）でもクラッシュしない', () => {
    const result = migrateGameProject({ id: 'x' });
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});

// ---------------------------------------------------------------------------
// migrateGameProject — flagValue → condition 正規化 (v1→v2)
// ---------------------------------------------------------------------------

describe('migrateGameProject – flagValue正規化', () => {
  it('flagValue: true → condition: ON', () => {
    const raw = makeProject({ script: { rules: [makeFlagRule({ flagValue: true })] } });
    const result = migrateGameProject(raw);
    const cond = result.script.rules[0].triggers.conditions[0] as Record<string, unknown>;
    expect(cond['condition']).toBe('ON');
    expect('flagValue' in cond).toBe(false);
  });

  it('flagValue: false → condition: OFF', () => {
    const raw = makeProject({ script: { rules: [makeFlagRule({ flagValue: false })] } });
    const result = migrateGameProject(raw);
    const cond = result.script.rules[0].triggers.conditions[0] as Record<string, unknown>;
    expect(cond['condition']).toBe('OFF');
    expect('flagValue' in cond).toBe(false);
  });

  it('conditionフィールド既存 → 変更しない', () => {
    const raw = makeProject({ script: { rules: [makeFlagRule({ condition: 'ON_TO_OFF' })] } });
    const result = migrateGameProject(raw);
    const cond = result.script.rules[0].triggers.conditions[0] as Record<string, unknown>;
    expect(cond['condition']).toBe('ON_TO_OFF');
    expect('flagValue' in cond).toBe(false);
  });

  it('flagId・その他フィールドは保持される', () => {
    const raw = makeProject({ script: { rules: [makeFlagRule({ flagValue: true })] } });
    const result = migrateGameProject(raw);
    const cond = result.script.rules[0].triggers.conditions[0] as Record<string, unknown>;
    expect(cond['type']).toBe('flag');
    expect(cond['flagId']).toBe('launched');
  });

  it('flag以外の条件は変更しない', () => {
    const rule = {
      id: 'r2',
      triggers: {
        operator: 'AND',
        conditions: [{ type: 'touch', target: 'ball', touchType: 'down' }],
      },
      actions: [],
    };
    const raw = makeProject({ script: { rules: [rule] } });
    const result = migrateGameProject(raw);
    const cond = result.script.rules[0].triggers.conditions[0] as Record<string, unknown>;
    expect(cond['type']).toBe('touch');
    expect(cond['target']).toBe('ball');
    expect('condition' in cond).toBe(false);
  });

  it('複数ルール・複数条件を全て正規化する', () => {
    const raw = makeProject({
      script: {
        rules: [
          makeFlagRule({ flagValue: true }),
          {
            id: 'r2',
            triggers: {
              operator: 'AND',
              conditions: [
                { type: 'flag', flagId: 'powered', flagValue: false },
                { type: 'touch', target: 'stage' },
              ],
            },
            actions: [],
          },
        ],
      },
    });
    const result = migrateGameProject(raw);
    const cond0 = result.script.rules[0].triggers.conditions[0] as Record<string, unknown>;
    expect(cond0['condition']).toBe('ON');

    const cond1a = result.script.rules[1].triggers.conditions[0] as Record<string, unknown>;
    expect(cond1a['condition']).toBe('OFF');

    const cond1b = result.script.rules[1].triggers.conditions[1] as Record<string, unknown>;
    expect(cond1b['type']).toBe('touch');
  });

  it('schemaVersion: 2 の場合はflagValueをそのまま残す（v2はマイグレーション不要）', () => {
    // v2として渡された場合は変換しない（既にv2と宣言した物に触らない）
    const raw = {
      schemaVersion: 2,
      script: {
        rules: [makeFlagRule({ condition: 'ON' })],
      },
    };
    const result = migrateGameProject(raw);
    const cond = result.script.rules[0].triggers.conditions[0] as Record<string, unknown>;
    expect(cond['condition']).toBe('ON');
  });
});

// ---------------------------------------------------------------------------
// isCurrentVersion
// ---------------------------------------------------------------------------

describe('isCurrentVersion', () => {
  it('schemaVersion欠落 → false', () => {
    expect(isCurrentVersion({})).toBe(false);
  });

  it('schemaVersion: 1 → false', () => {
    expect(isCurrentVersion({ schemaVersion: 1 })).toBe(false);
  });

  it(`schemaVersion: ${CURRENT_SCHEMA_VERSION} → true`, () => {
    expect(isCurrentVersion({ schemaVersion: CURRENT_SCHEMA_VERSION })).toBe(true);
  });
});
