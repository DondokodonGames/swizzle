/**
 * AdaptiveStandards
 * 適応的品質基準システム（環境変数対応版）
 * 
 * 機能:
 * - 品質基準の動的調整
 * - 合格率の監視と調整（目標35%）
 * - ε値の動的調整（探索率）
 * - ユーザーフィードバックからの学習
 * - パフォーマンスベースの基準更新
 * - 環境変数QUALITY_THRESHOLDからの初期値読み込み ✅ 追加
 */

import {
  UserFeedback,
  QualityEvaluation,
  GenerationStatistics
} from '../types/GenerationTypes';

/**
 * 品質基準
 */
interface QualityStandards {
  // 品質閾値
  qualityThreshold: number;               // 合格ライン（95点満点）
  
  // 相対評価基準
  relative: {
    minDiversityScore: number;            // 最小多様性スコア
    maxDensityPenalty: number;            // 最大密度ペナルティ
    minGapFillingScore: number;           // 最小ギャップ充填スコア
  };
  
  // 絶対評価基準
  absolute: {
    minBasicQuality: number;              // 最小基本品質
    minPlayability: number;               // 最小プレイアビリティ
    minSatisfaction: number;              // 最小満足度予測
  };
  
  // プレイ時間基準
  playTime: {
    min: number;                          // 最小プレイ時間（秒）
    max: number;                          // 最大プレイ時間（秒）
    ideal: number;                        // 理想プレイ時間（秒）
  };
  
  // 複雑度基準
  complexity: {
    minRules: number;                     // 最小ルール数
    maxRules: number;                     // 最大ルール数
    idealRules: number;                   // 理想ルール数
  };
}

/**
 * パフォーマンスメトリクス
 */
interface PerformanceMetrics {
  // 生成関連
  totalGenerated: number;                 // 総生成数
  totalPassed: number;                    // 総合格数
  currentPassRate: number;                // 現在の合格率
  targetPassRate: number;                 // 目標合格率
  
  // 品質関連
  averageQualityScore: number;            // 平均品質スコア
  qualityTrend: 'up' | 'down' | 'stable'; // 品質トレンド
  
  // 多様性関連
  diversityScore: number;                 // ポートフォリオ多様性
  explorationRate: number;                // 探索率
  
  // ユーザー関連
  averageUserRating: number;              // 平均ユーザー評価
  userSatisfaction: number;               // ユーザー満足度
  
  // パフォーマンス関連
  recentPerformance: number;              // 最近のパフォーマンス（0-1）
}

/**
 * 調整履歴
 */
interface AdjustmentHistory {
  timestamp: string;
  type: 'threshold' | 'epsilon' | 'standards';
  oldValue: number;
  newValue: number;
  reason: string;
}

/**
 * AdaptiveStandards
 * 適応的品質基準の管理
 */
export class AdaptiveStandards {
  private standards: QualityStandards;
  private adjustmentHistory: AdjustmentHistory[] = [];
  
  // 調整パラメータ
  private readonly TARGET_PASS_RATE = 0.35;       // 目標合格率35%
  private readonly PASS_RATE_TOLERANCE = 0.05;    // 許容誤差±5%
  private readonly ADJUSTMENT_RATE = 0.1;         // 調整速度（10%）
  private readonly MIN_THRESHOLD = 60;            // 最小閾値 ✅ 80→60に変更
  private readonly MAX_THRESHOLD = 98;            // 最大閾値
  
  constructor() {
    // ✅ 環境変数から初期閾値を読み込み
    const envThreshold = process.env.QUALITY_THRESHOLD 
      ? parseFloat(process.env.QUALITY_THRESHOLD)
      : 95;
    
    // 初期基準
    this.standards = {
      qualityThreshold: envThreshold, // ✅ 環境変数対応
      
      relative: {
        minDiversityScore: 10,
        maxDensityPenalty: -8,
        minGapFillingScore: 5
      },
      
      absolute: {
        minBasicQuality: 10,
        minPlayability: 10,
        minSatisfaction: 8
      },
      
      playTime: {
        min: 5,
        max: 30,
        ideal: 15
      },
      
      complexity: {
        minRules: 2,
        maxRules: 15,
        idealRules: 5
      }
    };
    
    // ✅ 初期化ログ
    console.log(`📊 AdaptiveStandards initialized with threshold: ${this.standards.qualityThreshold}`);
  }
  
  /**
   * 現在の基準を取得
   */
  getStandards(): QualityStandards {
    return { ...this.standards };
  }
  
  /**
   * 品質閾値を取得
   */
  getQualityThreshold(): number {
    return this.standards.qualityThreshold;
  }
  
  /**
   * ユーザーフィードバックから学習
   */
  updateFromUserFeedback(feedbacks: UserFeedback[]): void {
    if (feedbacks.length === 0) {
      return;
    }
    
    console.log(`\n🧠 Learning from ${feedbacks.length} user feedbacks...`);
    
    // 高評価ゲームの特性を分析
    const highRatedFeedbacks = feedbacks.filter(f => f.rating >= 4);
    
    if (highRatedFeedbacks.length > 0) {
      // プレイ時間の傾向を学習
      const avgPlayTime = highRatedFeedbacks.reduce((sum, f) => sum + f.playTime, 0) / 
                         highRatedFeedbacks.length;
      
      // 指数移動平均で緩やかに更新（急激な変化を防ぐ）
      const alpha = 0.1; // 10%の重み
      this.standards.playTime.ideal = 
        this.standards.playTime.ideal * (1 - alpha) + avgPlayTime * alpha;
      
      // 範囲も更新
      this.standards.playTime.min = Math.max(5, this.standards.playTime.ideal * 0.5);
      this.standards.playTime.max = Math.min(30, this.standards.playTime.ideal * 2);
      
      console.log(`   ✓ Updated ideal play time: ${this.standards.playTime.ideal.toFixed(1)}s`);
    }
    
    // クリア率から難易度基準を調整
    const completionRate = feedbacks.filter(f => f.completed).length / feedbacks.length;
    
    if (completionRate < 0.3) {
      // クリア率が低い → 簡単にする
      this.standards.absolute.minPlayability -= 1;
      console.log('   ✓ Lowered playability standards (low completion rate)');
    } else if (completionRate > 0.8) {
      // クリア率が高すぎる → 難しくする
      this.standards.absolute.minPlayability += 1;
      console.log('   ✓ Raised playability standards (high completion rate)');
    }
    
    // 満足度から品質基準を調整
    const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
    
    if (avgRating < 3.0) {
      // 評価が低い → 基準を上げる
      this.adjustQualityThreshold(2, 'Low user satisfaction');
    } else if (avgRating > 4.5) {
      // 評価が高い → 基準を少し緩める
      this.adjustQualityThreshold(-1, 'High user satisfaction');
    }
  }
  
  /**
   * 生成結果からの学習
   */
  updateFromGenerationResults(
    results: Array<{ quality: QualityEvaluation }>
  ): void {
    if (results.length === 0) {
      return;
    }
    
    const scores = results.map(r => r.quality.totalScore);
    const median = this.calculateMedian(scores);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    console.log(`\n📊 Analyzing ${results.length} generation results...`);
    console.log(`   Median: ${median.toFixed(1)}, Mean: ${mean.toFixed(1)}`);
    
    // 品質分布に基づいて基準を調整
    if (median > 90) {
      // 全体的に品質が高い → 基準を上げる
      this.adjustQualityThreshold(1, 'High median quality');
    } else if (median < 75) {
      // 全体的に品質が低い → 基準を下げる
      this.adjustQualityThreshold(-2, 'Low median quality');
    }
    
    // 品質の標準偏差をチェック
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev > 10) {
      console.log(`   ⚠️  High variance (${stdDev.toFixed(1)}) - quality unstable`);
    }
  }
  
  /**
   * パフォーマンスメトリクスに基づく調整
   */
  adjustBasedOnPerformance(metrics: PerformanceMetrics): void {
    console.log('\n🎯 Adjusting standards based on performance...');
    
    // 1. 合格率の調整
    this.adjustForPassRate(metrics);
    
    // 2. 多様性の調整
    this.adjustForDiversity(metrics);
    
    // 3. ユーザー満足度の調整
    this.adjustForUserSatisfaction(metrics);
    
    // 4. 探索率の調整
    this.adjustExplorationRate(metrics);
  }
  
  /**
   * 合格率に基づく調整
   */
  private adjustForPassRate(metrics: PerformanceMetrics): void {
    const passRateDiff = metrics.currentPassRate - this.TARGET_PASS_RATE;
    
    if (Math.abs(passRateDiff) > this.PASS_RATE_TOLERANCE) {
      if (passRateDiff > 0) {
        // 合格率が高すぎる → 基準を上げる
        const adjustment = Math.ceil(passRateDiff * 20); // 5%差 → 1点調整
        this.adjustQualityThreshold(adjustment, 
          `Pass rate too high: ${(metrics.currentPassRate * 100).toFixed(1)}%`);
      } else {
        // 合格率が低すぎる → 基準を下げる
        const adjustment = Math.floor(passRateDiff * 20);
        this.adjustQualityThreshold(adjustment,
          `Pass rate too low: ${(metrics.currentPassRate * 100).toFixed(1)}%`);
      }
    } else {
      console.log(`   ✓ Pass rate OK: ${(metrics.currentPassRate * 100).toFixed(1)}%`);
    }
  }
  
  /**
   * 多様性に基づく調整
   */
  private adjustForDiversity(metrics: PerformanceMetrics): void {
    if (metrics.diversityScore < 0.5) {
      // 多様性が低い → 多様性基準を上げる
      this.standards.relative.minDiversityScore += 1;
      console.log('   ✓ Raised diversity standards');
    } else if (metrics.diversityScore > 0.8) {
      // 多様性が高い → 少し緩める
      this.standards.relative.minDiversityScore = Math.max(5, 
        this.standards.relative.minDiversityScore - 0.5);
      console.log('   ✓ Slightly lowered diversity standards');
    }
  }
  
  /**
   * ユーザー満足度に基づく調整
   */
  private adjustForUserSatisfaction(metrics: PerformanceMetrics): void {
    if (metrics.userSatisfaction < 0.6) {
      // 満足度が低い → 品質基準を上げる
      this.standards.absolute.minSatisfaction += 1;
      console.log('   ✓ Raised satisfaction standards');
    } else if (metrics.userSatisfaction > 0.85) {
      // 満足度が高い → 少し緩める
      this.standards.absolute.minSatisfaction = Math.max(5,
        this.standards.absolute.minSatisfaction - 0.5);
      console.log('   ✓ Slightly lowered satisfaction standards');
    }
  }
  
  /**
   * 探索率の調整（ε-greedy戦略）
   */
  private adjustExplorationRate(metrics: PerformanceMetrics): number {
    let newEpsilon = metrics.explorationRate;
    
    // 多様性が低い → 探索率UP
    if (metrics.diversityScore < 0.5) {
      newEpsilon = Math.min(0.5, metrics.explorationRate + 0.05);
      console.log(`   ✓ Increased exploration rate: ${newEpsilon.toFixed(2)}`);
    }
    
    // ユーザー満足度が高い → 活用率UP（探索率DOWN）
    if (metrics.userSatisfaction > 0.8) {
      newEpsilon = Math.max(0.1, metrics.explorationRate - 0.05);
      console.log(`   ✓ Decreased exploration rate: ${newEpsilon.toFixed(2)}`);
    }
    
    // 最近のパフォーマンスが悪い → 探索率UP
    if (metrics.recentPerformance < 0.6) {
      newEpsilon = Math.min(0.5, metrics.explorationRate + 0.1);
      console.log(`   ✓ Boosted exploration (poor performance): ${newEpsilon.toFixed(2)}`);
    }
    
    return newEpsilon;
  }
  
  /**
   * 品質閾値の調整
   */
  private adjustQualityThreshold(delta: number, reason: string): void {
    const oldValue = this.standards.qualityThreshold;
    let newValue = oldValue + delta;
    
    // 範囲制限
    newValue = Math.max(this.MIN_THRESHOLD, Math.min(this.MAX_THRESHOLD, newValue));
    
    if (newValue !== oldValue) {
      this.standards.qualityThreshold = newValue;
      
      // 履歴に記録
      this.adjustmentHistory.push({
        timestamp: new Date().toISOString(),
        type: 'threshold',
        oldValue,
        newValue,
        reason
      });
      
      console.log(`   ✓ Quality threshold: ${oldValue} → ${newValue} (${reason})`);
    }
  }
  
  /**
   * 統計情報から基準を自動調整
   */
  autoAdjust(statistics: GenerationStatistics): void {
    console.log('\n🔄 Auto-adjusting standards...');
    
    const metrics: PerformanceMetrics = {
      totalGenerated: statistics.generated,
      totalPassed: statistics.passed,
      currentPassRate: statistics.passRate,
      targetPassRate: this.TARGET_PASS_RATE,
      averageQualityScore: statistics.averageQuality,
      qualityTrend: this.detectQualityTrend(statistics),
      diversityScore: statistics.diversityScore,
      explorationRate: statistics.currentEpsilon,
      averageUserRating: 0, // TODO: 実際のユーザー評価から取得
      userSatisfaction: 0.7, // TODO: 実際の満足度から取得
      recentPerformance: statistics.passRate
    };
    
    this.adjustBasedOnPerformance(metrics);
  }
  
  /**
   * 品質トレンドの検出
   */
  private detectQualityTrend(statistics: GenerationStatistics): 'up' | 'down' | 'stable' {
    // TODO: 履歴データから傾向を分析
    // 現在は簡易実装
    
    if (statistics.averageQuality > 90) {
      return 'up';
    } else if (statistics.averageQuality < 80) {
      return 'down';
    } else {
      return 'stable';
    }
  }
  
  /**
   * 中央値の計算
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }
  
  /**
   * 調整履歴の取得
   */
  getAdjustmentHistory(limit: number = 10): AdjustmentHistory[] {
    return this.adjustmentHistory.slice(-limit);
  }
  
  /**
   * 統計レポートの生成
   */
  generateReport(): string {
    const lines: string[] = [];
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📋 Adaptive Standards Report');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('Quality Standards:');
    lines.push(`  Threshold: ${this.standards.qualityThreshold}`);
    lines.push(`  Min Diversity: ${this.standards.relative.minDiversityScore}`);
    lines.push(`  Min Playability: ${this.standards.absolute.minPlayability}`);
    lines.push(`  Min Satisfaction: ${this.standards.absolute.minSatisfaction}`);
    lines.push('');
    lines.push('Play Time Standards:');
    lines.push(`  Min: ${this.standards.playTime.min}s`);
    lines.push(`  Ideal: ${this.standards.playTime.ideal}s`);
    lines.push(`  Max: ${this.standards.playTime.max}s`);
    lines.push('');
    lines.push('Complexity Standards:');
    lines.push(`  Min Rules: ${this.standards.complexity.minRules}`);
    lines.push(`  Ideal Rules: ${this.standards.complexity.idealRules}`);
    lines.push(`  Max Rules: ${this.standards.complexity.maxRules}`);
    lines.push('');
    
    if (this.adjustmentHistory.length > 0) {
      lines.push('Recent Adjustments:');
      const recentAdjustments = this.adjustmentHistory.slice(-5);
      recentAdjustments.forEach(adj => {
        const timestamp = new Date(adj.timestamp).toLocaleString();
        lines.push(`  [${timestamp}] ${adj.type}: ${adj.oldValue} → ${adj.newValue}`);
        lines.push(`    Reason: ${adj.reason}`);
      });
    }
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return lines.join('\n');
  }
  
  /**
   * 基準のリセット（デバッグ用）
   */
  reset(): void {
    console.log('🔄 Resetting standards to initial values...');
    
    // ✅ 環境変数から再読み込み
    const envThreshold = process.env.QUALITY_THRESHOLD 
      ? parseFloat(process.env.QUALITY_THRESHOLD)
      : 95;
    
    this.standards = {
      qualityThreshold: envThreshold,
      
      relative: {
        minDiversityScore: 10,
        maxDensityPenalty: -8,
        minGapFillingScore: 5
      },
      
      absolute: {
        minBasicQuality: 10,
        minPlayability: 10,
        minSatisfaction: 8
      },
      
      playTime: {
        min: 5,
        max: 30,
        ideal: 15
      },
      
      complexity: {
        minRules: 2,
        maxRules: 15,
        idealRules: 5
      }
    };
    
    this.adjustmentHistory = [];
  }
  
  /**
   * 基準のエクスポート（保存用）
   */
  export(): string {
    return JSON.stringify({
      standards: this.standards,
      history: this.adjustmentHistory
    }, null, 2);
  }
  
  /**
   * 基準のインポート（読み込み用）
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.standards = parsed.standards;
      this.adjustmentHistory = parsed.history || [];
      console.log('✓ Standards imported successfully');
    } catch (error) {
      console.error('❌ Failed to import standards:', error);
    }
  }
}