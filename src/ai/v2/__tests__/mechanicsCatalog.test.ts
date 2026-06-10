import { describe, it, expect } from 'vitest';
import rawCatalog from '../mechanics-catalog.json';

interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  skillTypes: string[];
}

const catalog = rawCatalog as unknown as {
  version: string;
  mechanics: CatalogEntry[];
};

const VALID_DIFFICULTIES = ['easy', 'normal', 'hard'];
const VALID_SKILL_TYPES = [
  'timing', 'precision', 'observation', 'judgment',
  'speed', 'memory', 'endurance', 'dexterity'
];

describe('mechanics-catalog.json – 整合性', () => {
  it('バージョン1.1以上', () => {
    expect(parseFloat(catalog.version)).toBeGreaterThanOrEqual(1.1);
  });

  it('IDが一意', () => {
    const ids = catalog.mechanics.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('全エントリに id / name / description / difficulty / skillTypes がある', () => {
    for (const m of catalog.mechanics) {
      expect(m.id, `id missing`).toBeTruthy();
      expect(m.name, `${m.id}: name missing`).toBeTruthy();
      expect(m.description, `${m.id}: description missing`).toBeTruthy();
      expect(VALID_DIFFICULTIES, `${m.id}: invalid difficulty "${m.difficulty}"`).toContain(m.difficulty);
      expect(Array.isArray(m.skillTypes), `${m.id}: skillTypes must be array`).toBe(true);
    }
  });

  it('skillTypes は定義済み語彙のみ使用する', () => {
    for (const m of catalog.mechanics) {
      for (const skill of m.skillTypes) {
        expect(VALID_SKILL_TYPES, `${m.id}: unknown skillType "${skill}"`).toContain(skill);
      }
    }
  });

  it('難易度ローテーション用に easy / normal / hard がそれぞれ1件以上ある', () => {
    for (const difficulty of VALID_DIFFICULTIES) {
      const count = catalog.mechanics.filter(m => m.difficulty === difficulty).length;
      expect(count, `difficulty "${difficulty}" has no mechanics`).toBeGreaterThan(0);
    }
  });
});
