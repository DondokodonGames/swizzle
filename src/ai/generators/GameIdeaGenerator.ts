/**
 * GameIdeaGenerator
 *
 * 面白いゲームアイデアを生成するジェネレーター
 * GPT-4o-mini / Claude を使用して、ユニークで面白いゲームコンセプトを生成
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// ゲームアイデアの型定義
export interface GameIdea {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  theme: string;
  visualStyle: string;
  mainMechanic: GameMechanic;
  subMechanics: GameMechanic[];
  winCondition: string;
  loseCondition: string;
  duration: number;
  difficulty: 'easy' | 'normal' | 'hard';
  objectCount: number;
  estimatedRuleCount: number;
  funScore: number;
  uniqueness: string;
  targetAudience: string;
  emotionalHook: string;
}

export type GameMechanic =
  | 'tap-target'      // 特定オブジェクトをタップ
  | 'tap-avoid'       // 特定オブジェクトを避けてタップ
  | 'tap-sequence'    // 順番にタップ
  | 'tap-rhythm'      // リズムに合わせてタップ
  | 'swipe-direction' // 方向スワイプ
  | 'drag-drop'       // ドラッグ&ドロップ
  | 'hold-release'    // 長押し&離す
  | 'catch-falling'   // 落下物をキャッチ
  | 'dodge-moving'    // 動く障害物を避ける
  | 'match-pattern'   // パターンマッチング
  | 'count-objects'   // オブジェクトを数える
  | 'find-different'  // 仲間はずれを探す
  | 'memory-match'    // 記憶マッチング
  | 'timing-action'   // タイミングアクション
  | 'chase-target'    // 追いかける
  | 'collect-items'   // アイテム収集
  | 'protect-target'  // ターゲットを守る
  | 'balance-game'    // バランスゲーム
  | 'reaction-test';  // 反射神経テスト

// ゲームテーマの候補
const GAME_THEMES = [
  '宇宙・惑星', '森・自然', '海・水中', '空・雲', '都市・建物',
  '食べ物・料理', '動物・ペット', '昆虫', 'スポーツ', '音楽・楽器',
  '季節（春夏秋冬）', 'ファンタジー', 'サイエンス', 'お祭り', '学校',
  'おもちゃ', 'キャンディ・スイーツ', '忍者・侍', 'ロボット', '恐竜'
];

// ビジュアルスタイル
const VISUAL_STYLES = [
  'かわいい・ポップ', 'クール・スタイリッシュ', 'ミニマル・シンプル',
  '手描き風', 'ドット絵風', 'パステルカラー', 'ビビッドカラー',
  '和風', '北欧風', 'レトロ'
];

export interface GameIdeaGeneratorConfig {
  provider: 'anthropic' | 'openai';
  model?: string;
  maxRetries?: number;
  minFunScore?: number;
}

export class GameIdeaGenerator {
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private config: Required<GameIdeaGeneratorConfig>;
  private generatedIdeas: Set<string> = new Set();

  constructor(config: GameIdeaGeneratorConfig) {
    this.config = {
      provider: config.provider,
      model: config.model || (config.provider === 'anthropic' ? 'claude-3-5-haiku-latest' : 'gpt-4o-mini'),
      maxRetries: config.maxRetries || 3,
      minFunScore: config.minFunScore || 7
    };

    if (config.provider === 'anthropic') {
      this.anthropic = new Anthropic();
    } else {
      this.openai = new OpenAI();
    }
  }

  /**
   * ゲームアイデアを生成
   */
  async generate(existingMechanics?: string[]): Promise<GameIdea> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.config.maxRetries) {
      try {
        const idea = await this.generateIdea(existingMechanics);

        // 重複チェック
        const ideaHash = this.hashIdea(idea);
        if (this.generatedIdeas.has(ideaHash)) {
          console.log(`重複アイデア検出、再生成: ${idea.title}`);
          attempts++;
          continue;
        }

        // 面白さスコアチェック
        if (idea.funScore < this.config.minFunScore) {
          console.log(`面白さスコア不足 (${idea.funScore}/${this.config.minFunScore})、再生成: ${idea.title}`);
          attempts++;
          continue;
        }

        // 成功
        this.generatedIdeas.add(ideaHash);
        return idea;
      } catch (error) {
        lastError = error as Error;
        console.error(`アイデア生成失敗 (試行${attempts + 1}):`, error);
        attempts++;
      }
    }

    throw new Error(`アイデア生成に失敗（${this.config.maxRetries}回試行）: ${lastError?.message}`);
  }

  /**
   * 内部: アイデア生成
   */
  private async generateIdea(existingMechanics?: string[]): Promise<GameIdea> {
    // ランダムなテーマとスタイルを提案
    const suggestedTheme = GAME_THEMES[Math.floor(Math.random() * GAME_THEMES.length)];
    const suggestedStyle = VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)];

    const prompt = this.buildPrompt(suggestedTheme, suggestedStyle, existingMechanics);

    let responseText: string;

    if (this.config.provider === 'anthropic' && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      responseText = (response.content[0] as { text: string }).text;
    } else if (this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      responseText = response.choices[0].message.content || '';
    } else {
      throw new Error('APIクライアントが初期化されていません');
    }

    return this.parseResponse(responseText);
  }

  /**
   * プロンプト構築
   */
  private buildPrompt(theme: string, style: string, existingMechanics?: string[]): string {
    const avoidMechanics = existingMechanics?.join(', ') || 'なし';

    return `あなたはスマホ向け10秒ゲームのプロデューサーです。
子供から大人まで楽しめる、シンプルで面白いゲームを考案してください。

# 基本要件
- 制限時間: 10秒（または成功条件達成まで）
- 画面: スマホ縦画面 (1080×1920px)
- 操作: タッチのみ（タップ、スワイプ、ドラッグ）
- 対象: 子供から大人まで誰でも

# 提案テーマ（参考）
テーマ: ${theme}
スタイル: ${style}
※ 上記は参考です。より面白いアイデアがあれば変更してOKです。

# 避けるべきメカニクス（既存ゲームと被らないように）
${avoidMechanics}

# 面白いゲームの条件
1. 目標が一目でわかる（説明不要）
2. 操作が直感的（1-2種類の操作のみ）
3. 達成感がある（成功時に「やった！」と思える）
4. 適度な緊張感（失敗もありえる）
5. 動きがある（静的なものは避ける）
6. 繰り返し遊びたくなる

# 禁止パターン
- 動かないオブジェクトをただタップするだけ
- 答えが1つの単純なクイズ
- 完全な運ゲー（プレイヤースキルが関係ない）
- 文字を読まないと理解できないゲーム

# 出力形式（JSON）
\`\`\`json
{
  "title": "ゲーム名（日本語、8文字以内）",
  "titleEn": "英語タイトル",
  "description": "説明（20文字以内）",
  "theme": "世界観・テーマ",
  "visualStyle": "ビジュアルスタイル",
  "mainMechanic": "メイン操作（以下から1つ選択: tap-target, tap-avoid, tap-sequence, tap-rhythm, swipe-direction, drag-drop, hold-release, catch-falling, dodge-moving, match-pattern, count-objects, find-different, memory-match, timing-action, chase-target, collect-items, protect-target, balance-game, reaction-test）",
  "subMechanics": ["サブ操作（0-2個）"],
  "winCondition": "勝利条件（具体的に）",
  "loseCondition": "失敗条件（具体的に）",
  "duration": 10,
  "difficulty": "easy",
  "objectCount": 3,
  "estimatedRuleCount": 7,
  "funScore": 8,
  "uniqueness": "このゲームが面白い理由・ユニークなポイント",
  "targetAudience": "想定プレイヤー層",
  "emotionalHook": "プレイヤーが感じる感情（ワクワク、ドキドキ、達成感など）"
}
\`\`\`

funScoreは1-10で自己評価してください。7未満のアイデアは採用しません。
7点以上になるまでアイデアを練り直してから出力してください。`;
  }

  /**
   * レスポンスをパース
   */
  private parseResponse(text: string): GameIdea {
    // JSONブロックを抽出
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      // JSONブロックがない場合、テキスト全体をパース試行
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('JSONが見つかりません');
      }
      text = text.slice(jsonStart, jsonEnd + 1);
    } else {
      text = jsonMatch[1];
    }

    const parsed = JSON.parse(text);

    // バリデーション
    const required = ['title', 'mainMechanic', 'winCondition', 'funScore'];
    for (const field of required) {
      if (!(field in parsed)) {
        throw new Error(`必須フィールド ${field} がありません`);
      }
    }

    // IDを生成
    const id = `idea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      title: parsed.title || '無題',
      titleEn: parsed.titleEn || 'Untitled',
      description: parsed.description || '',
      theme: parsed.theme || '一般',
      visualStyle: parsed.visualStyle || 'ポップ',
      mainMechanic: parsed.mainMechanic as GameMechanic,
      subMechanics: parsed.subMechanics || [],
      winCondition: parsed.winCondition,
      loseCondition: parsed.loseCondition || '時間切れ',
      duration: parsed.duration || 10,
      difficulty: parsed.difficulty || 'easy',
      objectCount: parsed.objectCount || 5,
      estimatedRuleCount: parsed.estimatedRuleCount || 7,
      funScore: parsed.funScore || 5,
      uniqueness: parsed.uniqueness || '',
      targetAudience: parsed.targetAudience || '全年齢',
      emotionalHook: parsed.emotionalHook || '楽しさ'
    };
  }

  /**
   * アイデアのハッシュを生成（重複検出用）
   */
  private hashIdea(idea: GameIdea): string {
    return `${idea.mainMechanic}-${idea.theme}-${idea.winCondition.slice(0, 20)}`;
  }

  /**
   * 生成済みアイデア数を取得
   */
  getGeneratedCount(): number {
    return this.generatedIdeas.size;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.generatedIdeas.clear();
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      provider: this.config.provider,
      model: this.config.model,
      generatedCount: this.generatedIdeas.size,
      minFunScore: this.config.minFunScore
    };
  }
}

// エクスポート
export default GameIdeaGenerator;
