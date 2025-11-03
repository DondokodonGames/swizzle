/**
 * GamePortfolioAnalyzer
 * ポートフォリオ分析・多様性評価システム
 * 
 * 機能:
 * - ゲームを40次元ベクトルに変換
 * - 多様性スコア計算
 * - ギャップ検出（未開拓領域の特定）
 * - カバレッジ分析
 * - 推奨生成方向の提案
 */

import { GameProject } from '../../types/editor/GameProject';
import { GameScript } from '../../types/editor/GameScript';
import {
  GameVector,
  GeneratedGame,
  GamePortfolio,
  GameGenre,
  GameMechanic,
  VisualStyle
} from '../types/GenerationTypes';

/**
 * ギャップ領域（未開拓領域）
 */
interface GapArea {
  description: string;                      // 説明
  vector: Partial<GameVector>;              // 推奨ベクトル
  priority: number;                         // 優先度（0-1）
  estimatedDiversity: number;               // 推定多様性貢献度
}

/**
 * 多様性分析結果
 */
interface DiversityAnalysis {
  score: number;                            // 多様性スコア（0-1）
  nearestDistance: number;                  // 最近傍距離
  averageDistance: number;                  // 平均距離
  densityPenalty: number;                   // 密度ペナルティ（0-1）
  gapFillingScore: number;                  // ギャップ充填スコア（0-1）
  balanceContribution: number;              // バランス貢献度（-0.5 to 0.5）
}

/**
 * GamePortfolioAnalyzer
 * ポートフォリオ全体の分析と多様性評価
 */
export class GamePortfolioAnalyzer {
  
  /**
   * ゲームを40次元ベクトルに変換
   */
  vectorizeGame(project: GameProject): GameVector {
    const script = project.script;
    const settings = project.settings;
    const assets = project.assets;
    
    return {
      // ゲームプレイ特性（10次元）
      gameplay: {
        playTime: this.normalizePlayTime(script),
        interactionFrequency: this.calculateInteractionFrequency(script),
        difficulty: this.estimateDifficulty(script, settings),
        skillCeiling: this.estimateSkillCeiling(script),
        complexity: this.calculateComplexity(script),
        replayability: this.estimateReplayability(script),
        accessibility: this.estimateAccessibility(script),
        learningCurve: this.estimateLearningCurve(script),
        pace: this.calculatePace(script),
        tension: this.calculateTension(script)
      },
      
      // ビジュアル特性（10次元）
      visual: {
        colorIntensity: this.analyzeColorIntensity(assets),
        visualComplexity: this.calculateVisualComplexity(assets),
        brightness: this.analyzeBrightness(assets),
        contrast: this.analyzeContrast(assets),
        saturation: this.analyzeSaturation(assets),
        objectDensity: this.calculateObjectDensity(assets),
        animationAmount: this.calculateAnimationAmount(assets),
        effectIntensity: this.calculateEffectIntensity(script),
        artStyleIndex: this.encodeArtStyle(assets),
        symmetry: this.analyzeSymmetry(assets)
      },
      
      // ルール特性（10次元）
      rules: {
        ruleCount: script.rules.length,
        conditionDiversity: this.calculateConditionDiversity(script),
        actionDiversity: this.calculateActionDiversity(script),
        conditionComplexity: this.calculateConditionComplexity(script),
        actionComplexity: this.calculateActionComplexity(script),
        ruleInteraction: this.calculateRuleInteraction(script),
        randomness: this.calculateRandomness(script),
        determinism: this.calculateDeterminism(script),
        feedbackLoop: this.detectFeedbackLoop(script),
        emergentComplexity: this.estimateEmergentComplexity(script)
      },
      
      // インタラクション特性（10次元）
      interaction: {
        touchBased: this.isTouchBased(script) ? 1 : 0,
        timingBased: this.isTimingBased(script) ? 1 : 0,
        memoryBased: this.isMemoryBased(script) ? 1 : 0,
        reflexBased: this.isReflexBased(script) ? 1 : 0,
        strategyBased: this.isStrategyBased(script) ? 1 : 0,
        precisionBased: this.isPrecisionBased(script) ? 1 : 0,
        rhythmBased: this.isRhythmBased(script) ? 1 : 0,
        spatialBased: this.isSpatialBased(script) ? 1 : 0,
        patternBased: this.isPatternBased(script) ? 1 : 0,
        reactionBased: this.isReactionBased(script) ? 1 : 0
      }
    };
  }
  
  /**
   * 多様性スコア計算
   * 新しいゲームが既存ゲーム群にどれだけ異なるかを評価
   */
  calculateDiversityScore(
    newGame: GameProject | GameVector,
    existingGames: GeneratedGame[]
  ): number {
    if (existingGames.length === 0) {
      return 1.0; // 最初のゲームは最高の多様性
    }
    
    const newVector = this.isGameProject(newGame) 
      ? this.vectorizeGame(newGame)
      : newGame;
    
    // 既存ゲームとの距離を計算
    const distances = existingGames.map(game => 
      this.calculateVectorDistance(newVector, game.vector)
    );
    
    // 最近傍距離（最も近いゲームとの距離）
    const nearestDistance = Math.min(...distances);
    
    // 平均距離
    const averageDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    
    // 多様性スコア = 加重平均（最近傍60% + 平均40%）
    // 正規化: 距離0-10 → スコア0-1
    const nearestScore = Math.min(nearestDistance / 10, 1.0);
    const averageScore = Math.min(averageDistance / 10, 1.0);
    const diversityScore = nearestScore * 0.6 + averageScore * 0.4;
    
    return diversityScore;
  }
  
  /**
   * 密度ペナルティ計算
   * 既存ゲームが密集している領域では減点
   */
  calculateDensityPenalty(
    newVector: GameVector,
    existingGames: GeneratedGame[]
  ): number {
    if (existingGames.length === 0) {
      return 0; // ペナルティなし
    }
    
    // 近傍半径内のゲーム数をカウント（距離3以内）
    const neighborRadius = 3.0;
    const neighborsCount = existingGames.filter(game => 
      this.calculateVectorDistance(newVector, game.vector) < neighborRadius
    ).length;
    
    // ペナルティ = 近傍ゲーム数 / 10（最大1.0）
    const penalty = Math.min(neighborsCount / 10, 1.0);
    
    return penalty;
  }
  
  /**
   * ギャップ充填ボーナス計算
   * 未開拓領域を埋める貢献度
   */
  calculateGapFillingBonus(
    newVector: GameVector,
    existingGames: GeneratedGame[]
  ): number {
    if (existingGames.length === 0) {
      return 1.0; // 最初のゲームは最大ボーナス
    }
    
    // ギャップ領域を検出
    const gapAreas = this.findGapAreas(existingGames);
    
    if (gapAreas.length === 0) {
      return 0.5; // ギャップがない場合は中立
    }
    
    // 各ギャップ領域との距離を計算
    const gapDistances = gapAreas.map(gap => {
      const gapVector = this.constructFullVector(gap.vector);
      return {
        distance: this.calculateVectorDistance(newVector, gapVector),
        priority: gap.priority
      };
    });
    
    // 最も近いギャップとの距離
    const nearestGap = gapDistances.reduce((min, current) => 
      current.distance < min.distance ? current : min
    );
    
    // ボーナス = (1 - 正規化距離) × 優先度
    const normalizedDistance = Math.min(nearestGap.distance / 10, 1.0);
    const bonus = (1 - normalizedDistance) * nearestGap.priority;
    
    return bonus;
  }
  
  /**
   * バランス貢献度計算
   * ジャンル・メカニクスのバランスへの貢献
   */
  calculateBalanceContribution(
    newGame: GameProject,
    existingGames: GeneratedGame[]
  ): number {
    if (existingGames.length === 0) {
      return 0; // 最初のゲームは中立
    }
    
    // TODO: ジャンル・メカニクス分布の分析
    // 現在は簡易実装
    
    // ランダムで-0.5〜0.5を返す（仮実装）
    return Math.random() - 0.5;
  }
  
  /**
   * 完全な多様性分析
   */
  analyzeDiversity(
    newGame: GameProject | GameVector,
    existingGames: GeneratedGame[]
  ): DiversityAnalysis {
    const newVector = this.isGameProject(newGame)
      ? this.vectorizeGame(newGame)
      : newGame;
    
    if (existingGames.length === 0) {
      return {
        score: 1.0,
        nearestDistance: 10.0,
        averageDistance: 10.0,
        densityPenalty: 0,
        gapFillingScore: 1.0,
        balanceContribution: 0
      };
    }
    
    const distances = existingGames.map(game =>
      this.calculateVectorDistance(newVector, game.vector)
    );
    
    const nearestDistance = Math.min(...distances);
    const averageDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    
    const diversityScore = this.calculateDiversityScore(newVector, existingGames);
    const densityPenalty = this.calculateDensityPenalty(newVector, existingGames);
    const gapFillingScore = this.calculateGapFillingBonus(newVector, existingGames);
    
    return {
      score: diversityScore,
      nearestDistance,
      averageDistance,
      densityPenalty,
      gapFillingScore,
      balanceContribution: 0 // TODO: 実装
    };
  }
  
  /**
   * ギャップ領域の検出
   * 未開拓の領域を特定
   */
  findGapAreas(existingGames: GeneratedGame[]): GapArea[] {
    if (existingGames.length < 10) {
      // ゲーム数が少ない場合は全方向を探索
      return this.generateExplorationDirections();
    }
    
    // TODO: クラスタリングとギャップ検出の完全実装
    // 現在は簡易実装
    
    const gapAreas: GapArea[] = [];
    
    // ジャンル・メカニクスの未開拓組み合わせを検出
    const genreCoverage = this.analyzeGenreCoverage(existingGames);
    const mechanicCoverage = this.analyzeMechanicCoverage(existingGames);
    
    // カバレッジが低い領域をギャップとして追加
    Object.entries(genreCoverage).forEach(([genre, count]) => {
      if (count < 3) {
        gapAreas.push({
          description: `Underrepresented genre: ${genre}`,
          vector: {}, // 仮
          priority: 1.0 - (count / 10),
          estimatedDiversity: 0.8
        });
      }
    });
    
    return gapAreas.slice(0, 5); // 上位5つ
  }
  
  /**
   * ポートフォリオ統計の更新
   */
  updatePortfolioStatistics(portfolio: GamePortfolio): void {
    const games = portfolio.games;
    
    if (games.length === 0) {
      return;
    }
    
    // 平均品質
    portfolio.statistics.averageQuality = 
      games.reduce((sum, g) => sum + g.quality.totalScore, 0) / games.length;
    
    // 多様性スコア
    portfolio.statistics.diversityScore = this.calculatePortfolioDiversity(games);
    
    // 総ゲーム数
    portfolio.statistics.totalGames = games.length;
    
    // ジャンル分布
    const genreDist = this.analyzeGenreCoverage(games);
    portfolio.statistics.genreDistribution = genreDist as any;
    
    // 品質分布
    const qualityDist = {
      excellent: games.filter(g => g.quality.totalScore >= 95).length,
      good: games.filter(g => g.quality.totalScore >= 85 && g.quality.totalScore < 95).length,
      acceptable: games.filter(g => g.quality.totalScore >= 75 && g.quality.totalScore < 85).length,
      poor: games.filter(g => g.quality.totalScore < 75).length
    };
    portfolio.statistics.qualityDistribution = qualityDist;
    
    // 健全性チェック
    portfolio.health.isBalanced = this.checkBalance(portfolio);
    portfolio.health.hasCoverage = this.checkCoverage(portfolio);
    portfolio.health.needsExploration = this.identifyExplorationNeeds(portfolio);
  }
  
  // ==========================================
  // Private: ベクトル化ヘルパー関数
  // ==========================================
  
  /**
   * プレイ時間の正規化（0-1）
   */
  private normalizePlayTime(script: GameScript): number {
    // TODO: scriptから推定
    // 仮実装: 0.5（中程度）
    return 0.5;
  }
  
  /**
   * 操作頻度の計算
   */
  private calculateInteractionFrequency(script: GameScript): number {
    // タッチ条件の数から推定
    const touchConditions = script.rules.filter(rule =>
      rule.triggers.conditions.some(c => c.type === 'touch')
    ).length;
    
    return Math.min(touchConditions / 5, 1.0);
  }
  
  /**
   * 難易度の推定
   */
  private estimateDifficulty(script: GameScript, settings: any): number {
    // settings.difficultyから推定
    const difficultyMap: Record<string, number> = {
      easy: 0.3,
      normal: 0.5,
      hard: 0.8
    };
    
    return difficultyMap[settings.difficulty] || 0.5;
  }
  
  /**
   * スキル上達余地の推定
   */
  private estimateSkillCeiling(script: GameScript): number {
    // ルールの複雑度から推定
    return Math.min(script.rules.length / 10, 1.0);
  }
  
  /**
   * 複雑度の計算
   */
  private calculateComplexity(script: GameScript): number {
    return Math.min(script.rules.length / 8, 1.0);
  }
  
  /**
   * リプレイ性の推定
   */
  private estimateReplayability(script: GameScript): number {
    // ランダム性やバリエーションから推定
    const hasRandom = script.rules.some(rule =>
      rule.actions.some(action => action.type === 'randomAction')
    );
    
    return hasRandom ? 0.7 : 0.4;
  }
  
  /**
   * アクセシビリティの推定
   */
  private estimateAccessibility(script: GameScript): number {
    // シンプルなゲームほど高い
    return 1.0 - Math.min(script.rules.length / 15, 1.0);
  }
  
  /**
   * 学習曲線の推定
   */
  private estimateLearningCurve(script: GameScript): number {
    // ルール数から推定（多いほど急）
    return Math.min(script.rules.length / 10, 1.0);
  }
  
  /**
   * ペースの計算
   */
  private calculatePace(script: GameScript): number {
    // time条件の数から推定
    const timeConditions = script.rules.filter(rule =>
      rule.triggers.conditions.some(c => c.type === 'time')
    ).length;
    
    return Math.min(timeConditions / 3, 1.0);
  }
  
  /**
   * 緊張感の計算
   */
  private calculateTension(script: GameScript): number {
    // 失敗条件の数から推定
    const failConditions = script.rules.filter(rule =>
      rule.actions.some(action => action.type === 'failure')
    ).length;
    
    return Math.min(failConditions / 3, 1.0);
  }
  
  /**
   * 色彩強度の分析
   */
  private analyzeColorIntensity(assets: any): number {
    // TODO: Base64画像から色彩分析
    // 仮実装
    return 0.5;
  }
  
  /**
   * 視覚的複雑度の計算
   */
  private calculateVisualComplexity(assets: any): number {
    // オブジェクト数から推定
    const objectCount = assets.objects?.length || 0;
    return Math.min(objectCount / 10, 1.0);
  }
  
  /**
   * 明るさの分析
   */
  private analyzeBrightness(assets: any): number {
    // TODO: 画像分析
    return 0.5;
  }
  
  /**
   * コントラストの分析
   */
  private analyzeContrast(assets: any): number {
    // TODO: 画像分析
    return 0.5;
  }
  
  /**
   * 彩度の分析
   */
  private analyzeSaturation(assets: any): number {
    // TODO: 画像分析
    return 0.5;
  }
  
  /**
   * オブジェクト密度の計算
   */
  private calculateObjectDensity(assets: any): number {
    const objectCount = assets.objects?.length || 0;
    return Math.min(objectCount / 15, 1.0);
  }
  
  /**
   * アニメーション量の計算
   */
  private calculateAnimationAmount(assets: any): number {
    // フレーム数から推定
    const hasAnimation = assets.objects?.some((obj: any) => 
      obj.frames?.length > 1
    );
    
    return hasAnimation ? 0.7 : 0.3;
  }
  
  /**
   * エフェクト強度の計算
   */
  private calculateEffectIntensity(script: GameScript): number {
    // effect系のアクションから推定
    const effectActions = script.rules.filter(rule =>
      rule.actions.some(action => action.type === 'effect')
    ).length;
    
    return Math.min(effectActions / 5, 1.0);
  }
  
  /**
   * アートスタイルのエンコード
   */
  private encodeArtStyle(assets: any): number {
    // TODO: 画像からスタイル推定
    return Math.random(); // 仮実装
  }
  
  /**
   * 対称性の分析
   */
  private analyzeSymmetry(assets: any): number {
    // TODO: 画像分析
    return 0.5;
  }
  
  /**
   * 条件多様性の計算
   */
  private calculateConditionDiversity(script: GameScript): number {
    const conditionTypes = new Set<string>();
    script.rules.forEach(rule => {
      rule.triggers.conditions.forEach(c => conditionTypes.add(c.type));
    });
    return Math.min(conditionTypes.size / 9, 1.0); // 9種類の条件タイプ
  }
  
  /**
   * アクション多様性の計算
   */
  private calculateActionDiversity(script: GameScript): number {
    const actionTypes = new Set<string>();
    script.rules.forEach(rule => {
      rule.actions.forEach(action => actionTypes.add(action.type));
    });
    return Math.min(actionTypes.size / 13, 1.0); // 13種類のアクションタイプ
  }
  
  /**
   * 条件複雑度の計算
   */
  private calculateConditionComplexity(script: GameScript): number {
    // 複合条件の数から推定
    // TODO: 完全実装
    return Math.min(script.rules.length / 10, 1.0);
  }
  
  /**
   * アクション複雑度の計算
   */
  private calculateActionComplexity(script: GameScript): number {
    // 複合アクションの数から推定
    return Math.min(script.rules.length / 10, 1.0);
  }
  
  /**
   * ルール間相互作用の計算
   */
  private calculateRuleInteraction(script: GameScript): number {
    // 変数を共有するルールの数から推定
    return Math.min(script.rules.length / 15, 1.0);
  }
  
  /**
   * ランダム性の計算
   */
  private calculateRandomness(script: GameScript): number {
    const hasRandom = script.rules.some(rule =>
      rule.actions.some(action => action.type === 'randomAction')
    );
    
    return hasRandom ? 0.7 : 0.1;
  }
  
  /**
   * 決定論性の計算
   */
  private calculateDeterminism(script: GameScript): number {
    return 1.0 - this.calculateRandomness(script);
  }
  
  /**
   * フィードバックループの検出
   */
  private detectFeedbackLoop(script: GameScript): number {
    // スコア変更が連鎖するルールを検出
    const scoreActions = script.rules.filter(rule =>
      rule.actions.some(action => action.type === 'counter')
    ).length;
    
    return Math.min(scoreActions / 5, 1.0);
  }
  
  /**
   * 創発的複雑性の推定
   */
  private estimateEmergentComplexity(script: GameScript): number {
    // ルール数と相互作用から推定
    const ruleCount = script.rules.length;
    const interaction = this.calculateRuleInteraction(script);
    
    return Math.min((ruleCount * interaction) / 10, 1.0);
  }
  
  /**
   * インタラクションタイプ判定
   */
  private isTouchBased(script: GameScript): boolean {
    return script.rules.some(rule => 
      rule.triggers.conditions.some(c => c.type === 'touch')
    );
  }
  
  private isTimingBased(script: GameScript): boolean {
    return script.rules.some(rule => 
      rule.triggers.conditions.some(c => c.type === 'time')
    );
  }
  
  private isMemoryBased(script: GameScript): boolean {
    // TODO: メモリ要素の検出
    return false;
  }
  
  private isReflexBased(script: GameScript): boolean {
    // タイマーとタッチの組み合わせで判定
    const hasTimer = script.rules.some(rule => 
      rule.triggers.conditions.some(c => c.type === 'time')
    );
    const hasTouch = script.rules.some(rule => 
      rule.triggers.conditions.some(c => c.type === 'touch')
    );
    return hasTimer && hasTouch;
  }
  
  private isStrategyBased(script: GameScript): boolean {
    // TODO: 戦略要素の検出
    return script.rules.length > 5;
  }
  
  private isPrecisionBased(script: GameScript): boolean {
    // タッチ条件の多さから判定
    const touchCount = script.rules.filter(rule => 
      rule.triggers.conditions.some(c => c.type === 'touch')
    ).length;
    return touchCount > 3;
  }
  
  private isRhythmBased(script: GameScript): boolean {
    // TODO: リズム要素の検出
    return false;
  }
  
  private isSpatialBased(script: GameScript): boolean {
    // 位置条件の存在から判定
    return script.rules.some(rule => 
      rule.triggers.conditions.some(c => c.type === 'position' || c.type === 'collision')
    );
  }
  
  private isPatternBased(script: GameScript): boolean {
    // TODO: パターン要素の検出
    return false;
  }
  
  private isReactionBased(script: GameScript): boolean {
    return this.isReflexBased(script);
  }
  
  // ==========================================
  // Private: ユーティリティ関数
  // ==========================================
  
  /**
   * ベクトル間距離の計算（ユークリッド距離）
   */
  private calculateVectorDistance(v1: GameVector, v2: GameVector): number {
    let sumSquares = 0;
    
    // ゲームプレイ特性
    for (const key in v1.gameplay) {
      const diff = v1.gameplay[key as keyof typeof v1.gameplay] - 
                   v2.gameplay[key as keyof typeof v2.gameplay];
      sumSquares += diff * diff;
    }
    
    // ビジュアル特性
    for (const key in v1.visual) {
      const diff = v1.visual[key as keyof typeof v1.visual] - 
                   v2.visual[key as keyof typeof v2.visual];
      sumSquares += diff * diff;
    }
    
    // ルール特性
    for (const key in v1.rules) {
      const diff = v1.rules[key as keyof typeof v1.rules] - 
                   v2.rules[key as keyof typeof v2.rules];
      sumSquares += diff * diff;
    }
    
    // インタラクション特性
    for (const key in v1.interaction) {
      const diff = v1.interaction[key as keyof typeof v1.interaction] - 
                   v2.interaction[key as keyof typeof v2.interaction];
      sumSquares += diff * diff;
    }
    
    return Math.sqrt(sumSquares);
  }
  
  /**
   * 部分ベクトルから完全なベクトルを構築
   */
  private constructFullVector(partial: Partial<GameVector>): GameVector {
    const defaultVector: GameVector = {
      gameplay: {
        playTime: 0.5,
        interactionFrequency: 0.5,
        difficulty: 0.5,
        skillCeiling: 0.5,
        complexity: 0.5,
        replayability: 0.5,
        accessibility: 0.5,
        learningCurve: 0.5,
        pace: 0.5,
        tension: 0.5
      },
      visual: {
        colorIntensity: 0.5,
        visualComplexity: 0.5,
        brightness: 0.5,
        contrast: 0.5,
        saturation: 0.5,
        objectDensity: 0.5,
        animationAmount: 0.5,
        effectIntensity: 0.5,
        artStyleIndex: 0.5,
        symmetry: 0.5
      },
      rules: {
        ruleCount: 0.5,
        conditionDiversity: 0.5,
        actionDiversity: 0.5,
        conditionComplexity: 0.5,
        actionComplexity: 0.5,
        ruleInteraction: 0.5,
        randomness: 0.5,
        determinism: 0.5,
        feedbackLoop: 0.5,
        emergentComplexity: 0.5
      },
      interaction: {
        touchBased: 0,
        timingBased: 0,
        memoryBased: 0,
        reflexBased: 0,
        strategyBased: 0,
        precisionBased: 0,
        rhythmBased: 0,
        spatialBased: 0,
        patternBased: 0,
        reactionBased: 0
      }
    };
    
    return { ...defaultVector, ...partial };
  }
  
  /**
   * GameProjectかどうかの判定
   */
  private isGameProject(game: GameProject | GameVector): game is GameProject {
    return (game as GameProject).script !== undefined;
  }
  
  /**
   * ポートフォリオ全体の多様性計算
   */
  private calculatePortfolioDiversity(games: GeneratedGame[]): number {
    if (games.length < 2) {
      return 1.0;
    }
    
    // 全ゲーム間の平均距離
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < games.length; i++) {
      for (let j = i + 1; j < games.length; j++) {
        totalDistance += this.calculateVectorDistance(
          games[i].vector,
          games[j].vector
        );
        pairCount++;
      }
    }
    
    const averageDistance = totalDistance / pairCount;
    
    // 正規化（0-10の距離を0-1のスコアに）
    return Math.min(averageDistance / 10, 1.0);
  }
  
  /**
   * ジャンルカバレッジの分析
   */
  private analyzeGenreCoverage(games: GeneratedGame[]): Record<string, number> {
    const coverage: Record<string, number> = {};
    
    games.forEach(game => {
      const genre = game.metadata.spec.concept.genre;
      coverage[genre] = (coverage[genre] || 0) + 1;
    });
    
    return coverage;
  }
  
  /**
   * メカニクスカバレッジの分析
   */
  private analyzeMechanicCoverage(games: GeneratedGame[]): Record<string, number> {
    const coverage: Record<string, number> = {};
    
    games.forEach(game => {
      const mechanic = game.metadata.spec.concept.mechanic;
      coverage[mechanic] = (coverage[mechanic] || 0) + 1;
    });
    
    return coverage;
  }
  
  /**
   * 探索方向の生成（初期段階用）
   */
  private generateExplorationDirections(): GapArea[] {
    return [
      {
        description: 'Simple action games',
        vector: {},
        priority: 1.0,
        estimatedDiversity: 0.8
      },
      {
        description: 'Complex puzzle games',
        vector: {},
        priority: 0.9,
        estimatedDiversity: 0.7
      },
      {
        description: 'Reflex-based timing games',
        vector: {},
        priority: 0.8,
        estimatedDiversity: 0.6
      }
    ];
  }
  
  /**
   * バランスチェック
   */
  private checkBalance(portfolio: GamePortfolio): boolean {
    // ジャンル・メカニクス分布が偏っていないか
    const genreDist = Object.values(portfolio.statistics.genreDistribution);
    const maxCount = Math.max(...genreDist);
    const minCount = Math.min(...genreDist.filter(c => c > 0));
    
    // 最大と最小の差が3倍以内ならバランス良好
    return maxCount <= minCount * 3;
  }
  
  /**
   * カバレッジチェック
   */
  private checkCoverage(portfolio: GamePortfolio): boolean {
    // 最低5つのジャンル、5つのメカニクスをカバー
    const genreCount = Object.keys(portfolio.statistics.genreDistribution).length;
    const mechanicCount = Object.keys(portfolio.statistics.mechanicDistribution).length;
    
    return genreCount >= 5 && mechanicCount >= 5;
  }
  
  /**
   * 探索が必要な領域の特定
   */
  private identifyExplorationNeeds(portfolio: GamePortfolio): string[] {
    const needs: string[] = [];
    
    // ジャンルカバレッジチェック
    const allGenres: GameGenre[] = [
      'action', 'puzzle', 'timing', 'reflex', 'memory',
      'collection', 'avoidance', 'shooter', 'endless', 'rhythm'
    ];
    
    allGenres.forEach(genre => {
      if (!portfolio.statistics.genreDistribution[genre] || 
          portfolio.statistics.genreDistribution[genre] < 2) {
        needs.push(`More ${genre} games needed`);
      }
    });
    
    return needs;
  }
}