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

// 注: テーマは静的リストを使用せず、AIが動的に生成する

export interface GameIdeaGeneratorConfig {
  provider: 'anthropic' | 'openai';
  model?: string;
  maxRetries?: number;
  minFunScore?: number;
  dryRun?: boolean;
}

export class GameIdeaGenerator {
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private config: Required<GameIdeaGeneratorConfig>;
  private generatedIdeas: Set<string> = new Set();
  private usedThemes: Set<string> = new Set();
  private usedMechanics: Set<string> = new Set();
  private mockCounter: number = 0;

  constructor(config: GameIdeaGeneratorConfig) {
    this.config = {
      provider: config.provider,
      model: config.model || (config.provider === 'anthropic' ? 'claude-3-5-haiku-latest' : 'gpt-4o-mini'),
      maxRetries: config.maxRetries || 3,
      minFunScore: config.minFunScore || 7,
      dryRun: config.dryRun || false
    };

    // ドライランモードではAPIクライアントを初期化しない
    if (!this.config.dryRun) {
      if (config.provider === 'anthropic') {
        this.anthropic = new Anthropic();
      } else {
        this.openai = new OpenAI();
      }
    }
  }

  /**
   * ゲームアイデアを生成
   * @param additionalMechanicsToAvoid 追加で避けるべきメカニクス（外部から指定）
   */
  async generate(additionalMechanicsToAvoid?: string[]): Promise<GameIdea> {
    let attempts = 0;
    let lastError: Error | null = null;

    // 避けるべきメカニクスを統合
    const mechanicsToAvoid = [
      ...Array.from(this.usedMechanics),
      ...(additionalMechanicsToAvoid || [])
    ];

    // 避けるべきテーマ
    const themesToAvoid = Array.from(this.usedThemes);

    while (attempts < this.config.maxRetries) {
      try {
        const idea = await this.generateIdea(mechanicsToAvoid, themesToAvoid);

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

        // 成功 - 使用済みとして記録
        this.generatedIdeas.add(ideaHash);
        this.usedThemes.add(idea.theme);
        this.usedMechanics.add(idea.mainMechanic);

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
  private async generateIdea(existingMechanics?: string[], existingThemes?: string[]): Promise<GameIdea> {
    // ドライランモードの場合はモックデータを返す
    if (this.config.dryRun) {
      return this.generateMockIdea();
    }

    const prompt = this.buildPrompt(existingMechanics, existingThemes);

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
   * モックアイデア生成（ドライランテスト用）
   */
  private generateMockIdea(): GameIdea {
    this.mockCounter++;

    const mechanics: GameMechanic[] = [
      'tap-target', 'tap-avoid', 'collect-items', 'catch-falling', 'dodge-moving',
      'tap-sequence', 'timing-action', 'reaction-test', 'match-pattern', 'find-different'
    ];
    const mechanic = mechanics[this.mockCounter % mechanics.length];

    const themes = [
      '宇宙探検', 'お菓子の国', '忍者修行', 'ゾンビアポカリプス', '海底王国',
      '時計塔', '雲の上の世界', 'おもちゃ箱', '氷の洞窟', '火山の島'
    ];
    const theme = themes[this.mockCounter % themes.length];

    return {
      id: `mock_idea_${Date.now()}_${this.mockCounter}`,
      title: `テスト${this.mockCounter}`,
      titleEn: `Test Game ${this.mockCounter}`,
      description: `テスト用のゲーム説明${this.mockCounter}`,
      theme: theme,
      visualStyle: 'ポップ・カラフル',
      mainMechanic: mechanic,
      subMechanics: [],
      winCondition: '全てのターゲットを集める',
      loseCondition: '時間切れ',
      duration: 10,
      difficulty: 'normal',
      objectCount: 5,
      estimatedRuleCount: 7,
      funScore: 8,
      uniqueness: 'テスト用モックゲーム',
      targetAudience: '全年齢',
      emotionalHook: '達成感'
    };
  }

  /**
   * プロンプト構築
   */
  private buildPrompt(existingMechanics?: string[], existingThemes?: string[]): string {
    const avoidMechanics = existingMechanics?.length ? existingMechanics.join(', ') : 'なし';
    const avoidThemes = existingThemes?.length ? existingThemes.join(', ') : 'なし';

    return `あなたはスマホ向け10秒ゲームのプロデューサーです。
誰も見たことがない、ユニークで面白いゲームを自由に考案してください。

# 基本要件
- 制限時間: 5-15秒（成功条件達成まで）
- 画面: スマホ縦画面
- 操作: タッチのみ（タップ、スワイプ、ドラッグ、長押し）

# テーマ・世界観について
**あなたの創造力で自由に決めてください。** 制限はありません。
- 現実的なものでも抽象的なものでもOK
- 日常的なものでもファンタジーでもOK
- 真面目でもシュールでもOK
- 既存のカテゴリに縛られる必要なし

ただし、以下のテーマは既に使用済みなので避けてください:
${avoidThemes}

# 避けるべきメカニクス（既に使用済み）
${avoidMechanics}

# 面白いゲームの条件
1. 目標が一目でわかる（説明不要）
2. 操作が直感的（1-2種類のみ）
3. 達成感がある（成功時に「やった！」）
4. 適度な緊張感（失敗もありえる）
5. 動きがある（静的は×）
6. 繰り返し遊びたくなる

# 禁止パターン
- 動かないものをタップするだけ
- 単純な1問クイズ
- 完全な運ゲー
- 文字を読まないとわからない

# 出力形式（JSON）
\`\`\`json
{
  "title": "ゲーム名（日本語、8文字以内）",
  "titleEn": "English Title",
  "description": "説明（20文字以内）",
  "theme": "あなたが考えた独自のテーマ・世界観",
  "visualStyle": "あなたが考えた独自のビジュアルスタイル",
  "mainMechanic": "tap-target | tap-avoid | tap-sequence | tap-rhythm | swipe-direction | drag-drop | hold-release | catch-falling | dodge-moving | match-pattern | count-objects | find-different | memory-match | timing-action | chase-target | collect-items | protect-target | balance-game | reaction-test",
  "subMechanics": [],
  "winCondition": "具体的な勝利条件",
  "loseCondition": "具体的な失敗条件",
  "duration": 10,
  "difficulty": "easy | normal | hard",
  "objectCount": 3,
  "estimatedRuleCount": 7,
  "funScore": 8,
  "uniqueness": "このゲームが面白い理由・他にないポイント",
  "targetAudience": "想定プレイヤー層",
  "emotionalHook": "プレイヤーが感じる感情"
}
\`\`\`

重要: funScoreは1-10で正直に自己評価してください。
7未満のアイデアは採用しません。7点以上になるまで練り直してから出力を。`;
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
    this.usedThemes.clear();
    this.usedMechanics.clear();
  }

  /**
   * 使用済みテーマを取得
   */
  getUsedThemes(): string[] {
    return Array.from(this.usedThemes);
  }

  /**
   * 使用済みメカニクスを取得
   */
  getUsedMechanics(): string[] {
    return Array.from(this.usedMechanics);
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      provider: this.config.provider,
      model: this.config.model,
      generatedCount: this.generatedIdeas.size,
      usedThemesCount: this.usedThemes.size,
      usedMechanicsCount: this.usedMechanics.size,
      minFunScore: this.config.minFunScore
    };
  }
}

// エクスポート
export default GameIdeaGenerator;
