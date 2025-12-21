/**
 * Swizzle Discord Bot
 * コミュニティ管理・自動投稿・FAQ応答
 */

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  TextChannel,
  GuildMember,
  Message,
  ChannelType,
} from 'discord.js';
import { ContentGenerator } from '../content/ContentGenerator';
import { GameInfo, ContentType, DiscordEmbed } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// チャンネルID設定
interface ChannelConfig {
  announcements: string;
  general: string;
  helpSupport: string;
  gameShowcase: string;
  yourCreations: string;
  highScores: string;
  tutorials: string;
  botCommands: string;
}

export class SwizzleDiscordBot {
  private client: Client;
  private supabase: SupabaseClient;
  private contentGenerator: ContentGenerator;
  private channels: ChannelConfig | null = null;
  private guildId: string;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });

    this.guildId = process.env.DISCORD_GUILD_ID || '';

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase環境変数が設定されていません');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.contentGenerator = new ContentGenerator();
  }

  /**
   * Bot起動
   */
  async start(): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      throw new Error('DISCORD_BOT_TOKEN is not set');
    }

    // イベントリスナー設定
    this.setupEventListeners();

    // 起動
    await this.client.login(token);
    console.log('✅ Discord Bot起動完了');
  }

  /**
   * イベントリスナー設定
   */
  private setupEventListeners(): void {
    // 準備完了
    this.client.on('ready', () => {
      console.log(`🤖 Logged in as ${this.client.user?.tag}`);
      this.client.user?.setActivity('Swizzle Games', { type: 0 }); // Playing
    });

    // 新規メンバー
    this.client.on('guildMemberAdd', async (member) => {
      await this.welcomeNewMember(member);
    });

    // メッセージ受信
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      // コマンド処理
      if (message.content.startsWith('!')) {
        await this.handleCommand(message);
        return;
      }

      // FAQ自動応答
      if (await this.isFAQ(message.content)) {
        await this.answerFAQ(message);
      }
    });
  }

  /**
   * 新規メンバー歓迎
   */
  private async welcomeNewMember(member: GuildMember): Promise<void> {
    try {
      const generalChannel = await this.getChannel('general');
      if (!generalChannel) return;

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`🎉 ようこそ ${member.displayName} さん！`)
        .setDescription(
          `Swizzleコミュニティへようこそ！🎮\n\n` +
          `まずは #announcements をチェック！\n` +
          `ゲーム作成は #tutorials を見てね\n\n` +
          `楽しんでいってね！✨`
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await generalChannel.send({ embeds: [embed] });

      // Playerロール付与
      const playerRole = member.guild.roles.cache.find(r => r.name === 'Player');
      if (playerRole) {
        await member.roles.add(playerRole);
      }
    } catch (error) {
      console.error('Welcome message failed:', error);
    }
  }

  /**
   * コマンド処理
   */
  private async handleCommand(message: Message): Promise<void> {
    const args = message.content.slice(1).split(' ');
    const command = args[0].toLowerCase();

    const commands: Record<string, () => Promise<void>> = {
      'help': async () => {
        const embed = new EmbedBuilder()
          .setColor(0x95e1d3)
          .setTitle('📚 コマンド一覧')
          .addFields(
            { name: '!help', value: 'このヘルプを表示', inline: true },
            { name: '!tutorial', value: 'チュートリアルリンク', inline: true },
            { name: '!games', value: '人気ゲームTOP10', inline: true },
            { name: '!random', value: 'ランダムゲーム', inline: true },
            { name: '!new', value: '新着ゲーム', inline: true },
            { name: '!stats', value: '統計情報', inline: true },
          )
          .setFooter({ text: 'Swizzle Bot' });

        await message.reply({ embeds: [embed] });
      },

      'tutorial': async () => {
        await message.reply(
          '📚 **チュートリアル**\n\n' +
          '1️⃣ テンプレートを選ぶ\n' +
          '2️⃣ 画像を変更する\n' +
          '3️⃣ 公開する\n\n' +
          'たった3ステップでゲームが作れます！✨\n' +
          '👉 https://playswizzle.com/editor'
        );
      },

      'games': async () => {
        const games = await this.getTopGames(10);
        const list = games.map((g, i) =>
          `${i + 1}. **${g.name}** - ${g.playCount}プレイ`
        ).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0xff6b6b)
          .setTitle('🏆 人気ゲームTOP10')
          .setDescription(list || 'まだゲームがありません')
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      },

      'random': async () => {
        const game = await this.getRandomGame();
        if (!game) {
          await message.reply('ゲームが見つかりませんでした 😢');
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x4ecdc4)
          .setTitle(`🎲 ${game.name}`)
          .setDescription(game.description)
          .addFields(
            { name: '🎮 プレイ', value: `[今すぐプレイ](${game.playUrl})`, inline: true },
          )
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      },

      'new': async () => {
        const games = await this.getNewGames(5);
        const list = games.map((g, i) =>
          `${i + 1}. **${g.name}** - ${this.formatDate(g.createdAt)}`
        ).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x00b894)
          .setTitle('🆕 新着ゲーム')
          .setDescription(list || 'まだゲームがありません')
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      },

      'stats': async () => {
        const stats = await this.getStats();

        const embed = new EmbedBuilder()
          .setColor(0x6c5ce7)
          .setTitle('📊 Swizzle統計')
          .addFields(
            { name: '🎮 総ゲーム数', value: `${stats.totalGames}個`, inline: true },
            { name: '👁️ 総プレイ数', value: `${stats.totalPlays}回`, inline: true },
            { name: '👥 クリエイター数', value: `${stats.totalCreators}人`, inline: true },
          )
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      },
    };

    const handler = commands[command];
    if (handler) {
      await handler();
    }
  }

  /**
   * FAQ判定
   */
  private async isFAQ(content: string): Promise<boolean> {
    const keywords = [
      'ゲームの作り方', '作り方', 'どうやって作る',
      'エラー', 'バグ', '動かない',
      '公開', '共有', 'シェア',
      '使い方', 'やり方',
    ];

    const lowerContent = content.toLowerCase();
    return keywords.some(keyword => lowerContent.includes(keyword));
  }

  /**
   * FAQ応答
   */
  private async answerFAQ(message: Message): Promise<void> {
    const content = message.content.toLowerCase();

    // キーワードマッチング
    if (content.includes('作り方') || content.includes('どうやって作る')) {
      await message.reply(
        '🎮 **ゲームの作り方**\n\n' +
        '1️⃣ エディターを開く: https://playswizzle.com/editor\n' +
        '2️⃣ テンプレートを選択\n' +
        '3️⃣ 画像を変更\n' +
        '4️⃣ 公開ボタンを押す\n\n' +
        'たった3分で完成！✨'
      );
      return;
    }

    if (content.includes('エラー') || content.includes('バグ') || content.includes('動かない')) {
      await message.reply(
        '🔧 **トラブルシューティング**\n\n' +
        '以下を試してください:\n' +
        '1. ページを更新する\n' +
        '2. キャッシュをクリアする\n' +
        '3. 別のブラウザで試す\n\n' +
        'それでも解決しない場合は #help-and-support で詳細を教えてください！'
      );
      return;
    }

    // Claude APIで応答生成
    try {
      const reply = await this.contentGenerator.generateReply(message.content, 'discord_help');
      await message.reply(reply);
    } catch (error) {
      console.error('FAQ response generation failed:', error);
    }
  }

  /**
   * 新ゲーム告知
   */
  async announceNewGames(): Promise<void> {
    const games = await this.getNewGames(24); // 過去24時間
    if (games.length === 0) return;

    const channel = await this.getChannel('announcements');
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x4ecdc4)
      .setTitle('🎮 今日の新作ゲーム')
      .setDescription(
        games.map((game, i) =>
          `**${i + 1}. ${game.name}**\n${game.description}\n[プレイする](${game.playUrl})`
        ).join('\n\n')
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  /**
   * デイリーチャレンジ告知
   */
  async announceDailyChallenge(): Promise<void> {
    const game = await this.getRandomGame();
    if (!game) return;

    const channel = await this.getChannel('announcements');
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xffe66d)
      .setTitle('🏆 デイリーチャレンジ')
      .setDescription(
        `**今日のチャレンジゲーム**\n\n` +
        `**${game.name}**\n\n` +
        `ハイスコアを #high-scores に投稿してね！\n\n` +
        `[プレイする](${game.playUrl})`
      )
      .setImage(game.thumbnailUrl || null)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  /**
   * 週間サマリー告知
   */
  async announceWeeklySummary(): Promise<void> {
    const stats = await this.getWeeklyStats();
    const summary = await this.contentGenerator.generateWeeklySummary(stats);

    const channel = await this.getChannel('announcements');
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x6c5ce7)
      .setTitle('📊 今週のSwizzle')
      .setDescription(summary)
      .addFields(
        { name: '🆕 新作ゲーム', value: `${stats.newGames}本`, inline: true },
        { name: '👁️ 総プレイ数', value: `${stats.totalPlays}回`, inline: true },
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  /**
   * カスタムEmbed投稿
   */
  async postEmbed(channelKey: keyof ChannelConfig, embed: DiscordEmbed): Promise<void> {
    const channel = await this.getChannel(channelKey);
    if (!channel) return;

    const discordEmbed = new EmbedBuilder()
      .setColor(embed.color)
      .setTitle(embed.title)
      .setDescription(embed.description);

    if (embed.fields) {
      discordEmbed.addFields(embed.fields);
    }
    if (embed.image) {
      discordEmbed.setImage(embed.image);
    }
    if (embed.thumbnail) {
      discordEmbed.setThumbnail(embed.thumbnail);
    }
    if (embed.footer) {
      discordEmbed.setFooter({ text: embed.footer });
    }
    if (embed.timestamp) {
      discordEmbed.setTimestamp(new Date(embed.timestamp));
    }

    await channel.send({ embeds: [discordEmbed] });
  }

  // ==================== ヘルパー関数 ====================

  private async getChannel(key: string): Promise<TextChannel | null> {
    // チャンネルIDはユーザーが設定後に使用
    // 現在は名前でチャンネルを検索
    const guild = this.client.guilds.cache.get(this.guildId);
    if (!guild) return null;

    const channel = guild.channels.cache.find(
      ch => ch.type === ChannelType.GuildText && ch.name === key.replace(/([A-Z])/g, '-$1').toLowerCase()
    ) as TextChannel | undefined;

    return channel || null;
  }

  private async getTopGames(limit: number): Promise<GameInfo[]> {
    const { data } = await this.supabase
      .from('user_games')
      .select('*')
      .eq('is_published', true)
      .order('play_count', { ascending: false })
      .limit(limit);

    return (data || []).map(this.mapGameInfo);
  }

  private async getNewGames(hoursOrLimit: number): Promise<GameInfo[]> {
    const since = new Date();
    since.setHours(since.getHours() - hoursOrLimit);

    const { data } = await this.supabase
      .from('user_games')
      .select('*')
      .eq('is_published', true)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    return (data || []).map(this.mapGameInfo);
  }

  private async getRandomGame(): Promise<GameInfo | null> {
    const { data } = await this.supabase
      .from('user_games')
      .select('*')
      .eq('is_published', true);

    if (!data || data.length === 0) return null;

    const random = data[Math.floor(Math.random() * data.length)];
    return this.mapGameInfo(random);
  }

  private async getStats(): Promise<{ totalGames: number; totalPlays: number; totalCreators: number }> {
    const { count: totalGames } = await this.supabase
      .from('user_games')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    const { data: playData } = await this.supabase
      .from('user_games')
      .select('play_count')
      .eq('is_published', true);

    const totalPlays = (playData || []).reduce((sum, g) => sum + (g.play_count || 0), 0);

    const { data: creators } = await this.supabase
      .from('user_games')
      .select('creator_id')
      .eq('is_published', true);

    const uniqueCreators = new Set((creators || []).map(c => c.creator_id));

    return {
      totalGames: totalGames || 0,
      totalPlays,
      totalCreators: uniqueCreators.size,
    };
  }

  private async getWeeklyStats(): Promise<{
    newGames: number;
    totalPlays: number;
    topGames: GameInfo[];
  }> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count: newGames } = await this.supabase
      .from('user_games')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .gte('created_at', weekAgo.toISOString());

    const { data: playData } = await this.supabase
      .from('user_games')
      .select('play_count')
      .eq('is_published', true);

    const totalPlays = (playData || []).reduce((sum, g) => sum + (g.play_count || 0), 0);

    const topGames = await this.getTopGames(3);

    return {
      newGames: newGames || 0,
      totalPlays,
      topGames,
    };
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

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  /**
   * Bot停止
   */
  async stop(): Promise<void> {
    await this.client.destroy();
    console.log('Discord Bot stopped');
  }
}
