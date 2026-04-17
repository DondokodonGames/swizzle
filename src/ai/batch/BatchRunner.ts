/**
 * BatchRunner.ts
 * Supabaseへのバッチ挿入ループ（Node fetch使用・外部依存なし）
 *
 * 必要な環境変数:
 *   VITE_SUPABASE_URL      - Supabase URL
 *   SUPABASE_SERVICE_KEY   - service_role キー（RLSバイパス用）
 *   MASTER_USER_ID         - games の creator_id に使うユーザーUUID
 *   SKIP_UPLOAD            - 'true' でドライラン（DB書き込みなし）
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { buildGame } from './GameBuilder.js';
import type { GameConfig } from './GameBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROGRESS_FILE = path.join(__dirname, 'batch-progress.json');
const LOG_FILE = path.join(__dirname, 'batch-errors.log');

/** 連続エラーがこの件数を超えたらバッチを緊急停止 */
const MAX_ERRORS = 50;

interface Progress {
  total: number;
  errorCount: number;
}

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_FILE)) {
    const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    // 旧フォーマット（arcade/bar）からの移行
    if (typeof p.total === 'undefined') {
      return { total: (p.arcade ?? 0) + (p.bar ?? 0), errorCount: p.errorCount ?? 0 };
    }
    return p as Progress;
  }
  return { total: 0, errorCount: 0 };
}

function saveProgress(p: Progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

function logError(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.error('  ⚠️', msg);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function supabaseInsert(
  url: string,
  serviceKey: string,
  table: string,
  row: object
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (res.ok) return { ok: true };
  const body = await res.text().catch(() => res.statusText);
  return { ok: false, error: `HTTP ${res.status}: ${body}` };
}

export class BatchRunner {
  private supabaseUrl: string;
  private serviceKey: string;
  private masterUserId: string;
  private skipUpload: boolean;
  private stopped = false;

  constructor() {
    this.skipUpload = process.env.SKIP_UPLOAD === 'true';
    this.supabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
    this.serviceKey = process.env.SUPABASE_SERVICE_KEY ?? '';
    this.masterUserId = process.env.MASTER_USER_ID ?? 'dry-run-user';

    if (!this.skipUpload && (!this.supabaseUrl || !this.serviceKey || !this.masterUserId || this.masterUserId === 'dry-run-user')) {
      throw new Error(
        '❌ 環境変数が不足しています。\n' +
        '   VITE_SUPABASE_URL / SUPABASE_SERVICE_KEY / MASTER_USER_ID を .env.local に設定してください。\n' +
        '   ドライランは: SKIP_UPLOAD=true npm run ai:batch:dry'
      );
    }
  }

  stop() { this.stopped = true; }

  /**
   * DBに既に存在するバッチゲームの template_id を Set で返す。
   * これを使って再実行時の重複 INSERT を防ぐ（冪等性の保証）。
   * template_id は 'batch_{cfg.id}' 形式なので LIKE 'batch_%' でフィルタ。
   */
  private async getExistingTemplateIds(): Promise<Set<string>> {
    if (this.skipUpload) return new Set();
    const res = await fetch(
      `${this.supabaseUrl}/rest/v1/user_games` +
      `?creator_id=eq.${encodeURIComponent(this.masterUserId)}` +
      `&template_id=like.batch_%25` +
      `&select=template_id&limit=2000`,
      {
        headers: {
          'apikey': this.serviceKey,
          'Authorization': `Bearer ${this.serviceKey}`,
        },
      }
    );
    if (!res.ok) {
      logError(`既存ゲーム一覧の取得に失敗: HTTP ${res.status}`);
      return new Set();
    }
    const rows: { template_id: string }[] = await res.json().catch(() => []);
    return new Set(rows.map(r => r.template_id));
  }

  /**
   * 1本のゲームを INSERT する。
   * - existingIds に既に含まれる場合は SKIP（重複防止）
   * - INSERT 成功後は existingIds に追加（同一セッション内の重複も防止）
   * - 最大3回リトライ（2s / 4s バックオフ）
   */
  private async insertGame(cfg: GameConfig, existingIds: Set<string>): Promise<boolean> {
    const templateId = `batch_${cfg.id}`;

    if (this.skipUpload) {
      console.log(`  [DRY] ${cfg.category}/${cfg.id}: ${cfg.title}`);
      return true;
    }

    // 既にアップロード済みならスキップ（冪等）
    if (existingIds.has(templateId)) {
      process.stdout.write('  [SKIP]\n');
      return true;
    }

    const projectData = buildGame(cfg);
    const now = new Date().toISOString();
    const row = {
      creator_id: this.masterUserId,
      title: cfg.title,
      description: cfg.description,
      template_id: templateId,   // ゲームごとに一意: 'batch_{cfg.id}'
      category: cfg.category,
      game_data: {},
      project_data: projectData,
      is_published: true,
      is_featured: false,
      created_at: now,
      updated_at: now,
    };

    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await supabaseInsert(this.supabaseUrl, this.serviceKey, 'user_games', row);
      if (result.ok) {
        existingIds.add(templateId); // ローカルでも追跡
        return true;
      }
      if (attempt < 3) {
        await sleep(2000 * attempt);
      } else {
        logError(`INSERT失敗 [${cfg.id}]: ${result.error}`);
        return false;
      }
    }
    return false;
  }

  async run(games: GameConfig[]) {
    const total = games.length;
    console.log('\n🎮 バッチ生成ランナー起動');
    console.log(`   SKIP_UPLOAD:   ${this.skipUpload}`);
    console.log(`   MASTER_USER_ID: ${this.masterUserId.substring(0, 8)}...`);
    console.log(`   対象ゲーム数:   ${total}\n`);

    // DB に存在するバッチゲームを一括取得（重複 INSERT 防止）
    console.log('🔍 既存バッチゲームを確認中...');
    const existingIds = await this.getExistingTemplateIds();
    console.log(`   既存: ${existingIds.size} 件\n`);

    const progress = loadProgress();
    let idx = progress.total;

    while (!this.stopped && idx < total) {
      // エラーが閾値を超えたら緊急停止
      if (progress.errorCount >= MAX_ERRORS) {
        console.error(`\n❌ エラーが${MAX_ERRORS}件を超えたため停止します。${LOG_FILE} を確認してください。`);
        break;
      }

      const cfg = games[idx];
      process.stdout.write(`[${idx + 1}/${total}] ${cfg.category}/${cfg.id} ... `);
      const ok = await this.insertGame(cfg, existingIds);
      idx++;
      progress.total = idx;
      if (ok) { console.log('✓'); } else { progress.errorCount++; }

      saveProgress(progress);

      if (idx % 50 === 0) {
        console.log(`\n📊 進捗: ${idx}/${total}, エラー=${progress.errorCount}\n`);
      }

      if (!this.skipUpload) await sleep(300);
    }

    saveProgress(progress);
    console.log(`\n📊 最終: ${idx}/${total}, エラー=${progress.errorCount}`);

    if (idx >= total) {
      console.log(`\n✅ 全${total}本の生成が完了しました！`);
    }
  }
}
