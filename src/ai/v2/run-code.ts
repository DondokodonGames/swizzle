/**
 * JSサンドボックスゲーム生成ランナー
 *
 * 使い方:
 *   npm run ai:code:1          # 1本生成・Supabase保存
 *   npm run ai:code:dry        # LLM/アセットAPIをスキップ（動作確認用）
 *   npm run ai:code:local      # LLM使用、Supabaseアップロードをスキップ
 *
 * 環境変数:
 *   OPENAI_API_KEY      必須（DRY_RUN=true の場合は不要）
 *   ANTHROPIC_API_KEY   任意（LLM_PROVIDER=anthropic 指定時）
 *   LLM_PROVIDER        'openai'（既定）| 'anthropic'
 *   IMAGE_PROVIDER      'openai'（既定）| 'claude-svg' | 'mock'
 *   DRY_RUN             'true' = LLM/APIコールをスキップ
 *   SKIP_UPLOAD         'true' = Supabaseアップロードをスキップ
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { CodeOrchestrator } from '../code/CodeOrchestrator.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🎮 Swizzle JSコードゲーム ジェネレーター');
  console.log('==========================================\n');

  const dryRun    = process.env.DRY_RUN     === 'true';
  const skipUp    = process.env.SKIP_UPLOAD === 'true';
  const openaiKey = process.env.OPENAI_API_KEY;
  const llmProv   = process.env.LLM_PROVIDER === 'anthropic' ? 'anthropic' : 'openai';
  const imgProv   = (process.env.IMAGE_PROVIDER as 'mock' | 'claude-svg' | 'openai' | undefined)
    ?? (openaiKey ? 'openai' : 'mock');

  console.log(`🔑 OPENAI_API_KEY:   ${openaiKey ? '設定済み' : '❌ 未設定'}`);
  console.log(`🤖 LLM_PROVIDER:     ${llmProv}`);
  console.log(`🖼️  IMAGE_PROVIDER:   ${imgProv}`);
  console.log(`🏃 DRY_RUN:          ${dryRun}`);
  console.log(`☁️  SKIP_UPLOAD:      ${skipUp}`);

  const activeKey = llmProv === 'anthropic' ? process.env.ANTHROPIC_API_KEY : openaiKey;
  if (!activeKey && !dryRun) {
    const keyName = llmProv === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    console.error(`\n❌ ${keyName} が設定されていません。`);
    console.error(`   .env または .env.local に ${keyName}=... を設定してください。`);
    process.exit(1);
  }

  const args  = process.argv.slice(2).filter((a: string) => !a.startsWith('--'));
  const count = parseInt(args[0]) || 1;

  console.log(`\n📦 生成本数: ${count}`);

  const orchestrator = new CodeOrchestrator({
    dryRun,
    skipUpload: skipUp,
    imageProvider: imgProv,
  });

  const { succeeded, failed } = await orchestrator.generateBatch(count);

  console.log('\n==========================================');
  console.log(`✅ 成功: ${succeeded}本 / ❌ 失敗: ${failed}本`);
  console.log('==========================================');

  process.exit(failed > 0 && succeeded === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ 予期しないエラー:', err);
  process.exit(1);
});
