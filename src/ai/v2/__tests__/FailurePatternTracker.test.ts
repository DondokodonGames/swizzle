import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FailurePatternTracker } from '../FailurePatternTracker';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'failure-tracker-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('FailurePatternTracker – メカニクス別集計', () => {
  it('recordFailure がメカニクスIDごとに発生回数を集計する', () => {
    const tracker = new FailurePatternTracker(tmpDir);
    tracker.recordFailure(['AUTO_SUCCESS'], 'game1', 'timing_window');
    tracker.recordFailure(['AUTO_SUCCESS'], 'game2', 'timing_window');
    tracker.recordFailure(['AUTO_SUCCESS'], 'game3', 'drag_place');
    tracker.recordFailure(['COUNTER_UNREACHABLE'], 'game4'); // mechanicなし → unknown

    const stored = JSON.parse(fs.readFileSync(path.join(tmpDir, 'failure_patterns.json'), 'utf-8'));
    expect(stored.patterns.AUTO_SUCCESS.byMechanic.timing_window).toBe(2);
    expect(stored.patterns.AUTO_SUCCESS.byMechanic.drag_place).toBe(1);
    expect(stored.patterns.COUNTER_UNREACHABLE.byMechanic.unknown).toBe(1);
  });

  it('generateDynamicHints はメカニクス指定時にそのメカニクスの失敗を優先する', () => {
    const tracker = new FailurePatternTracker(tmpDir);
    // 全体では COUNTER_UNREACHABLE が多いが、timing_window では AUTO_SUCCESS が多い
    for (let i = 0; i < 5; i++) tracker.recordFailure(['COUNTER_UNREACHABLE'], `g${i}`, 'count_exact');
    for (let i = 0; i < 3; i++) tracker.recordFailure(['AUTO_SUCCESS'], `t${i}`, 'timing_window');

    const globalHints = tracker.generateDynamicHints();
    const mechHints = tracker.generateDynamicHints('timing_window');

    // 全体ヒントは COUNTER_UNREACHABLE が先頭
    expect(globalHints.indexOf('COUNTER_UNREACHABLE')).toBeLessThan(globalHints.indexOf('AUTO_SUCCESS'));
    // timing_window 指定時は AUTO_SUCCESS が先頭
    expect(mechHints.indexOf('AUTO_SUCCESS')).toBeLessThan(mechHints.indexOf('COUNTER_UNREACHABLE'));
  });

  it('byMechanic を持たない旧形式ストアを読み込んでもクラッシュしない', () => {
    const legacyStore = {
      runStarted: new Date().toISOString(),
      totalAttempts: 3,
      totalSuccesses: 1,
      patterns: {
        AUTO_SUCCESS: {
          errorCode: 'AUTO_SUCCESS', count: 2,
          gameExamples: ['old game'], lastSeen: new Date().toISOString()
          // byMechanic なし（旧形式）
        }
      }
    };
    fs.writeFileSync(path.join(tmpDir, 'failure_patterns.json'), JSON.stringify(legacyStore));

    const tracker = new FailurePatternTracker(tmpDir);
    // 旧レコードに追記しても落ちない
    tracker.recordFailure(['AUTO_SUCCESS'], 'new game', 'timing_window');
    const hints = tracker.generateDynamicHints('timing_window');
    expect(hints).toContain('AUTO_SUCCESS');

    const stored = JSON.parse(fs.readFileSync(path.join(tmpDir, 'failure_patterns.json'), 'utf-8'));
    expect(stored.patterns.AUTO_SUCCESS.count).toBe(3);
    expect(stored.patterns.AUTO_SUCCESS.byMechanic.timing_window).toBe(1);
  });

  it('CONCEPT_TOO_SIMILAR にヒントが定義されている', () => {
    const tracker = new FailurePatternTracker(tmpDir);
    tracker.recordFailure(['CONCEPT_TOO_SIMILAR'], 'similar game', 'tap_selective');
    const hints = tracker.generateDynamicHints();
    expect(hints).toContain('CONCEPT_TOO_SIMILAR');
    expect(hints).toContain('差別化');
  });

  it('最終レポートにメカニクス別失敗率セクションが含まれる', () => {
    const tracker = new FailurePatternTracker(tmpDir);
    tracker.recordFailure(['AUTO_SUCCESS'], 'g1', 'timing_window');
    tracker.recordFailure(['COUNTER_UNREACHABLE'], 'g2', 'timing_window');
    const report = tracker.generateFinalReport();
    expect(report).toContain('メカニクス別失敗率');
    expect(report).toContain('timing_window');
  });
});
