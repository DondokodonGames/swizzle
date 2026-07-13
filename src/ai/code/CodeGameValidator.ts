import { MECHANIC_IDS, ALLOWED_SE_IDS, ALLOWED_BGM_IDS } from './mechanics-v3.js';

export interface CodeValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface CodeValidationResult {
  valid: boolean;
  errors: CodeValidationError[];
  warnings: CodeValidationError[];
}

export interface CodeValidationOptions {
  /** true で PLAY_GRAMMAR_V3 の追加チェックをエラーとして適用(書き換え済みゲーム用) */
  v3?: boolean;
}

const KNOWN_API_METHODS = new Set([
  'game.onStart', 'game.onUpdate', 'game.onTap', 'game.onSwipe', 'game.onHold',
  'game.onPress', 'game.onRelease', 'game.onMove',
  'game.draw.clear', 'game.draw.image', 'game.draw.rect', 'game.draw.circle',
  'game.draw.text', 'game.draw.line', 'game.draw.sprite', 'game.draw.gradient',
  'game.draw.hand',
  'game.audio.play', 'game.audio.bgm', 'game.audio.stopBgm',
  'game.audio.tone', 'game.audio.melody',
  'game.fx.burst', 'game.fx.popup', 'game.fx.flash', 'game.fx.shake',
  'game.feedback.good', 'game.feedback.bad',
  'game.hit.circle', 'game.hit.rect',
  'game.end.success', 'game.end.failure',
  'game.random', 'game.canvas', 'game.time', 'game.best',
  'game.input', 'game.touches',
]);

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; code: string; message: string }> = [
  { pattern: /while\s*\(\s*true\s*\)/,     code: 'INFINITE_LOOP',   message: 'while(true)の無限ループがあります' },
  { pattern: /for\s*\(;;\)/,               code: 'INFINITE_LOOP',   message: 'for(;;)の無限ループがあります' },
  { pattern: /\bfetch\s*\(/,               code: 'FORBIDDEN_API',   message: 'fetch()はサンドボックス内で動作しません' },
  { pattern: /\bXMLHttpRequest\b/,         code: 'FORBIDDEN_API',   message: 'XMLHttpRequestはサンドボックス内で動作しません' },
  { pattern: /\blocalStorage\b/,           code: 'FORBIDDEN_API',   message: 'localStorageはサンドボックス内でアクセスできません' },
  { pattern: /\bsessionStorage\b/,         code: 'FORBIDDEN_API',   message: 'sessionStorageはサンドボックス内でアクセスできません' },
  { pattern: /\bdocument\.\w/,             code: 'FORBIDDEN_API',   message: 'document APIはサンドボックス内でアクセスできません' },
  { pattern: /\bwindow\.\w/,               code: 'FORBIDDEN_API',   message: 'window APIはサンドボックス内でアクセスできません（gameオブジェクトを使ってください）' },
  { pattern: /\beval\s*\(/,                code: 'FORBIDDEN_API',   message: 'eval()は禁止されています' },
  { pattern: /import\s+|require\s*\(/,     code: 'FORBIDDEN_API',   message: 'import/requireは使用できません（全APIはgameオブジェクト経由）' },
  { pattern: /\bnew\s+(webkit)?AudioContext\b/, code: 'FORBIDDEN_API', message: 'AudioContextの直接生成は禁止です（game.audio.tone/melodyを使ってください）' },
];

export class CodeGameValidator {
  validate(code: string, opts?: CodeValidationOptions): CodeValidationResult {
    const errors: CodeValidationError[] = [];
    const warnings: CodeValidationError[] = [];

    // 1. 禁止パターンチェック（import等は構文エラーを起こす前にキャッチする）
    for (const { pattern, code: errCode, message } of FORBIDDEN_PATTERNS) {
      if (pattern.test(code)) {
        warnings.push({ code: errCode, message, severity: 'warning' });
      }
    }

    // 2. 構文チェック
    try {
      // node.js環境での構文検証（new Functionでパース）
      new Function('game', code);
    } catch (err) {
      errors.push({
        code: 'SYNTAX_ERROR',
        message: `構文エラー: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
      // 構文エラーがあれば以降のチェックは意味がないのでここで終了
      return { valid: false, errors, warnings };
    }

    // 3. game.end.success の存在チェック
    if (!code.includes('game.end.success')) {
      errors.push({
        code: 'NO_SUCCESS',
        message: 'game.end.success() が見つかりません。成功条件を実装してください',
        severity: 'error',
      });
    }

    // 4. game.end.failure の存在チェック
    if (!code.includes('game.end.failure')) {
      errors.push({
        code: 'NO_FAILURE',
        message: 'game.end.failure() が見つかりません。失敗条件を実装してください',
        severity: 'error',
      });
    }

    // 5. ゲームループのチェック（onUpdate がないと静的なゲームになる可能性）
    if (!code.includes('game.onUpdate')) {
      warnings.push({
        code: 'NO_UPDATE_LOOP',
        message: 'game.onUpdate() がありません。ゲームループが機能しない可能性があります',
        severity: 'warning',
      });
    }

    // 6. 未知のAPIメソッド使用の検出
    const gameApiCalls = [...code.matchAll(/game\.[\w.]+\s*[(?]/g)];
    for (const match of gameApiCalls) {
      const call = match[0].replace(/[(?].*/, '').trim();
      if (!KNOWN_API_METHODS.has(call)) {
        warnings.push({
          code: 'UNKNOWN_API',
          message: `未定義のAPI: ${call} はSwizzleGameAPIに存在しません`,
          severity: 'warning',
        });
      }
    }

    // 7. PLAY_GRAMMAR_V3 チェック(v3 フラグ時のみエラーにする)
    if (opts?.v3) {
      this.validateV3(code, errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /** PLAY_GRAMMAR_V3 の追加チェック(書き換え済みゲーム用)。errors に push する。 */
  private validateV3(code: string, errors: CodeValidationError[]): void {
    // @mechanic ヘッダー: 存在 + 40+ID に一致(MECHANICS_CATALOG_V2 / mechanics-v3)
    const mechMatch = code.match(/^\s*\/\/\s*@mechanic:\s*(\S+)/m);
    if (!mechMatch) {
      errors.push({
        code: 'NO_MECHANIC',
        message: '// @mechanic: ヘッダーがありません(PLAY_GRAMMAR_V3 §8)',
        severity: 'error',
      });
    } else if (!MECHANIC_IDS.has(mechMatch[1])) {
      errors.push({
        code: 'UNKNOWN_MECHANIC',
        message: `@mechanic: ${mechMatch[1]} はMECHANICS_CATALOG_V2の有効IDではありません`,
        severity: 'error',
      });
    }

    // @theme ヘッダー: 存在
    if (!/^\s*\/\/\s*@theme:\s*\S+/m.test(code)) {
      errors.push({
        code: 'NO_THEME',
        message: '// @theme: ヘッダーがありません(PLAY_GRAMMAR_V3 §8)',
        severity: 'error',
      });
    }

    // HOW_TO_PLAY の全廃(v3 テキストレス原則 §3)
    if (/HOW_TO_PLAY/.test(code)) {
      errors.push({
        code: 'HOW_TO_PLAY_PRESENT',
        message: 'HOW_TO_PLAY が残っています。v3では指導文を全廃してください(§3)',
        severity: 'error',
      });
    }

    // se_* / bgm_* トークンがプリセット+エイリアス一覧に無い(iframeTemplate と同期: mechanics-v3)
    const seTokens = new Set(code.match(/\bse_[a-z0-9_]+/g) || []);
    for (const id of seTokens) {
      if (!ALLOWED_SE_IDS.has(id)) {
        errors.push({
          code: 'UNKNOWN_SE',
          message: `未定義のSE: ${id} はプリセット+エイリアスに存在しません(§6.1)`,
          severity: 'error',
        });
      }
    }
    const bgmTokens = new Set(code.match(/\bbgm_[a-z0-9_]+/g) || []);
    for (const id of bgmTokens) {
      if (!ALLOWED_BGM_IDS.has(id)) {
        errors.push({
          code: 'UNKNOWN_BGM',
          message: `未定義のBGM: ${id} はプリセットに存在しません(§6.2)`,
          severity: 'error',
        });
      }
    }
  }

  /** バリデーション結果をコンソールに出力 */
  report(result: CodeValidationResult): void {
    if (result.valid) {
      console.log('   ✅ コードバリデーション: OK');
    } else {
      console.log('   ❌ コードバリデーション: NG');
    }
    for (const e of result.errors) {
      console.error(`   ❌ [${e.code}] ${e.message}`);
    }
    for (const w of result.warnings) {
      console.warn(`   ⚠️  [${w.code}] ${w.message}`);
    }
  }
}
