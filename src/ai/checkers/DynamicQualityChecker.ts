/**
 * DynamicQualityChecker
 * 動的品質評価システム
 * 
 * Phase H: 95点満点の品質評価
 * - 相対評価（50点）: 多様性・密度・ギャップ・バランス
 * - 絶対評価（45点）: 基本品質・プレイアビリティ・満足度予測
 * - 合格基準: 95点以上
 */

import { GameProject } from '../../types/editor/GameProject';
import {
  QualityEvaluation,
  GeneratedGame,
  GameSpec
} from '../types/GenerationTypes';
import { GamePortfolioAnalyzer } from '../analyzers/GamePortfolioAnalyzer';

/**
 * 基本品質評価結果
 */
interface BasicQualityResult {
  fileIntegrity: number;        // ファイル整合性（0-5点）
  assetQuality: number;          // アセット品質（0-5点）
  ruleConsistency: number;       // ルール整合性（0-5点）
  total: number;                 // 合計（0-15点）
  issues: string[];              // 問題点
}

/**
 * プレイアビリティ評価結果
 */
interface PlayabilityResult {
  clearable: number;             // クリア可能性（0-7点）
  difficulty: number;            // 難易度適切性（0-5点）
  balance: number;               // バランス（0-3点）
  total: number;                 // 合計（0-15点）
  issues: string[];              // 問題点
}

/**
 * 満足度予測結果
 */
interface SatisfactionResult {
  claudePrediction: number;      // Claude予測（0-10点）
  gameplayScore: number;         // ゲーム性（0-3点）
  replayability: number;         // リプレイ性（0-2点）
  total: number;                 // 合計（0-15点）
  reasoning: string;             // 理由
}

/**
 * DynamicQualityChecker
 * 動的品質評価システムの中核
 */
export class DynamicQualityChecker {
  private analyzer: GamePortfolioAnalyzer;
  
  constructor() {
    this.analyzer = new GamePortfolioAnalyzer();
  }
  
  /**
   * 完全な品質評価
   * 相対評価（50点）+ 絶対評価（45点）= 95点満点
   */
  async evaluateQuality(
    newGame: GeneratedGame,
    existingGames: GeneratedGame[]
  ): Promise<QualityEvaluation> {
    
    console.log('  🔍 Dynamic Quality Check...');
    
    // === 相対評価（50点） ===
    const relativeScore = await this.evaluateRelativeQuality(newGame, existingGames);
    console.log(`     ├─ Relative: ${relativeScore.subtotal.toFixed(1)}/50`);
    
    // === 絶対評価（45点） ===
    const absoluteScore = await this.evaluateAbsoluteQuality(newGame);
    console.log(`     └─ Absolute: ${absoluteScore.subtotal.toFixed(1)}/45`);
    
    // 総合スコア
    const totalScore = relativeScore.subtotal + absoluteScore.subtotal;
    const passed = totalScore >= 95.0; // 95点以上で合格
    
    // 詳細情報の収集
    const details = {
      playabilityIssues: this.collectPlayabilityIssues(newGame),
      diversityAnalysis: this.generateDiversityAnalysis(newGame, existingGames),
      recommendations: this.generateRecommendations(totalScore, relativeScore, absoluteScore)
    };
    
    return {
      totalScore,
      relativeScore,
      absoluteScore,
      passed,
      details
    };
  }
  
  /**
   * 相対評価（50点）
   * ポートフォリオとの関係性で評価
   */
  private async evaluateRelativeQuality(
    newGame: GeneratedGame,
    existingGames: GeneratedGame[]
  ): Promise<QualityEvaluation['relativeScore']> {
    
    // 多様性分析
    const diversityAnalysis = this.analyzer.analyzeDiversity(
      newGame.vector,
      existingGames
    );
    
    // 1. 多様性スコア（0-20点）
    const diversityPoints = diversityAnalysis.score * 20;
    
    // 2. 密度ペナルティ（0--10点）
    // 密集領域では最大-10点のペナルティ
    const densityPenaltyPoints = -diversityAnalysis.densityPenalty * 10;
    
    // 3. ギャップ充填ボーナス（0-10点）
    const gapFillingPoints = diversityAnalysis.gapFillingScore * 10;
    
    // 4. バランス貢献（0-10点）
    // balanceContribution: -0.5〜0.5 → 0-10点に変換
    const balancePoints = (diversityAnalysis.balanceContribution + 0.5) * 10;
    
    const subtotal = diversityPoints + densityPenaltyPoints + gapFillingPoints + balancePoints;
    
    return {
      diversity: diversityPoints,
      densityPenalty: densityPenaltyPoints,
      gapFilling: gapFillingPoints,
      balance: balancePoints,
      subtotal: Math.max(0, Math.min(50, subtotal)) // 0-50点の範囲に制限
    };
  }
  
  /**
   * 絶対評価（45点）
   * ゲーム自体の品質で評価
   */
  private async evaluateAbsoluteQuality(
    newGame: GeneratedGame
  ): Promise<QualityEvaluation['absoluteScore']> {
    
    // 1. 基本品質評価（0-15点）
    const basicQuality = this.evaluateBasicQuality(newGame);
    
    // 2. プレイアビリティ評価（0-15点）
    const playability = this.evaluatePlayability(newGame);
    
    // 3. 満足度予測（0-15点）
    const satisfaction = await this.predictSatisfaction(newGame);
    
    const subtotal = basicQuality.total + playability.total + satisfaction.total;
    
    return {
      basicQuality: basicQuality.total,
      playability: playability.total,
      predictedSatisfaction: satisfaction.total,
      subtotal: Math.max(0, Math.min(45, subtotal)) // 0-45点の範囲に制限
    };
  }
  
  // ==========================================
  // 絶対評価: 基本品質（0-15点）
  // ==========================================
  
  /**
   * 基本品質評価
   * ファイル整合性・アセット品質・ルール整合性
   */
  private evaluateBasicQuality(game: GeneratedGame): BasicQualityResult {
    const issues: string[] = [];
    
    // 1. ファイル整合性（0-5点）
    let fileIntegrityScore = 5;
    
    // GameProjectの必須フィールドチェック
    if (!game.project.settings || !game.project.script || !game.project.assets) {
      fileIntegrityScore -= 2;
      issues.push('Missing required fields in GameProject');
    }
    
    // ルール数チェック（最低1つ必要）
    if (game.project.script.rules.length === 0) {
      fileIntegrityScore -= 3;
      issues.push('No rules defined');
    }
    
    // 2. アセット品質（0-5点）
    let assetQualityScore = 5;
    
    // 背景チェック
    if (!game.project.assets.background || !game.project.assets.background) {
      assetQualityScore -= 2;
      issues.push('No background');
    }
    
    // オブジェクトチェック（最低1つ必要）
    if (!game.project.assets.objects || game.project.assets.objects.length === 0) {
      assetQualityScore -= 2;
      issues.push('No objects');
    }
    
    // Base64サイズチェック（8MB制限）
    const projectSize = JSON.stringify(game.project).length;
    if (projectSize > 8 * 1024 * 1024) {
      assetQualityScore -= 1;
      issues.push('Project size exceeds 8MB');
    }
    
    // 3. ルール整合性（0-5点）
    let ruleConsistencyScore = 5;
    
    // ルールの整合性チェック
    const ruleIssues = this.checkRuleConsistency(game.project.script);
    ruleConsistencyScore -= ruleIssues.length * 0.5;
    ruleConsistencyScore = Math.max(0, ruleConsistencyScore);
    issues.push(...ruleIssues);
    
    const total = fileIntegrityScore + assetQualityScore + ruleConsistencyScore;
    
    return {
      fileIntegrity: fileIntegrityScore,
      assetQuality: assetQualityScore,
      ruleConsistency: ruleConsistencyScore,
      total: Math.max(0, Math.min(15, total)),
      issues
    };
  }
  
  /**
   * ルール整合性のチェック
   */
  private checkRuleConsistency(script: any): string[] {
    const issues: string[] = [];
    
    // 勝利条件チェック
    const hasWinCondition = script.rules.some((rule: any) => 
      rule.actions.some((action: any) => action.type === 'success')
    );
    
    if (!hasWinCondition) {
      issues.push('No win condition');
    }
    
    // ゲームオーバー条件チェック（必須ではないが推奨）
    const hasGameOver = script.rules.some((rule: any) =>
      rule.actions.some((action: any) => action.type === 'failure')
    );
    
    if (!hasGameOver && script.rules.length > 2) {
      // ルールが多いのにゲームオーバーがないのは不自然
      issues.push('No game over condition for complex game');
    }
    
    // アクション対象の整合性チェック
    script.rules.forEach((rule: any, index: number) => {
      if (rule.action && rule.action.target && rule.action.target.objectId) {
        // オブジェクトIDが正しいか簡易チェック
        if (rule.action.target.objectId === '') {
          issues.push(`Rule ${index}: Empty object ID`);
        }
      }
    });
    
    return issues.slice(0, 5); // 最大5つまで
  }
  
  // ==========================================
  // 絶対評価: プレイアビリティ（0-15点）
  // ==========================================
  
  /**
   * プレイアビリティ評価
   * クリア可能性・難易度・バランス
   */
  private evaluatePlayability(game: GeneratedGame): PlayabilityResult {
    const issues: string[] = [];
    
    // 1. クリア可能性（0-7点）
    let clearableScore = 7;
    
    // 勝利条件の存在確認
    const hasWinCondition = game.project.script.rules.some(rule =>
      rule.actions.some(action => action.type === 'success')
    );
    
    if (!hasWinCondition) {
      clearableScore = 0;
      issues.push('No win condition - game cannot be cleared');
    } else {
      // 勝利条件の達成可能性を簡易評価
      const winRules = game.project.script.rules.filter(rule =>
        rule.actions.some(action => action.type === 'success')
      );
      
      // カウンター条件の場合、カウンター変更アクションが必要
      const hasCounterCondition = winRules.some(rule =>
        rule.triggers.conditions.some(c => c.type === 'counter')
      );
      
      if (hasCounterCondition) {
        const hasCounterAction = game.project.script.rules.some(rule =>
          rule.actions.some(action => action.type === 'counter')
        );
        
        if (!hasCounterAction) {
          clearableScore -= 3;
          issues.push('Counter win condition but no counter change action');
        }
      }
    }
    
    // 2. 難易度適切性（0-5点）
    let difficultyScore = 5;
    
    // ルール数から難易度を推定
    const ruleCount = game.project.script.rules.length;
    
    if (ruleCount < 2) {
      difficultyScore -= 2;
      issues.push('Too simple (too few rules)');
    } else if (ruleCount > 15) {
      difficultyScore -= 1;
      issues.push('Possibly too complex (many rules)');
    }
    
    // タイマー条件のチェック（時間制限が厳しすぎないか）
    const timerRules = game.project.script.rules.filter(rule =>
      rule.triggers.conditions.some(c => c.type === 'time')
    );
    
    if (timerRules.length > 5) {
      difficultyScore -= 1;
      issues.push('Many timer conditions - may be too difficult');
    }
    
    // 3. バランス（0-3点）
    let balanceScore = 3;
    
    // 条件とアクションのバランスチェック
    const conditionTypes = new Set<string>();
    const actionTypes = new Set<string>();
    
    game.project.script.rules.forEach(rule => {
      rule.triggers.conditions.forEach(c => conditionTypes.add(c.type));
      rule.actions.forEach(action => actionTypes.add(action.type));
    });
    
    // 条件とアクションの多様性が低い場合は減点
    if (conditionTypes.size === 1) {
      balanceScore -= 1;
      issues.push('Low condition diversity');
    }
    
    if (actionTypes.size === 1) {
      balanceScore -= 1;
      issues.push('Low action diversity');
    }
    
    const total = clearableScore + difficultyScore + balanceScore;
    
    return {
      clearable: clearableScore,
      difficulty: difficultyScore,
      balance: balanceScore,
      total: Math.max(0, Math.min(15, total)),
      issues
    };
  }
  
  // ==========================================
  // 絶対評価: 満足度予測（0-15点）
  // ==========================================
  
  /**
   * 満足度予測
   * Claude評価・ゲーム性・リプレイ性
   */
  private async predictSatisfaction(game: GeneratedGame): Promise<SatisfactionResult> {
    // 1. Claude予測（0-10点）
    // 実際のClaude API呼び出しは高コストなので、
    // ルールベース評価で代用
    const claudePrediction = this.predictWithRules(game);
    
    // 2. ゲーム性（0-3点）
    const gameplayScore = this.evaluateGameplayValue(game);
    
    // 3. リプレイ性（0-2点）
    const replayability = this.evaluateReplayability(game);
    
    const total = claudePrediction + gameplayScore + replayability;
    
    const reasoning = this.generateSatisfactionReasoning(
      claudePrediction,
      gameplayScore,
      replayability
    );
    
    return {
      claudePrediction,
      gameplayScore,
      replayability,
      total: Math.max(0, Math.min(15, total)),
      reasoning
    };
  }
  
  /**
   * ルールベースの満足度予測
   */
  private predictWithRules(game: GeneratedGame): number {
    let score = 5; // ベーススコア
    
    const spec = game.metadata.spec;
    const script = game.project.script;
    
    // 複雑度が適切か（中程度が好まれる）
    const ruleCount = script.rules.length;
    if (ruleCount >= 3 && ruleCount <= 8) {
      score += 2; // 適切な複雑度
    } else if (ruleCount < 2 || ruleCount > 12) {
      score -= 1; // 極端すぎる
    }
    
    // ジャンルの魅力度
    const popularGenres = ['action', 'puzzle', 'timing', 'reflex'];
    if (popularGenres.includes(spec.concept.genre)) {
      score += 1;
    }
    
    // ビジュアルの多様性
    const objectCount = game.project.assets.objects?.length || 0;
    if (objectCount >= 2 && objectCount <= 5) {
      score += 1;
    }
    
    // タイミング要素（面白さを高める）
    const hasTimer = script.rules.some(r => 
      r.triggers.conditions.some(c => c.type === 'time')
    );
    if (hasTimer) {
      score += 1;
    }
    
    return Math.max(0, Math.min(10, score));
  }
  
  /**
   * ゲーム性の評価
   */
  private evaluateGameplayValue(game: GeneratedGame): number {
    let score = 1.5; // ベーススコア
    
    const script = game.project.script;
    
    // インタラクションの多様性
    const conditionTypes = new Set<string>();
    script.rules.forEach(rule => {
      rule.triggers.conditions.forEach(c => conditionTypes.add(c.type));
    });
    
    if (conditionTypes.size >= 2) {
      score += 0.5;
    }
    
    // フィードバックの存在
    const hasFeedback = script.rules.some(r =>
      r.actions.some(action => action.type === 'counter' || action.type === 'effect')
    );
    if (hasFeedback) {
      score += 0.5;
    }
    
    // 戦略性（ルール間の相互作用）
    if (script.rules.length >= 4) {
      score += 0.5;
    }
    
    return Math.max(0, Math.min(3, score));
  }
  
  /**
   * リプレイ性の評価
   */
  private evaluateReplayability(game: GeneratedGame): number {
    let score = 1; // ベーススコア
    
    const script = game.project.script;
    
    // ランダム性の存在
    const hasRandom = script.rules.some(r =>
      r.actions.some(action => action.type === 'randomAction')
    );
    
    if (hasRandom) {
      score += 0.5;
    }
    
    // カウンターシステムの存在（競争要素）
    const hasCounter = script.rules.some(r =>
      r.actions.some(action => action.type === 'counter') || 
      r.triggers.conditions.some(c => c.type === 'counter')
    );
    
    if (hasCounter) {
      score += 0.5;
    }
    
    return Math.max(0, Math.min(2, score));
  }
  
  /**
   * 満足度予測の理由生成
   */
  private generateSatisfactionReasoning(
    claude: number,
    gameplay: number,
    replay: number
  ): string {
    const reasons: string[] = [];
    
    if (claude >= 8) {
      reasons.push('High predicted satisfaction');
    } else if (claude <= 4) {
      reasons.push('Low predicted satisfaction');
    }
    
    if (gameplay >= 2.5) {
      reasons.push('Strong gameplay value');
    } else if (gameplay <= 1.5) {
      reasons.push('Weak gameplay value');
    }
    
    if (replay >= 1.5) {
      reasons.push('Good replayability');
    } else if (replay <= 0.5) {
      reasons.push('Limited replayability');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Average satisfaction expected';
  }
  
  // ==========================================
  // ヘルパーメソッド
  // ==========================================
  
  /**
   * プレイアビリティの問題点を収集
   */
  private collectPlayabilityIssues(game: GeneratedGame): string[] {
    const issues: string[] = [];
    
    const basicQuality = this.evaluateBasicQuality(game);
    const playability = this.evaluatePlayability(game);
    
    issues.push(...basicQuality.issues);
    issues.push(...playability.issues);
    
    // 重複を削除して返す
    return Array.from(new Set(issues));
  }
  
  /**
   * 多様性分析レポートの生成
   */
  private generateDiversityAnalysis(
    newGame: GeneratedGame,
    existingGames: GeneratedGame[]
  ): string {
    if (existingGames.length === 0) {
      return 'First game - maximum diversity';
    }
    
    const analysis = this.analyzer.analyzeDiversity(newGame.vector, existingGames);
    
    const parts: string[] = [];
    
    // 多様性スコア
    if (analysis.score >= 0.8) {
      parts.push('Highly diverse');
    } else if (analysis.score >= 0.5) {
      parts.push('Moderately diverse');
    } else {
      parts.push('Low diversity');
    }
    
    // 最近傍距離
    parts.push(`Nearest: ${analysis.nearestDistance.toFixed(2)}`);
    
    // 密度ペナルティ
    if (analysis.densityPenalty > 0.5) {
      parts.push('High density area');
    }
    
    // ギャップ充填
    if (analysis.gapFillingScore > 0.7) {
      parts.push('Fills gap');
    }
    
    return parts.join(', ');
  }
  
  /**
   * 改善提案の生成
   */
  private generateRecommendations(
    totalScore: number,
    relativeScore: QualityEvaluation['relativeScore'],
    absoluteScore: QualityEvaluation['absoluteScore']
  ): string[] {
    const recommendations: string[] = [];
    
    // 総合スコアが低い場合
    if (totalScore < 85) {
      recommendations.push('Overall quality needs improvement');
    }
    
    // 相対評価が低い場合
    if (relativeScore.subtotal < 25) {
      recommendations.push('Increase diversity - explore new game mechanics');
    }
    
    // 多様性が特に低い場合
    if (relativeScore.diversity < 10) {
      recommendations.push('Too similar to existing games');
    }
    
    // 密度ペナルティが大きい場合
    if (relativeScore.densityPenalty < -5) {
      recommendations.push('Avoid overcrowded game space');
    }
    
    // 絶対評価が低い場合
    if (absoluteScore.subtotal < 30) {
      recommendations.push('Improve basic game quality');
    }
    
    // 基本品質が低い場合
    if (absoluteScore.basicQuality < 10) {
      recommendations.push('Fix file integrity and asset quality issues');
    }
    
    // プレイアビリティが低い場合
    if (absoluteScore.playability < 10) {
      recommendations.push('Ensure game is clearable and balanced');
    }
    
    // 満足度予測が低い場合
    if (absoluteScore.predictedSatisfaction < 10) {
      recommendations.push('Enhance gameplay value and replayability');
    }
    
    // 推奨事項がない場合
    if (recommendations.length === 0 && totalScore >= 95) {
      recommendations.push('Excellent quality - ready for publication');
    }
    
    return recommendations.slice(0, 5); // 最大5つまで
  }
}