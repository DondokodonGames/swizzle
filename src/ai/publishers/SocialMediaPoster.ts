/**
 * SocialMediaPoster
 * SNS自動投稿システム（7言語対応）
 * 
 * Phase H Day 4-5: 自動公開システム
 * - X（Twitter）自動投稿
 * - 7言語対応（en, ja, es, fr, de, zh, ko）
 * - Claude APIでツイート文生成
 * - Rate limit対策
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { GameProject } from '../../types/editor/GameProject';
import { SocialMediaPostResult } from './AutoPublisher';

/**
 * 投稿統計
 */
export interface PostStatistics {
  totalPosts: number;
  postsToday: number;
  postsThisWeek: number;
  postsByLanguage: Record<string, number>;
  postsByPlatform: Record<string, number>;
}

/**
 * ツイート生成設定
 */
interface TweetGenerationConfig {
  maxLength: number;
  includeHashtags: boolean;
  includeUrl: boolean;
  tone: 'exciting' | 'casual' | 'professional';
}

/**
 * SocialMediaPoster
 * SNS投稿の自動化
 */
export class SocialMediaPoster {
  private claude: Anthropic;
  private postHistory: Map<string, Date>;
  
  // 対応言語
  private readonly SUPPORTED_LANGUAGES = {
    en: 'English',
    ja: '日本語',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    zh: '中文',
    ko: '한국어'
  };
  
  constructor() {
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.postHistory = new Map();
    
    // 環境変数チェック
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️ ANTHROPIC_API_KEY not set - Social media posting will fail');
    }
  }
  
  /**
   * X（Twitter）に投稿
   */
  async postToTwitter(
    project: GameProject,
    gameUrl: string,
    language: string = 'en'
  ): Promise<SocialMediaPostResult> {
    
    try {
      // 1. 言語チェック
      if (!this.isSupportedLanguage(language)) {
        throw new Error(`Unsupported language: ${language}`);
      }
      
      // 2. Rate limit チェック
      await this.checkRateLimit(language);
      
      // 3. ツイート文を生成（Claude API）
      const tweetText = await this.generateTweet(project, gameUrl, language);
      
      // 4. 実際の投稿（TODO: Twitter API統合）
      // 現在はシミュレーション
      const postId = await this.simulateTwitterPost(tweetText, language);
      
      // 5. 投稿履歴を記録
      this.recordPost(language);
      
      return {
        platform: 'twitter',
        language,
        success: true,
        postId
      };
      
    } catch (error) {
      console.error(`Twitter post error (${language}):`, error);
      
      return {
        platform: 'twitter',
        language,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * ツイート文を生成（Claude API）
   */
  private async generateTweet(
    project: GameProject,
    gameUrl: string,
    language: string
  ): Promise<string> {
    
    const config: TweetGenerationConfig = {
      maxLength: 280,
      includeHashtags: true,
      includeUrl: true,
      tone: 'exciting'
    };
    
    // プロンプト作成
    const prompt = this.createTweetPrompt(project, gameUrl, language, config);
    
    try {
      const message = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      const tweetText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';
      
      // 280文字制限チェック
      if (tweetText.length > 280) {
        return tweetText.substring(0, 277) + '...';
      }
      
      return tweetText;
      
    } catch (error) {
      console.error('Tweet generation error:', error);
      
      // フォールバック: シンプルなツイート
      return this.generateFallbackTweet(project, gameUrl, language);
    }
  }
  
  /**
   * ツイート生成プロンプトの作成
   */
  private createTweetPrompt(
    project: GameProject,
    gameUrl: string,
    language: string,
    config: TweetGenerationConfig
  ): string {
    
    const languageName = this.SUPPORTED_LANGUAGES[language as keyof typeof this.SUPPORTED_LANGUAGES];
    
    return `Generate an exciting ${languageName} tweet (max 280 characters) to promote this game:

Game Information:
- Title: ${project.settings.name}
- Description: ${project.settings.description || 'Fun short game'}
- Difficulty: ${project.settings.difficulty || 'normal'}
- Play Time: ~30 seconds
- URL: ${gameUrl}

Requirements:
- Write in ${languageName} only
- Maximum 280 characters (including spaces and URL)
- ${config.includeHashtags ? 'Include 2-3 relevant hashtags' : 'No hashtags'}
- ${config.includeUrl ? 'Include the game URL at the end' : 'No URL'}
- Tone: ${config.tone}
- Make it exciting and engaging
- Highlight what makes this game fun
- Encourage people to play

Examples of good tweets:
- English: "🎮 New game alert! Test your reflexes in [Title]! Can you beat it? Play now! [URL] #indiegame #gaming"
- 日本語: "🎮 新作ゲーム登場！[タイトル]で反射神経を試そう！あなたはクリアできる？今すぐプレイ！[URL] #ゲーム #インディーゲーム"

Generate the tweet now (text only, no explanations):`;
  }
  
  /**
   * フォールバックツイートの生成
   */
  private generateFallbackTweet(
    project: GameProject,
    gameUrl: string,
    language: string
  ): string {
    
    const templates: Record<string, string> = {
      en: `🎮 Play ${project.settings.name}! Fun short game. ${gameUrl} #indiegame #gaming`,
      ja: `🎮 ${project.settings.name}をプレイしよう！楽しいミニゲーム ${gameUrl} #ゲーム #インディーゲーム`,
      es: `🎮 ¡Juega ${project.settings.name}! Juego divertido. ${gameUrl} #juegos #gaming`,
      fr: `🎮 Jouez à ${project.settings.name}! Jeu amusant. ${gameUrl} #jeux #gaming`,
      de: `🎮 Spiele ${project.settings.name}! Spaßiges Spiel. ${gameUrl} #spiele #gaming`,
      zh: `🎮 玩 ${project.settings.name}！有趣的小游戏 ${gameUrl} #游戏 #indiegame`,
      ko: `🎮 ${project.settings.name} 플레이하기! 재미있는 게임 ${gameUrl} #게임 #인디게임`
    };
    
    return templates[language] || templates.en;
  }
  
  /**
   * Twitter投稿シミュレーション
   * TODO: 実際のTwitter API統合
   */
  private async simulateTwitterPost(
    tweetText: string,
    language: string
  ): Promise<string> {
    
    // 実際の投稿処理はここに実装
    // const twitter = new TwitterApi({...});
    // const result = await twitter.v2.tweet(tweetText);
    // return result.data.id;
    
    // 現在はシミュレーション
    const postId = `sim_${Date.now()}_${language}`;
    
    console.log(`      [${language}] "${tweetText}"`);
    
    return postId;
  }
  
  /**
   * Rate limit チェック
   */
  private async checkRateLimit(language: string): Promise<void> {
    
    const lastPostTime = this.postHistory.get(language);
    
    if (lastPostTime) {
      const timeSinceLastPost = Date.now() - lastPostTime.getTime();
      const minInterval = 1000; // 1秒
      
      if (timeSinceLastPost < minInterval) {
        const waitTime = minInterval - timeSinceLastPost;
        await this.sleep(waitTime);
      }
    }
  }
  
  /**
   * 投稿記録
   */
  private recordPost(language: string): void {
    this.postHistory.set(language, new Date());
  }
  
  /**
   * 対応言語チェック
   */
  private isSupportedLanguage(language: string): boolean {
    return language in this.SUPPORTED_LANGUAGES;
  }
  
  /**
   * 統計情報の取得
   */
  async getStatistics(): Promise<PostStatistics> {
    
    // TODO: Supabaseから統計取得
    // 現在はシミュレーション
    
    return {
      totalPosts: 0,
      postsToday: 0,
      postsThisWeek: 0,
      postsByLanguage: {
        en: 0,
        ja: 0,
        es: 0,
        fr: 0,
        de: 0,
        zh: 0,
        ko: 0
      },
      postsByPlatform: {
        twitter: 0
      }
    };
  }
  
  /**
   * バッチ投稿（複数言語）
   */
  async postToMultipleLanguages(
    project: GameProject,
    gameUrl: string,
    languages: string[]
  ): Promise<SocialMediaPostResult[]> {
    
    const results: SocialMediaPostResult[] = [];
    
    for (const language of languages) {
      const result = await this.postToTwitter(project, gameUrl, language);
      results.push(result);
      
      // 言語間のインターバル: 1秒
      if (languages.indexOf(language) < languages.length - 1) {
        await this.sleep(1000);
      }
    }
    
    return results;
  }
  
  /**
   * ツイートプレビュー（投稿せずに生成のみ）
   */
  async previewTweet(
    project: GameProject,
    gameUrl: string,
    language: string
  ): Promise<string> {
    
    try {
      return await this.generateTweet(project, gameUrl, language);
    } catch (error) {
      console.error('Tweet preview error:', error);
      return this.generateFallbackTweet(project, gameUrl, language);
    }
  }
  
  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<boolean> {
    
    try {
      // Claude API接続チェック
      const message = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Hello'
        }]
      });
      
      return !!message;
      
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
  
  /**
   * 待機（Sleep）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}