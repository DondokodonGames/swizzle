// src/services/rule-engine/EffectManager.ts
// エフェクト管理システム

import { GameAction } from '../../types/editor/GameScript';
import { RuleExecutionContext, GameObject } from './types';

/**
 * エフェクト管理クラス
 * scale, flash, shake, rotate, particles等のエフェクトを管理
 */
export class EffectManager {
  constructor() {
    console.log('✨ EffectManager初期化');
  }

  /**
   * エフェクトアクションを実行
   */
  executeEffectAction(
    action: Extract<GameAction, { type: 'effect' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }

    const effect = action.effect;
    const durationMs = (effect.duration || 0.2) * 1000;

    switch (effect.type) {
      case 'scale':
        this.executeScaleEffect(targetObj, effect, durationMs);
        break;
      case 'flash':
        this.executeFlashEffect(targetObj, effect, durationMs);
        break;
      case 'shake':
        this.executeShakeEffect(targetObj, effect, durationMs);
        break;
      case 'rotate':
        this.executeRotateEffect(targetObj, effect, durationMs);
        break;
      case 'particles':
        this.executeParticlesEffect(targetObj, effect, durationMs, context);
        break;
      default:
        break;
    }
  }

  /**
   * スケールエフェクト実行
   */
  private executeScaleEffect(targetObj: GameObject, effect: any, durationMs: number): void {
    if (targetObj.baseScale === undefined) {
      targetObj.baseScale = targetObj.scale;
    }

    const scaleAmount = effect.scaleAmount || 0.5;
    targetObj.effectScale = scaleAmount;
    targetObj.effectStartTime = performance.now();
    targetObj.effectDuration = durationMs;
    targetObj.effectType = 'scale';
  }

  /**
   * フラッシュエフェクト実行
   */
  private executeFlashEffect(targetObj: GameObject, effect: any, durationMs: number): void {
    if (targetObj.baseOpacity === undefined) {
      targetObj.baseOpacity = 1.0;
    }
    
    targetObj.effectType = 'flash';
    targetObj.effectStartTime = performance.now();
    targetObj.effectDuration = durationMs;
    targetObj.flashColor = effect.flashColor || '#FFFFFF';
    targetObj.flashIntensity = effect.flashIntensity || 0.5;
    targetObj.flashFrequency = effect.flashFrequency || 10;
  }

  /**
   * シェイクエフェクト実行
   */
  private executeShakeEffect(targetObj: GameObject, effect: any, durationMs: number): void {
    if (targetObj.originalX === undefined) {
      targetObj.originalX = targetObj.x;
    }
    if (targetObj.originalY === undefined) {
      targetObj.originalY = targetObj.y;
    }
    
    targetObj.effectType = 'shake';
    targetObj.effectStartTime = performance.now();
    targetObj.effectDuration = durationMs;
    targetObj.shakeIntensity = effect.shakeIntensity || 5;
    targetObj.shakeFrequency = effect.shakeFrequency || 20;
    targetObj.shakeDirection = effect.shakeDirection || 'both';
  }

  /**
   * 回転エフェクト実行
   */
  private executeRotateEffect(targetObj: GameObject, effect: any, durationMs: number): void {
    if (targetObj.baseRotation === undefined) {
      targetObj.baseRotation = targetObj.rotation || 0;
    }
    
    targetObj.effectType = 'rotate';
    targetObj.effectStartTime = performance.now();
    targetObj.effectDuration = durationMs;
    targetObj.rotationAmount = effect.rotationAmount || 360;
    targetObj.rotationDirection = effect.rotationDirection || 'clockwise';
  }

  /**
   * パーティクルエフェクト実行
   */
  private executeParticlesEffect(
    targetObj: GameObject, 
    effect: any, 
    durationMs: number, 
    context: RuleExecutionContext
  ): void {
    if (context.particleSystem) {
      const particleType = effect.particleType || 'star';
      const particleCount = effect.particleCount || 20;
      const colors = Array.isArray(effect.particleColor) 
        ? effect.particleColor 
        : effect.particleColor 
          ? [effect.particleColor] 
          : this.getDefaultParticleColors(particleType);
      
      context.particleSystem.emit({
        x: targetObj.x + targetObj.width / 2,
        y: targetObj.y + targetObj.height / 2,
        type: particleType,
        count: particleCount,
        size: effect.particleSize || 10,
        colors: colors,
        spread: effect.particleSpread || 100,
        speed: effect.particleSpeed || 200,
        gravity: effect.particleGravity !== false,
        duration: durationMs / 1000
      });
    }
  }

  /**
   * エフェクトを更新（フレームごと）
   */
  updateEffects(context: RuleExecutionContext): void {
    const now = performance.now();
    
    context.objects.forEach((obj, id) => {
      if (!obj.effectType || !obj.effectStartTime) {
        return;
      }
      
      const elapsed = now - obj.effectStartTime;
      const progress = Math.min(elapsed / obj.effectDuration!, 1.0);
      
      if (progress >= 1.0) {
        this.endEffect(obj);
        return;
      }
      
      switch (obj.effectType) {
        case 'scale':
          this.updateScaleEffect(obj, progress);
          break;
        case 'flash':
          this.updateFlashEffect(obj, elapsed);
          break;
        case 'shake':
          this.updateShakeEffect(obj, elapsed);
          break;
        case 'rotate':
          this.updateRotateEffect(obj, progress);
          break;
      }
    });
  }

  /**
   * スケールエフェクト更新
   */
  private updateScaleEffect(obj: GameObject, progress: number): void {
    if (obj.baseScale !== undefined && obj.effectScale !== undefined) {
      // 潰れるアニメーション: 1.0 → scaleAmount → 1.0
      const t = progress * 2; // 0-2の範囲
      if (t < 1) {
        // 前半: 1.0 → scaleAmount
        obj.scale = obj.baseScale * (1.0 - (1.0 - obj.effectScale) * t);
      } else {
        // 後半: scaleAmount → 1.0
        obj.scale = obj.baseScale * (obj.effectScale + (1.0 - obj.effectScale) * (t - 1));
      }
    }
  }

  /**
   * フラッシュエフェクト更新
   */
  private updateFlashEffect(obj: GameObject, elapsed: number): void {
    const frequency = obj.flashFrequency || 10;
    const intensity = obj.flashIntensity || 0.5;
    
    const phase = (elapsed / 1000) * frequency * Math.PI * 2;
    const flashAmount = (Math.sin(phase) + 1) / 2;
    
    obj.flashValue = flashAmount * intensity;
  }

  /**
   * シェイクエフェクト更新
   */
  private updateShakeEffect(obj: GameObject, elapsed: number): void {
    const intensity = obj.shakeIntensity || 5;
    const direction = obj.shakeDirection || 'both';
    
    const shakeX = (Math.random() - 0.5) * 2 * intensity;
    const shakeY = (Math.random() - 0.5) * 2 * intensity;
    
    if (direction === 'horizontal' || direction === 'both') {
      obj.x = obj.originalX! + shakeX;
    }
    if (direction === 'vertical' || direction === 'both') {
      obj.y = obj.originalY! + shakeY;
    }
  }

  /**
   * 回転エフェクト更新
   */
  private updateRotateEffect(obj: GameObject, progress: number): void {
    const amount = obj.rotationAmount || 360;
    const direction = obj.rotationDirection || 'clockwise';
    const multiplier = direction === 'clockwise' ? 1 : -1;
    
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    
    obj.rotation = obj.baseRotation! + (amount * multiplier * easedProgress * Math.PI / 180);
  }

  /**
   * エフェクト終了処理
   */
  private endEffect(obj: GameObject): void {
    switch (obj.effectType) {
      case 'scale':
        if (obj.baseScale !== undefined) {
          obj.scale = obj.baseScale;
        }
        break;
      case 'flash':
        obj.flashValue = 0;
        break;
      case 'shake':
        if (obj.originalX !== undefined) {
          obj.x = obj.originalX;
        }
        if (obj.originalY !== undefined) {
          obj.y = obj.originalY;
        }
        break;
      case 'rotate':
        if (obj.baseRotation !== undefined) {
          obj.rotation = obj.baseRotation;
        }
        break;
    }
    
    obj.effectType = undefined;
    obj.effectStartTime = undefined;
    obj.effectDuration = undefined;
  }

  /**
   * パーティクルタイプのデフォルト色を取得
   */
  private getDefaultParticleColors(type: string): string[] {
    switch (type) {
      case 'star':
        return ['#FFD700', '#FFA500', '#FFFF00'];
      case 'confetti':
        return ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
      case 'explosion':
        return ['#FF4500', '#FF6347', '#FFA500', '#FFD700'];
      case 'splash':
        return ['#1E90FF', '#00BFFF', '#87CEEB'];
      case 'hearts':
        return ['#FF1493', '#FF69B4', '#FFB6C1'];
      case 'sparkle':
        return ['#FFFFFF', '#F0F8FF', '#E6E6FA'];
      default:
        return ['#FFFFFF'];
    }
  }
}