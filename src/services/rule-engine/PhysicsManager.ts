// src/services/rule-engine/PhysicsManager.ts
// 物理演算システム - 重力、速度、地面衝突管理

import { RuleExecutionContext, GameObject } from './types';

/**
 * PhysicsManager クラス
 * 
 * 役割:
 * - 物理演算の更新（重力、速度、加速度）
 * - 地面との衝突判定
 * - 物理プロパティの管理
 */
export class PhysicsManager {
  constructor() {
    console.log('⚡ PhysicsManager初期化');
  }

  /**
   * 物理演算を更新
   *
   * @param context - ゲーム実行コンテキスト
   * @param deltaTime - 前フレームからの経過時間（秒）
   */
  updatePhysics(context: RuleExecutionContext, deltaTime: number): void {
    // 60fps基準のdeltaTime（1/60秒 = 0.01666...）
    // 実際のdeltaTimeとの比率を計算
    const targetDeltaTime = 1 / 60;
    const timeScale = deltaTime / targetDeltaTime;

    // デバッグ: 初回のみログ出力
    if (!this.debugLogged) {
      console.log(`🔧 PhysicsManager: deltaTime=${deltaTime.toFixed(4)}s, timeScale=${timeScale.toFixed(2)}x (${(1/deltaTime).toFixed(1)}fps)`);
      this.debugLogged = true;
    }

    context.objects.forEach((obj, id) => {
      // 物理プロパティが無効な場合はスキップ
      if (!obj.physics || !obj.physics.enabled) {
        return;
      }

      // 静的オブジェクトはスキップ
      if (obj.physics.type === 'static') {
        return;
      }

      // キネマティックオブジェクト（速度のみ適用）
      // vxとvyはpx/frame（60fps基準）として扱い、timeScaleで調整
      if (obj.physics.type === 'kinematic') {
        obj.x += (obj.vx || 0) * timeScale;
        obj.y += (obj.vy || 0) * timeScale;
        return;
      }

      // ダイナミックオブジェクト（完全な物理演算）
      this.updateDynamicPhysics(obj, context, deltaTime, timeScale);
    });
  }

  private debugLogged = false;

  /**
   * ダイナミックオブジェクトの物理演算
   *
   * @param obj - 対象オブジェクト
   * @param context - ゲーム実行コンテキスト
   * @param deltaTime - 経過時間（秒）
   * @param timeScale - 60fps基準との時間比率
   */
  private updateDynamicPhysics(
    obj: GameObject,
    context: RuleExecutionContext,
    deltaTime: number,
    timeScale: number
  ): void {
    if (!obj.physics) return;

    // 重力の適用（60fps基準）
    const gravity = obj.physics.gravity || 980; // px/s^2（デフォルト: 地球の重力）
    const gravityPerFrame = gravity / 60; // px/frame^2 (60fps基準)

    // 空気抵抗の適用
    const airResistance = obj.physics.airResistance || 0.01;
    const vx = (obj.vx || 0) * (1 - airResistance);
    const vy = (obj.vy || 0) * (1 - airResistance);

    // 速度の更新（重力を加算）- timeScaleで調整
    obj.vx = vx;
    obj.vy = vy + gravityPerFrame * timeScale;

    // 最大速度の制限
    if (obj.physics.maxVelocity) {
      const speed = Math.sqrt(obj.vx ** 2 + obj.vy ** 2);
      if (speed > obj.physics.maxVelocity) {
        const ratio = obj.physics.maxVelocity / speed;
        obj.vx *= ratio;
        obj.vy *= ratio;
      }
    }

    // 位置の更新（timeScaleで調整）
    obj.x += obj.vx * timeScale;
    obj.y += obj.vy * timeScale;

    // 地面との衝突チェック
    this.checkGroundCollision(obj, context);

    // 角速度の適用（回転）- 60fps基準、timeScaleで調整
    if (obj.physics.angularVelocity) {
      const angularVelocityPerFrame = obj.physics.angularVelocity / 60;
      obj.rotation = (obj.rotation || 0) + angularVelocityPerFrame * timeScale;
    }
  }

  /**
   * 地面との衝突判定と反発処理
   * 
   * @param obj - 対象オブジェクト
   * @param context - ゲーム実行コンテキスト
   */
  private checkGroundCollision(
    obj: GameObject,
    context: RuleExecutionContext
  ): void {
    if (!obj.physics) return;
    
    // 地面のY座標（画面下端）
    const groundY = context.canvas.height - obj.height;
    
    // 地面に到達または貫通した場合
    if (obj.y >= groundY) {
      // 位置を地面に修正
      obj.y = groundY;
      
      // 反発係数による跳ね返り
      const restitution = obj.physics.restitution || 0.5;
      obj.vy = -(obj.vy || 0) * restitution;
      
      // 摩擦による水平速度の減衰
      const friction = obj.physics.friction || 0.3;
      obj.vx = (obj.vx || 0) * (1 - friction);
      
      // 微小な速度はゼロにする（停止判定）
      if (Math.abs(obj.vy) < 10) {
        obj.vy = 0;
      }
      if (Math.abs(obj.vx) < 5) {
        obj.vx = 0;
      }
    }
  }

  /**
   * リセット
   * 
   * 現状では状態を持たないため、何もしない
   */
  reset(): void {
    // 状態を持たないため、リセット不要
  }

  /**
   * デバッグ情報取得
   * 
   * @returns デバッグ情報オブジェクト
   */
  getDebugInfo(): any {
    return {
      managerType: 'PhysicsManager',
      description: '物理演算システム（重力、速度、衝突）',
      features: [
        '重力の適用',
        '空気抵抗の計算',
        '最大速度の制限',
        '地面との衝突判定',
        '反発係数による跳ね返り',
        '摩擦による減衰',
        '角速度による回転'
      ],
      physicsTypes: [
        'static: 動かないオブジェクト',
        'kinematic: 速度のみ適用（重力なし）',
        'dynamic: 完全な物理演算'
      ]
    };
  }
}