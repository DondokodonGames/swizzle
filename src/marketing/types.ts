/**
 * Swizzle マーケティング自動化 - 型定義
 */

// コンテンツタイプ
export enum ContentType {
  // 新ゲーム紹介
  NEW_GAME = 'new_game',
  GAME_HIGHLIGHT = 'game_highlight',

  // チャレンジ系
  DAILY_CHALLENGE = 'daily_challenge',
  HIGH_SCORE = 'high_score',

  // ユーザー参加
  USER_GAME = 'user_game',
  COMMUNITY = 'community',

  // エンゲージメント
  POLL = 'poll',
  QUIZ = 'quiz',

  // 開発関連
  BEHIND_SCENES = 'behind_scenes',
  TIPS = 'tips',

  // マイルストーン
  MILESTONE = 'milestone',
  UPDATE = 'update',
}

// ゲーム情報
export interface GameInfo {
  id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  playUrl: string;
  creatorName?: string;
  playCount: number;
  likeCount: number;
  createdAt: string;
}

// 投稿スケジュール
export interface PostSchedule {
  time: string; // HH:mm形式 (JST)
  contentType: ContentType;
  platform: 'tiktok' | 'instagram' | 'twitter' | 'discord';
}

// SNS投稿結果
export interface PostResult {
  success: boolean;
  platform: string;
  postId?: string;
  url?: string;
  error?: string;
  timestamp: string;
}

// TikTok動画
export interface TikTokVideo {
  hook: {
    type: 'question' | 'challenge' | 'surprise';
    text: string;
  };
  mainContent: {
    gameplayPath: string;
    captions: string[];
  };
  cta: {
    text: string;
    visual: 'logo' | 'qr';
  };
  caption: string;
  hashtags: string[];
  musicId?: string;
}

// Instagram投稿
export interface InstagramPost {
  type: 'feed' | 'reel' | 'story';
  images?: string[];
  video?: string;
  caption: string;
  hashtags: string[];
  location?: string;
}

// Twitter投稿
export interface Tweet {
  text: string;
  media?: TweetMedia[];
  poll?: TweetPoll;
  replyTo?: string;
  quoteTweet?: string;
}

export interface TweetMedia {
  type: 'image' | 'video' | 'gif';
  path: string;
  altText?: string;
}

export interface TweetPoll {
  options: string[];
  durationMinutes: number;
}

// Discord Embed
export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  image?: string;
  thumbnail?: string;
  footer?: string;
  timestamp?: string;
}

// マイルストーン
export interface Milestone {
  type: 'plays' | 'games' | 'users' | 'custom';
  value: number;
  title: string;
  description: string;
}

// 分析データ
export interface AnalyticsData {
  platform: string;
  date: string;
  metrics: {
    posts: number;
    impressions: number;
    engagements: number;
    clicks: number;
    followers: number;
    followerChange: number;
  };
  topPosts: {
    id: string;
    text: string;
    engagements: number;
  }[];
}

// マーケティング設定
export interface MarketingConfig {
  enabled: boolean;
  dryRun: boolean; // true=投稿せずログのみ
  platforms: {
    twitter: { enabled: boolean; postsPerDay: number };
    instagram: { enabled: boolean; postsPerDay: number };
    tiktok: { enabled: boolean; postsPerDay: number };
    discord: { enabled: boolean };
  };
  schedule: PostSchedule[];
  hashtags: {
    default: string[];
    trending: string[];
  };
}
