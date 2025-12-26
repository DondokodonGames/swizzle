/**
 * GameGenerationHooks
 * ゲーム生成後のフック処理を管理するサービス
 *
 * Orchestratorからゲーム生成完了時に呼び出され:
 * 1. ゲームリンクを生成
 * 2. Twitter/TikTokへ自動投稿（設定による）
 * 3. ソーシャル統計を記録
 */

import { PostGenerationPublisher, PublishResult } from './PostGenerationPublisher';
import { GameSocialSharingService, ShareableGame } from './GameSocialSharingService';
import { GameProject } from '../../types/editor/GameProject';

export interface GeneratedGameInfo {
  id: string;
  project: GameProject;
  thumbnailUrl?: string;
  screenshotUrl?: string;
  videoUrl?: string;
  qualityScore: number;
}

export interface HookResult {
  gameUrl: string;
  shortUrl?: string;
  publishResult?: PublishResult;
  success: boolean;
  errors: string[];
}

export interface HookConfig {
  autoPostTwitter: boolean;
  autoPostTikTok: boolean;
  generateScreenshot: boolean;
  generateVideo: boolean;
  skipPublishing: boolean;
}

const DEFAULT_CONFIG: HookConfig = {
  autoPostTwitter: process.env.AUTO_POST_TWITTER === 'true',
  autoPostTikTok: process.env.AUTO_POST_TIKTOK === 'true',
  generateScreenshot: true,
  generateVideo: false, // 動画生成は重いのでデフォルトオフ
  skipPublishing: process.env.SKIP_SOCIAL_POST === 'true',
};

/**
 * ゲーム生成後のフック処理
 */
export class GameGenerationHooks {
  private publisher: PostGenerationPublisher | null = null;
  private sharingService: GameSocialSharingService;
  private config: HookConfig;
  private initialized: boolean = false;

  constructor(config?: Partial<HookConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sharingService = new GameSocialSharingService();
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.config.skipPublishing) {
      try {
        this.publisher = new PostGenerationPublisher({
          twitter: {
            enabled: true,
            autoPost: this.config.autoPostTwitter,
          },
          tiktok: {
            enabled: true,
            autoPost: this.config.autoPostTikTok,
          },
          generateShortUrl: true,
          recordAnalytics: true,
        });
        await this.publisher.initialize();
        console.log('✅ GameGenerationHooks initialized with publishing enabled');
      } catch (error) {
        console.warn('⚠️ Publishing initialization failed, hooks will only generate URLs:', error);
        this.publisher = null;
      }
    } else {
      console.log('ℹ️ GameGenerationHooks initialized (publishing disabled)');
    }

    this.initialized = true;
  }

  /**
   * ゲーム生成完了後のフック
   */
  async onGameGenerated(gameInfo: GeneratedGameInfo): Promise<HookResult> {
    const errors: string[] = [];

    // ゲームURLを生成
    const gameUrl = this.sharingService.generateGameUrl(gameInfo.id);
    const shortUrl = this.sharingService.generateShortUrl(gameInfo.id);

    console.log(`🔗 Game URL: ${gameUrl}`);
    console.log(`🔗 Short URL: ${shortUrl}`);

    const result: HookResult = {
      gameUrl,
      shortUrl,
      success: true,
      errors,
    };

    // SNS投稿を実行
    if (this.publisher && !this.config.skipPublishing) {
      try {
        const shareableGame: ShareableGame = {
          id: gameInfo.id,
          title: gameInfo.project.name || 'Untitled Game',
          description: gameInfo.project.description || 'AI-generated game on Swizzle',
          thumbnailUrl: gameInfo.thumbnailUrl,
          screenshotUrl: gameInfo.screenshotUrl,
          videoUrl: gameInfo.videoUrl,
          createdAt: new Date().toISOString(),
        };

        const publishResult = await this.publisher.publishGame(shareableGame, {
          screenshotUrl: gameInfo.screenshotUrl,
          videoUrl: gameInfo.videoUrl,
          skipTwitter: !this.config.autoPostTwitter,
          skipTikTok: !this.config.autoPostTikTok,
        });

        result.publishResult = publishResult;

        if (!publishResult.success) {
          errors.push(...publishResult.errors);
        }

        if (publishResult.twitter?.success) {
          console.log(`✅ Posted to Twitter: ${publishResult.twitter.url}`);
        }

        if (publishResult.tiktok?.success) {
          console.log(`✅ Posted to TikTok: ${publishResult.tiktok.url}`);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown publishing error';
        errors.push(errorMsg);
        console.error('❌ Publishing error:', error);
      }
    }

    result.success = errors.length === 0;
    result.errors = errors;

    return result;
  }

  /**
   * バッチ処理完了後のサマリー投稿
   */
  async onBatchCompleted(results: {
    total: number;
    successful: number;
    gameUrls: string[];
  }): Promise<void> {
    if (!this.publisher || this.config.skipPublishing) {
      return;
    }

    // バッチ完了のサマリーをTwitterに投稿
    if (results.successful > 1) {
      console.log(`📊 Batch completed: ${results.successful}/${results.total} games`);
      // オプション: バッチサマリー投稿
      // await this.publisher.postBatchSummary(results);
    }
  }

  /**
   * ゲームURLを取得
   */
  getGameUrl(gameId: string): string {
    return this.sharingService.generateGameUrl(gameId);
  }

  /**
   * 短縮URLを取得
   */
  getShortUrl(gameId: string): string {
    return this.sharingService.generateShortUrl(gameId);
  }

  /**
   * 手動でTwitterに投稿
   */
  async postToTwitter(gameInfo: GeneratedGameInfo): Promise<boolean> {
    if (!this.publisher) {
      console.warn('⚠️ Publisher not initialized');
      return false;
    }

    const shareableGame: ShareableGame = {
      id: gameInfo.id,
      title: gameInfo.project.name || 'Untitled Game',
      description: gameInfo.project.description || '',
      thumbnailUrl: gameInfo.thumbnailUrl,
      screenshotUrl: gameInfo.screenshotUrl,
      createdAt: new Date().toISOString(),
    };

    const result = await this.publisher.postToTwitter(shareableGame);
    return result.success;
  }

  /**
   * 手動でTikTokに投稿
   */
  async postToTikTok(gameInfo: GeneratedGameInfo): Promise<boolean> {
    if (!this.publisher) {
      console.warn('⚠️ Publisher not initialized');
      return false;
    }

    const shareableGame: ShareableGame = {
      id: gameInfo.id,
      title: gameInfo.project.name || 'Untitled Game',
      description: gameInfo.project.description || '',
      videoUrl: gameInfo.videoUrl,
      createdAt: new Date().toISOString(),
    };

    const result = await this.publisher.postToTikTok(shareableGame);
    return result.success;
  }
}

export default GameGenerationHooks;
