/**
 * ネタ帳ベースのJSコードゲーム生成ランナー
 *
 * 使い方:
 *   npm run ai:code:neta:1          # ネタ帳から1本生成・Supabase保存
 *   npm run ai:code:neta:5          # ネタ帳から5本生成
 *   npm run ai:code:neta:dry        # ドライラン（LLM/APIコールをスキップ）
 *
 * 環境変数:
 *   OPENAI_API_KEY      必須（DRY_RUN=true の場合は不要）
 *   ANTHROPIC_API_KEY   任意（LLM_PROVIDER=anthropic 指定時）
 *   LLM_PROVIDER        'openai'（既定）| 'anthropic'
 *   IMAGE_PROVIDER      'openai'（既定）| 'claude-svg' | 'mock'
 *   DRY_RUN             'true' = LLM/APIコールをスキップ
 *   SKIP_UPLOAD         'true' = Supabaseアップロードをスキップ
 *   NETA_FILE           ネタファイルパス（既定: src/ai/v2/neta.json）
 *
 * 進捗:
 *   処理済みネタIDは neta-code-progress.json に自動保存される（中断・再開可能）
 *   rules版の neta-progress.json とは独立して管理される
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { CodeOrchestrator } from '../code/CodeOrchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('📓 ネタ帳ベース コードゲームジェネレーター');
  console.log('=========================================\n');

  const dryRun    = process.env.DRY_RUN     === 'true';
  const skipUp    = process.env.SKIP_UPLOAD === 'true';
  const openaiKey = process.env.OPENAI_API_KEY;
  const llmProv   = process.env.LLM_PROVIDER === 'anthropic' ? 'anthropic' : 'openai';
  const imgProv   = (process.env.IMAGE_PROVIDER as 'mock' | 'claude-svg' | 'openai' | undefined)
    ?? (openaiKey ? 'openai' : 'mock');

  const netaFile = process.env.NETA_FILE
    ?? path.join(__dirname, 'neta.json');

  console.log(`🔑 OPENAI_API_KEY:   ${openaiKey ? '設定済み' : '❌ 未設定'}`);
  console.log(`🤖 LLM_PROVIDER:     ${llmProv}`);
  console.log(`🖼️  IMAGE_PROVIDER:   ${imgProv}`);
  console.log(`🏃 DRY_RUN:          ${dryRun}`);
  console.log(`☁️  SKIP_UPLOAD:      ${skipUp}`);
  console.log(`📖 NETA_FILE:        ${netaFile}`);

  const activeKey = llmProv === 'anthropic' ? process.env.ANTHROPIC_API_KEY : openaiKey;
  if (!activeKey && !dryRun) {
    const keyName = llmProv === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    console.error(`\n❌ ${keyName} が設定されていません。`);
    console.error(`   .env または .env.local に ${keyName}=... を設定してください。`);
    process.exit(1);
  }

  if (!fs.existsSync(netaFile)) {
    console.error(`\n❌ ネタファイルが見つかりません: ${netaFile}`);
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

  const { succeeded, failed, remaining } = await orchestrator.runFromNeta(netaFile, count);

  console.log('\n=========================================');
  console.log(`✅ 成功: ${succeeded}本 / ❌ 失敗: ${failed}本`);
  console.log(`📖 ネタ帳残り: ${remaining}件`);
  console.log('=========================================');

  process.exit(failed > 0 && succeeded === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ 予期しないエラー:', err);
  process.exit(1);
});
