/**
 * ImprovedQualityChecker
 *
 * 改善された品質評価システム
 * - 技術的品質評価
 * - 面白さ評価（FunEvaluator統合）
 * - 多様性評価
 */

import { GameProject } from '../../types/editor/GameProject';
import { GameScript } from '../../types/editor/GameScript';
import { GameIdea } from '../generators/GameIdeaGenerator';
import { FunEvaluator, FunEvaluationResult } from './FunEvaluator';

// 総合評価結果
export interface QualityCheckResult {
  passed: boolean;
  totalScore: number;         // 0-100
  technicalScore: number;     // 0-35
  funScore: number;           // 0-50
  diversityScore: number;     // 0-15
  breakdown: {
    technical: TechnicalBreakdown;
    fun: FunEvaluationResult['breakdown'];
    diversity: DiversityBreakdown;
  };
  issues: string[];
  recommendations: string[];
}

// 技術評価内訳
interface TechnicalBreakdown {
  structureIntegrity: number;   // 構造整合性（0-10）
  assetValidity: number;        // アセット妥当性（0-10）
  ruleLogic: number;            // ルールロジック（0-10）
  engineCompatibility: number;  // エンジン互換性（0-5）
}

// 多様性内訳
interface DiversityBreakdown {
  mechanicUniqueness: number;   // メカニクス独自性（0-5）
  themeVariety: number;         // テーマ多様性（0-5）
  visualDistinctness: number;   // ビジュアル独自性（0-5）
}

/**
 * ImprovedQualityChecker
 */
export class ImprovedQualityChecker {
  private funEvaluator: FunEvaluator;
  private seenMechanics: Set<string> = new Set();
  private seenThemes: Set<string> = new Set();

  constructor() {
    this.funEvaluator = new FunEvaluator();
    console.log('✅ ImprovedQualityChecker initialized');
  }

  /**
   * 完全な品質チェック
   */
  check(
    project: GameProject,
    idea?: GameIdea,
    existingGames?: GameProject[]
  ): QualityCheckResult {
    console.log(`  🔍 Quality check for: ${project.settings?.name || 'Unnamed'}`);

    // 1. 技術評価（0-35点）
    const technical = this.evaluateTechnical(project);
    const technicalScore = this.sumBreakdown(technical, 35);

    // 2. 面白さ評価（0-50点）
    const funResult = this.funEvaluator.evaluate(project, idea);
    const funScore = funResult.funScore / 2; // 100点満点を50点に変換

    // 3. 多様性評価（0-15点）
    const diversity = this.evaluateDiversity(project, idea, existingGames);
    const diversityScore = this.sumBreakdown(diversity, 15);

    const totalScore = technicalScore + funScore + diversityScore;
    const passed = totalScore >= 60 && technicalScore >= 20 && funScore >= 25;

    // 問題点と推奨事項の収集
    const issues = [
      ...this.getTechnicalIssues(technical),
      ...funResult.issues
    ];

    const recommendations = [
      ...this.getTechnicalRecommendations(technical),
      ...funResult.recommendations
    ];

    console.log(`     Total: ${totalScore.toFixed(1)}/100 (Tech: ${technicalScore.toFixed(1)}, Fun: ${funScore.toFixed(1)}, Div: ${diversityScore.toFixed(1)})`);

    return {
      passed,
      totalScore,
      technicalScore,
      funScore,
      diversityScore,
      breakdown: {
        technical,
        fun: funResult.breakdown,
        diversity
      },
      issues,
      recommendations
    };
  }

  /**
   * 技術評価
   */
  private evaluateTechnical(project: GameProject): TechnicalBreakdown {
    return {
      structureIntegrity: this.evaluateStructure(project),
      assetValidity: this.evaluateAssets(project),
      ruleLogic: this.evaluateRuleLogic(project.script),
      engineCompatibility: this.evaluateEngineCompatibility(project.script)
    };
  }

  /**
   * 構造整合性評価（0-10点）
   */
  private evaluateStructure(project: GameProject): number {
    let score = 10;

    // 必須フィールドチェック
    if (!project.settings) score -= 2;
    if (!project.script) score -= 3;
    if (!project.assets) score -= 2;

    // スクリプト構造チェック
    if (project.script) {
      if (!project.script.rules || project.script.rules.length === 0) {
        score -= 3;
      }
      if (!project.script.layout) score -= 1;
    }

    return Math.max(0, score);
  }

  /**
   * アセット妥当性評価（0-10点）
   */
  private evaluateAssets(project: GameProject): number {
    let score = 10;

    if (!project.assets) return 0;

    // オブジェクト存在チェック
    if (!project.assets.objects || project.assets.objects.length === 0) {
      score -= 4;
    }

    // オブジェクトのデータ妥当性
    if (project.assets.objects) {
      project.assets.objects.forEach(obj => {
        if (!obj.frames || obj.frames.length === 0) {
          score -= 1;
        }
      });
    }

    // レイアウトとアセットの整合性
    if (project.script?.layout?.objects) {
      const assetIds = new Set(project.assets.objects?.map(o => o.id) || []);
      project.script.layout.objects.forEach(layoutObj => {
        if (!assetIds.has(layoutObj.objectId)) {
          score -= 1;
        }
      });
    }

    return Math.max(0, score);
  }

  /**
   * ルールロジック評価（0-10点）
   */
  private evaluateRuleLogic(script: GameScript): number {
    let score = 10;

    if (!script || !script.rules) return 0;

    // 成功条件の存在
    const hasSuccess = script.rules.some(rule =>
      rule.actions?.some(a => a.type === 'success')
    );
    if (!hasSuccess) {
      score -= 4; // クリア不可能
    }

    // ルール数の妥当性
    const ruleCount = script.rules.length;
    if (ruleCount === 0) {
      score -= 4;
    } else if (ruleCount > 20) {
      score -= 2; // 複雑すぎ
    }

    // 条件-アクションの整合性
    script.rules.forEach(rule => {
      if (!rule.triggers?.conditions || rule.triggers.conditions.length === 0) {
        score -= 0.5; // 条件なしルール
      }
      if (!rule.actions || rule.actions.length === 0) {
        score -= 0.5; // アクションなしルール
      }
    });

    // カウンター条件とカウンターアクションの整合性
    const hasCounterCondition = script.rules.some(rule =>
      rule.triggers?.conditions?.some(c => c.type === 'counter')
    );
    const hasCounterAction = script.rules.some(rule =>
      rule.actions?.some(a => a.type === 'counter')
    );
    if (hasCounterCondition && !hasCounterAction) {
      score -= 2; // カウンター条件があるのに変更手段がない
    }

    return Math.max(0, score);
  }

  /**
   * エンジン互換性評価（0-5点）
   */
  private evaluateEngineCompatibility(script: GameScript): number {
    let score = 5;

    if (!script || !script.rules) return 0;

    // 検証済み条件タイプのみ使用しているか
    const validConditionTypes = new Set([
      'touch', 'time', 'counter', 'collision', 'flag', 'gameState', 'random', 'position', 'animation'
    ]);

    // 検証済みアクションタイプのみ使用しているか
    const validActionTypes = new Set([
      'success', 'failure', 'hide', 'show', 'move', 'counter', 'addScore',
      'effect', 'playSound', 'setFlag', 'toggleFlag', 'switchAnimation', 'randomAction'
    ]);

    script.rules.forEach(rule => {
      rule.triggers?.conditions?.forEach(c => {
        if (!validConditionTypes.has(c.type)) {
          score -= 1;
        }
      });
      rule.actions?.forEach(a => {
        if (!validActionTypes.has(a.type)) {
          score -= 1;
        }
      });
    });

    // 座標範囲チェック
    if (script.layout?.objects) {
      script.layout.objects.forEach(obj => {
        if (obj.position) {
          if (obj.position.x < 0 || obj.position.x > 1 ||
              obj.position.y < 0 || obj.position.y > 1) {
            score -= 0.5;
          }
        }
      });
    }

    return Math.max(0, score);
  }

  /**
   * 多様性評価
   */
  private evaluateDiversity(
    project: GameProject,
    idea?: GameIdea,
    existingGames?: GameProject[]
  ): DiversityBreakdown {
    const mechanic = this.extractMainMechanic(project.script);
    const theme = idea?.theme || project.settings?.publishing?.category || 'unknown';

    // メカニクス独自性（0-5点）
    let mechanicUniqueness = 5;
    if (this.seenMechanics.has(mechanic)) {
      mechanicUniqueness = 2; // 既出のメカニクス
    }
    this.seenMechanics.add(mechanic);

    // テーマ多様性（0-5点）
    let themeVariety = 5;
    if (this.seenThemes.has(theme)) {
      themeVariety = 2;
    }
    this.seenThemes.add(theme);

    // ビジュアル独自性（簡易評価）
    let visualDistinctness = 3; // ベーススコア
    const objectCount = project.assets?.objects?.length || 0;
    if (objectCount >= 3) {
      visualDistinctness += 2;
    }

    return {
      mechanicUniqueness,
      themeVariety,
      visualDistinctness
    };
  }

  /**
   * メインメカニクスの抽出
   */
  private extractMainMechanic(script: GameScript): string {
    if (!script || !script.rules) return 'unknown';

    // 条件タイプの頻度をカウント
    const conditionCounts: Record<string, number> = {};
    script.rules.forEach(rule => {
      rule.triggers?.conditions?.forEach(c => {
        conditionCounts[c.type] = (conditionCounts[c.type] || 0) + 1;
      });
    });

    // 最も多い条件タイプをメインメカニクスとする
    let maxType = 'touch';
    let maxCount = 0;
    for (const [type, count] of Object.entries(conditionCounts)) {
      if (count > maxCount) {
        maxType = type;
        maxCount = count;
      }
    }

    // アクションタイプも考慮
    const hasMove = script.rules.some(r => r.actions?.some(a => a.type === 'move'));
    const hasCollision = script.rules.some(r =>
      r.triggers?.conditions?.some(c => c.type === 'collision')
    );

    if (hasMove && hasCollision) return 'catch';
    if (hasMove) return 'tap-moving';
    return `tap-${maxType}`;
  }

  /**
   * 内訳の合計
   */
  private sumBreakdown(breakdown: Record<string, number>, max: number): number {
    const sum = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return Math.min(max, sum);
  }

  /**
   * 技術的問題の取得
   */
  private getTechnicalIssues(technical: TechnicalBreakdown): string[] {
    const issues: string[] = [];

    if (technical.structureIntegrity < 7) {
      issues.push('Missing required project structure');
    }
    if (technical.assetValidity < 7) {
      issues.push('Invalid or missing assets');
    }
    if (technical.ruleLogic < 7) {
      issues.push('Logic issues in game rules');
    }
    if (technical.engineCompatibility < 3) {
      issues.push('Engine compatibility issues');
    }

    return issues;
  }

  /**
   * 技術的推奨事項の取得
   */
  private getTechnicalRecommendations(technical: TechnicalBreakdown): string[] {
    const recs: string[] = [];

    if (technical.structureIntegrity < 10) {
      recs.push('Ensure all required fields are present');
    }
    if (technical.assetValidity < 10) {
      recs.push('Verify asset references match layout');
    }
    if (technical.ruleLogic < 10) {
      recs.push('Add success condition and verify counter logic');
    }

    return recs;
  }

  /**
   * 多様性キャッシュのリセット
   */
  resetDiversityCache(): void {
    this.seenMechanics.clear();
    this.seenThemes.clear();
  }

  /**
   * 簡易チェック（合格/不合格のみ）
   */
  quickCheck(project: GameProject): boolean {
    const result = this.check(project);
    return result.passed;
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      seenMechanics: Array.from(this.seenMechanics),
      seenThemes: Array.from(this.seenThemes),
      passThreshold: 60,
      scoring: {
        technical: '0-35 points',
        fun: '0-50 points',
        diversity: '0-15 points'
      }
    };
  }
}

// デフォルトエクスポート
export default ImprovedQualityChecker;
