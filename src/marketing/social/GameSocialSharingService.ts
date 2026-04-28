/**
 * GameSocialSharingService
 * ゲーム生成後のソーシャルシェアリングを統括するサービス
 *
 * 機能:
 * - ゲーム生成後のスクリーンショット撮影→Twitter投稿
 * - ゲーム生成後の動画撮影→TikTok投稿
 * - ゲームリンクの生成と管理
 * - SNS共有用のコンテンツ生成
 */

import { ContentGenerator } from '../content/ContentGenerator';
import { GameInfo, ContentType, PostResult, TikTokVideo } from '../types';

export interface ShareableGame {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  screenshotUrl?: string;
  videoUrl?: string;
  creatorName?: string;
  playCount?: number;
  likeCount?: number;
  createdAt: string;
}

export interface SocialShareResult {
  twitter?: PostResult;
  tiktok?: PostResult;
  gameUrl: string;
  shortUrl?: string;
}

export interface ShareContent {
  text: string;
  hashtags: string[];
  gameUrl: string;
  mediaUrl?: string;
}

/**
 * ゲームソーシャルシェアリングサービス
 */
export class GameSocialSharingService {
  private contentGenerator: ContentGenerator;
  private baseUrl: string;

  constructor() {
    this.contentGenerator = new ContentGenerator();
    this.baseUrl = process.env.VITE_APP_URL || 'https://playswizzle.com';
  }

  /**
   * ゲームURLを生成
   */
  generateGameUrl(gameId: string): string {
    return `${this.baseUrl}/play/${gameId}`;
  }

  /**
   * 短縮URLを生成（将来的にカスタムドメイン対応）
   */
  generateShortUrl(gameId: string): string {
    // 短いIDを生成（UUID前半8文字）
    const shortId = gameId.substring(0, 8);
    return `${this.baseUrl}/g/${shortId}`;
  }

  /**
   * Twitter共有用コンテンツを生成
   */
  async generateTwitterContent(game: ShareableGame): Promise<ShareContent> {
    const gameInfo: GameInfo = {
      id: game.id,
      name: game.title,
      description: game.description,
      thumbnailUrl: game.screenshotUrl || game.thumbnailUrl,
      playUrl: this.generateGameUrl(game.id),
      creatorName: game.creatorName,
      playCount: game.playCount || 0,
      likeCount: game.likeCount || 0,
      createdAt: game.createdAt,
    };

    const tweet = await this.contentGenerator.generateTweet(gameInfo, ContentType.NEW_GAME);

    return {
      text: tweet.text,
      hashtags: this.extractHashtags(tweet.text),
      gameUrl: gameInfo.playUrl,
      mediaUrl: game.screenshotUrl,
    };
  }

  /**
   * TikTok共有用コンテンツを生成
   */
  async generateTikTokContent(game: ShareableGame): Promise<{
    script: TikTokVideo;
    videoUrl?: string;
    gameUrl: string;
  }> {
    const gameInfo: GameInfo = {
      id: game.id,
      name: game.title,
      description: game.description,
      thumbnailUrl: game.thumbnailUrl,
      playUrl: this.generateGameUrl(game.id),
      creatorName: game.creatorName,
      playCount: game.playCount || 0,
      likeCount: game.likeCount || 0,
      createdAt: game.createdAt,
    };

    const script = await this.contentGenerator.generateTikTokScript(gameInfo);

    // 動画パスを設定
    if (game.videoUrl) {
      script.mainContent.gameplayPath = game.videoUrl;
    }

    return {
      script,
      videoUrl: game.videoUrl,
      gameUrl: gameInfo.playUrl,
    };
  }

  /**
   * 汎用ソーシャルシェアコンテンツを生成
   */
  async generateShareContent(
    game: ShareableGame,
    platform: 'twitter' | 'tiktok' | 'instagram' | 'line' | 'generic'
  ): Promise<ShareContent> {
    const gameUrl = this.generateGameUrl(game.id);

    switch (platform) {
      case 'twitter':
        return this.generateTwitterContent(game);

      case 'tiktok': {
        const tiktokContent = await this.generateTikTokContent(game);
        return {
          text: tiktokContent.script.caption,
          hashtags: tiktokContent.script.hashtags,
          gameUrl,
          mediaUrl: game.videoUrl,
        };
      }

      case 'instagram': {
        const gameInfo: GameInfo = {
          id: game.id,
          name: game.title,
          description: game.description,
          playUrl: gameUrl,
          playCount: game.playCount || 0,
          likeCount: game.likeCount || 0,
          createdAt: game.createdAt,
        };
        const post = await this.contentGenerator.generateInstagramPost(gameInfo, ContentType.NEW_GAME);
        return {
          text: post.caption,
          hashtags: post.hashtags,
          gameUrl,
          mediaUrl: game.screenshotUrl,
        };
      }

      case 'line':
        return {
          text: `${game.title}で遊んでみて！\n${game.description}\n\n${gameUrl}`,
          hashtags: [],
          gameUrl,
        };

      default:
        return {
          text: `${game.title}をプレイしよう！\n${game.description}\n\nプレイはこちら: ${gameUrl}`,
          hashtags: ['#Swizzle', '#IndieGame'],
          gameUrl,
        };
    }
  }

  /**
   * Web Share APIを使用した共有
   */
  async shareViaWebAPI(game: ShareableGame): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.share) {
      console.warn('⚠️ Web Share APIがサポートされていません');
      return false;
    }

    const gameUrl = this.generateGameUrl(game.id);

    try {
      await navigator.share({
        title: game.title,
        text: game.description,
        url: gameUrl,
      });
      console.log('✅ Web Share API経由で共有成功');
      return true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('ユーザーが共有をキャンセルしました');
      } else {
        console.error('❌ 共有エラー:', error);
      }
      return false;
    }
  }

  /**
   * クリップボードにURLをコピー
   */
  async copyUrlToClipboard(gameId: string): Promise<boolean> {
    const url = this.generateGameUrl(gameId);

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        console.log('✅ URLをクリップボードにコピーしました');
        return true;
      }

      // フォールバック: 古いブラウザ対応
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      console.log('✅ URLをクリップボードにコピーしました（フォールバック）');
      return true;

    } catch (error) {
      console.error('❌ クリップボードへのコピー失敗:', error);
      return false;
    }
  }

  /**
   * SNS共有URLを生成
   */
  generateSocialShareUrls(game: ShareableGame): {
    twitter: string;
    facebook: string;
    line: string;
    reddit: string;
    whatsapp: string;
    telegram: string;
    discord: string;
    wechat: string;
  } {
    const gameUrl = encodeURIComponent(this.generateGameUrl(game.id));
    const rawGameUrl = this.generateGameUrl(game.id);
    const text = encodeURIComponent(`${game.title}で遊んでみて！ #Swizzle #IndieGame`);
    const rawText = `${game.title}で遊んでみて！ #Swizzle #IndieGame`;

    return {
      // Global
      twitter: `https://twitter.com/intent/tweet?url=${gameUrl}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${gameUrl}`,

      // Europe/Americas/Africa/South Asia
      whatsapp: `https://wa.me/?text=${encodeURIComponent(rawText + '\n' + rawGameUrl)}`,
      reddit: `https://www.reddit.com/submit?url=${gameUrl}&title=${encodeURIComponent(game.title)}`,

      // Europe/Middle East
      telegram: `https://t.me/share/url?url=${gameUrl}&text=${text}`,

      // Gaming communities (copy to clipboard)
      discord: rawGameUrl, // Discord doesn't have share URL - use clipboard

      // Asia
      line: `https://social-plugins.line.me/lineit/share?url=${gameUrl}`,

      // China (copy to clipboard)
      wechat: rawGameUrl, // WeChat doesn't have web share URL - use clipboard
    };
  }

  /**
   * リザルト画面用共有コンテンツを生成
   */
  generateResultShareContent(
    game: ShareableGame,
    result: {
      score: number;
      time?: number;
      success: boolean;
    }
  ): ShareContent {
    const gameUrl = this.generateGameUrl(game.id);
    const emoji = result.success ? '🎉' : '😅';
    const statusText = result.success ? 'クリア' : 'チャレンジ';

    const text = `${emoji} 「${game.title}」を${statusText}！\n` +
      `スコア: ${result.score}点\n` +
      (result.time ? `タイム: ${result.time.toFixed(1)}秒\n` : '') +
      `\nあなたも挑戦してみて！\n${gameUrl}\n\n#Swizzle #ショートゲーム`;

    return {
      text,
      hashtags: ['#Swizzle', '#ショートゲーム'],
      gameUrl,
    };
  }

  // ==================== ヘルパー関数 ====================

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g;
    return text.match(hashtagRegex) || [];
  }
}

export default GameSocialSharingService;
