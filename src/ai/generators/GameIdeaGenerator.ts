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
  // 遊び重視の新フィールド
  playerGoal: string;      // プレイヤーが思うこと（例: 「あの敵を倒さなきゃ！」）
  playerAction: string;    // プレイヤーがする操作（例: 「敵をタップして攻撃」）
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
      visualStyle: 'simple',
      mainMechanic: mechanic,
      subMechanics: [],
      playerGoal: 'ターゲットを全部集めなきゃ！',
      playerAction: 'ターゲットをタップして収集',
      winCondition: '5個のターゲットを集める',
      loseCondition: '3回ミスするか時間切れ',
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

    return `あなたはスマホ向け10秒ゲームのゲームデザイナーです。
「遊び」を最優先に考えた、面白いゲームを設計してください。

# 🎯 最重要: 遊びの設計

ゲームは以下の3要素で成り立ちます。見た目より先にこれを決めてください：

## 1. プレイヤーに何をさせたいか？（目標）
- 画面を見た瞬間に「〇〇しなきゃ！」とわかる
- 例: 「落ちてくる！キャッチしなきゃ！」「逃げてる！捕まえなきゃ！」

## 2. プレイヤーは具体的に何をするか？（操作）
- タップ: どこを？何回？タイミングは？
- スワイプ: どの方向に？何を動かす？
- 長押し: いつまで？離すタイミングは？

## 3. 成功と失敗はどう決まるか？（判定）
- 成功: 具体的な達成条件（例: 5個キャッチ、敵に3回当てる、10秒生き残る）
- 失敗: 具体的な失敗条件（例: 3回落とす、敵に当たる、時間切れ）
- **失敗する可能性がないゲームは面白くない**

# 基本要件
- 制限時間: 5-15秒
- 画面: スマホ縦画面
- 操作: タッチのみ（タップ、スワイプ、ドラッグ、長押し）

# 避けるべきテーマ（使用済み）
${avoidThemes}

# 避けるべきメカニクス（使用済み）
${avoidMechanics}

# ❌ 絶対に作ってはいけないゲーム
1. **即成功ゲーム**: 何かタップすれば即クリア
2. **操作不要ゲーム**: 見てるだけでクリア
3. **目的不明ゲーム**: 何すればいいかわからない
4. **失敗不可能ゲーム**: どうやっても成功する
5. **運だけゲーム**: スキルが関係ない

# 出力形式（JSON）
\`\`\`json
{
  "title": "ゲーム名（日本語、8文字以内）",
  "titleEn": "English Title",
  "description": "何をするゲームか（20文字以内）",
  "theme": "世界観",
  "visualStyle": "minimal | cute | retro | neon | nature | space | underwater | abstract | geometric | pixel",
  "mainMechanic": "tap-target | tap-avoid | tap-sequence | tap-rhythm | swipe-direction | drag-drop | hold-release | catch-falling | dodge-moving | match-pattern | count-objects | find-different | memory-match | timing-action | chase-target | collect-items | protect-target | balance-game | reaction-test",
  "subMechanics": [],
  "playerGoal": "プレイヤーが画面を見て思うこと",
  "playerAction": "プレイヤーが実際にする操作",
  "winCondition": "具体的な成功条件（数値を含む）",
  "loseCondition": "具体的な失敗条件（数値を含む）",
  "duration": 10,
  "difficulty": "easy | normal | hard",
  "objectCount": 3,
  "estimatedRuleCount": 7,
  "funScore": 8,
  "uniqueness": "このゲームが面白い理由",
  "targetAudience": "想定プレイヤー層",
  "emotionalHook": "プレイヤーが感じる感情"
}
\`\`\`

重要:
- funScoreは1-10で正直に自己評価。7未満は不採用
- playerGoal, playerAction, winCondition, loseConditionが最重要`;
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
      visualStyle: parsed.visualStyle || 'simple',
      mainMechanic: parsed.mainMechanic as GameMechanic,
      subMechanics: parsed.subMechanics || [],
      playerGoal: parsed.playerGoal || parsed.winCondition || '',
      playerAction: parsed.playerAction || '',
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
