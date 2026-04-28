/**
 * PostGenerationPublisher
 * ゲーム生成後の自動SNS投稿を管理するサービス
 *
 * ゲーム生成完了時に以下を自動実行:
 * 1. スクリーンショット撮影 → Twitterに投稿
 * 2. 動画撮影 → TikTokに投稿
 * 3. ゲームリンクの生成と記録
 */

import { TwitterAutomation } from '../twitter/TwitterAutomation';
import { TikTokAutomation } from '../tiktok/TikTokAutomation';
import { GameSocialSharingService, ShareableGame } from './GameSocialSharingService';
import { GameInfo, PostResult } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface PublishConfig {
  twitter: {
    enabled: boolean;
    autoPost: boolean;
  };
  tiktok: {
    enabled: boolean;
    autoPost: boolean;
  };
  generateShortUrl: boolean;
  recordAnalytics: boolean;
}

export interface PublishResult {
  success: boolean;
  gameId: string;
  gameUrl: string;
  shortUrl?: string;
  twitter?: PostResult;
  tiktok?: PostResult;
  errors: string[];
}

/**
 * ゲーム生成後の自動投稿サービス
 */
export class PostGenerationPublisher {
  private twitterAutomation: TwitterAutomation | null = null;
  private tiktokAutomation: TikTokAutomation | null = null;
  private socialSharingService: GameSocialSharingService;
  private supabase: SupabaseClient;
  private config: PublishConfig;

  constructor(config?: Partial<PublishConfig>) {
    this.config = {
      twitter: {
        enabled: true,
        autoPost: process.env.AUTO_POST_TWITTER === 'true',
      },
      tiktok: {
        enabled: true,
        autoPost: process.env.AUTO_POST_TIKTOK === 'true',
      },
      generateShortUrl: true,
      recordAnalytics: true,
      ...config,
    };

    this.socialSharingService = new GameSocialSharingService();

    // Supabase初期化
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase環境変数が設定されていません');
    }

    this.supabase = createClient(supabaseUrl, serviceKey);

    // Twitter初期化
    if (this.config.twitter.enabled) {
      try {
        this.twitterAutomation = new TwitterAutomation();
      } catch (error) {
        console.warn('⚠️ Twitter初期化失敗:', error);
      }
    }

    // TikTok初期化
    if (this.config.tiktok.enabled) {
      try {
        this.tiktokAutomation = new TikTokAutomation();
      } catch (error) {
        console.warn('⚠️ TikTok初期化失敗:', error);
      }
    }
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    if (this.twitterAutomation) {
      await this.twitterAutomation.initialize();
    }
    if (this.tiktokAutomation) {
      await this.tiktokAutomation.initialize();
    }
    console.log('✅ PostGenerationPublisher initialized');
  }

  /**
   * ゲーム生成後の自動投稿を実行
   */
  async publishGame(
    game: ShareableGame,
    options: {
      screenshotUrl?: string;
      videoUrl?: string;
      skipTwitter?: boolean;
      skipTikTok?: boolean;
    } = {}
  ): Promise<PublishResult> {
    const errors: string[] = [];
    const gameUrl = this.socialSharingService.generateGameUrl(game.id);
    const shortUrl = this.config.generateShortUrl
      ? this.socialSharingService.generateShortUrl(game.id)
      : undefined;

    const result: PublishResult = {
      success: false,
      gameId: game.id,
      gameUrl,
      shortUrl,
      errors,
    };

    console.log(`📤 ゲーム投稿開始: ${game.title} (${game.id})`);

    // スクリーンショットURLを設定
    if (options.screenshotUrl) {
      game.screenshotUrl = options.screenshotUrl;
    }

    // 動画URLを設定
    if (options.videoUrl) {
      game.videoUrl = options.videoUrl;
    }

    // Twitter投稿
    if (
      this.config.twitter.enabled &&
      this.config.twitter.autoPost &&
      !options.skipTwitter &&
      this.twitterAutomation
    ) {
      try {
        const gameInfo = this.toGameInfo(game);
        result.twitter = await this.twitterAutomation.postNewGame(gameInfo);

        if (result.twitter.success) {
          console.log(`✅ Twitter投稿成功: ${result.twitter.url}`);
          await this.recordSocialPost(game.id, 'twitter', result.twitter);
        } else {
          errors.push(`Twitter: ${result.twitter.error}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Twitter: ${errorMsg}`);
        console.error('❌ Twitter投稿失敗:', error);
      }
    }

    // TikTok投稿
    if (
      this.config.tiktok.enabled &&
      this.config.tiktok.autoPost &&
      !options.skipTikTok &&
      this.tiktokAutomation &&
      game.videoUrl
    ) {
      try {
        const gameInfo = this.toGameInfo(game);
        result.tiktok = await this.tiktokAutomation.postNewGame(gameInfo);

        if (result.tiktok.success) {
          console.log(`✅ TikTok投稿成功: ${result.tiktok.url}`);
          await this.recordSocialPost(game.id, 'tiktok', result.tiktok);
        } else {
          errors.push(`TikTok: ${result.tiktok.error}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`TikTok: ${errorMsg}`);
        console.error('❌ TikTok投稿失敗:', error);
      }
    }

    // ゲームリンクを記録
    if (this.config.recordAnalytics) {
      await this.recordGameLink(game.id, gameUrl, shortUrl);
    }

    result.success = errors.length === 0;
    result.errors = errors;

    if (result.success) {
      console.log(`✅ ゲーム投稿完了: ${gameUrl}`);
    } else {
      console.warn(`⚠️ ゲーム投稿に一部エラー: ${errors.join(', ')}`);
    }

    return result;
  }

  /**
   * 手動でTwitterに投稿
   */
  async postToTwitter(game: ShareableGame): Promise<PostResult> {
    if (!this.twitterAutomation) {
      return {
        success: false,
        platform: 'twitter',
        error: 'Twitterが初期化されていません',
        timestamp: new Date().toISOString(),
      };
    }

    const gameInfo = this.toGameInfo(game);
    const result = await this.twitterAutomation.postNewGame(gameInfo);

    if (result.success) {
      await this.recordSocialPost(game.id, 'twitter', result);
    }

    return result;
  }

  /**
   * 手動でTikTokに投稿
   */
  async postToTikTok(game: ShareableGame): Promise<PostResult> {
    if (!this.tiktokAutomation) {
      return {
        success: false,
        platform: 'tiktok',
        error: 'TikTokが初期化されていません',
        timestamp: new Date().toISOString(),
      };
    }

    const gameInfo = this.toGameInfo(game);
    const result = await this.tiktokAutomation.postNewGame(gameInfo);

    if (result.success) {
      await this.recordSocialPost(game.id, 'tiktok', result);
    }

    return result;
  }

  /**
   * SNS投稿を記録
   */
  private async recordSocialPost(
    gameId: string,
    platform: string,
    result: PostResult
  ): Promise<void> {
    try {
      await this.supabase.from('social_posts').insert({
        game_id: gameId,
        platform,
        post_id: result.postId,
        post_url: result.url,
        success: result.success,
        posted_at: result.timestamp,
      });
    } catch (error) {
      console.error('SNS投稿記録エラー:', error);
    }
  }

  /**
   * ゲームリンクを記録
   */
  private async recordGameLink(
    gameId: string,
    gameUrl: string,
    shortUrl?: string
  ): Promise<void> {
    try {
      await this.supabase.from('game_links').upsert({
        game_id: gameId,
        full_url: gameUrl,
        short_url: shortUrl,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('ゲームリンク記録エラー:', error);
    }
  }

  /**
   * ShareableGameをGameInfoに変換
   */
  private toGameInfo(game: ShareableGame): GameInfo {
    return {
      id: game.id,
      name: game.title,
      description: game.description,
      thumbnailUrl: game.screenshotUrl || game.thumbnailUrl,
      playUrl: this.socialSharingService.generateGameUrl(game.id),
      creatorName: game.creatorName,
      playCount: game.playCount || 0,
      likeCount: game.likeCount || 0,
      createdAt: game.createdAt,
    };
  }

  /**
   * 投稿状況の取得
   */
  async getPostStatus(gameId: string): Promise<{
    twitter?: PostResult;
    tiktok?: PostResult;
    gameUrl: string;
  }> {
    const { data } = await this.supabase
      .from('social_posts')
      .select('*')
      .eq('game_id', gameId);

    const result: {
      twitter?: PostResult;
      tiktok?: PostResult;
      gameUrl: string;
    } = {
      gameUrl: this.socialSharingService.generateGameUrl(gameId),
    };

    if (data) {
      for (const post of data) {
        const postResult: PostResult = {
          success: post.success,
          platform: post.platform,
          postId: post.post_id,
          url: post.post_url,
          timestamp: post.posted_at,
        };

        if (post.platform === 'twitter') {
          result.twitter = postResult;
        } else if (post.platform === 'tiktok') {
          result.tiktok = postResult;
        }
      }
    }

    return result;
  }
}

export default PostGenerationPublisher;
