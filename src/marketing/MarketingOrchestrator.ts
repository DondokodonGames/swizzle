/**
 * Marketing Orchestrator
 * 全マーケティングチャネルを統合管理
 */

import * as cron from 'node-cron';
import { SwizzleDiscordBot } from './discord/DiscordBot';
import { TwitterAutomation } from './twitter/TwitterAutomation';
import { InstagramAutomation } from './instagram/InstagramAutomation';
import { ContentGenerator } from './content/ContentGenerator';
import { GameInfo, ContentType, PostResult, MarketingConfig } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// デフォルト設定
const DEFAULT_CONFIG: MarketingConfig = {
  enabled: true,
  dryRun: false,
  platforms: {
    twitter: { enabled: true, postsPerDay: 4 },
    instagram: { enabled: true, postsPerDay: 2 },
    tiktok: { enabled: false, postsPerDay: 3 }, // API承認待ち
    discord: { enabled: true },
  },
  schedule: [
    // Twitter: 09:00, 12:00, 18:00, 21:00
    { time: '09:00', contentType: ContentType.NEW_GAME, platform: 'twitter' },
    { time: '12:00', contentType: ContentType.DAILY_CHALLENGE, platform: 'twitter' },
    { time: '18:00', contentType: ContentType.HIGH_SCORE, platform: 'twitter' },
    { time: '21:00', contentType: ContentType.POLL, platform: 'twitter' },

    // Instagram: 12:00, 20:00
    { time: '12:00', contentType: ContentType.GAME_HIGHLIGHT, platform: 'instagram' },
    { time: '20:00', contentType: ContentType.USER_GAME, platform: 'instagram' },

    // Discord: 09:00, 12:00
    { time: '09:00', contentType: ContentType.NEW_GAME, platform: 'discord' },
    { time: '12:00', contentType: ContentType.DAILY_CHALLENGE, platform: 'discord' },
  ],
  hashtags: {
    default: ['#Swizzle', '#IndieGame', '#WebGame', '#Gaming'],
    trending: [],
  },
};

export class MarketingOrchestrator {
  private config: MarketingConfig;
  private discord: SwizzleDiscordBot;
  private twitter: TwitterAutomation;
  private instagram: InstagramAutomation;
  private contentGenerator: ContentGenerator;
  private supabase: SupabaseClient;
  private cronJobs: cron.ScheduledTask[] = [];

  constructor(config?: Partial<MarketingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase環境変数が設定されていません');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.discord = new SwizzleDiscordBot();
    this.twitter = new TwitterAutomation();
    this.instagram = new InstagramAutomation();
    this.contentGenerator = new ContentGenerator();
  }

  /**
   * マーケティングシステム起動
   */
  async start(): Promise<void> {
    console.log('🚀 マーケティング自動化システム起動');

    if (!this.config.enabled) {
      console.log('⚠️ マーケティングシステムは無効です');
      return;
    }

    // 各プラットフォーム初期化
    await this.initializePlatforms();

    // 定期タスク設定
    this.scheduleDailyTasks();
    this.scheduleWeeklyTasks();

    console.log('✅ すべてのシステム稼働中');
    console.log(`   📊 Twitter: ${this.config.platforms.twitter.enabled ? '有効' : '無効'}`);
    console.log(`   📸 Instagram: ${this.config.platforms.instagram.enabled ? '有効' : '無効'}`);
    console.log(`   🎬 TikTok: ${this.config.platforms.tiktok.enabled ? '有効' : '無効'}`);
    console.log(`   💬 Discord: ${this.config.platforms.discord.enabled ? '有効' : '無効'}`);
  }

  /**
   * プラットフォーム初期化
   */
  private async initializePlatforms(): Promise<void> {
    const tasks: Promise<void>[] = [];

    if (this.config.platforms.twitter.enabled) {
      tasks.push(this.twitter.initialize());
    }

    if (this.config.platforms.instagram.enabled) {
      tasks.push(this.instagram.initialize());
    }

    if (this.config.platforms.discord.enabled) {
      tasks.push(this.discord.start());
    }

    await Promise.allSettled(tasks);
  }

  /**
   * 日次タスク設定
   */
  private scheduleDailyTasks(): void {
    // Twitter: 09:00, 12:00, 18:00, 21:00 (JST)
    if (this.config.platforms.twitter.enabled) {
      this.scheduleCron('0 9 * * *', () => this.twitter.postDaily());
      this.scheduleCron('0 12 * * *', () => this.twitter.postDaily());
      this.scheduleCron('0 18 * * *', () => this.twitter.postDaily());
      this.scheduleCron('0 21 * * *', () => this.twitter.postDaily());
    }

    // Instagram: 12:00, 20:00 (JST)
    if (this.config.platforms.instagram.enabled) {
      this.scheduleCron('0 12 * * *', () => this.instagram.postDaily());
      this.scheduleCron('0 20 * * *', () => this.instagram.postDaily());
    }

    // Discord: 09:00新ゲーム, 12:00デイリーチャレンジ (JST)
    if (this.config.platforms.discord.enabled) {
      this.scheduleCron('0 9 * * *', () => this.discord.announceNewGames());
      this.scheduleCron('0 12 * * *', () => this.discord.announceDailyChallenge());
    }

    // メンション監視: 1時間ごと
    if (this.config.platforms.twitter.enabled) {
      this.scheduleCron('0 * * * *', () => this.twitter.monitorAndReply());
    }

    console.log(`📅 日次タスク: ${this.cronJobs.length}件登録`);
  }

  /**
   * 週次タスク設定
   */
  private scheduleWeeklyTasks(): void {
    // 毎週月曜 09:00 - 週間サマリー (JST)
    this.scheduleCron('0 9 * * 1', async () => {
      const summary = await this.generateWeeklySummary();

      const tasks: Promise<PostResult>[] = [];

      if (this.config.platforms.twitter.enabled) {
        tasks.push(this.twitter.postWeeklySummary(summary));
      }

      if (this.config.platforms.instagram.enabled) {
        tasks.push(this.instagram.postWeeklySummary(summary));
      }

      if (this.config.platforms.discord.enabled) {
        this.discord.announceWeeklySummary();
      }

      await Promise.allSettled(tasks);
    });

    console.log('📅 週次タスク登録完了');
  }

  /**
   * Cronジョブ登録
   */
  private scheduleCron(cronExpression: string, task: () => Promise<any>): void {
    const job = cron.schedule(cronExpression, async () => {
      try {
        await task();
      } catch (error) {
        console.error(`Cron task failed:`, error);
      }
    }, {
      timezone: 'Asia/Tokyo',
    });

    this.cronJobs.push(job);
  }

  /**
   * 新ゲーム公開時の自動プロモーション
   */
  async onNewGame(game: GameInfo): Promise<void> {
    console.log(`📢 新ゲーム公開: ${game.name}`);

    const tasks: Promise<PostResult>[] = [];

    if (this.config.platforms.twitter.enabled) {
      tasks.push(this.twitter.postNewGame(game));
    }

    if (this.config.platforms.instagram.enabled) {
      tasks.push(this.instagram.postNewGame(game));
    }

    if (this.config.platforms.discord.enabled) {
      // Discord Embedを生成して投稿
      const embed = await this.contentGenerator.generateDiscordEmbed(game, ContentType.NEW_GAME);
      this.discord.postEmbed('announcements', embed);
    }

    const results = await Promise.allSettled(tasks);
    console.log(`📤 投稿完了: ${results.filter(r => r.status === 'fulfilled').length}/${results.length}`);
  }

  /**
   * マイルストーン達成時の告知
   */
  async onMilestone(milestone: { type: string; value: number; title: string; description: string }): Promise<void> {
    console.log(`🎉 マイルストーン達成: ${milestone.title}`);

    const tasks: Promise<PostResult>[] = [];

    if (this.config.platforms.twitter.enabled) {
      tasks.push(this.twitter.postMilestone(milestone));
    }

    if (this.config.platforms.instagram.enabled) {
      tasks.push(this.instagram.postMilestone(milestone));
    }

    await Promise.allSettled(tasks);
  }

  /**
   * 週間サマリー生成
   */
  private async generateWeeklySummary(): Promise<string> {
    const stats = await this.getWeeklyStats();
    return this.contentGenerator.generateWeeklySummary(stats);
  }

  /**
   * 週間統計取得
   */
  private async getWeeklyStats(): Promise<{
    newGames: number;
    totalPlays: number;
    topGames: GameInfo[];
  }> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // 新規ゲーム数
    const { count: newGames } = await this.supabase
      .from('user_games')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .gte('created_at', weekAgo.toISOString());

    // 総プレイ数
    const { data: playData } = await this.supabase
      .from('user_games')
      .select('play_count')
      .eq('is_published', true);

    const totalPlays = (playData || []).reduce((sum: number, g: any) => sum + (g.play_count || 0), 0);

    // トップゲーム
    const { data: topGamesData } = await this.supabase
      .from('user_games')
      .select('*')
      .eq('is_published', true)
      .order('play_count', { ascending: false })
      .limit(3);

    const topGames = (topGamesData || []).map(this.mapGameInfo);

    return {
      newGames: newGames || 0,
      totalPlays,
      topGames,
    };
  }

  /**
   * 手動投稿
   */
  async manualPost(platform: 'twitter' | 'instagram' | 'discord', type: ContentType): Promise<PostResult> {
    const game = await this.getRandomGame();
    if (!game) {
      return {
        success: false,
        platform,
        error: 'No games available',
        timestamp: new Date().toISOString(),
      };
    }

    switch (platform) {
      case 'twitter':
        return this.twitter.postGameTweet(game, type);
      case 'instagram':
        return this.instagram.postGamePost(game, type);
      case 'discord':
        const embed = await this.contentGenerator.generateDiscordEmbed(game, type);
        await this.discord.postEmbed('announcements', embed);
        return {
          success: true,
          platform,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * システム停止
   */
  async stop(): Promise<void> {
    console.log('🛑 マーケティングシステム停止中...');

    // Cronジョブ停止
    for (const job of this.cronJobs) {
      job.stop();
    }

    // Discord Bot停止
    await this.discord.stop();

    console.log('✅ マーケティングシステム停止完了');
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

// エクスポート
export { SwizzleDiscordBot } from './discord/DiscordBot';
export { TwitterAutomation } from './twitter/TwitterAutomation';
export { InstagramAutomation } from './instagram/InstagramAutomation';
export { ContentGenerator } from './content/ContentGenerator';
export * from './types';
