import { describe, it, expect, vi } from 'vitest';
import { ImageQualityChecker, VisionClient } from '../ImageQualityChecker';
import { GameConcept, AssetPlan } from '../types';

const concept: GameConcept = {
  title: 'テスト', titleEn: 'Test', description: 'テスト', duration: 7,
  theme: '宇宙', visualStyle: 'ポップ',
  playerGoal: 'goal', playerOperation: 'tap', successCondition: '1', failureCondition: '1',
  selfEvaluation: { goalClarity: 8, operationClarity: 8, judgmentClarity: 8, acceptance: 8, reasoning: '' }
};

const objectPlan: AssetPlan['objects'][0] = {
  id: 'obj_star', name: '星', purpose: 'タップ対象',
  visualDescription: '黄色い星', initialPosition: { x: 0.5, y: 0.5 }, size: 'medium'
};

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';
const SVG_DATA_URL = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';

function makeClient(responseText: string): VisionClient {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: responseText }] })
    }
  };
}

describe('ImageQualityChecker – mockモード', () => {
  it('APIを呼ばず固定の合格結果を返す', async () => {
    const checker = new ImageQualityChecker({ mock: true });
    const result = await checker.checkObjectImage(PNG_DATA_URL, objectPlan, concept, '');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(85);
    expect(result.skipped).toBeUndefined();
  });
});

describe('ImageQualityChecker – vision評価', () => {
  it('合格レスポンスを正しくパースする', async () => {
    const client = makeClient(JSON.stringify({
      styleMatch: 9, singleObject: true, whiteBackground: true,
      paletteAdherence: 8, overall: 88, issues: []
    }));
    const checker = new ImageQualityChecker({ client });
    const result = await checker.checkObjectImage(PNG_DATA_URL, objectPlan, concept, 'STYLE SHEET');
    expect(result.score).toBe(88);
    expect(result.passed).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('passThreshold 未満は不合格になり issues を返す', async () => {
    const client = makeClient(JSON.stringify({
      styleMatch: 3, singleObject: false, whiteBackground: false,
      paletteAdherence: 2, overall: 40, issues: ['scenery behind object']
    }));
    const checker = new ImageQualityChecker({ client, passThreshold: 60 });
    const result = await checker.checkObjectImage(PNG_DATA_URL, objectPlan, concept, '');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(40);
    expect(result.issues).toContain('scenery behind object');
  });

  it('SVGデータURLはvision評価をスキップして通過させる', async () => {
    const client = makeClient('{}');
    const checker = new ImageQualityChecker({ client });
    const result = await checker.checkObjectImage(SVG_DATA_URL, objectPlan, concept, '');
    expect(result.skipped).toBe(true);
    expect(result.passed).toBe(true);
    expect(client.messages.create).not.toHaveBeenCalled();
  });

  it('API障害時は生成を止めず passed: true（skipped扱い）で返す', async () => {
    const client: VisionClient = {
      messages: { create: vi.fn().mockRejectedValue(new Error('rate limit')) }
    };
    const checker = new ImageQualityChecker({ client });
    const result = await checker.checkBackground(PNG_DATA_URL, concept);
    expect(result.passed).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.issues).toContain('qa_check_failed');
  });

  it('クライアント未設定（APIキーなし）はスキップ扱い', async () => {
    const checker = new ImageQualityChecker({});
    const result = await checker.checkObjectImage(PNG_DATA_URL, objectPlan, concept, '');
    expect(result.skipped).toBe(true);
    expect(result.passed).toBe(true);
  });
});

describe('ImageQualityChecker – parseVerdict', () => {
  const checker = new ImageQualityChecker({ mock: true });

  it('コードブロック付きJSONもパースできる', () => {
    const verdict = checker.parseVerdict('```json\n{"overall": 75, "styleMatch": 7, "singleObject": true, "whiteBackground": true, "paletteAdherence": 6, "issues": []}\n```');
    expect(verdict.overall).toBe(75);
  });

  it('欠落フィールドはデフォルト値で埋める', () => {
    const verdict = checker.parseVerdict('{"overall": 50}');
    expect(verdict.styleMatch).toBe(0);
    expect(verdict.singleObject).toBe(true);
    expect(verdict.issues).toEqual([]);
  });
});
