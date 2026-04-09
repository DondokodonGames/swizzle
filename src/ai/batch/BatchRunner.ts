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

interface Progress {
  arcade: number;
  bar: number;
  errorCount: number;
}

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return { arcade: 0, bar: 0, errorCount: 0 };
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

async function supabaseCount(
  url: string,
  serviceKey: string,
  table: string,
  creatorId: string,
  category: string
): Promise<number> {
  const res = await fetch(
    `${url}/rest/v1/${table}?creator_id=eq.${encodeURIComponent(creatorId)}&category=eq.${category}&select=id`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'count=exact',
        'Range-Unit': 'items',
        'Range': '0-0',
      },
    }
  );
  const range = res.headers.get('content-range') ?? '0/0';
  const total = parseInt(range.split('/')[1] ?? '0', 10);
  return isNaN(total) ? 0 : total;
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

  private async getExistingCounts(): Promise<{ arcade: number; bar: number }> {
    if (this.skipUpload) return { arcade: 0, bar: 0 };
    const [arcade, bar] = await Promise.all([
      supabaseCount(this.supabaseUrl, this.serviceKey, 'user_games', this.masterUserId, 'arcade'),
      supabaseCount(this.supabaseUrl, this.serviceKey, 'user_games', this.masterUserId, 'bar'),
    ]);
    return { arcade, bar };
  }

  private async insertGame(cfg: GameConfig): Promise<boolean> {
    if (this.skipUpload) {
      console.log(`  [DRY] ${cfg.category}/${cfg.id}: ${cfg.title}`);
      return true;
    }

    const projectData = buildGame(cfg);
    const now = new Date().toISOString();
    const row = {
      creator_id: this.masterUserId,
      title: cfg.title,
      description: cfg.description,
      template_id: `batch_${cfg.category}`,
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
      if (result.ok) return true;
      if (attempt < 3) {
        await sleep(2000 * attempt);
      } else {
        logError(`INSERT失敗 [${cfg.id}]: ${result.error}`);
        return false;
      }
    }
    return false;
  }

  async run(arcadeGames: GameConfig[], barGames: GameConfig[]) {
    console.log('\n🎮 バッチ生成ランナー起動');
    console.log(`   SKIP_UPLOAD: ${this.skipUpload}`);
    console.log(`   MASTER_USER_ID: ${this.masterUserId.substring(0, 8)}...\n`);

    const progress = loadProgress();
    const existing = await this.getExistingCounts();
    console.log(`📊 現在のDB件数: arcade=${existing.arcade}, bar=${existing.bar}`);

    let arcadeIdx = Math.max(progress.arcade, existing.arcade);
    let barIdx = Math.max(progress.bar, existing.bar);

    const TARGET_ARCADE = 500;
    const TARGET_BAR = 200;
    let total = arcadeIdx + barIdx;

    while (!this.stopped) {
      const needsArcade = arcadeIdx < TARGET_ARCADE && arcadeIdx < arcadeGames.length;
      const needsBar = barIdx < TARGET_BAR && barIdx < barGames.length;

      if (!needsArcade && !needsBar) {
        console.log('\n✅ 全700本の生成が完了しました！');
        break;
      }

      if (needsArcade) {
        const cfg = arcadeGames[arcadeIdx];
        process.stdout.write(`[arcade ${arcadeIdx + 1}/500] ${cfg.title} ... `);
        const ok = await this.insertGame(cfg);
        arcadeIdx++;
        progress.arcade = arcadeIdx;
        if (ok) { console.log('✓'); } else { progress.errorCount++; }
      } else if (needsBar) {
        const cfg = barGames[barIdx];
        process.stdout.write(`[bar ${barIdx + 1}/200] ${cfg.title} ... `);
        const ok = await this.insertGame(cfg);
        barIdx++;
        progress.bar = barIdx;
        if (ok) { console.log('✓'); } else { progress.errorCount++; }
      }

      total++;
      saveProgress(progress);

      if (total % 50 === 0) {
        console.log(`\n📊 進捗: arcade=${arcadeIdx}/500, bar=${barIdx}/200, エラー=${progress.errorCount}\n`);
      }

      if (!this.skipUpload) await sleep(300);
    }

    saveProgress(progress);
    console.log(`\n📊 最終: arcade=${arcadeIdx}/500, bar=${barIdx}/200, エラー=${progress.errorCount}`);
  }
}
