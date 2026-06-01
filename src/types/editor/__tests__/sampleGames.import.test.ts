import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { validateProjectForImport, validateRulesAgainstContract } from '../contractValidation';

// 既存サンプルゲームが「単一の正解」契約に適合し、インポート検証を通ることを保証する。
// （Codex量産で参照される手本のため、ここが壊れると量産物も壊れる）

const SAMPLES_DIR = resolve(process.cwd(), 'public/sample-games');
const files = readdirSync(SAMPLES_DIR).filter((f) => f.endsWith('.json'));

describe('public/sample-games の契約適合', () => {
  it('サンプルゲームが存在する', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file}: 無効なアクション/条件タイプを含まない`, () => {
      const raw = JSON.parse(readFileSync(resolve(SAMPLES_DIR, file), 'utf-8'));
      const project = raw.project ?? raw;
      const errors = validateRulesAgainstContract(project);
      expect(errors).toEqual([]);
    });

    it(`${file}: インポート検証を通過する`, () => {
      const raw = JSON.parse(readFileSync(resolve(SAMPLES_DIR, file), 'utf-8'));
      const project = raw.project ?? raw;
      const errors = validateProjectForImport(project);
      expect(errors).toEqual([]);
    });
  }
});
