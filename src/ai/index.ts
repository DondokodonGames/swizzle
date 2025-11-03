/**
 * Phase H - AI自動ゲーム生成システム テスト実行
 * テスト起動用エントリーポイント
 */

// 🔧 環境変数読み込み（最優先）
import dotenv from 'dotenv';
import { resolve } from 'path';

// .env.local ファイルを読み込み
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { MasterOrchestrator } from './MasterOrchestrator';
import { AIGenerationConfig } from './types/GenerationTypes';

/**
 * 環境変数から設定を読み込み
 */
function loadConfig(): AIGenerationConfig {
  // 環境変数チェック
  const requiredVars = [
    'ANTHROPIC_API_KEY',
    'VITE_SUPABASE_URL',
    'SUPABASE_SERVICE_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
  }
  
  // 設定構築
  const config: AIGenerationConfig = {
    // API設定
    api: {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
      openaiApiKey: process.env.OPENAI_API_KEY,
      imageProvider: (process.env.IMAGE_GENERATION_PROVIDER as any) || 'openai',
      stableDiffusionUrl: process.env.SD_API_URL,
      replicateApiKey: process.env.REPLICATE_API_TOKEN
    },
    
    // Supabase設定
    supabase: {
      url: process.env.VITE_SUPABASE_URL!,
      serviceKey: process.env.SUPABASE_SERVICE_KEY!,
      masterEmail: process.env.MASTER_EMAIL || 'master@swizzle.app',
      masterPassword: process.env.MASTER_PASSWORD || 'changeme'
    },
    
    // Twitter設定（オプション）
    twitter: process.env.TWITTER_API_KEY ? {
      apiKey: process.env.TWITTER_API_KEY,
      apiSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!
    } : undefined,
    
    // 生成設定
    generation: {
      targetGamesCount: parseInt(process.env.TARGET_GAMES_COUNT || '245'),
      dailyGenerationLimit: parseInt(process.env.DAILY_GENERATION_LIMIT || '100'),
      qualityThreshold: parseFloat(process.env.QUALITY_THRESHOLD || '85'),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
      explorationRate: parseFloat(process.env.EXPLORATION_RATE || '0.3')
    },
    
    // パフォーマンス設定
    performance: {
      parallelGeneration: process.env.PARALLEL_GENERATION === 'true',
      maxConcurrent: parseInt(process.env.MAX_CONCURRENT || '3'),
      batchSize: parseInt(process.env.BATCH_SIZE || '10'),
      cacheEnabled: process.env.CACHE_ENABLED !== 'false'
    },
    
    // デバッグ設定
    debug: {
      dryRun: process.env.VITE_AI_DRY_RUN === 'true',
      verbose: process.env.VITE_AI_DEBUG_MODE === 'true',
      saveFailures: process.env.SAVE_FAILURES !== 'false'
    }
  };
  
  return config;
}

/**
 * 設定情報を表示
 */
function printConfig(config: AIGenerationConfig): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚙️  Phase H Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Target Games: ${config.generation.targetGamesCount}`);
  console.log(`Quality Threshold: ${config.generation.qualityThreshold} points`);
  console.log(`Exploration Rate: ${(config.generation.explorationRate * 100).toFixed(0)}%`);
  console.log(`Dry Run: ${config.debug.dryRun ? 'YES (no publishing)' : 'NO'}`);
  console.log(`Verbose: ${config.debug.verbose ? 'YES' : 'NO'}`);
  console.log(`Image Provider: ${config.api.imageProvider || 'openai'}`);
  if (config.api.imageProvider === 'openai') {
    console.log(`OpenAI DALL-E 3: ${config.api.openaiApiKey ? 'Enabled' : 'Disabled'}`);
  } else if (config.api.imageProvider === 'replicate') {
    console.log(`Replicate: ${config.api.replicateApiKey ? 'Enabled' : 'Disabled'}`);
  } else {
    console.log(`Stable Diffusion: ${config.api.stableDiffusionUrl || 'Disabled'}`);
  }
  console.log(`Twitter: ${config.twitter ? 'Enabled' : 'Disabled'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * メイン実行
 */
async function main() {
  console.log('🎮 Phase H: AI自動ゲーム生成システム');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // 1. 設定読み込み
    console.log('📋 Loading configuration...');
    const config = loadConfig();
    printConfig(config);
    
    // 2. MasterOrchestrator初期化
    console.log('🚀 Initializing MasterOrchestrator...');
    const orchestrator = new MasterOrchestrator(config);
    
    // 3. 24時間ループ開始
    console.log('▶️  Starting generation loop...\n');
    
    // Ctrl+Cで停止できるようにする
    process.on('SIGINT', () => {
      console.log('\n\n⏹️  Received SIGINT, stopping...');
      orchestrator.stop();
      setTimeout(() => {
        console.log('👋 Goodbye!');
        process.exit(0);
      }, 2000);
    });
    
    await orchestrator.run24HourLoop();
    
    console.log('\n✅ Generation completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// 実行
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

export { main };