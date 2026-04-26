/**
 * Twitter Automation
 * Twitter API v2を使用した自動投稿・エンゲージメント
 */

import { TwitterApi } from 'twitter-api-v2';
import { ContentGenerator } from '../content/ContentGenerator';
import { GameInfo, ContentType, PostResult } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';

export class TwitterAutomation {
  private client: TwitterApi;
  private supabase: SupabaseClient;
  private contentGenerator: ContentGenerator;
  private dryRun: boolean;

  constructor() {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      console.warn('⚠️ Twitter API credentials not set - running in dry-run mode');
      this.dryRun = true;
      this.client = null as any;
    } else {
      this.client = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken,
        accessSecret,
      });
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
      console.log('🐦 Twitter: Dry-run mode');
      return;
    }

    try {
      const me = await this.client.v2.me();
      console.log(`🐦 Twitter: Logged in as @${me.data.username}`);
    } catch (error) {
      console.error('Twitter initialization failed:', error);
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

    // コンテンツタイプをランダム選択
    const types = [ContentType.NEW_GAME, ContentType.GAME_HIGHLIGHT, ContentType.DAILY_CHALLENGE];
    const type = types[Math.floor(Math.random() * types.length)];

    try {
      const result = await this.postGameTweet(game, type);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        platform: 'twitter',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }

    return results;
  }

  /**
   * ゲーム紹介ツイート投稿
   */
  async postGameTweet(game: GameInfo, type: ContentType): Promise<PostResult> {
    console.log(`📝 Generating tweet for: ${game.name} (${type})`);

    // コンテンツ生成
    const tweet = await this.contentGenerator.generateTweet(game, type);

    console.log(`📤 Tweet: ${tweet.text.substring(0, 50)}...`);

    if (this.dryRun) {
      console.log('[DRY-RUN] Would post tweet:', tweet.text);
      return {
        success: true,
        platform: 'twitter',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      let mediaIds: string[] = [];

      // メディアアップロード
      if (tweet.media && tweet.media.length > 0) {
        for (const media of tweet.media) {
          if (media.path.startsWith('http')) {
            // URL画像のダウンロードとアップロードは省略（実装が複雑）
            console.log('Skipping URL media upload');
          } else if (fs.existsSync(media.path)) {
            const mediaId = await this.client.v1.uploadMedia(media.path);
            mediaIds.push(mediaId);
          }
        }
      }

      // ツイート投稿
      const result = await this.client.v2.tweet({
        text: tweet.text,
        media: mediaIds.length > 0 ? { media_ids: mediaIds as any } : undefined,
      });

      console.log(`✅ Tweet posted: ${result.data.id}`);

      return {
        success: true,
        platform: 'twitter',
        postId: result.data.id,
        url: `https://twitter.com/i/web/status/${result.data.id}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Tweet failed:', error);
      return {
        success: false,
        platform: 'twitter',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 新ゲーム告知
   */
  async postNewGame(game: GameInfo): Promise<PostResult> {
    return this.postGameTweet(game, ContentType.NEW_GAME);
  }

  /**
   * デイリーチャレンジ
   */
  async postDailyChallenge(): Promise<PostResult> {
    const game = await this.getRandomGame();
    if (!game) {
      return {
        success: false,
        platform: 'twitter',
        error: 'No games available',
        timestamp: new Date().toISOString(),
      };
    }

    return this.postGameTweet(game, ContentType.DAILY_CHALLENGE);
  }

  /**
   * アンケート投稿
   */
  async postPoll(question: string, options: string[], durationMinutes: number = 1440): Promise<PostResult> {
    console.log(`📊 Posting poll: ${question}`);

    if (this.dryRun) {
      console.log('[DRY-RUN] Would post poll:', { question, options });
      return {
        success: true,
        platform: 'twitter',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const result = await this.client.v2.tweet({
        text: question,
        poll: {
          duration_minutes: durationMinutes,
          options,
        },
      });

      return {
        success: true,
        platform: 'twitter',
        postId: result.data.id,
        url: `https://twitter.com/i/web/status/${result.data.id}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform: 'twitter',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * マイルストーン告知
   */
  async postMilestone(milestone: { title: string; value: number; description: string }): Promise<PostResult> {
    const text = `🎉 ${milestone.title}\n\n${milestone.description}\n\nありがとうございます！これからもSwizzleをよろしくお願いします✨\n\n#Swizzle #マイルストーン`;

    if (this.dryRun) {
      console.log('[DRY-RUN] Would post milestone:', text);
      return {
        success: true,
        platform: 'twitter',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const result = await this.client.v2.tweet({ text });

      return {
        success: true,
        platform: 'twitter',
        postId: result.data.id,
        url: `https://twitter.com/i/web/status/${result.data.id}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform: 'twitter',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 週間サマリー投稿
   */
  async postWeeklySummary(summary: string): Promise<PostResult> {
    const text = `📊 今週のSwizzle\n\n${summary}\n\n#Swizzle #週間レポート`;

    if (text.length > 280) {
      // 長すぎる場合はスレッドにする
      return this.postThread([text.substring(0, 277) + '...', summary.substring(277)]);
    }

    if (this.dryRun) {
      console.log('[DRY-RUN] Would post weekly summary:', text);
      return {
        success: true,
        platform: 'twitter',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const result = await this.client.v2.tweet({ text });

      return {
        success: true,
        platform: 'twitter',
        postId: result.data.id,
        url: `https://twitter.com/i/web/status/${result.data.id}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform: 'twitter',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * スレッド投稿
   */
  async postThread(tweets: string[]): Promise<PostResult> {
    if (this.dryRun) {
      console.log('[DRY-RUN] Would post thread:', tweets);
      return {
        success: true,
        platform: 'twitter',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      let previousTweetId: string | undefined;
      let firstTweetId: string | undefined;

      for (const text of tweets) {
        const result = await this.client.v2.tweet({
          text,
          reply: previousTweetId ? { in_reply_to_tweet_id: previousTweetId } : undefined,
        });

        if (!firstTweetId) {
          firstTweetId = result.data.id;
        }
        previousTweetId = result.data.id;
      }

      return {
        success: true,
        platform: 'twitter',
        postId: firstTweetId,
        url: `https://twitter.com/i/web/status/${firstTweetId}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform: 'twitter',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * メンション監視・自動返信
   */
  async monitorAndReply(): Promise<void> {
    if (this.dryRun) {
      console.log('[DRY-RUN] Would monitor mentions');
      return;
    }

    try {
      const me = await this.client.v2.me();
      const mentions = await this.client.v2.userMentionTimeline(me.data.id, {
        max_results: 10,
        'tweet.fields': ['created_at', 'text'],
      });

      for await (const mention of mentions) {
        // 最近のメンションにのみ返信
        const createdAt = new Date(mention.created_at || '');
        const now = new Date();
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursDiff > 1) continue; // 1時間以上前はスキップ

        // 返信生成
        const reply = await this.contentGenerator.generateReply(mention.text, 'twitter_mention');

        // 返信投稿
        await this.client.v2.tweet({
          text: reply,
          reply: { in_reply_to_tweet_id: mention.id },
        });

        console.log(`Replied to mention ${mention.id}`);
      }
    } catch (error) {
      console.error('Mention monitoring failed:', error);
    }
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
