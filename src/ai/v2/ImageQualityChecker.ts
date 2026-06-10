/**
 * ImageQualityChecker
 *
 * 生成画像の視覚QA。Claude (Haiku) の vision で
 * AssetGenerator のプロンプト要件（白背景・単一オブジェクト・フラット・
 * スタイルシート準拠）を満たしているか採点する。
 *
 * 設計方針:
 * - QA基盤の障害で生成を止めない（API失敗時は passed: true で通す）
 * - SVG（claude-svg / プレースホルダー）は vision 非対応のためスキップ
 *   （プレースホルダーの品質減点は GeneratedObject.isPlaceholder 側で行う）
 * - mock モード（DRY_RUN / IMAGE_PROVIDER=mock）は API を呼ばず固定値を返す
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameConcept, AssetPlan } from './types';
import { robustParseJSON } from './jsonParser';

export interface ImageQualityResult {
  /** 総合 0-100 */
  score: number;
  /** スタイル一致度 0-10 */
  styleMatch: number;
  /** 単一オブジェクトか（オブジェクト画像のみ意味を持つ） */
  singleObject: boolean;
  /** 白背景か（オブジェクト画像のみ意味を持つ） */
  whiteBackground: boolean;
  /** パレット準拠度 0-10 */
  paletteAdherence: number;
  /** 不合格理由（再生成プロンプトにフィードバックされる） */
  issues: string[];
  /** score >= passThreshold */
  passed: boolean;
  /** SVG等で vision 評価をスキップした場合 true（平均計算から除外する） */
  skipped?: boolean;
}

interface RawVisionVerdict {
  styleMatch: number;
  singleObject: boolean;
  whiteBackground: boolean;
  paletteAdherence: number;
  overall: number;
  issues: string[];
}

/** テスト時に偽クライアントを注入できる最小インターフェース */
export interface VisionClient {
  messages: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create(params: any): Promise<{
      content: Array<{ type: string; text?: string }>;
    }>;
  };
}

export interface ImageQualityCheckerConfig {
  anthropicApiKey?: string;
  /** true なら API を呼ばず固定の合格結果を返す */
  mock?: boolean;
  /** この点数未満は passed: false（既定 60） */
  passThreshold?: number;
  /** テスト用のクライアント注入 */
  client?: VisionClient;
}

const VISION_MODEL = 'claude-haiku-4-5-20251001';
const SUPPORTED_MEDIA = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

export class ImageQualityChecker {
  private client?: VisionClient;
  private mock: boolean;
  private passThreshold: number;

  constructor(config: ImageQualityCheckerConfig = {}) {
    this.mock = config.mock ?? false;
    this.passThreshold = config.passThreshold ?? 60;

    if (config.client) {
      this.client = config.client;
    } else if (!this.mock && config.anthropicApiKey) {
      this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    }
  }

  /**
   * オブジェクト画像のQA
   * @param styleSheet AssetGenerator.buildStyleSheet() の出力（生成側と同一基準）
   */
  async checkObjectImage(
    dataUrl: string,
    plan: AssetPlan['objects'][0],
    concept: GameConcept,
    styleSheet: string
  ): Promise<ImageQualityResult> {
    const criteria = `This image was generated as a mobile game sprite with these REQUIREMENTS:
- Depicts: ${plan.visualDescription} (role in game: ${plan.purpose})
- Pure white background (#FFFFFF) — no texture, no gradient, no scenery
- Single object only, centered, filling 70-80% of the frame
- Flat vector / cartoon style with bold outlines and solid flat colors
- NOT photorealistic, no text or labels, no multi-element composition
- Theme: ${concept.theme}, visual style: ${concept.visualStyle}
${styleSheet}`;

    return this.runVisionCheck(dataUrl, criteria, /* isObject */ true);
  }

  /**
   * 背景画像のQA
   */
  async checkBackground(dataUrl: string, concept: GameConcept): Promise<ImageQualityResult> {
    const criteria = `This image was generated as a mobile game BACKGROUND with these REQUIREMENTS:
- Theme: ${concept.theme}, visual style: ${concept.visualStyle}
- Central area must be OPEN and UNCLUTTERED (game sprites are overlaid on top)
- Decorative elements only at edges/corners
- Mood conveyed through color and texture only — no characters, no gameplay elements
- No written text or labels, not photorealistic, not a busy scene`;

    return this.runVisionCheck(dataUrl, criteria, /* isObject */ false);
  }

  // ============================================================

  private async runVisionCheck(
    dataUrl: string,
    criteria: string,
    isObject: boolean
  ): Promise<ImageQualityResult> {
    if (this.mock) {
      return {
        score: 85, styleMatch: 8, singleObject: true, whiteBackground: true,
        paletteAdherence: 8, issues: [], passed: true
      };
    }

    // SVG は vision 非対応 → スキップ（平均計算から除外）
    const media = this.parseDataUrl(dataUrl);
    if (!media) {
      return {
        score: 0, styleMatch: 0, singleObject: true, whiteBackground: true,
        paletteAdherence: 0, issues: [], passed: true, skipped: true
      };
    }

    if (!this.client) {
      // APIキーなし → QA無効と同義（スキップ扱い）
      return {
        score: 0, styleMatch: 0, singleObject: true, whiteBackground: true,
        paletteAdherence: 0, issues: [], passed: true, skipped: true
      };
    }

    try {
      const response = await this.client.messages.create({
        model: VISION_MODEL,
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: media.mediaType, data: media.base64 }
            },
            {
              type: 'text',
              text: `${criteria}

Evaluate strictly whether the image satisfies the requirements. Respond with ONLY this JSON (no code block):
{"styleMatch": 0-10, "singleObject": true/false, "whiteBackground": true/false, "paletteAdherence": 0-10, "overall": 0-100, "issues": ["concrete issue in English, actionable as image-generation feedback"]}

Scoring guidance:
- overall >= 80: fully meets requirements, ship as-is
- overall 60-79: minor deviations (slight background tint, minor extra elements)
- overall < 60: requirement violations (${isObject
                ? 'scenery behind object, multiple objects, photorealistic rendering, text in image'
                : 'cluttered center, characters/gameplay elements, text in image'})
- issues must be empty when overall >= 80`
            }
          ]
        }]
      });

      const raw = response.content[0]?.type === 'text' ? (response.content[0].text ?? '') : '';
      const verdict = this.parseVerdict(raw);
      const score = Math.max(0, Math.min(100, Math.round(verdict.overall)));

      return {
        score,
        styleMatch: verdict.styleMatch,
        singleObject: verdict.singleObject,
        whiteBackground: verdict.whiteBackground,
        paletteAdherence: verdict.paletteAdherence,
        issues: verdict.issues,
        passed: score >= this.passThreshold
      };
    } catch (error) {
      // QA基盤の障害で生成を止めない
      console.log(`      ⚠️ Image QA failed (${error instanceof Error ? error.message : error}), accepting image`);
      return {
        score: 0, styleMatch: 0, singleObject: true, whiteBackground: true,
        paletteAdherence: 0, issues: ['qa_check_failed'], passed: true, skipped: true
      };
    }
  }

  /** LLM応答のJSONを解析（テストから直接検証できるよう public） */
  parseVerdict(raw: string): RawVisionVerdict {
    const parsed = robustParseJSON<Partial<RawVisionVerdict>>(raw);
    return {
      styleMatch: typeof parsed.styleMatch === 'number' ? parsed.styleMatch : 0,
      singleObject: parsed.singleObject !== false,
      whiteBackground: parsed.whiteBackground !== false,
      paletteAdherence: typeof parsed.paletteAdherence === 'number' ? parsed.paletteAdherence : 0,
      overall: typeof parsed.overall === 'number' ? parsed.overall : 0,
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : []
    };
  }

  private parseDataUrl(dataUrl: string): { mediaType: typeof SUPPORTED_MEDIA[number]; base64: string } | null {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) return null;
    const mediaType = match[1] as typeof SUPPORTED_MEDIA[number];
    if (!SUPPORTED_MEDIA.includes(mediaType)) return null;
    return { mediaType, base64: match[2] };
  }
}
