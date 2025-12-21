/**
 * Instagram Automation
 * Instagram Graph APIを使用した自動投稿
 */

import { ContentGenerator } from '../content/ContentGenerator';
import { GameInfo, ContentType, InstagramPost, PostResult } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class InstagramAutomation {
  private accessToken: string;
  private businessAccountId: string;
  private supabase: SupabaseClient;
  private contentGenerator: ContentGenerator;
  private dryRun: boolean;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';

    if (!this.accessToken || !this.businessAccountId) {
      console.warn('⚠️ Instagram API credentials not set - running in dry-run mode');
      this.dryRun = true;
    } else {
      this.dryRun = process.env.MARKETING_DRY_RUN === 'true';
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
    if (this.dryRun) {
      console.log('📸 Instagram: Dry-run mode');
      return;
    }

    try {
      // アカウント情報取得
      const response = await this.apiRequest(`/${this.businessAccountId}`, {
        fields: 'username,name,biography',
      });
      console.log(`📸 Instagram: Logged in as @${response.username}`);
    } catch (error) {
      console.error('Instagram initialization failed:', error);
      this.dryRun = true;
    }
  }

  /**
   * 日次投稿
   */
  async postDaily(): Promise<PostResult[]> {
    const results: PostResult[] = [];

    // ランダムなゲームを選択
    const game = await this.getRandomGame();
    if (!game) {
      console.log('No games available for posting');
      return results;
    }

    try {
      const result = await this.postGamePost(game, ContentType.GAME_HIGHLIGHT);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        platform: 'instagram',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }

    return results;
  }

  /**
   * ゲーム紹介投稿
   */
  async postGamePost(game: GameInfo, type: ContentType): Promise<PostResult> {
    console.log(`📝 Generating Instagram post for: ${game.name}`);

    // コンテンツ生成
    const post = await this.contentGenerator.generateInstagramPost(game, type);

    // キャプション + ハッシュタグ
    const fullCaption = `${post.caption}\n\n${post.hashtags.join(' ')}`;

    console.log(`📤 Caption: ${post.caption.substring(0, 50)}...`);

    if (this.dryRun) {
      console.log('[DRY-RUN] Would post to Instagram:', fullCaption);
      return {
        success: true,
        platform: 'instagram',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // 画像URLが必要（Instagram APIは公開URLが必要）
      const imageUrl = game.thumbnailUrl || await this.getDefaultImage();

      if (!imageUrl) {
        throw new Error('No image URL available');
      }

      // Step 1: メディアコンテナ作成
      const container = await this.createMediaContainer(imageUrl, fullCaption);

      // Step 2: メディア公開
      const result = await this.publishMedia(container.id);

      console.log(`✅ Instagram post published: ${result.id}`);

      return {
        success: true,
        platform: 'instagram',
        postId: result.id,
        url: `https://www.instagram.com/p/${result.id}/`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Instagram post failed:', error);
      return {
        success: false,
        platform: 'instagram',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 新ゲーム投稿
   */
  async postNewGame(game: GameInfo): Promise<PostResult> {
    return this.postGamePost(game, ContentType.NEW_GAME);
  }

  /**
   * マイルストーン投稿
   */
  async postMilestone(milestone: { title: string; description: string }): Promise<PostResult> {
    const caption = `🎉 ${milestone.title}\n\n${milestone.description}\n\nありがとうございます！これからもSwizzleをよろしくお願いします✨\n\nプロフィールのリンクから遊べます！`;

    const hashtags = [
      '#swizzle', '#milestone', '#indiegame', '#webgame',
      '#gaming', '#gamedev', '#thankyou', '#anniversary',
    ];

    if (this.dryRun) {
      console.log('[DRY-RUN] Would post milestone:', caption);
      return {
        success: true,
        platform: 'instagram',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const imageUrl = await this.getDefaultImage();
      if (!imageUrl) throw new Error('No image available');

      const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;
      const container = await this.createMediaContainer(imageUrl, fullCaption);
      const result = await this.publishMedia(container.id);

      return {
        success: true,
        platform: 'instagram',
        postId: result.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform: 'instagram',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 週間サマリー投稿
   */
  async postWeeklySummary(summary: string): Promise<PostResult> {
    const caption = `📊 今週のSwizzle\n\n${summary}\n\nプロフィールのリンクから遊べます！`;

    const hashtags = [
      '#swizzle', '#weeklyreport', '#indiegame', '#webgame',
      '#gaming', '#gamedev', '#weeklysummary',
    ];

    if (this.dryRun) {
      console.log('[DRY-RUN] Would post weekly summary:', caption);
      return {
        success: true,
        platform: 'instagram',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const imageUrl = await this.getDefaultImage();
      if (!imageUrl) throw new Error('No image available');

      const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;
      const container = await this.createMediaContainer(imageUrl, fullCaption);
      const result = await this.publishMedia(container.id);

      return {
        success: true,
        platform: 'instagram',
        postId: result.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform: 'instagram',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ==================== Instagram Graph API ====================

  /**
   * メディアコンテナ作成
   */
  private async createMediaContainer(imageUrl: string, caption: string): Promise<{ id: string }> {
    return this.apiRequest(`/${this.businessAccountId}/media`, {
      image_url: imageUrl,
      caption,
    }, 'POST');
  }

  /**
   * メディア公開
   */
  private async publishMedia(containerId: string): Promise<{ id: string }> {
    return this.apiRequest(`/${this.businessAccountId}/media_publish`, {
      creation_id: containerId,
    }, 'POST');
  }

  /**
   * API リクエスト
   */
  private async apiRequest(
    endpoint: string,
    params: Record<string, string> = {},
    method: 'GET' | 'POST' = 'GET'
  ): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('access_token', this.accessToken);

    if (method === 'GET') {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: method === 'POST' ? {
        'Content-Type': 'application/json',
      } : undefined,
      body: method === 'POST' ? JSON.stringify(params) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Instagram API error');
    }

    return response.json();
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

  private async getDefaultImage(): Promise<string | null> {
    // デフォルトのSwizzleロゴ画像URL
    // 実際のURLに置き換える必要があります
    return 'https://playswizzle.com/logo-large.png';
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
