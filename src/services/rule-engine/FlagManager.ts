// src/services/rule-engine/FlagManager.ts
// フラグ管理システム

import { TriggerCondition } from '../../types/editor/GameScript';

/**
 * フラグ管理クラス
 * ゲーム内のブール値フラグを管理し、状態遷移（ON→OFF等）を追跡
 */
export class FlagManager {
  private flags: Map<string, boolean> = new Map();
  private previousFlags: Map<string, boolean> = new Map();
  private flagDefinitions: Map<string, boolean> = new Map();

  constructor() {
    console.log('🏴 FlagManager初期化');
  }

  /**
   * フラグ定義を追加
   */
  addFlagDefinition(flagId: string, initialValue: boolean): void {
    this.flagDefinitions.set(flagId, initialValue);
    this.flags.set(flagId, initialValue);
    this.previousFlags.set(flagId, initialValue);
  }

  /**
   * フラグ値を取得
   */
  getFlag(flagId: string): boolean {
    return this.flags.get(flagId) || false;
  }

  /**
   * フラグ値を設定
   */
  setFlag(flagId: string, value: boolean): void {
    const oldValue = this.flags.get(flagId) ?? false;
    this.previousFlags.set(flagId, oldValue);
    this.flags.set(flagId, value);
  }

  /**
   * フラグをトグル（反転）
   */
  toggleFlag(flagId: string): void {
    const currentValue = this.getFlag(flagId);
    this.setFlag(flagId, !currentValue);
  }

  /**
   * フラグ条件を評価
   * 
   * @param condition - フラグ条件
   * @returns 条件が満たされているか
   */
  evaluateFlagCondition(
    condition: Extract<TriggerCondition, { type: 'flag' }>
  ): boolean {
    const currentValue = this.getFlag(condition.flagId);
    const previousValue = this.previousFlags.get(condition.flagId) ?? false;
    
    switch (condition.condition) {
      case 'ON':
        return currentValue === true;
        
      case 'OFF':
        return currentValue === false;
        
      case 'CHANGED':
        // 値が変化した（true→false または false→true）
        return currentValue !== previousValue;
        
      case 'OFF_TO_ON':
        // 前回OFFで今回ON
        return previousValue === false && currentValue === true;
        
      case 'ON_TO_OFF':
        // 前回ONで今回OFF
        return previousValue === true && currentValue === false;
        
      default:
        return false;
    }
  }

  /**
   * 前回のフラグ値を現在の値で更新
   * フレーム更新時に呼び出す
   */
  updatePreviousFlags(): void {
    this.flags.forEach((value, flagId) => {
      this.previousFlags.set(flagId, value);
    });
  }

  /**
   * 全フラグをリセット
   */
  reset(): void {
    this.flags.clear();
    this.previousFlags.clear();
    
    // 初期値で再設定
    this.flagDefinitions.forEach((initialValue, flagId) => {
      this.flags.set(flagId, initialValue);
      this.previousFlags.set(flagId, initialValue);
    });
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): any {
    return {
      flagsCount: this.flags.size,
      flagDefinitionsCount: this.flagDefinitions.size,
      flags: Object.fromEntries(this.flags),
      previousFlags: Object.fromEntries(this.previousFlags),
      flagDefinitions: Object.fromEntries(this.flagDefinitions)
    };
  }
}