import { describe, it, expect } from 'vitest';
import { validateRulesAgainstContract } from '../contractValidation';
import type { GameProject } from '../GameProject';

function projectWithActions(actions: any[], conditions: any[] = [{ type: 'touch', touchType: 'down', target: 'self' }]): GameProject {
  return {
    script: {
      rules: [{ id: 'r1', name: 'rule', triggers: { operator: 'AND', conditions }, actions }],
    },
  } as unknown as GameProject;
}

describe('validateRulesAgainstContract', () => {
  it('削除済みの showMessage アクションを拒否する', () => {
    const errors = validateRulesAgainstContract(projectWithActions([{ type: 'showMessage', text: 'Good!' }]));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('showMessage');
  });

  it('未知の条件タイプを拒否する', () => {
    const errors = validateRulesAgainstContract(projectWithActions([{ type: 'addScore', points: 1 }], [{ type: 'always' }, { type: 'bogus' }]));
    expect(errors.some((e) => e.includes('bogus'))).toBe(true);
  });

  it('有効なアクション/条件は通る(pause/restart/always 含む)', () => {
    const errors = validateRulesAgainstContract(
      projectWithActions(
        [{ type: 'pause', duration: 1 }, { type: 'restart' }, { type: 'success' }],
        [{ type: 'always' }]
      )
    );
    expect(errors).toEqual([]);
  });
});
