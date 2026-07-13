/**
 * smoke-code-games.ts — コードゲームの実行時スモークテスト + スクリーンショット監査
 *
 * 各ゲームを本物の iframeTemplate HTML として headless Chromium で実行し、
 *   1. ERROR postMessage / pageerror が出ないこと
 *   2. GAME_END に到達すること(ウォッチドッグ含む)
 *   3. タップに描画が反応すること(参考情報)
 * を検査し、ATTRACT / PLAYING のスクリーンショットを撮影して
 * コンタクトシート(HTML)と縦3分割インク被覆率レポートを出力する。
 *
 * 使い方:
 *   npm run games:smoke                          # フィクスチャ + サンプル20本
 *   npm run games:smoke -- --all                 # 全件(時間がかかる)
 *   npm run games:smoke -- --sample 50           # サンプル数指定
 *   npm run games:smoke -- --files 004-shooting-star.js 799-avalanche.js
 *   npm run games:smoke -- --quick               # 6秒打ち切り(GAME_END到達は検査しない)
 *   npm run games:smoke -- --workers 4 --out smoke-output
 *
 * 出力:
 *   <out>/report.json            機械可読レポート(スコアラーのruntime入力)
 *   <out>/contact-sheet.html     スクショ一覧(レイアウト/見た目の人間審査用)
 *   <out>/screenshots/*.png
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { chromium, Browser, Page } from 'playwright';
import { buildIframeHtml } from '../src/services/code-game/iframeTemplate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = path.resolve(__dirname, '../src/ai/code/examples');
const FIXTURE = path.resolve(
  __dirname,
  '../src/services/code-game/__tests__/fixtures/api-v2-fixture.js'
);

interface CliOpts {
  all: boolean;
  quick: boolean;
  sample: number;
  workers: number;
  out: string;
  files: string[];
}

function parseArgs(argv: string[]): CliOpts {
  const o: CliOpts = { all: false, quick: false, sample: 20, workers: 4, out: 'smoke-output', files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') o.all = true;
    else if (a === '--quick') o.quick = true;
    else if (a === '--sample') o.sample = parseInt(argv[++i], 10) || 20;
    else if (a === '--workers') o.workers = parseInt(argv[++i], 10) || 4;
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--files') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) o.files.push(argv[++i]);
    }
  }
  return o;
}

interface ZoneCoverage {
  top: number;    // 上0-33%の非背景ピクセル率
  middle: number;
  bottom: number;
}

interface WarnEvent {
  code: string;
  id: string;
}

interface GameSmokeResult {
  file: string;
  ok: boolean;
  gameEnd: boolean;
  endResult?: 'success' | 'failure';
  errors: string[];
  /** エンジンが送った WARN(未知SE/BGM/画像・読込失敗)。1件でもあれば FAIL(WP63) */
  warns: WarnEvent[];
  /** ATTRACT の2枚のスクショが動いているか(ゴースト実演の実行時担保。false は FAIL) */
  attractMotion: boolean | null;
  /** ATTRACT 2枚のサンプリング pixel-diff 率(0..1) */
  attractDiff: number | null;
  tapResponsive: boolean | null;
  coverage: ZoneCoverage | null;
  durationMs: number;
  /** START→GAME_END の実測ms(台帳の尺検収用) */
  playMs: number | null;
  screenshots: string[];
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch {
    for (const p of ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
      if (fs.existsSync(p)) {
        try {
          return await chromium.launch({ executablePath: p });
        } catch { /* try next */ }
      }
    }
    throw new Error('Chromium が見つかりません(playwright install か CHROMIUM_PATH を確認)');
  }
}

/** ページ内の game canvas から縦3分割の非背景ピクセル率を計測 */
async function measureCoverage(page: Page): Promise<ZoneCoverage | null> {
  try {
    return await page.evaluate(() => {
      const c = document.getElementById('c') as HTMLCanvasElement | null;
      if (!c) return null;
      const g = c.getContext('2d');
      if (!g) return null;
      const { width: w, height: h } = c;
      const data = g.getImageData(0, 0, w, h).data;
      const STEP = 12;
      const freq: Record<string, number> = {};
      const samples: Array<{ y: number; key: string }> = [];
      for (let y = 0; y < h; y += STEP) {
        for (let x = 0; x < w; x += STEP) {
          const i = (y * w + x) * 4;
          const key = `${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`;
          freq[key] = (freq[key] || 0) + 1;
          samples.push({ y, key });
        }
      }
      let bgKey = '';
      let bgN = -1;
      for (const k in freq) if (freq[k] > bgN) { bgN = freq[k]; bgKey = k; }
      const zone = [ { n: 0, ink: 0 }, { n: 0, ink: 0 }, { n: 0, ink: 0 } ];
      for (const s of samples) {
        const z = s.y < h / 3 ? 0 : s.y < (h * 2) / 3 ? 1 : 2;
        zone[z].n++;
        if (s.key !== bgKey) zone[z].ink++;
      }
      return {
        top: zone[0].n ? +(zone[0].ink / zone[0].n).toFixed(3) : 0,
        middle: zone[1].n ? +(zone[1].ink / zone[1].n).toFixed(3) : 0,
        bottom: zone[2].n ? +(zone[2].ink / zone[2].n).toFixed(3) : 0,
      };
    });
  } catch {
    return null;
  }
}

/** キャンバスの粗いピクセル指紋(タップ反応の変化検出用) */
async function canvasFingerprint(page: Page): Promise<string | null> {
  try {
    return await page.evaluate(() => {
      const c = document.getElementById('c') as HTMLCanvasElement | null;
      const g = c?.getContext('2d');
      if (!c || !g) return null;
      const data = g.getImageData(0, 0, c.width, c.height).data;
      let acc = 0;
      for (let i = 0; i < data.length; i += 997 * 4) acc = (acc * 31 + data[i] + data[i + 1] + data[i + 2]) >>> 0;
      return String(acc);
    });
  } catch {
    return null;
  }
}

// attract_motion 判定: ATTRACT 2枚(t≈1.2s/2.8s)の輝度サンプル差分率がこの値以上なら「動いている」。
// 実測調整(WP63, --sample 30 + fixture で計測):
//   ・ゴースト実演あり(fixture: 手が的へ移動+feedback)= 4.7%
//   ・ATTRACTに既存アニメがあるv2ゲーム = 0.6〜1.7%
//   ・点滅テキストのみ/静止の静的ATTRACT = 0〜0.49%
// → 0.005(0.5%)が「点滅のみ」と「実演あり」の間に明確に入る(境界の空き: 0.49% ↔ 0.61%)。
const ATTRACT_MOTION_THRESHOLD = 0.005;
// 輝度差がこの値超のサンプルを「変化した」とみなす(微小なアンチエイリアス揺れを無視)
const LUMA_DELTA = 16;

/** キャンバス全面を等間隔サンプリングした輝度配列(ATTRACT モーション差分用) */
async function canvasLumaSamples(page: Page): Promise<number[] | null> {
  try {
    return await page.evaluate(() => {
      const c = document.getElementById('c') as HTMLCanvasElement | null;
      const g = c?.getContext('2d');
      if (!c || !g) return null;
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const out: number[] = [];
      for (let i = 0; i < d.length; i += 600 * 4) out.push((d[i] + d[i + 1] + d[i + 2]) / 3 | 0);
      return out;
    });
  } catch {
    return null;
  }
}

/** 2枚の輝度サンプルの差分率(0..1)。長さ不一致・null は null。 */
function lumaDiffRatio(a: number[] | null, b: number[] | null): number | null {
  if (!a || !b || a.length === 0 || a.length !== b.length) return null;
  let changed = 0;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > LUMA_DELTA) changed++;
  return changed / a.length;
}

async function smokeOne(
  page: Page,
  file: string,
  code: string,
  opts: CliOpts,
  shotDir: string
): Promise<GameSmokeResult> {
  const started = Date.now();
  const errors: string[] = [];
  const base = path.basename(file, '.js');
  const screenshots: string[] = [];
  let gameEnd = false;
  let endResult: 'success' | 'failure' | undefined;

  const capMs = opts.quick ? 6000 : 15000;

  // GAME_END / ERROR / READY / WARN を親(=同一window)で受け取るキャプチャを
  // HTML に直接注入する(setContent では addInitScript が効かないため)。
  // 各イベントに performance.now() を刻んで START→GAME_END の実測 msを取る。
  const capture =
    '<script>window.__smokeEvents=[];window.addEventListener("message",function(e){' +
    'var d=e.data;if(d&&(d.type==="GAME_END"||d.type==="ERROR"||d.type==="READY"||d.type==="WARN")){' +
    'd.__t=performance.now();window.__smokeEvents.push(d);}});</scr' + 'ipt>';
  const html = buildIframeHtml(code, capMs).replace('<canvas', capture + '<canvas');

  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  type SmokeEvent = { type: string; result?: string; message?: string; code?: string; id?: string; __t?: number };
  const readEvents = async (): Promise<SmokeEvent[]> => {
    const ev = await page
      .evaluate(() => (window as unknown as { __smokeEvents?: SmokeEvent[] }).__smokeEvents)
      .catch(() => undefined);
    return ev || [];
  };

  // READY を待って INIT + START
  await page
    .waitForFunction(
      () => ((window as unknown as { __smokeEvents?: Array<{ type: string }> }).__smokeEvents || []).some((e) => e.type === 'READY'),
      undefined,
      { timeout: 5000 }
    )
    .catch(() => errors.push('READY timeout'));
  await page.evaluate(() => {
    window.postMessage({ type: 'INIT', assets: [], context: { gameId: 'smoke', bestScore: 1234 } }, '*');
  });
  await page.waitForTimeout(150);
  const startAt = await page.evaluate(() => {
    (window as unknown as { __smokeStartAt?: number }).__smokeStartAt = performance.now();
    window.postMessage({ type: 'START' }, '*');
    return (window as unknown as { __smokeStartAt: number }).__smokeStartAt;
  });

  // ATTRACT モーション判定: t≈1.2s と t≈2.8s の2枚を撮り、輝度差分率で
  // ゴースト実演が動いているかを実行時に担保する(§2.1)。
  // WP62 でウォッチドッグは初回入力から計時されるため、ATTRACT を長めに眺めても強制終了しない。
  await page.waitForTimeout(1200);
  const shotA1 = path.join(shotDir, `${base}-attract.png`);
  await page.locator('#c').screenshot({ path: shotA1 }).catch(() => {});
  if (fs.existsSync(shotA1)) screenshots.push(path.basename(shotA1));
  const attractSample1 = await canvasLumaSamples(page);

  await page.waitForTimeout(1600); // 合計 t≈2.8s
  const shotA2 = path.join(shotDir, `${base}-attract2.png`);
  await page.locator('#c').screenshot({ path: shotA2 }).catch(() => {});
  if (fs.existsSync(shotA2)) screenshots.push(path.basename(shotA2));
  const attractSample2 = await canvasLumaSamples(page);

  const attractDiff = lumaDiffRatio(attractSample1, attractSample2);
  const attractMotion = attractDiff === null ? null : attractDiff >= ATTRACT_MOTION_THRESHOLD;

  // タップ反応チェック: ATTRACT→PLAYING 遷移タップ
  const before = await canvasFingerprint(page);
  const box = await page.locator('#c').boundingBox();
  const tap = async (fx: number, fy: number) => {
    if (!box) return;
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy).catch(() => {});
  };
  await tap(0.5, 0.5);
  await page.waitForTimeout(250);
  const after = await canvasFingerprint(page);
  const tapResponsive = before !== null && after !== null ? before !== after : null;

  // PLAYING スクリーンショット + 被覆率
  await page.waitForTimeout(1000);
  const shotP = path.join(shotDir, `${base}-playing.png`);
  await page.locator('#c').screenshot({ path: shotP }).catch(() => {});
  if (fs.existsSync(shotP)) screenshots.push(path.basename(shotP));
  const coverage = await measureCoverage(page);

  // GAME_END までタップ連打(quick モードでは打ち切りのみ)
  let playMs: number | null = null;
  const deadline = started + capMs + 6000;
  while (Date.now() < deadline) {
    const events = await readEvents();
    const end = events.find((e) => e.type === 'GAME_END');
    if (end) {
      gameEnd = true;
      endResult = end.result as 'success' | 'failure';
      if (end.__t !== undefined) playMs = Math.round(end.__t - startAt);
      break;
    }
    const err = events.find((e) => e.type === 'ERROR');
    if (err) {
      errors.push(`ERROR: ${err.message}`);
      break;
    }
    if (opts.quick && Date.now() - started > 5500) break;
    await tap(0.15 + Math.random() * 0.7, 0.2 + Math.random() * 0.65);
    await page.waitForTimeout(350);
  }

  // WARN 収集(未知SE/BGM/画像・読込失敗)。1件でもあれば FAIL(WP63)。
  const finalEvents = await readEvents();
  const warns: WarnEvent[] = finalEvents
    .filter((e) => e.type === 'WARN')
    .map((e) => ({ code: String(e.code), id: String(e.id) }));

  // 合否: エラー0 + (quick以外は GAME_END) + WARN 0 + attract_motion。
  // quick は打ち切りのため GAME_END / attract_motion を合否に含めない。
  const ok =
    errors.length === 0 &&
    warns.length === 0 &&
    (opts.quick ? true : gameEnd && attractMotion === true);

  return {
    file: path.basename(file),
    ok,
    gameEnd,
    endResult,
    errors,
    warns,
    attractMotion,
    attractDiff: attractDiff === null ? null : +attractDiff.toFixed(4),
    tapResponsive,
    coverage,
    durationMs: Date.now() - started,
    playMs,
    screenshots,
  };
}

function writeContactSheet(outDir: string, results: GameSmokeResult[]): void {
  const rows = results
    .map((r) => {
      const shots = r.screenshots
        .map((s) => `<img src="screenshots/${s}" loading="lazy">`)
        .join('');
      const cov = r.coverage
        ? `top ${(r.coverage.top * 100).toFixed(0)}% / mid ${(r.coverage.middle * 100).toFixed(0)}% / btm ${(r.coverage.bottom * 100).toFixed(0)}%`
        : '-';
      const badge = r.ok ? '<span class="ok">PASS</span>' : '<span class="ng">FAIL</span>';
      const errs = r.errors.length ? `<div class="err">${r.errors.join('<br>')}</div>` : '';
      const motion =
        r.attractMotion === null ? '?' : r.attractMotion ? `yes(${((r.attractDiff ?? 0) * 100).toFixed(1)}%)` : `<span class="ng">NO(${((r.attractDiff ?? 0) * 100).toFixed(1)}%)</span>`;
      const warnHtml = r.warns.length
        ? `<div class="err">WARN×${r.warns.length}: ${r.warns.map((w) => `${w.code}(${w.id})`).join(', ')}</div>`
        : '';
      const playMsStr = r.playMs !== null ? ` | 実測尺: ${r.playMs}ms` : '';
      return `<div class="game"><h3>${badge} ${r.file}</h3><div class="shots">${shots}</div>` +
        `<div class="meta">end: ${r.gameEnd ? r.endResult : 'none'} | attract動き: ${motion} | tap反応: ${r.tapResponsive === null ? '?' : r.tapResponsive ? 'yes' : 'NO'} | 被覆率: ${cov}${playMsStr} | ${r.durationMs}ms</div>${warnHtml}${errs}</div>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Swizzle smoke contact sheet</title>
<style>
body{font-family:sans-serif;background:#181818;color:#eee;margin:20px}
.game{border:1px solid #333;padding:12px;margin-bottom:16px;background:#202020}
.shots img{height:280px;margin-right:8px;border:1px solid #444;image-rendering:pixelated}
.ok{color:#0f0}.ng{color:#f44}.meta{color:#aaa;font-size:13px;margin-top:6px}.err{color:#f88;font-size:12px;margin-top:4px}
h3{margin:0 0 8px}
</style></head><body>
<h1>Swizzle コードゲーム スモーク結果 (${results.filter((r) => r.ok).length}/${results.length} PASS)</h1>
<p>生成: ${new Date().toISOString()} — 縦3分割の被覆率が「top偏重/bottom空白」のゲームは縦画面レイアウト基準違反の疑い。</p>
${rows}
</body></html>`;
  fs.writeFileSync(path.join(outDir, 'contact-sheet.html'), html, 'utf-8');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(process.cwd(), opts.out);
  const shotDir = path.join(outDir, 'screenshots');
  fs.mkdirSync(shotDir, { recursive: true });

  // 対象ファイルの決定: フィクスチャ + examples
  let targets: string[] = [];
  if (opts.files.length > 0) {
    targets = opts.files.map((f) =>
      path.isAbsolute(f) ? f : fs.existsSync(path.resolve(EXAMPLES_DIR, f)) ? path.resolve(EXAMPLES_DIR, f) : path.resolve(process.cwd(), f)
    );
  } else {
    const all = fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.js')).sort();
    if (opts.all) {
      targets = all.map((f) => path.join(EXAMPLES_DIR, f));
    } else {
      // 決定的サンプリング(等間隔)で再現性を確保
      const step = Math.max(1, Math.floor(all.length / opts.sample));
      targets = all.filter((_, i) => i % step === 0).slice(0, opts.sample).map((f) => path.join(EXAMPLES_DIR, f));
    }
    targets.unshift(FIXTURE);
  }

  console.log(`🎮 スモーク対象: ${targets.length} 本 (workers=${opts.workers}, quick=${opts.quick})`);

  const browser = await launchBrowser();
  const results: GameSmokeResult[] = [];
  let cursor = 0;

  async function worker() {
    const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
    for (;;) {
      const idx = cursor++;
      if (idx >= targets.length) break;
      const file = targets[idx];
      const code = fs.readFileSync(file, 'utf-8');
      let result: GameSmokeResult;
      try {
        result = await smokeOne(page, file, code, opts, shotDir);
      } catch (err) {
        if (process.env.DEBUG) console.error(err);
        result = {
          file: path.basename(file), ok: false, gameEnd: false,
          errors: [`harness: ${err instanceof Error ? err.message : String(err)}`],
          warns: [], attractMotion: null, attractDiff: null, playMs: null,
          tapResponsive: null, coverage: null, durationMs: 0, screenshots: [],
        };
      }
      results.push(result);
      const mark = result.ok ? '✅' : '❌';
      console.log(`  ${mark} [${results.length}/${targets.length}] ${result.file} (${result.durationMs}ms)${result.errors.length ? ' — ' + result.errors[0] : ''}`);
    }
    await page.close();
  }

  await Promise.all(Array.from({ length: Math.min(opts.workers, targets.length) }, worker));
  await browser.close();

  results.sort((a, b) => a.file.localeCompare(b.file));
  fs.writeFileSync(
    path.join(outDir, 'report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), quick: opts.quick, results }, null, 2),
    'utf-8'
  );
  writeContactSheet(outDir, results);

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log('\n====================================');
  console.log(`✅ PASS: ${passed} / ❌ FAIL: ${failed}`);
  console.log(`📄 レポート:          ${path.join(outDir, 'report.json')}`);
  console.log(`🖼  コンタクトシート: ${path.join(outDir, 'contact-sheet.html')}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ 予期しないエラー:', err);
  process.exit(1);
});
