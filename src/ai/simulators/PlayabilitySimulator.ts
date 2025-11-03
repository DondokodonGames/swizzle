/**
 * PlayabilitySimulator
 * プレイアビリティ検証システム
 * 
 * 機能:
 * - ゲームロジックのシミュレーション
 * - クリア可能性の検証
 * - 難易度の推定
 * - バグの検出
 * - プレイアビリティ問題の特定
 */

import { GameProject } from '../../types/editor/GameProject';
import { GameScript, GameRule, TriggerCondition, GameAction } from '../../types/editor/GameScript';

/**
 * シミュレーション結果
 */
interface SimulationResult {
  clearable: boolean;               // クリア可能か
  averageSteps: number;             // 平均ステップ数
  minSteps: number;                 // 最小ステップ数
  maxSteps: number;                 // 最大ステップ数
  successRate: number;              // 成功率（0-1）
  estimatedDifficulty: number;      // 推定難易度（0-1）
  issues: string[];                 // 検出された問題
  bugs: string[];                   // 検出されたバグ
}

/**
 * ゲーム状態
 */
interface GameState {
  score: number;
  timer: number;
  counters: Record<string, number>;
  objectStates: Record<string, any>;
  gameOver: boolean;
  won: boolean;
  step: number;
}

/**
 * シミュレーション設定
 */
interface SimulationConfig {
  maxSteps: number;                 // 最大ステップ数
  numTrials: number;                // 試行回数
  randomSeed?: number;              // ランダムシード
}

/**
 * PlayabilitySimulator
 * ゲームの実行可能性とクリア可能性を検証
 */
export class PlayabilitySimulator {
  
  /**
   * ゲームのプレイアビリティを検証
   */
  async verifyPlayability(
    project: GameProject,
    config: SimulationConfig = {
      maxSteps: 1000,
      numTrials: 10
    }
  ): Promise<SimulationResult> {
    
    console.log('  🎮 Simulating gameplay...');
    
    const results: SimulationResult[] = [];
    
    // 複数回試行
    for (let i = 0; i < config.numTrials; i++) {
      const result = await this.simulateSingleGame(project, config);
      results.push(result);
    }
    
    // 結果を集計
    const aggregated = this.aggregateResults(results);
    
    console.log(`     ✓ Clearable: ${aggregated.clearable ? 'Yes' : 'No'}`);
    console.log(`     ✓ Success rate: ${(aggregated.successRate * 100).toFixed(0)}%`);
    console.log(`     ✓ Estimated difficulty: ${(aggregated.estimatedDifficulty * 100).toFixed(0)}%`);
    
    if (aggregated.issues.length > 0) {
      console.log(`     ⚠️  Issues found: ${aggregated.issues.length}`);
    }
    
    return aggregated;
  }
  
  /**
   * 単一ゲームのシミュレーション
   */
  private async simulateSingleGame(
    project: GameProject,
    config: SimulationConfig
  ): Promise<SimulationResult> {
    
    const issues: string[] = [];
    const bugs: string[] = [];
    
    // 初期状態
    const state: GameState = {
      score: 0,
      timer: 0,
      counters: {},
      objectStates: {},
      gameOver: false,
      won: false,
      step: 0
    };
    
    // シミュレーションループ
    while (!state.gameOver && !state.won && state.step < config.maxSteps) {
      state.step++;
      state.timer++;
      
      // ルールを評価
      const triggeredRules = this.evaluateRules(project.script, state);
      
      // トリガーされたルールを実行
      for (const rule of triggeredRules) {
        this.executeRule(rule, state, issues, bugs);
        
        // 勝利またはゲームオーバーチェック
        if (state.won || state.gameOver) {
          break;
        }
      }
      
      // ランダムアクション（タッチなど）をシミュレート
      if (Math.random() < 0.1) { // 10%の確率でアクション
        this.simulateRandomAction(project.script, state);
      }
    }
    
    // 無限ループチェック
    if (state.step >= config.maxSteps && !state.won && !state.gameOver) {
      issues.push('Possible infinite loop - game did not end');
      bugs.push('Game runs indefinitely without win/lose condition');
    }
    
    return {
      clearable: state.won,
      averageSteps: state.step,
      minSteps: state.step,
      maxSteps: state.step,
      successRate: state.won ? 1 : 0,
      estimatedDifficulty: this.estimateDifficultyFromSteps(state.step),
      issues,
      bugs
    };
  }
  
  /**
   * ルールの評価
   */
  private evaluateRules(script: GameScript, state: GameState): GameRule[] {
    const triggered: GameRule[] = [];
    
    for (const rule of script.rules) {
      // triggers.operator に基づいて条件を評価
      const conditionsMet = rule.triggers.operator === 'AND'
        ? rule.triggers.conditions.every(c => this.checkCondition(c, state))
        : rule.triggers.conditions.some(c => this.checkCondition(c, state));
      
      if (conditionsMet) {
        triggered.push(rule);
      }
    }
    
    return triggered;
  }
  
  /**
   * 条件のチェック
   */
  private checkCondition(condition: TriggerCondition, state: GameState): boolean {
    switch (condition.type) {
      case 'gameState':
        // ゲーム状態条件
        if (condition.state === 'playing') {
          return !state.gameOver && !state.won;
        } else if (condition.state === 'success') {
          return state.won;
        } else if (condition.state === 'failure') {
          return state.gameOver;
        }
        return false;
      
      case 'time':
        // タイマー条件
        if (condition.timeType === 'exact' && condition.seconds !== undefined) {
          return state.timer >= condition.seconds;
        } else if (condition.timeType === 'range' && condition.range) {
          return state.timer >= condition.range.min && state.timer <= condition.range.max;
        } else if (condition.timeType === 'interval' && condition.interval) {
          return state.timer % condition.interval === 0;
        }
        return false;
      
      case 'counter':
        // カウンター条件
        const counterValue = state.counters[condition.counterName] || 0;
        const targetValue = condition.value;
        
        switch (condition.comparison) {
          case 'equals':
            return counterValue === targetValue;
          case 'notEquals':
            return counterValue !== targetValue;
          case 'greater':
            return counterValue > targetValue;
          case 'greaterOrEqual':
            return counterValue >= targetValue;
          case 'less':
            return counterValue < targetValue;
          case 'lessOrEqual':
            return counterValue <= targetValue;
          case 'between':
            return condition.rangeMax !== undefined && 
                   counterValue >= targetValue && 
                   counterValue <= condition.rangeMax;
          case 'notBetween':
            return condition.rangeMax !== undefined && 
                   (counterValue < targetValue || counterValue > condition.rangeMax);
          default:
            return false;
        }
      
      case 'touch':
        // タッチ条件（ランダムシミュレーション）
        return Math.random() < 0.05; // 5%の確率
      
      case 'collision':
        // 衝突条件（簡易実装）
        return Math.random() < 0.1; // 10%の確率
      
      case 'position':
        // 位置条件（簡易実装）
        const objectId = condition.target;
        const objState = state.objectStates[objectId];
        if (!objState) return false;
        
        if (condition.region.shape === 'rect') {
          const inRect = objState.x >= condition.region.x && 
                        objState.x <= (condition.region.x + (condition.region.width || 0)) &&
                        objState.y >= condition.region.y && 
                        objState.y <= (condition.region.y + (condition.region.height || 0));
          return condition.area === 'inside' ? inRect : !inRect;
        }
        return false;
      
      case 'flag':
        // フラグ条件（簡易実装）
        return Math.random() < 0.5;
      
      case 'animation':
        // アニメーション条件（簡易実装）
        return Math.random() < 0.3;
      
      case 'random':
        // ランダム条件
        return Math.random() < condition.probability;
      
      default:
        return false;
    }
  }
  
  /**
   * ルールの実行
   */
  private executeRule(
    rule: GameRule,
    state: GameState,
    issues: string[],
    bugs: string[]
  ): void {
    
    for (const action of rule.actions) {
      try {
        this.executeAction(action, state, issues, bugs);
        
        // 勝利またはゲームオーバーチェック
        if (state.won || state.gameOver) {
          break;
        }
      } catch (error) {
        bugs.push(`Error executing action ${action.type}: ${error}`);
      }
    }
  }
  
  /**
   * アクションの実行
   */
  private executeAction(
    action: GameAction,
    state: GameState,
    issues: string[],
    bugs: string[]
  ): void {
    
    switch (action.type) {
      case 'success':
        state.won = true;
        if (action.score !== undefined) {
          state.score += action.score;
        }
        break;
      
      case 'failure':
        state.gameOver = true;
        break;
      
      case 'counter':
        // カウンター操作
        const counterName = action.counterName;
        const currentValue = state.counters[counterName] || 0;
        
        switch (action.operation) {
          case 'increment':
            state.counters[counterName] = currentValue + 1;
            break;
          case 'decrement':
            state.counters[counterName] = currentValue - 1;
            break;
          case 'set':
            state.counters[counterName] = action.value || 0;
            break;
          case 'reset':
            state.counters[counterName] = 0;
            break;
          case 'add':
            state.counters[counterName] = currentValue + (action.value || 0);
            break;
          case 'subtract':
            state.counters[counterName] = currentValue - (action.value || 0);
            break;
          case 'multiply':
            state.counters[counterName] = currentValue * (action.value || 1);
            break;
          case 'divide':
            state.counters[counterName] = currentValue / (action.value || 1);
            break;
        }
        break;
      
      case 'setFlag':
        // フラグ設定（簡易実装）
        break;
      
      case 'toggleFlag':
        // フラグトグル（簡易実装）
        break;
      
      case 'move':
        // 移動アクション（状態更新）
        const moveObjectId = action.targetId;
        if (!state.objectStates[moveObjectId]) {
          state.objectStates[moveObjectId] = { x: 0, y: 0 };
        }
        
        // 移動パターンに基づいて位置更新（簡易実装）
        if (action.movement.type === 'straight' && action.movement.target) {
          if (typeof action.movement.target !== 'string') {
            state.objectStates[moveObjectId].x = action.movement.target.x;
            state.objectStates[moveObjectId].y = action.movement.target.y;
          }
        }
        break;
      
      case 'randomAction':
        // ランダムアクション（選択肢からランダム実行）
        if (action.actions.length > 0) {
          const weights = action.weights || action.actions.map(() => 1);
          const totalWeight = weights.reduce((sum, w) => sum + w, 0);
          let random = Math.random() * totalWeight;
          
          for (let i = 0; i < action.actions.length; i++) {
            random -= weights[i];
            if (random <= 0) {
              this.executeAction(action.actions[i].action, state, issues, bugs);
              break;
            }
          }
        }
        break;
      
      case 'show':
      case 'hide':
      case 'switchAnimation':
      case 'effect':
      case 'playSound':
      case 'stopSound':
      case 'playBGM':
      case 'stopBGM':
      case 'pause':
      case 'restart':
      case 'addScore':
      case 'showMessage':
        // その他のアクション（シミュレーションでは無視）
        break;
      
      default:
        bugs.push(`Unknown action type: ${(action as any).type}`);
        break;
    }
  }
  
  /**
   * ランダムアクションのシミュレート
   */
  private simulateRandomAction(script: GameScript, state: GameState): void {
    // タッチベースのルールをランダムにトリガー
    const touchRules = script.rules.filter(rule => 
      rule.triggers.conditions.some(c => c.type === 'touch')
    );
    
    if (touchRules.length > 0) {
      const randomRule = touchRules[Math.floor(Math.random() * touchRules.length)];
      this.executeRule(randomRule, state, [], []);
    }
  }
  
  /**
   * ステップ数から難易度を推定
   */
  private estimateDifficultyFromSteps(steps: number): number {
    // ステップ数が多い = 難しい
    // 10ステップ = 簡単（0.1）
    // 100ステップ = 普通（0.5）
    // 500ステップ = 難しい（0.9）
    
    if (steps < 10) {
      return 0.1;
    } else if (steps < 50) {
      return 0.3;
    } else if (steps < 100) {
      return 0.5;
    } else if (steps < 200) {
      return 0.7;
    } else {
      return 0.9;
    }
  }
  
  /**
   * 結果の集計
   */
  private aggregateResults(results: SimulationResult[]): SimulationResult {
    const clearable = results.some(r => r.clearable);
    const successRate = results.filter(r => r.clearable).length / results.length;
    
    const allSteps = results.map(r => r.averageSteps);
    const averageSteps = allSteps.reduce((sum, s) => sum + s, 0) / allSteps.length;
    const minSteps = Math.min(...allSteps);
    const maxSteps = Math.max(...allSteps);
    
    const allDifficulties = results.map(r => r.estimatedDifficulty);
    const avgDifficulty = allDifficulties.reduce((sum, d) => sum + d, 0) / allDifficulties.length;
    
    // 全試行の問題とバグを集約
    const allIssues = new Set<string>();
    const allBugs = new Set<string>();
    
    results.forEach(r => {
      r.issues.forEach(issue => allIssues.add(issue));
      r.bugs.forEach(bug => allBugs.add(bug));
    });
    
    return {
      clearable,
      averageSteps,
      minSteps,
      maxSteps,
      successRate,
      estimatedDifficulty: avgDifficulty,
      issues: Array.from(allIssues),
      bugs: Array.from(allBugs)
    };
  }
  
  /**
   * クリア可能性の詳細分析
   */
  analyzeClearability(project: GameProject): {
    hasWinCondition: boolean;
    winConditionReachable: boolean;
    hasRequiredActions: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // 勝利条件の存在確認
    const winRules = project.script.rules.filter(rule => 
      rule.actions.some(action => action.type === 'success')
    );
    
    const hasWinCondition = winRules.length > 0;
    
    if (!hasWinCondition) {
      issues.push('No win condition defined');
      return {
        hasWinCondition: false,
        winConditionReachable: false,
        hasRequiredActions: false,
        issues
      };
    }
    
    // 勝利条件の達成可能性チェック
    let winConditionReachable = true;
    let hasRequiredActions = true;
    
    winRules.forEach((winRule, index) => {
      // カウンター条件の場合
      const hasCounterCondition = winRule.triggers.conditions.some(c => c.type === 'counter');
      
      if (hasCounterCondition) {
        const hasCounterAction = project.script.rules.some(rule =>
          rule.actions.some(action => action.type === 'counter')
        );
        
        if (!hasCounterAction) {
          issues.push(`Win condition ${index + 1}: No way to change counter`);
          winConditionReachable = false;
          hasRequiredActions = false;
        }
      }
    });
    
    return {
      hasWinCondition,
      winConditionReachable,
      hasRequiredActions,
      issues
    };
  }
  
  /**
   * バグ検出
   */
  detectBugs(project: GameProject): string[] {
    const bugs: string[] = [];
    
    // ルールの基本チェック
    if (project.script.rules.length === 0) {
      bugs.push('No rules defined');
    }
    
    // 重複ルールチェック
    const ruleSignatures = new Set<string>();
    project.script.rules.forEach((rule, index) => {
      const signature = JSON.stringify({
        conditions: rule.triggers.conditions.map(c => c.type),
        actions: rule.actions.map(a => a.type)
      });
      
      if (ruleSignatures.has(signature)) {
        bugs.push(`Duplicate rule detected at index ${index}`);
      }
      ruleSignatures.add(signature);
    });
    
    // 到達不可能なルールチェック
    const unreachableRules = this.findUnreachableRules(project.script);
    if (unreachableRules.length > 0) {
      bugs.push(`${unreachableRules.length} unreachable rules detected`);
    }
    
    // 無限ループの可能性チェック
    const hasInfiniteLoopRisk = this.checkInfiniteLoopRisk(project.script);
    if (hasInfiniteLoopRisk) {
      bugs.push('Potential infinite loop detected');
    }
    
    return bugs;
  }
  
  /**
   * 到達不可能なルールの検出
   */
  private findUnreachableRules(script: GameScript): number[] {
    const unreachable: number[] = [];
    
    // 簡易実装: タッチ条件なしでタッチアクションを要求するルールなど
    script.rules.forEach((rule, index) => {
      // TODO: より詳細な到達可能性分析
      // 現在は基本的なチェックのみ
    });
    
    return unreachable;
  }
  
  /**
   * 無限ループリスクのチェック
   */
  private checkInfiniteLoopRisk(script: GameScript): boolean {
    // 勝利条件もゲームオーバー条件もない場合
    const hasWinCondition = script.rules.some(rule => 
      rule.actions.some(action => action.type === 'success')
    );
    const hasGameOver = script.rules.some(rule => 
      rule.actions.some(action => action.type === 'failure')
    );
    
    if (!hasWinCondition && !hasGameOver) {
      return true;
    }
    
    // タイマー条件があるのにタイマーが進まない場合
    const hasTimerCondition = script.rules.some(rule => 
      rule.triggers.conditions.some(c => c.type === 'time')
    );
    if (hasTimerCondition) {
      // タイマーは自動的に進むため、問題なし
      return false;
    }
    
    return false;
  }
  
  /**
   * プレイアビリティスコアの計算
   */
  calculatePlayabilityScore(project: GameProject): number {
    let score = 100;
    
    // クリア可能性分析
    const clearability = this.analyzeClearability(project);
    
    if (!clearability.hasWinCondition) {
      score -= 50; // 勝利条件なし = 大幅減点
    } else if (!clearability.winConditionReachable) {
      score -= 30; // 勝利条件に到達不可 = 減点
    }
    
    if (!clearability.hasRequiredActions) {
      score -= 20;
    }
    
    // バグ検出
    const bugs = this.detectBugs(project);
    score -= bugs.length * 5; // バグ1つにつき5点減点
    
    // ルールの妥当性
    const ruleCount = project.script.rules.length;
    if (ruleCount < 2) {
      score -= 20; // ルールが少なすぎる
    } else if (ruleCount > 20) {
      score -= 10; // ルールが多すぎる
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * プレイアビリティレポートの生成
   */
  generateReport(project: GameProject): string {
    const lines: string[] = [];
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎮 Playability Analysis Report');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    
    // クリア可能性
    const clearability = this.analyzeClearability(project);
    lines.push('Clearability:');
    lines.push(`  Has Win Condition: ${clearability.hasWinCondition ? '✓' : '✗'}`);
    lines.push(`  Win Reachable: ${clearability.winConditionReachable ? '✓' : '✗'}`);
    lines.push(`  Has Required Actions: ${clearability.hasRequiredActions ? '✓' : '✗'}`);
    
    if (clearability.issues.length > 0) {
      lines.push('  Issues:');
      clearability.issues.forEach(issue => {
        lines.push(`    - ${issue}`);
      });
    }
    lines.push('');
    
    // バグ検出
    const bugs = this.detectBugs(project);
    lines.push(`Bugs Detected: ${bugs.length}`);
    if (bugs.length > 0) {
      bugs.forEach(bug => {
        lines.push(`  - ${bug}`);
      });
    }
    lines.push('');
    
    // プレイアビリティスコア
    const score = this.calculatePlayabilityScore(project);
    lines.push(`Playability Score: ${score}/100`);
    
    if (score >= 80) {
      lines.push('  Rating: Excellent ⭐⭐⭐');
    } else if (score >= 60) {
      lines.push('  Rating: Good ⭐⭐');
    } else if (score >= 40) {
      lines.push('  Rating: Fair ⭐');
    } else {
      lines.push('  Rating: Poor ❌');
    }
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return lines.join('\n');
  }
}