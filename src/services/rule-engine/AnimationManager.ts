// src/services/rule-engine/AnimationManager.ts
// アニメーション管理システム - フレーム更新、ループ、状態追跡

import { RuleExecutionContext, GameObject, AnimationState } from './types';

/**
 * AnimationManager クラス
 * 
 * 役割:
 * - アニメーションの状態管理
 * - フレームごとのアニメーション更新
 * - ループ回数の追跡
 */
export class AnimationManager {
  // アニメーション状態追跡
  private animationStates: Map<string, AnimationState> = new Map();

  constructor() {
    console.log('🎬 AnimationManager初期化');
  }

  /**
   * アニメーションを更新
   * 
   * @param context - ゲーム実行コンテキスト
   * @param deltaTime - 前フレームからの経過時間（秒）
   */
  updateAnimations(context: RuleExecutionContext, _deltaTime: number): void {
    const now = performance.now();
    
    context.objects.forEach((obj, id) => {
      // アニメーションが停止中の場合はスキップ
      if (!obj.animationPlaying) {
        return;
      }
      
      // アニメーション設定の取得
      const speed = obj.animationSpeed || 12; // fps
      const frameTime = 1000 / speed; // ミリ秒
      const reverse = obj.animationReverse || false;
      const loop = obj.animationLoop !== undefined ? obj.animationLoop : true;
      
      // アニメーション状態の取得または初期化
      let state = this.animationStates.get(id);
      if (!state) {
        state = {
          lastFrame: obj.currentFrame || 0,
          frameChangeTime: now,
          loopCount: 0,
          wasPlaying: obj.animationPlaying || false,
          justStarted: false,
          justEnded: false
        };
        this.animationStates.set(id, state);
      }
      
      // フレーム更新のタイミング判定
      if (now - state.frameChangeTime >= frameTime) {
        this.advanceFrame(obj, state, reverse, loop);
        state.frameChangeTime = now;
      }
    });
  }

  /**
   * フレームを進める
   * 
   * @param obj - 対象オブジェクト
   * @param state - アニメーション状態
   * @param reverse - 逆再生フラグ
   * @param loop - ループフラグ
   */
  private advanceFrame(
    obj: GameObject,
    state: AnimationState,
    reverse: boolean,
    loop: boolean
  ): void {
    const frameCount = obj.frameCount || 1;
    
    if (reverse) {
      // 逆再生
      obj.currentFrame = (obj.currentFrame || 0) - 1;
      
      if (obj.currentFrame < 0) {
        if (loop) {
          // ループする場合は最後のフレームに戻る
          obj.currentFrame = frameCount - 1;
          state.loopCount++;
        } else {
          // ループしない場合は最初のフレームで停止
          obj.currentFrame = 0;
          obj.animationPlaying = false;
        }
      }
    } else {
      // 順再生
      obj.currentFrame = (obj.currentFrame || 0) + 1;
      
      if (obj.currentFrame >= frameCount) {
        if (loop) {
          // ループする場合は最初のフレームに戻る
          obj.currentFrame = 0;
          state.loopCount++;
        } else {
          // ループしない場合は最後のフレームで停止
          obj.currentFrame = frameCount - 1;
          obj.animationPlaying = false;
        }
      }
    }
    
    state.lastFrame = obj.currentFrame;
  }

  /**
   * アニメーション状態を取得
   * 
   * @param objectId - オブジェクトID
   * @returns アニメーション状態（存在しない場合はundefined）
   */
  getAnimationState(objectId: string): AnimationState | undefined {
    return this.animationStates.get(objectId);
  }

  /**
   * アニメーション状態を設定
   * 
   * @param objectId - オブジェクトID
   * @param state - 設定するアニメーション状態
   */
  setAnimationState(objectId: string, state: AnimationState): void {
    this.animationStates.set(objectId, state);
  }

  /**
   * アニメーション状態をクリア
   * 
   * @param objectId - オブジェクトID
   */
  clearAnimationState(objectId: string): void {
    this.animationStates.delete(objectId);
  }

  /**
   * リセット - 全アニメーション状態をクリア
   */
  reset(): void {
    this.animationStates.clear();
    console.log('🔄 AnimationManager リセット完了');
  }

  /**
   * デバッグ情報取得
   * 
   * @returns デバッグ情報オブジェクト
   */
  getDebugInfo(): any {
    const states: any = {};
    
    this.animationStates.forEach((state, id) => {
      states[id] = {
        lastFrame: state.lastFrame,
        loopCount: state.loopCount,
        frameChangeTime: state.frameChangeTime
      };
    });
    
    return {
      managerType: 'AnimationManager',
      animationStatesCount: this.animationStates.size,
      states: states,
      features: [
        'フレームアニメーション',
        '順再生・逆再生対応',
        'ループ制御',
        'ループ回数追跡',
        'フレームレート制御'
      ]
    };
  }
}