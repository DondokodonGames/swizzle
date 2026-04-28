/**
 * ContentGenerator
 * Claude APIを使用してマーケティングコンテンツを生成
 */

import Anthropic from '@anthropic-ai/sdk';
import { ContentType, GameInfo, Tweet, InstagramPost, TikTokVideo, DiscordEmbed } from '../types';

export class ContentGenerator {
  private claude: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    this.claude = new Anthropic({ apiKey });
  }

  /**
   * ゲーム紹介ツイートを生成
   */
  async generateTweet(game: GameInfo, type: ContentType): Promise<Tweet> {
    const prompts: Record<ContentType, string> = {
      [ContentType.NEW_GAME]: `
新作ゲーム紹介ツイートを作成してください。

ゲーム名: ${game.name}
説明: ${game.description}
URL: ${game.playUrl}

要件:
- 280文字以内
- 魅力的で好奇心をそそる導入
- ゲームの特徴を簡潔に
- CTA（リンク誘導）を含む
- 絵文字を3-5個使用
- ハッシュタグ3個（#Swizzle #IndieGame など）

出力形式: ツイート本文のみ（JSONではなくプレーンテキスト）
`,
      [ContentType.DAILY_CHALLENGE]: `
デイリーチャレンジツイートを作成してください。

ゲーム名: ${game.name}
説明: ${game.description}
URL: ${game.playUrl}

要件:
- 280文字以内
- チャレンジ感・競争心を煽る
- ハイスコア報告を促す
- #SwizzleChallenge を含む
- 絵文字使用

出力形式: ツイート本文のみ
`,
      [ContentType.GAME_HIGHLIGHT]: `
おすすめゲーム紹介ツイートを作成してください。

ゲーム名: ${game.name}
説明: ${game.description}
プレイ数: ${game.playCount}
URL: ${game.playUrl}

要件:
- 280文字以内
- 人気の理由を伝える
- 遊びたくなる表現
- 絵文字使用

出力形式: ツイート本文のみ
`,
      [ContentType.HIGH_SCORE]: `
ハイスコアチャレンジツイートを作成してください。

ゲーム名: ${game.name}
URL: ${game.playUrl}

要件:
- 280文字以内
- スコア競争を促す
- リプライでスコア報告を求める
- 絵文字使用

出力形式: ツイート本文のみ
`,
      [ContentType.USER_GAME]: `
ユーザー作成ゲーム紹介ツイートを作成してください。

ゲーム名: ${game.name}
作成者: ${game.creatorName || '匿名'}
説明: ${game.description}
URL: ${game.playUrl}

要件:
- 280文字以内
- クリエイターへの敬意を示す
- 作品の魅力を伝える
- 絵文字使用

出力形式: ツイート本文のみ
`,
      [ContentType.COMMUNITY]: `コミュニティ紹介ツイートを生成してください。`,
      [ContentType.POLL]: `アンケートツイートを生成してください。`,
      [ContentType.QUIZ]: `クイズツイートを生成してください。`,
      [ContentType.BEHIND_SCENES]: `開発裏話ツイートを生成してください。`,
      [ContentType.TIPS]: `ゲームTipsツイートを生成してください。`,
      [ContentType.MILESTONE]: `マイルストーン達成ツイートを生成してください。`,
      [ContentType.UPDATE]: `アップデート告知ツイートを生成してください。`,
    };

    const prompt = prompts[type] || prompts[ContentType.NEW_GAME];

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content[0] as { type: 'text'; text: string }).text.trim();

    return {
      text,
      media: game.thumbnailUrl ? [{ type: 'image', path: game.thumbnailUrl }] : undefined,
    };
  }

  /**
   * Instagram投稿を生成
   */
  async generateInstagramPost(game: GameInfo, _type: ContentType): Promise<InstagramPost> {
    const prompt = `
Instagramフィード投稿を作成してください。

ゲーム名: ${game.name}
説明: ${game.description}
プレイ数: ${game.playCount}
URL: ${game.playUrl}

要件:
- 魅力的な導入（2-3行）
- ゲームの特徴説明
- CTA（「プロフィールのリンクから」）
- 絵文字を適度に使用
- フレンドリーな口調
- 150-200文字程度

出力形式: 投稿本文のみ（ハッシュタグ別途追加）
`;

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const caption = (response.content[0] as { type: 'text'; text: string }).text.trim();

    // ハッシュタグ生成
    const hashtags = await this.generateInstagramHashtags(game);

    return {
      type: 'feed',
      images: game.thumbnailUrl ? [game.thumbnailUrl] : undefined,
      caption,
      hashtags,
    };
  }

  /**
   * Instagramハッシュタグ生成（最大30個）
   */
  async generateInstagramHashtags(_game: GameInfo): Promise<string[]> {
    const baseHashtags = [
      // ゲーム関連（10個）
      '#indiegame', '#mobilegame', '#webgame', '#gaming',
      '#gamedev', '#indiedev', '#casualgame', '#minigame',
      '#browsergame', '#freegame',
      // エンゲージメント系（5個）
      '#instagame', '#gamer', '#gamersofinstagram',
      '#gameoftheday', '#playtime',
      // 固有（5個）
      '#swizzle', '#shortgame', '#3tapgame',
      '#quickgame', '#addictivegame',
    ];

    return baseHashtags.slice(0, 30);
  }

  /**
   * TikTok動画スクリプトを生成
   */
  async generateTikTokScript(game: GameInfo): Promise<TikTokVideo> {
    const hookPrompt = `
TikTok動画のフック（最初3秒）を生成してください。

ゲーム名: ${game.name}
説明: ${game.description}

要件:
- 視聴者の注意を引く（質問/驚き/チャレンジ）
- 短く（10-15文字）
- 好奇心をそそる

例:
- 「3秒でクリアできる？」
- 「このゲーム知ってた？」
- 「簡単そうで激ムズ」

出力形式: フックのテキストのみ
`;

    const captionPrompt = `
TikTokキャプションを生成してください。

ゲーム名: ${game.name}
説明: ${game.description}
URL: ${game.playUrl}

要件:
- 簡潔（100文字以内）
- 絵文字使用
- CTAを含む（「リンクから遊べます」）
- フレンドリーな口調

出力形式: キャプションのみ
`;

    const [hookResponse, captionResponse] = await Promise.all([
      this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{ role: 'user', content: hookPrompt }],
      }),
      this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: captionPrompt }],
      }),
    ]);

    const hookText = (hookResponse.content[0] as { type: 'text'; text: string }).text.trim();
    const caption = (captionResponse.content[0] as { type: 'text'; text: string }).text.trim();

    return {
      hook: {
        type: 'challenge',
        text: hookText,
      },
      mainContent: {
        gameplayPath: '', // ゲームプレイキャプチャで後から設定
        captions: [hookText, game.name, 'リンクから遊べます'],
      },
      cta: {
        text: 'リンクから遊べます',
        visual: 'logo',
      },
      caption,
      hashtags: [
        '#indiegame', '#webgame', '#gaming', '#fyp',
        '#ゲーム', '#暇つぶし', '#中毒性', '#swizzle',
      ],
    };
  }

  /**
   * Discord Embed生成
   */
  async generateDiscordEmbed(game: GameInfo, type: ContentType): Promise<DiscordEmbed> {
    const colors: Record<ContentType, number> = {
      [ContentType.NEW_GAME]: 0x4ecdc4,      // ターコイズ
      [ContentType.DAILY_CHALLENGE]: 0xffe66d, // 黄色
      [ContentType.GAME_HIGHLIGHT]: 0xff6b6b,  // ピンク
      [ContentType.HIGH_SCORE]: 0x95e1d3,      // ミント
      [ContentType.USER_GAME]: 0xf38181,       // コーラル
      [ContentType.COMMUNITY]: 0x6c5ce7,       // 紫
      [ContentType.POLL]: 0x0984e3,            // 青
      [ContentType.QUIZ]: 0x00b894,            // 緑
      [ContentType.BEHIND_SCENES]: 0xfdcb6e,   // 黄
      [ContentType.TIPS]: 0xe17055,            // オレンジ
      [ContentType.MILESTONE]: 0xd63031,       // 赤
      [ContentType.UPDATE]: 0x74b9ff,          // 水色
    };

    const titles: Record<ContentType, string> = {
      [ContentType.NEW_GAME]: '🎮 新作ゲーム',
      [ContentType.DAILY_CHALLENGE]: '🏆 デイリーチャレンジ',
      [ContentType.GAME_HIGHLIGHT]: '⭐ おすすめゲーム',
      [ContentType.HIGH_SCORE]: '🥇 ハイスコアチャレンジ',
      [ContentType.USER_GAME]: '🎨 ユーザー作品',
      [ContentType.COMMUNITY]: '👥 コミュニティ',
      [ContentType.POLL]: '📊 アンケート',
      [ContentType.QUIZ]: '❓ クイズ',
      [ContentType.BEHIND_SCENES]: '🔧 開発裏話',
      [ContentType.TIPS]: '💡 Tips',
      [ContentType.MILESTONE]: '🎉 マイルストーン',
      [ContentType.UPDATE]: '📢 アップデート',
    };

    return {
      title: `${titles[type]} | ${game.name}`,
      description: game.description,
      color: colors[type],
      fields: [
        { name: '🎮 プレイ', value: `[今すぐプレイ](${game.playUrl})`, inline: true },
        { name: '👁️ プレイ数', value: `${game.playCount}回`, inline: true },
        { name: '❤️ いいね', value: `${game.likeCount}`, inline: true },
      ],
      image: game.thumbnailUrl,
      footer: 'Swizzle - 3タップで遊べるゲーム',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * リプライ生成
   */
  async generateReply(originalText: string, context: string = 'general'): Promise<string> {
    const prompt = `
このメッセージに返信してください:

メッセージ: "${originalText}"
コンテキスト: ${context}

返信は:
- Swizzle公式アカウントとして
- 感謝を伝える
- 質問には具体的に答える
- フレンドリーに
- 簡潔に（100文字以内）
- 絵文字を1-2個使用

出力形式: 返信文のみ
`;

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    return (response.content[0] as { type: 'text'; text: string }).text.trim();
  }

  /**
   * 週間サマリー生成
   */
  async generateWeeklySummary(stats: {
    newGames: number;
    totalPlays: number;
    topGames: GameInfo[];
  }): Promise<string> {
    const prompt = `
週間サマリーを作成してください:

今週の統計:
- 新作ゲーム: ${stats.newGames}本
- 総プレイ数: ${stats.totalPlays}回
- 人気ゲームTOP3: ${stats.topGames.map(g => g.name).join(', ')}

要件:
- 明るく前向きなトーン
- 達成感を感じさせる
- 来週への期待感
- 絵文字使用
- 300文字程度

出力形式: サマリー文のみ
`;

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    return (response.content[0] as { type: 'text'; text: string }).text.trim();
  }
}
