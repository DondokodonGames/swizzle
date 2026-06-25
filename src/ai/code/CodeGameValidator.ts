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

const KNOWN_API_METHODS = new Set([
  'game.onStart', 'game.onUpdate', 'game.onTap', 'game.onSwipe', 'game.onHold',
  'game.draw.clear', 'game.draw.image', 'game.draw.rect', 'game.draw.circle',
  'game.draw.text', 'game.draw.line',
  'game.audio.play', 'game.audio.bgm', 'game.audio.stopBgm',
  'game.end.success', 'game.end.failure',
  'game.random', 'game.canvas', 'game.time',
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
];

export class CodeGameValidator {
  validate(code: string): CodeValidationResult {
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
      // eslint-disable-next-line no-new-func
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

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
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
