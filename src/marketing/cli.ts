#!/usr/bin/env tsx
/**
 * Marketing CLI
 * マーケティング自動化システムのコマンドラインインターフェース
 *
 * Usage:
 *   npm run marketing:start    - 全システム起動（cronスケジュール含む）
 *   npm run marketing:post     - 手動投稿
 *   npm run marketing:discord  - Discord Botのみ起動
 *   npm run marketing:twitter  - Twitter投稿テスト
 *   npm run marketing:instagram - Instagram投稿テスト
 *   npm run marketing:status   - 現在の状態を表示
 *   npm run marketing:dry      - ドライランモード
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESモジュール対応
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.local を読み込み
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import { MarketingOrchestrator } from './MarketingOrchestrator';
import { SwizzleDiscordBot } from './discord/DiscordBot';
import { TwitterAutomation } from './twitter/TwitterAutomation';
import { InstagramAutomation } from './instagram/InstagramAutomation';
import { ContentType } from './types';

const command = process.argv[2] || 'help';
const args = process.argv.slice(3);

async function main() {
  console.log('🎮 Swizzle Marketing CLI');
  console.log('========================');
  console.log(`Command: ${command}`);
  console.log(`Dry Run: ${process.env.MARKETING_DRY_RUN === 'true' ? 'Yes' : 'No'}`);
  console.log('');

  switch (command) {
    case 'start':
      await startFullSystem();
      break;

    case 'post':
      await manualPost(args);
      break;

    case 'discord':
      await startDiscordOnly();
      break;

    case 'twitter':
      await testTwitter();
      break;

    case 'instagram':
      await testInstagram();
      break;

    case 'status':
      showStatus();
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

/**
 * フルシステム起動
 */
async function startFullSystem(): Promise<void> {
  console.log('🚀 Starting full marketing system...');

  const orchestrator = new MarketingOrchestrator({
    dryRun: process.env.MARKETING_DRY_RUN === 'true',
  });

  await orchestrator.start();

  // シグナルハンドリング
  process.on('SIGINT', async () => {
    console.log('\n📛 Received SIGINT, shutting down...');
    await orchestrator.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n📛 Received SIGTERM, shutting down...');
    await orchestrator.stop();
    process.exit(0);
  });

  console.log('\n✅ Marketing system running. Press Ctrl+C to stop.');

  // Keep alive
  await new Promise(() => {});
}

/**
 * 手動投稿
 */
async function manualPost(args: string[]): Promise<void> {
  const platform = args[0] as 'twitter' | 'instagram' | 'discord' || 'twitter';
  const type = args[1] as keyof typeof ContentType || 'NEW_GAME';

  console.log(`📤 Manual post to ${platform} with type ${type}`);

  const orchestrator = new MarketingOrchestrator({
    dryRun: process.env.MARKETING_DRY_RUN === 'true',
  });

  const contentType = ContentType[type as keyof typeof ContentType] || ContentType.NEW_GAME;
  const result = await orchestrator.manualPost(platform, contentType);

  console.log('\nResult:', JSON.stringify(result, null, 2));
}

/**
 * Discord Botのみ起動
 */
async function startDiscordOnly(): Promise<void> {
  console.log('💬 Starting Discord Bot only...');

  const bot = new SwizzleDiscordBot();
  await bot.start();

  process.on('SIGINT', async () => {
    console.log('\n📛 Shutting down Discord Bot...');
    await bot.stop();
    process.exit(0);
  });

  console.log('\n✅ Discord Bot running. Press Ctrl+C to stop.');
  await new Promise(() => {});
}

/**
 * Twitter投稿テスト
 */
async function testTwitter(): Promise<void> {
  console.log('🐦 Testing Twitter posting...');

  const twitter = new TwitterAutomation();
  await twitter.initialize();

  const result = await twitter.postDailyChallenge();
  console.log('\nResult:', JSON.stringify(result, null, 2));
}

/**
 * Instagram投稿テスト
 */
async function testInstagram(): Promise<void> {
  console.log('📸 Testing Instagram posting...');

  const instagram = new InstagramAutomation();
  await instagram.initialize();

  const results = await instagram.postDaily();
  console.log('\nResults:', JSON.stringify(results, null, 2));
}

/**
 * 現在の状態を表示
 */
function showStatus(): void {
  console.log('📊 Marketing System Status');
  console.log('==========================\n');

  // 環境変数チェック
  const checks = [
    { name: 'Supabase URL', key: 'VITE_SUPABASE_URL' },
    { name: 'Supabase Service Key', key: 'SUPABASE_SERVICE_KEY' },
    { name: 'Anthropic API Key', key: 'ANTHROPIC_API_KEY' },
    { name: 'Twitter API Key', key: 'TWITTER_API_KEY' },
    { name: 'Twitter API Secret', key: 'TWITTER_API_SECRET' },
    { name: 'Twitter Access Token', key: 'TWITTER_ACCESS_TOKEN' },
    { name: 'Twitter Access Secret', key: 'TWITTER_ACCESS_SECRET' },
    { name: 'Discord Bot Token', key: 'DISCORD_BOT_TOKEN' },
    { name: 'Discord Guild ID', key: 'DISCORD_GUILD_ID' },
    { name: 'Instagram Access Token', key: 'INSTAGRAM_ACCESS_TOKEN' },
    { name: 'Instagram Business ID', key: 'INSTAGRAM_BUSINESS_ID' },
    { name: 'TikTok Access Token', key: 'TIKTOK_ACCESS_TOKEN' },
  ];

  console.log('Environment Variables:');
  for (const check of checks) {
    const value = process.env[check.key];
    const status = value ? '✅' : '❌';
    const display = value ? `${value.substring(0, 8)}...` : 'Not set';
    console.log(`  ${status} ${check.name}: ${display}`);
  }

  console.log('\n Platform Status:');
  console.log(`  🐦 Twitter: ${process.env.TWITTER_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`  💬 Discord: ${process.env.DISCORD_BOT_TOKEN ? 'Configured' : 'Not configured'}`);
  console.log(`  📸 Instagram: ${process.env.INSTAGRAM_ACCESS_TOKEN ? 'Configured' : 'Not configured'}`);
  console.log(`  🎬 TikTok: ${process.env.TIKTOK_ACCESS_TOKEN ? 'Configured' : 'Pending API approval'}`);

  console.log('\nDry Run Mode:', process.env.MARKETING_DRY_RUN === 'true' ? 'Enabled' : 'Disabled');
}

/**
 * ヘルプ表示
 */
function showHelp(): void {
  console.log(`
Swizzle Marketing CLI
=====================

Commands:
  start      Start the full marketing system with scheduled tasks
  post       Manual post to a platform
             Usage: npm run marketing:post [platform] [type]
             Platforms: twitter, instagram, discord
             Types: NEW_GAME, GAME_HIGHLIGHT, DAILY_CHALLENGE, HIGH_SCORE, POLL

  discord    Start Discord Bot only
  twitter    Test Twitter posting
  instagram  Test Instagram posting
  status     Show current configuration status
  help       Show this help message

Environment Variables:
  MARKETING_DRY_RUN=true    Run in dry-run mode (no actual posts)

Examples:
  npm run marketing:start           # Start all systems
  npm run marketing:post twitter    # Manual Twitter post
  npm run marketing:dry             # Dry-run mode
  npm run marketing:status          # Check configuration

For detailed setup instructions, see:
  docs/marketing/api_setup_guide.md
`);
}

// Run
main().catch(console.error);
