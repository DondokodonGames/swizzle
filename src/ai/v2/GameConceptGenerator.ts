/**
 * Step 1: GameConceptGenerator
 *
 * 4つの評価基準を前提条件として、自由な発想でゲームを考える
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameConcept } from './types';

const CONCEPT_PROMPT = `あなたはスマホ向け10秒ミニゲームのゲームデザイナーです。

# 絶対に守る前提条件

以下の4つを満たさないゲームは存在価値がありません。
これらを満たした上で、自由に創造してください。

1. **目標明確性**
   プレイヤーが画面を見た瞬間に「何をすべきか」がわかる
   - ✅ 「赤いものを全部タップして消す」
   - ❌ 「画面をなんとなく触る」

2. **操作明確性**
   プレイヤーが「どう操作すればいいか」がわかる
   - ✅ 「落ちてくるリンゴの下にキャラを移動してキャッチ」
   - ❌ 「うまくやる」

3. **判定明確性**
   成功と失敗の基準が数値で明確
   - ✅ 「5個キャッチで成功、3個落としたら失敗」
   - ❌ 「なんとなく終わる」「時間切れで終了」

4. **納得感**
   結果に対してプレイヤーが納得できる
   - ✅ 自分の操作ミスで失敗 → 納得
   - ❌ 運だけで決まる、理不尽な判定 → 不満

# ゲーム基本制約
- 制限時間: 5〜15秒
- 画面: スマホ縦画面
- 操作: タッチのみ（タップ、スワイプ、ドラッグ、長押し）

# 自由に考えてよいこと
- テーマ（何でもOK: 宇宙、料理、スポーツ、抽象、ファンタジー、ホラー、SF...）
- ビジュアルスタイル（何でもOK: シンプル、派手、レトロ、モダン、ダーク...）
- ゲームメカニクス（何でもOK: 既存の型にとらわれない）
- 世界観・ストーリー（何でもOK）

# 出力（JSON形式）

{
  "title": "タイトル（日本語）",
  "titleEn": "English Title",
  "description": "一文でゲーム説明",
  "duration": 10,
  "theme": "テーマ（自由記述）",
  "visualStyle": "ビジュアルスタイル（自由記述）",
  "playerGoal": "プレイヤーの目標（具体的に、数値を含む）",
  "playerOperation": "具体的な操作方法（タップ/スワイプ/ドラッグ/長押しを明記）",
  "successCondition": "成功条件（必ず数値を含む）",
  "failureCondition": "失敗条件（必ず数値を含む、時間切れ以外も）",
  "selfEvaluation": {
    "goalClarity": 8,
    "operationClarity": 8,
    "judgmentClarity": 8,
    "acceptance": 8,
    "reasoning": "各項目について1文ずつ理由を記述"
  }
}

JSONのみを出力してください。`;

export interface ConceptGeneratorConfig {
  model?: string;
  minScore?: number;
  dryRun?: boolean;
}

export class GameConceptGenerator {
  private client: Anthropic;
  private config: Required<ConceptGeneratorConfig>;
  private usedThemes: Set<string> = new Set();

  constructor(config?: ConceptGeneratorConfig) {
    this.client = new Anthropic();
    this.config = {
      model: config?.model || 'claude-sonnet-4-20250514',
      minScore: config?.minScore || 7,
      dryRun: config?.dryRun || false
    };
  }

  /**
   * ゲームコンセプトを生成
   */
  async generate(feedback?: string): Promise<GameConcept> {
    if (this.config.dryRun) {
      return this.generateMockConcept();
    }

    let prompt = CONCEPT_PROMPT;

    // 既存テーマを避けるための追加指示
    if (this.usedThemes.size > 0) {
      prompt += `\n\n# 避けるべきテーマ（既出）\n${Array.from(this.usedThemes).join(', ')}\n\n上記とは異なる新しいテーマを考えてください。`;
    }

    // フィードバックがある場合（再生成時）
    if (feedback) {
      prompt += `\n\n# 前回の問題点\n${feedback}\n\n上記の問題を解決したコンセプトを生成してください。`;
    }

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // JSONを抽出
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const concept = JSON.parse(jsonMatch[0]) as GameConcept;

    // スコアチェック
    const { goalClarity, operationClarity, judgmentClarity, acceptance } = concept.selfEvaluation;
    const allAboveMin = [goalClarity, operationClarity, judgmentClarity, acceptance]
      .every(score => score >= this.config.minScore);

    if (!allAboveMin) {
      throw new Error(`Self-evaluation scores below minimum (${this.config.minScore}): ${JSON.stringify(concept.selfEvaluation)}`);
    }

    // テーマを記録
    this.usedThemes.add(concept.theme);

    return concept;
  }

  /**
   * モックコンセプト生成（ドライラン用）
   */
  private generateMockConcept(): GameConcept {
    return {
      title: 'テストゲーム',
      titleEn: 'Test Game',
      description: 'テスト用のゲームです',
      duration: 10,
      theme: 'テスト',
      visualStyle: 'シンプル',
      playerGoal: '画面に表示される5つの赤いターゲットを全てタップして消す',
      playerOperation: 'ターゲットをタップして消す',
      successCondition: '5つ全てのターゲットをタップ',
      failureCondition: '3つ以上タップし損ねる、または時間切れ',
      selfEvaluation: {
        goalClarity: 9,
        operationClarity: 9,
        judgmentClarity: 9,
        acceptance: 8,
        reasoning: 'テスト用のシンプルなコンセプト'
      }
    };
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.usedThemes.clear();
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      config: this.config,
      usedThemesCount: this.usedThemes.size
    };
  }
}
