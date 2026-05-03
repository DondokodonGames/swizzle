// src/services/rule-engine/CollisionDetector.ts
// 衝突判定システム（修正版）

import { TriggerCondition } from '../../types/editor/GameScript';
import { RuleExecutionContext, GameObject } from './types';

/**
 * 衝突判定クラス
 * オブジェクト間の衝突、stageArea衝突を管理
 */
export class CollisionDetector {
  private collisionCache: Map<string, Set<string>> = new Map();
  private previousCollisions: Map<string, Set<string>> = new Map();
  private lastCollisionCheckTime: number = 0;

  constructor() {
    console.log('💥 CollisionDetector初期化');
  }

  /**
   * 衝突条件を評価（メインメソッド）
   * 
   * @param condition - 衝突条件
   * @param context - 実行コンテキスト
   * @param targetObjectId - 対象オブジェクトID
   * @returns 条件が満たされているか
   */
  evaluateCollisionCondition(
    condition: Extract<TriggerCondition, { type: 'collision' }>,
    context: RuleExecutionContext,
    targetObjectId: string
  ): boolean {
    try {
      const sourceId = targetObjectId;
      const sourceObj = context.objects.get(sourceId);
      
      if (!sourceObj) {
        return false;
      }

      // stageArea判定
      if (condition.target === 'stageArea' || condition.target === 'stage') {
        return this.evaluateStageAreaCollision(condition, sourceObj, sourceId, context);
      }

      // オブジェクト間衝突判定
      // 🔧 修正: target='other'の場合にtargetObjectIdを使用
      const targetId = condition.target === 'self' ? targetObjectId : 
                       condition.target === 'background' ? 'background' :
                       (condition.target === 'other' && condition.targetObjectId) ? condition.targetObjectId :
                       condition.target;

      // デバッグログ
      console.log('🔍 衝突判定評価:', {
        sourceId,
        condition_target: condition.target,
        condition_targetObjectId: condition.targetObjectId,
        resolved_targetId: targetId,
        collisionType: condition.collisionType
      });

      if (sourceId === targetId) {
        return false;
      }

      if (targetId === 'background') {
        return false;
      }

      const targetObj = context.objects.get(targetId);
      if (!targetObj) {
        console.warn(`⚠️ ターゲットオブジェクトが見つかりません: ${targetId}`);
        return false;
      }

      const currentCollisions = this.collisionCache.get(sourceId) || new Set();
      const previousCollisions = this.previousCollisions.get(sourceId) || new Set();

      const isColliding = this.checkCollision(sourceObj, targetObj);

      // デバッグログ: 衝突状態
      if (sourceId === 'obj_moving_bar' && targetId === 'obj_green_zone') {
        console.log('🎯 Perfect Stop 衝突判定:', {
          sourceId,
          targetId,
          isColliding,
          wasColliding: previousCollisions.has(targetId),
          collisionType: condition.collisionType,
          sourceBounds: this.getObjectBounds(sourceObj),
          targetBounds: this.getObjectBounds(targetObj)
        });
      }

      const collisionType = condition.collisionType || 'enter';

      let result = false;
      if (collisionType === 'enter') {
        result = isColliding && !previousCollisions.has(targetId);
      } else if (collisionType === 'stay') {
        result = isColliding && previousCollisions.has(targetId);
      } else if (collisionType === 'exit') {
        result = !isColliding && previousCollisions.has(targetId);
      }

      if (isColliding) {
        currentCollisions.add(targetId);
      } else {
        currentCollisions.delete(targetId);
      }

      this.collisionCache.set(sourceId, currentCollisions);

      // デバッグログ: 判定結果
      if (sourceId === 'obj_moving_bar' && targetId === 'obj_green_zone') {
        console.log('📊 判定結果:', {
          collisionType,
          result,
          reason: result ? '条件満たす' : '条件満たさない'
        });
      }

      return result;
    } catch (error) {
      console.error('evaluateCollisionCondition error:', error);
      return false;
    }
  }

  /**
   * stageArea衝突判定（重要）
   * 
   * @param condition - 衝突条件
   * @param sourceObj - ソースオブジェクト
   * @param sourceId - ソースオブジェクトID
   * @param context - 実行コンテキスト
   * @returns 衝突しているか
   */
  evaluateStageAreaCollision(
    condition: Extract<TriggerCondition, { type: 'collision' }>,
    sourceObj: GameObject,
    sourceId: string,
    context: RuleExecutionContext
  ): boolean {
    if (!condition.region) {
      return false;
    }

    const region = condition.region;
    const collisionType = condition.collisionType || 'enter';
    
    // オブジェクトの境界ボックス（scaleX/scaleY個別対応）
    const objScaleX = (sourceObj as any).scaleX ?? sourceObj.scale ?? 1;
    const objScaleY = (sourceObj as any).scaleY ?? sourceObj.scale ?? 1;
    const objLeft = sourceObj.x;
    const objRight = sourceObj.x + sourceObj.width * objScaleX;
    const objTop = sourceObj.y;
    const objBottom = sourceObj.y + sourceObj.height * objScaleY;
    
    // stageAreaの境界ボックス（正規化座標 → ピクセル座標）
    const regionLeft = region.x * context.canvas.width;
    const regionTop = region.y * context.canvas.height;
    const regionRight = regionLeft + (region.width || 0) * context.canvas.width;
    const regionBottom = regionTop + (region.height || 0) * context.canvas.height;
    
    // 衝突判定（AABB - Axis-Aligned Bounding Box）
    const isColliding = !(
      objRight < regionLeft ||
      objLeft > regionRight ||
      objBottom < regionTop ||
      objTop > regionBottom
    );
    
    // 衝突履歴管理
    const stageAreaKey = `stageArea_${region.x}_${region.y}_${region.width}_${region.height}`;
    const previousCollisions = this.previousCollisions.get(sourceId) || new Set();
    const wasColliding = previousCollisions.has(stageAreaKey);
    
    // 現在の衝突状態を更新
    const currentCollisions = this.collisionCache.get(sourceId) || new Set();
    if (isColliding) {
      currentCollisions.add(stageAreaKey);
    } else {
      currentCollisions.delete(stageAreaKey);
    }
    this.collisionCache.set(sourceId, currentCollisions);
    
    // collisionTypeに応じた判定
    let result = false;
    switch (collisionType) {
      case 'enter':
        // 前回は衝突していなかったが、今回衝突した
        result = isColliding && !wasColliding;
        break;
      case 'stay':
        // 前回も今回も衝突している
        result = isColliding && wasColliding;
        break;
      case 'exit':
        // 前回は衝突していたが、今回は衝突していない
        result = !isColliding && wasColliding;
        break;
      default:
        result = false;
    }
    
    return result;
  }

   /**
   * オブジェクト間の衝突判定（AABB）
   * 
   * @param obj1 - オブジェクト1
   * @param obj2 - オブジェクト2
   * @returns 衝突しているか
   */
  checkCollision(obj1: GameObject, obj2: GameObject): boolean {
    if (!obj1.visible || !obj2.visible) {
      return false;
    }

    const scaleX1 = (obj1 as any).scaleX ?? obj1.scale ?? 1;
    const scaleY1 = (obj1 as any).scaleY ?? obj1.scale ?? 1;
    const scaleX2 = (obj2 as any).scaleX ?? obj2.scale ?? 1;
    const scaleY2 = (obj2 as any).scaleY ?? obj2.scale ?? 1;

    const result = obj1.x < obj2.x + obj2.width * scaleX2 &&
           obj1.x + obj1.width * scaleX1 > obj2.x &&
           obj1.y < obj2.y + obj2.height * scaleY2 &&
           obj1.y + obj1.height * scaleY1 > obj2.y;

    // デバッグログ追加（Perfect Stop専用）
    if (obj1.id === 'obj_moving_bar' && obj2.id === 'obj_green_zone') {
      console.log('🧮 衝突計算詳細:', {
        obj1_left: obj1.x.toFixed(2),
        obj1_right: (obj1.x + obj1.width * scale1).toFixed(2),
        obj1_width_scaled: (obj1.width * scale1).toFixed(2),
        obj2_left: obj2.x.toFixed(2),
        obj2_right: (obj2.x + obj2.width * scale2).toFixed(2),
        obj2_width_scaled: (obj2.width * scale2).toFixed(2),
        overlap_x: (obj1.x < obj2.x + obj2.width * scale2) && 
                   (obj1.x + obj1.width * scale1 > obj2.x),
        overlap_y: (obj1.y < obj2.y + obj2.height * scale2) && 
                   (obj1.y + obj1.height * scale1 > obj2.y),
        result
      });
    }

    return result;
  }

  /**
   * オブジェクトのbounds情報を取得（デバッグ用）
   */
  private getObjectBounds(obj: GameObject): any {
    const scale = obj.scale || 1;
    return {
      x: obj.x.toFixed(2),
      y: obj.y.toFixed(2),
      width: (obj.width * scale).toFixed(2),
      height: (obj.height * scale).toFixed(2),
      right: (obj.x + obj.width * scale).toFixed(2),
      bottom: (obj.y + obj.height * scale).toFixed(2)
    };
  }

  /**
   * 衝突キャッシュを更新
   * フレームごとに呼び出す
   */
  updateCollisionCache(): void {
    this.previousCollisions = new Map(this.collisionCache);
    this.lastCollisionCheckTime = Date.now();
  }

  /**
   * 全データをリセット
   */
  reset(): void {
    this.collisionCache.clear();
    this.previousCollisions.clear();
    this.lastCollisionCheckTime = 0;
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): any {
    return {
      collisionCacheSize: this.collisionCache.size,
      previousCollisionsSize: this.previousCollisions.size,
      lastCollisionCheckTime: this.lastCollisionCheckTime,
      collisionCache: Array.from(this.collisionCache.entries()).map(([key, value]) => ({
        objectId: key,
        collidingWith: Array.from(value)
      }))
    };
  }
}