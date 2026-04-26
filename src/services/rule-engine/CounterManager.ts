// src/services/rule-engine/CounterManager.ts
// カウンター管理システム

import { TriggerCondition, GameAction } from '../../types/editor/GameScript';
import { 
  GameCounter, 
  CounterChangeEvent,
  clampCounterValue,
  compareCounterValue
} from '../../types/counterTypes';
import { RuleExecutionContext } from './types';

/**
 * カウンター管理クラス
 * ゲーム内の数値カウンターを管理し、操作と履歴を追跡
 */
export class CounterManager {
  private counters: Map<string, number> = new Map();
  private counterDefinitions: Map<string, GameCounter> = new Map();
  private counterHistory: CounterChangeEvent[] = [];
  private counterPreviousValues: Map<string, number> = new Map();

  constructor() {
    console.log('🔢 CounterManager初期化');
  }

  /**
   * カウンター定義を追加
   */
  addCounterDefinition(counter: GameCounter): void {
    this.counterDefinitions.set(counter.name, counter);
    this.counters.set(counter.name, counter.initialValue);
    this.counterPreviousValues.set(counter.name, counter.initialValue);
  }

  /**
   * カウンター値を取得
   */
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * カウンター値を範囲制限
   */
  private clampCounterValue(value: number, definition: GameCounter): number {
    let clampedValue = value;
    
    if (definition.min !== undefined && clampedValue < definition.min) {
      clampedValue = definition.min;
    }
    
    if (definition.max !== undefined && clampedValue > definition.max) {
      clampedValue = definition.max;
    }
    
    return clampedValue;
  }

  /**
   * カウンター値を設定
   */
  setCounter(name: string, value: number): void {
    const def = this.counterDefinitions.get(name);
    if (def) {
      const clampedValue = this.clampCounterValue(value, def);
      this.counters.set(name, clampedValue);
    } else {
      this.counters.set(name, value);
    }
  }

  /**
   * カウンターをインクリメント
   */
  incrementCounter(name: string): void {
    const current = this.getCounter(name);
    this.setCounter(name, current + 1);
  }

  /**
   * カウンターをデクリメント
   */
  decrementCounter(name: string): void {
    const current = this.getCounter(name);
    this.setCounter(name, current - 1);
  }

  /**
   * カウンターをリセット
   */
  resetCounter(name: string): void {
    const def = this.counterDefinitions.get(name);
    const initialValue = def?.initialValue ?? 0;
    this.counters.set(name, initialValue);
  }

  /**
   * カウンターの前回値を取得
   */
  getCounterPreviousValue(name: string): number {
    return this.counterPreviousValues.get(name) || 0;
  }

  /**
   * カウンター条件を評価
   * 
   * @param condition - カウンター条件
   * @returns 条件が満たされているか
   */
  evaluateCounterCondition(
    condition: Extract<TriggerCondition, { type: 'counter' }>
  ): boolean {
    try {
      const currentValue = this.getCounter(condition.counterName);
      const previousValue = this.getCounterPreviousValue(condition.counterName);
      
      if (condition.comparison === 'changed') {
        return currentValue !== previousValue;
      }
      
      const result = compareCounterValue(
        currentValue,
        condition.comparison,
        condition.value,
        condition.rangeMax
      );

      return result;
    } catch (error) {
      console.error('evaluateCounterCondition error:', error);
      return false;
    }
  }

  /**
   * カウンターアクションを実行
   * 
   * @param action - カウンターアクション
   * @param context - 実行コンテキスト
   * @returns カウンター変更イベントの配列
   */
  executeCounterAction(
    action: Extract<GameAction, { type: 'counter' }>,
    _context?: RuleExecutionContext
  ): CounterChangeEvent[] {
    const counterDef = this.counterDefinitions.get(action.counterName);
    if (!counterDef) {
      console.warn(`Counter definition not found: ${action.counterName}`);
      return [];
    }

    const oldValue = this.getCounter(action.counterName);
    let newValue = oldValue;

    switch (action.operation) {
      case 'set':
        newValue = action.value ?? 0;
        break;
        
      case 'add':
      case 'increment':
        newValue = oldValue + (action.value ?? 1);
        break;
        
      case 'subtract':
      case 'decrement':
        newValue = oldValue - (action.value ?? 1);
        break;
        
      case 'multiply':
        newValue = oldValue * (action.value ?? 1);
        break;
        
      case 'divide':
        const divisor = action.value ?? 1;
        newValue = divisor !== 0 ? oldValue / divisor : oldValue;
        break;
        
      case 'reset':
        newValue = counterDef.initialValue;
        break;
        
      default:
        console.warn(`Unknown counter operation: ${action.operation}`);
        break;
    }

    // 値をクランプ（範囲内に制限）
    newValue = clampCounterValue(newValue, counterDef);

    // カウンター値を更新
    this.counterPreviousValues.set(action.counterName, oldValue);
    this.counters.set(action.counterName, newValue);

    // 変更イベントを作成
    const changeEvent: CounterChangeEvent = {
      counterName: action.counterName,
      oldValue,
      newValue,
      operation: action.operation,
      timestamp: Date.now()
    };

    this.counterHistory.push(changeEvent);

    return [changeEvent];
  }

  /**
   * 全カウンターをリセット
   */
  reset(): void {
    this.counters.clear();
    this.counterHistory = [];
    this.counterPreviousValues.clear();
    
    // 初期値で再設定
    this.counterDefinitions.forEach((counterDef, name) => {
      this.counters.set(name, counterDef.initialValue);
      this.counterPreviousValues.set(name, counterDef.initialValue);
    });
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): any {
    return {
      countersCount: this.counters.size,
      counterDefinitionsCount: this.counterDefinitions.size,
      counters: Object.fromEntries(this.counters),
      counterHistorySize: this.counterHistory.length,
      recentCounterChanges: this.counterHistory.slice(-10),
      counterPreviousValues: Object.fromEntries(this.counterPreviousValues)
    };
  }
}