import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetGenerator, resolveImageQAFromEnv } from '../AssetGenerator';
import { ImageQualityChecker, ImageQualityResult } from '../ImageQualityChecker';
import { GameConcept, AssetPlan } from '../types';

const { generateMock } = vi.hoisted(() => ({ generateMock: vi.fn() }));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    images = { generate: generateMock };
  }
}));

const concept: GameConcept = {
  title: 'テスト', titleEn: 'Test', description: 'テスト', duration: 7,
  theme: '宇宙', visualStyle: 'ポップ',
  playerGoal: 'goal', playerOperation: 'tap', successCondition: '1', failureCondition: '1',
  selfEvaluation: { goalClarity: 8, operationClarity: 8, judgmentClarity: 8, acceptance: 8, reasoning: '' }
};

function makePlan(objectCount: number = 1): AssetPlan {
  return {
    background: { description: '宇宙の背景', mood: '神秘的' },
    objects: Array.from({ length: objectCount }, (_, i) => ({
      id: `obj_${i}`, name: `星${i}`, purpose: 'タップ対象',
      visualDescription: '黄色い星', initialPosition: { x: 0.5, y: 0.5 }, size: 'medium' as const
    })),
    sounds: [{ id: 'se_tap', trigger: 'tap', type: 'tap' as const }]
  };
}

function qaResult(overrides: Partial<ImageQualityResult> = {}): ImageQualityResult {
  return {
    score: 90, styleMatch: 9, singleObject: true, whiteBackground: true,
    paletteAdherence: 8, issues: [], passed: true, ...overrides
  };
}

function makeChecker(objectResults: ImageQualityResult[], bgResult: ImageQualityResult = qaResult()) {
  let call = 0;
  return {
    checkObjectImage: vi.fn().mockImplementation(() => Promise.resolve(objectResults[Math.min(call++, objectResults.length - 1)])),
    checkBackground: vi.fn().mockResolvedValue(bgResult)
  } as unknown as ImageQualityChecker;
}

beforeEach(() => {
  generateMock.mockReset();
  generateMock.mockResolvedValue({ data: [{ b64_json: 'iVBORw0KGgo=' }] });
});

describe('AssetGenerator – プレースホルダーフラグ', () => {
  it('mockプロバイダの全オブジェクトに isPlaceholder: true が付く', async () => {
    const gen = new AssetGenerator({ imageProvider: 'mock' });
    const assets = await gen.generate(concept, makePlan(2));
    expect(assets.objects).toHaveLength(2);
    for (const obj of assets.objects) {
      expect(obj.isPlaceholder).toBe(true);
    }
    // QA無効なので imageQuality は undefined（QualityScorerで中立扱い）
    expect(assets.imageQuality).toBeUndefined();
  });

  it('DALL-E生成失敗時はプレースホルダーにフォールバックする', async () => {
    generateMock.mockRejectedValue(new Error('API down'));
    const gen = new AssetGenerator({ imageProvider: 'openai', openaiApiKey: 'sk-test' });
    const assets = await gen.generate(concept, makePlan(1));
    expect(assets.objects[0].isPlaceholder).toBe(true);
  });
});

describe('AssetGenerator – QA再生成ループ', () => {
  it('QA合格時は再生成しない', async () => {
    const checker = makeChecker([qaResult({ score: 85, passed: true })]);
    const gen = new AssetGenerator(
      { imageProvider: 'openai', openaiApiKey: 'sk-test', imageQA: { enabled: true, maxRetriesPerImage: 1 } },
      checker
    );
    const assets = await gen.generate(concept, makePlan(1));
    // 1オブジェクト1回 + 背景1回 = generate 2回
    expect(generateMock).toHaveBeenCalledTimes(2);
    expect(assets.objects[0].imageScore).toBe(85);
    expect(assets.imageQuality?.regeneratedCount).toBe(0);
  });

  it('QA不合格時は issues 付きで1回だけ再生成し、ベストスコアを採用する', async () => {
    const checker = makeChecker([
      qaResult({ score: 40, passed: false, issues: ['scenery behind object'] }),
      qaResult({ score: 88, passed: true })
    ]);
    const gen = new AssetGenerator(
      { imageProvider: 'openai', openaiApiKey: 'sk-test', imageQA: { enabled: true, maxRetriesPerImage: 1 } },
      checker
    );
    const assets = await gen.generate(concept, makePlan(1));
    // 背景1回 + オブジェクト2回（初回+再生成） = 3回
    expect(generateMock).toHaveBeenCalledTimes(3);
    // 再生成プロンプトに前回のissuesが含まれる
    const retryPrompt = generateMock.mock.calls
      .map((c: unknown[]) => (c[0] as { prompt: string }).prompt)
      .find((p: string) => p.includes('PREVIOUS ATTEMPT FAILED QA'));
    expect(retryPrompt).toContain('scenery behind object');
    expect(assets.objects[0].imageScore).toBe(88);
    expect(assets.imageQuality?.regeneratedCount).toBe(1);
  });

  it('maxRetriesPerImage を超えて再生成しない（全不合格ならベストを採用）', async () => {
    const checker = makeChecker([
      qaResult({ score: 30, passed: false, issues: ['bad'] }),
      qaResult({ score: 45, passed: false, issues: ['still bad'] })
    ]);
    const gen = new AssetGenerator(
      { imageProvider: 'openai', openaiApiKey: 'sk-test', imageQA: { enabled: true, maxRetriesPerImage: 1 } },
      checker
    );
    const assets = await gen.generate(concept, makePlan(1));
    // 背景1回 + オブジェクト最大2回 = 3回（3回目の再生成はしない）
    expect(generateMock).toHaveBeenCalledTimes(3);
    expect(assets.objects[0].imageScore).toBe(45); // ベストスコア採用
  });

  it('imageQuality サマリー: プレースホルダーは0点として平均に含む', async () => {
    // 呼び出し順: 1回目=背景、2回目=obj_0（QA 100点）、3回目=obj_1（生成失敗→プレースホルダー）
    let call = 0;
    generateMock.mockImplementation(() => {
      call++;
      if (call === 3) return Promise.reject(new Error('fail'));
      return Promise.resolve({ data: [{ b64_json: 'aW1n' }] });
    });
    const checker = makeChecker([qaResult({ score: 100 })], qaResult({ score: 80 }));
    const gen = new AssetGenerator(
      { imageProvider: 'openai', openaiApiKey: 'sk-test', imageQA: { enabled: true, maxRetriesPerImage: 1 } },
      checker
    );
    const assets = await gen.generate(concept, makePlan(2));
    expect(assets.imageQuality?.placeholderCount).toBe(1);
    // (100 + 0 + 80) / 3 = 60
    expect(assets.imageQuality?.averageScore).toBe(60);
  });
});

describe('AssetGenerator – アートディレクション定義の読み込み', () => {
  it('DALL-Eオブジェクトプロンプトに art-direction.json の様式文・パレット・禁止事項が入る', async () => {
    const gen = new AssetGenerator({ imageProvider: 'openai', openaiApiKey: 'sk-test' });
    await gen.generate(concept, makePlan(1));

    const objectPrompt = generateMock.mock.calls
      .map((c: unknown[]) => (c[0] as { prompt: string }).prompt)
      .find((p: string) => p.includes('Game object icon'));

    expect(objectPrompt).toBeDefined();
    // 様式名・描法・パレット・禁止事項が art-direction.json から組み立てられている
    expect(objectPrompt).toContain('GALLERY');
    expect(objectPrompt).toContain('#FF3B1F'); // vermilion accent
    expect(objectPrompt).toContain('flat vector'); // rendering
    expect(objectPrompt).toMatch(/NOT neon/i); // negative
  });

  it('mock(SVG)プレースホルダーの配色がパレット色（インク/アクセント）にスナップする', async () => {
    const gen = new AssetGenerator({ imageProvider: 'mock' });
    const assets = await gen.generate(concept, makePlan(1));
    const svg = Buffer.from(assets.objects[0].frames[0].dataUrl.split(',')[1], 'base64').toString();
    // ランダムHSLではなくパレットのHEX（インク #111111 もしくはアクセント #FF3B1F 等）を使う
    expect(svg).not.toContain('hsl(');
    expect(svg).toMatch(/#[0-9A-Fa-f]{6}/);
  });
});

describe('resolveImageQAFromEnv', () => {
  it('openai プロバイダはデフォルトで有効、他は無効', () => {
    delete process.env.IMAGE_QA;
    delete process.env.IMAGE_QA_MAX_RETRIES;
    expect(resolveImageQAFromEnv('openai').enabled).toBe(true);
    expect(resolveImageQAFromEnv('mock').enabled).toBe(false);
    expect(resolveImageQAFromEnv('claude-svg').enabled).toBe(false);
  });

  it('IMAGE_QA=false で無効化できる', () => {
    process.env.IMAGE_QA = 'false';
    expect(resolveImageQAFromEnv('openai').enabled).toBe(false);
    delete process.env.IMAGE_QA;
  });

  it('IMAGE_QA_MAX_RETRIES は 0〜2 にクランプされる（既定1）', () => {
    delete process.env.IMAGE_QA_MAX_RETRIES;
    expect(resolveImageQAFromEnv('openai').maxRetriesPerImage).toBe(1);
    process.env.IMAGE_QA_MAX_RETRIES = '5';
    expect(resolveImageQAFromEnv('openai').maxRetriesPerImage).toBe(2);
    process.env.IMAGE_QA_MAX_RETRIES = '0';
    expect(resolveImageQAFromEnv('openai').maxRetriesPerImage).toBe(0);
    delete process.env.IMAGE_QA_MAX_RETRIES;
  });
});
