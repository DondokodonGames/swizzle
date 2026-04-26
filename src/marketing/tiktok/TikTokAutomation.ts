/**
 * TikTok Automation
 * TikTok API を使用した自動投稿（API承認待ち）
 *
 * NOTE: TikTok API はビジネス向けで、一般開発者向けは承認プロセスが必要
 * 現在はプレースホルダー実装
 */

import { ContentGenerator } from '../content/ContentGenerator';
import { GameInfo, ContentType, PostResult } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class TikTokAutomation {
  private supabase: SupabaseClient;
  private contentGenerator: ContentGenerator;
  private dryRun: boolean = true;
  private isApproved: boolean = false;

  constructor() {
    const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

    if (!accessToken) {
      console.warn('⚠️ TikTok API credentials not set - API approval pending');
      this.dryRun = true;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase環境変数が設定されていません');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.contentGenerator = new ContentGenerator();
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    console.log('🎬 TikTok: API approval pending - running in dry-run mode');
    this.dryRun = true;
  }

  /**
   * 日次投稿
   */
  async postDaily(): Promise<PostResult[]> {
    const results: PostResult[] = [];

    if (!this.isApproved) {
      console.log('TikTok API not approved yet');
      return [{
        success: false,
        platform: 'tiktok',
        error: 'API approval pending',
        timestamp: new Date().toISOString(),
      }];
    }

    const game = await this.getRandomGame();
    if (!game) {
      console.log('No games available for posting');
      return results;
    }

    try {
      const result = await this.postGameVideo(game, ContentType.GAME_HIGHLIGHT);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        platform: 'tiktok',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }

    return results;
  }

  /**
   * ゲーム紹介動画投稿（プレースホルダー）
   */
  async postGameVideo(game: GameInfo, type: ContentType): Promise<PostResult> {
    console.log(`📝 Generating TikTok video for: ${game.name} (${type})`);

    // スクリプト生成
    const script = await this.contentGenerator.generateTikTokScript(game);

    console.log(`📤 TikTok Script:`, script);

    if (this.dryRun || !this.isApproved) {
      console.log('[DRY-RUN] Would post TikTok video:', script);
      return {
        success: true,
        platform: 'tiktok',
        timestamp: new Date().toISOString(),
      };
    }

    // TODO: 実際のTikTok API実装
    // TikTok APIは動画ファイルのアップロードが必要
    // 現在は承認待ちのためプレースホルダー

    return {
      success: false,
      platform: 'tiktok',
      error: 'TikTok API not implemented yet',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 新ゲーム告知
   */
  async postNewGame(game: GameInfo): Promise<PostResult> {
    return this.postGameVideo(game, ContentType.NEW_GAME);
  }

  /**
   * マイルストーン告知
   */
  async postMilestone(milestone: { title: string; value: number; description: string }): Promise<PostResult> {
    console.log(`🎉 Posting TikTok milestone: ${milestone.title}`);

    if (!this.isApproved) {
      return {
        success: false,
        platform: 'tiktok',
        error: 'API approval pending',
        timestamp: new Date().toISOString(),
      };
    }

    // TODO: マイルストーン動画生成・投稿

    return {
      success: false,
      platform: 'tiktok',
      error: 'TikTok API not implemented yet',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 週間サマリー投稿
   */
  async postWeeklySummary(_summary: string): Promise<PostResult> {
    console.log('📊 Posting TikTok weekly summary');

    if (!this.isApproved) {
      return {
        success: false,
        platform: 'tiktok',
        error: 'API approval pending',
        timestamp: new Date().toISOString(),
      };
    }

    // TODO: 週間サマリー動画生成・投稿

    return {
      success: false,
      platform: 'tiktok',
      error: 'TikTok API not implemented yet',
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== ヘルパー関数 ====================

  private async getRandomGame(): Promise<GameInfo | null> {
    const { data } = await this.supabase
      .from('user_games')
      .select('*')
      .eq('is_published', true);

    if (!data || data.length === 0) return null;

    const random = data[Math.floor(Math.random() * data.length)];
    return this.mapGameInfo(random);
  }

  private mapGameInfo(game: any): GameInfo {
    return {
      id: game.id,
      name: game.title || 'Untitled',
      description: game.description || '',
      thumbnailUrl: game.thumbnail_url,
      playUrl: `https://playswizzle.com/play/${game.id}`,
      creatorName: game.creator_name,
      playCount: game.play_count || 0,
      likeCount: game.like_count || 0,
      createdAt: game.created_at,
    };
  }
}
