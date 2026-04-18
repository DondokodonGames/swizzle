/**
 * FailurePatternTracker
 *
 * 生成失敗パターンを記録し、次回の生成に動的ヒントを注入する。
 * 200件完了後に最終レポートを生成する。
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FailureRecord {
  errorCode: string;
  count: number;
  gameExamples: string[];  // 失敗したゲームタイトル（最大5件）
  lastSeen: string;        // ISO timestamp
}

export interface FailurePatternStore {
  runStarted: string;
  totalAttempts: number;
  totalSuccesses: number;
  patterns: Record<string, FailureRecord>;
}

export class FailurePatternTracker {
  private storeFile: string;
  private store: FailurePatternStore;

  constructor(outputDir: string = 'logs/generation') {
    // ディレクトリを作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    this.storeFile = path.join(outputDir, 'failure_patterns.json');
    this.store = this.load();
  }

  private load(): FailurePatternStore {
    if (fs.existsSync(this.storeFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.storeFile, 'utf-8'));
      } catch {
        // 壊れている場合はリセット
      }
    }
    return {
      runStarted: new Date().toISOString(),
      totalAttempts: 0,
      totalSuccesses: 0,
      patterns: {}
    };
  }

  private save(): void {
    try {
      fs.writeFileSync(this.storeFile, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch {
      // ログ書き込み失敗は無視
    }
  }

  /**
   * 生成失敗を記録する
   */
  recordFailure(errorCodes: string[], gameTitle: string): void {
    this.store.totalAttempts++;
    for (const code of errorCodes) {
      if (!this.store.patterns[code]) {
        this.store.patterns[code] = {
          errorCode: code,
          count: 0,
          gameExamples: [],
          lastSeen: new Date().toISOString()
        };
      }
      const rec = this.store.patterns[code];
      rec.count++;
      rec.lastSeen = new Date().toISOString();
      if (!rec.gameExamples.includes(gameTitle) && rec.gameExamples.length < 5) {
        rec.gameExamples.push(gameTitle);
      }
    }
    this.save();
  }

  /**
   * 生成成功を記録する
   */
  recordSuccess(): void {
    this.store.totalAttempts++;
    this.store.totalSuccesses++;
    this.save();
  }

  /**
   * 頻出エラーパターンを動的ヒントとしてプロンプトに追加する文字列を返す
   * SpecificationGenerator の prevFeedback に付加して使用する
   */
  generateDynamicHints(): string {
    const sorted = Object.values(this.store.patterns)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (sorted.length === 0) return '';

    const lines: string[] = [
      '',
      '## ⚠️ 直近の生成で多発しているエラー（特に注意！）'
    ];

    for (const rec of sorted) {
      const hint = this.getHintForCode(rec.errorCode);
      if (hint) {
        lines.push(`- **${rec.errorCode}** (${rec.count}回発生): ${hint}`);
      }
    }

    return lines.join('\n');
  }

  private getHintForCode(code: string): string {
    const hints: Record<string, string> = {
      AUTO_SUCCESS: 'time→successは「collision→failure」とセットでのみ有効。サバイバルゲームは必ず敵のmovement設定 + collision→failureルールを含めること',
      INSTANT_WIN: 'カウンターの初期値が既に成功条件を満たしている。initialValueを0や低い値に設定すること',
      INSTANT_LOSE: 'カウンターの初期値が既に失敗条件を満たしている。initialValueを失敗閾値より高く設定すること',
      NO_SUCCESS: 'successアクションを含むルールが必須。touch/collisionで成功を発火すること',
      NO_PLAYER_ACTION: '成功パスにtouchまたはcollision条件が必要。time条件だけで成功するのは禁止',
      SUCCESS_FAILURE_CONFLICT: '同じtargetIDで成功と失敗が発火する。各ルールに異なるオブジェクトIDを使うこと',
      INVALID_COMPARISON: 'comparison値は"equals","greaterOrEqual","greater","less","lessOrEqual"のみ有効。"greaterThan"や"lessThan"は無効',
      MISSING_COUNTER: 'counterNameで参照するカウンターをstateManagement.countersに先に定義すること',
      POOR_HORIZONTAL_DISTRIBUTION: 'オブジェクトが画面中央に集中している。x座標を0.2〜0.8の範囲に分散させること',
      MISSING_SOUND_ID: 'soundIdで参照するサウンドをaudio.soundsに定義すること（se_tap, se_success, se_failureは必須）',
      CONFLICTING_TERMINATION: '複数のルールで同じ条件が成功と失敗の両方を発火させている。targetObjectを分けること',
      COUNTER_UNREACHABLE: 'カウンター目標値がインクリメントルール数より多い。「同じ操作をN回」は不可。「N個の別オブジェクトを1回ずつ」に設計変更すること',
      OBJECT_NO_RULES: '全オブジェクトに最低1つのルールが必要。省略せず全件にルールを生成すること（block_1だけでなくblock_2, block_3も）',
      SUCCESS_UNREACHABLE_TIME: 'time→successのみの成功条件は自動成功になる。touch/collisionを成功条件に使うか、time→failureにしてサバイバルゲームにすること'
    };
    return hints[code] || '';
  }

  /**
   * 200件完了後の最終レポートを生成する
   */
  generateFinalReport(): string {
    const totalFailed = this.store.totalAttempts - this.store.totalSuccesses;
    const failureRate = this.store.totalAttempts > 0
      ? ((totalFailed / this.store.totalAttempts) * 100).toFixed(1)
      : '0.0';

    const sorted = Object.values(this.store.patterns)
      .sort((a, b) => b.count - a.count);

    const lines: string[] = [
      '# 生成完了 最終レポート',
      '',
      `## 統計`,
      `- 総試行: ${this.store.totalAttempts}`,
      `- 成功: ${this.store.totalSuccesses}`,
      `- 失敗: ${totalFailed}`,
      `- 失敗率: ${failureRate}%`,
      '',
      '## 頻出エラーパターン（プロンプト改善候補）',
      ''
    ];

    for (const rec of sorted) {
      const hint = this.getHintForCode(rec.errorCode);
      lines.push(`### ${rec.errorCode} (${rec.count}回)`);
      lines.push(`- 発生ゲーム例: ${rec.gameExamples.join(', ')}`);
      if (hint) {
        lines.push(`- 推奨修正: ${hint}`);
      }
      lines.push('');
    }

    lines.push('## プロンプト改善提案');
    lines.push('上記の頻出エラーに対応するプロンプト改訂を検討してください。');
    lines.push(`最終更新: ${new Date().toISOString()}`);

    const reportPath = this.storeFile.replace('failure_patterns.json', 'final_report.md');
    try {
      fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
      console.log(`\n📊 最終レポートを保存: ${reportPath}`);
    } catch {
      // 保存失敗は無視
    }

    return lines.join('\n');
  }
}
