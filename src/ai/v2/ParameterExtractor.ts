/**
 * ParameterExtractor
 *
 * neta-all.json の各アイデアから、対応するファクトリーのパラメータを抽出する。
 * Claude Haiku を使用（最小トークン・低コスト）。
 *
 * Usage:
 *   const extractor = new ParameterExtractor(apiKey);
 *   const params = await extractor.extract(netaItem, 'CounterTap');
 */

import Anthropic from '@anthropic-ai/sdk';

import type {
  CounterTapParams,
  TimingWindowParams,
  MultiChoiceParams,
  DragDropParams,
  ScrollDodgeParams,
  ProjectileParams,
  HoldParams,
} from './template-factories/types.js';

export type FactoryParams =
  | CounterTapParams
  | TimingWindowParams
  | MultiChoiceParams
  | DragDropParams
  | ScrollDodgeParams
  | ProjectileParams
  | HoldParams;

export type FactoryName =
  | 'CounterTap'
  | 'TimingWindow'
  | 'MultiChoice'
  | 'DragDrop'
  | 'ScrollDodge'
  | 'Projectile'
  | 'Hold';

interface NetaItem {
  id: number;
  title: string;
  idea: string;
  mechanic: string;
  theme: string;
}

// 各ファクトリーのパラメータスキーマ説明（Haiku へのプロンプト用）
const PARAM_SCHEMAS: Record<FactoryName, string> = {
  CounterTap: `{
  "targetCount": <number: 何回タップすれば成功か。10〜50の範囲>,
  "duration": <number: 制限時間（秒）。5〜15の範囲>,
  "targetObjectDescription": <string: タップするオブジェクトの見た目（英語20字以内で簡潔に)>,
  "backgroundDescription": <string: 背景の説明（英語20字以内で簡潔に）>,
  "successMessage": <string: 成功時メッセージ（日本語10字以内）>,
  "failureMessage": <string: 失敗時メッセージ（日本語10字以内）>
}`,

  TimingWindow: `{
  "requiredHits": <number: 必要成功回数。3〜10の範囲>,
  "duration": <number: 制限時間（秒）。5〜15の範囲>,
  "allowedMisses": <number: 許容ミス数。0=無制限, 1〜5の範囲>,
  "movingSpeed": <number: ターゲット移動速度 px/sec。150〜500の範囲>,
  "targetObjectDescription": <string: 動くターゲットの見た目（英語20字以内）>,
  "backgroundDescription": <string: 背景の説明（英語20字以内）>,
  "successMessage": <string: 成功時メッセージ（日本語10字以内）>,
  "failureMessage": <string: 失敗時メッセージ（日本語10字以内）>
}`,

  MultiChoice: `{
  "choiceCount": <number: 選択肢の数。2〜4の範囲>,
  "duration": <number: 制限時間（秒）。3〜10の範囲>,
  "questionDescription": <string: 問題・状況の説明（英語30字以内）>,
  "correctDescription": <string: 正解の見た目（英語20字以内）>,
  "wrongDescription": <string: 不正解の見た目（英語20字以内）>,
  "backgroundDescription": <string: 背景の説明（英語20字以内）>,
  "successMessage": <string: 成功時メッセージ（日本語10字以内）>,
  "failureMessage": <string: 失敗時メッセージ（日本語10字以内）>
}`,

  DragDrop: `{
  "itemCount": <number: ドラッグするアイテム数。1〜3の範囲>,
  "duration": <number: 制限時間（秒）。5〜15の範囲>,
  "dragObjectDescription": <string: ドラッグするオブジェクトの見た目（英語20字以内）>,
  "targetZoneDescription": <string: 目標ゾーンの見た目（英語20字以内）>,
  "backgroundDescription": <string: 背景の説明（英語20字以内）>,
  "successMessage": <string: 成功時メッセージ（日本語10字以内）>,
  "failureMessage": <string: 失敗時メッセージ（日本語10字以内）>
}`,

  ScrollDodge: `{
  "mode": <"dodge" | "collect": 避けるか集めるか>,
  "duration": <number: 制限時間（秒）。10〜20の範囲>,
  "targetCount": <number: collectモードの目標収集数。5〜20の範囲>,
  "playerDescription": <string: プレイヤーキャラの見た目（英語20字以内）>,
  "obstacleDescription": <string: 障害物またはアイテムの見た目（英語20字以内）>,
  "backgroundDescription": <string: 背景の説明（英語20字以内）>,
  "successMessage": <string: 成功時メッセージ（日本語10字以内）>,
  "failureMessage": <string: 失敗時メッセージ（日本語10字以内）>
}`,

  Projectile: `{
  "requiredHits": <number: 必要命中数。3〜10の範囲>,
  "duration": <number: 制限時間（秒）。5〜15の範囲>,
  "projectileDescription": <string: 飛ばすものの見た目（英語20字以内）>,
  "targetDescription": <string: 的の見た目（英語20字以内）>,
  "backgroundDescription": <string: 背景の説明（英語20字以内）>,
  "successMessage": <string: 成功時メッセージ（日本語10字以内）>,
  "failureMessage": <string: 失敗時メッセージ（日本語10字以内）>
}`,

  Hold: `{
  "holdDuration": <number: 必要ホールド時間（ミリ秒）。1000〜4000の範囲>,
  "duration": <number: 制限時間（秒）。5〜10の範囲>,
  "holdObjectDescription": <string: 押すオブジェクトの見た目（英語20字以内）>,
  "backgroundDescription": <string: 背景の説明（英語20字以内）>,
  "successMessage": <string: 成功時メッセージ（日本語10字以内）>,
  "failureMessage": <string: 失敗時メッセージ（日本語10字以内）>
}`,
};

export class ParameterExtractor {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  }

  async extract(neta: NetaItem, factoryName: FactoryName): Promise<FactoryParams> {
    const schema = PARAM_SCHEMAS[factoryName];

    const prompt = `ゲームアイデアからパラメータを抽出してください。

タイトル: ${neta.title}
アイデア: ${neta.idea}
テーマ: ${neta.theme}

以下のJSONスキーマに従って、このアイデアに合ったパラメータを出力してください。
JSONのみを出力し、コメントや説明は不要です。

${schema}`;

    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find((b: { type: string }) => b.type === 'text');
    if (!text || text.type !== 'text') {
      throw new Error(`No text in response for neta #${neta.id}`);
    }

    // JSONブロック抽出
    const raw = text.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`No JSON found in response for neta #${neta.id}: ${raw.slice(0, 200)}`);
    }

    return JSON.parse(jsonMatch[0]) as FactoryParams;
  }
}
