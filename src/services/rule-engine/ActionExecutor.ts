// src/services/rule-engine/ActionExecutor.ts
// アクション実行システム - 全アクションタイプのディスパッチと実行

import { GameAction, GameRule, PhysicsProperties } from '../../types/editor/GameScript';
import { RuleExecutionContext, GameObject, ActionExecutionResult, DirectionType, DIRECTION_VECTORS } from './types';
import { CounterChangeEvent } from '../../types/counterTypes';
import { EffectManager } from './EffectManager';
import { CounterManager } from './CounterManager';
import { FlagManager } from './FlagManager';

/**
 * ActionExecutor クラス
 * 
 * 役割:
 * - 全アクションタイプの実行ディスパッチ
 * - 基本アクション（show/hide/sound/move/animation）
 * - 高度なアクション（followDrag/playAnimation等）
 * - 物理アクション（applyForce/applyImpulse等）
 * - ランダムアクション
 */
export class ActionExecutor {
  constructor(
    private effectManager: EffectManager,
    private counterManager: CounterManager,
    private flagManager: FlagManager
  ) {
    console.log('🎯 ActionExecutor初期化');
  }

  /**
   * ルールのアクションを実行
   * 
   * @param rule - 実行対象のルール
   * @param context - ゲーム実行コンテキスト
   * @param executionCounts - ルール実行回数マップ
   * @returns アクション実行結果
   */
  executeActions(
    rule: GameRule,
    context: RuleExecutionContext,
    executionCounts: Map<string, number>
  ): ActionExecutionResult {
    const effectsApplied: string[] = [];
    const errors: string[] = [];
    const newGameState: Partial<RuleExecutionContext['gameState']> = {};
    const counterChanges: CounterChangeEvent[] = [];

    // 実行回数をカウント
    const ruleId = rule.id;
    const currentCount = executionCounts.get(ruleId) || 0;
    executionCounts.set(ruleId, currentCount + 1);

    // 各アクションを順次実行
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'success':
            newGameState.isPlaying = false;
            if (action.score) {
              newGameState.score = (context.gameState.score || 0) + action.score;
            }
            effectsApplied.push(`成功: ${action.message || ''}`);
            break;

          case 'failure':
            newGameState.isPlaying = false;
            effectsApplied.push(`失敗: ${action.message || ''}`);
            break;

          case 'addScore':
            newGameState.score = (context.gameState.score || 0) + action.points;
            effectsApplied.push(`スコア加算: +${action.points}`);
            break;

          case 'setFlag':
            this.flagManager.setFlag(action.flagId, action.value);
            effectsApplied.push(`フラグ設定: ${action.flagId} = ${action.value}`);
            break;

          case 'toggleFlag':
            this.flagManager.toggleFlag(action.flagId);
            effectsApplied.push(`フラグ切替: ${action.flagId}`);
            break;

          case 'counter':
            const counterResult = this.counterManager.executeCounterAction(action, context);
            counterChanges.push(...counterResult);
            effectsApplied.push(`カウンター操作: ${action.counterName}`);
            break;

          case 'show':
            this.executeShowAction(action, context);
            effectsApplied.push(`表示: ${action.targetId}`);
            break;

          case 'hide':
            this.executeHideAction(action, context);
            effectsApplied.push(`非表示: ${action.targetId}`);
            break;

          case 'playSound':
            this.executePlaySoundAction(action, context);
            effectsApplied.push(`音声再生: ${action.soundId}`);
            break;

          case 'move':
            this.executeMoveAction(action, context);
            effectsApplied.push(`移動: ${action.targetId}`);
            break;

          case 'switchAnimation':
            this.executeSwitchAnimationAction(action, context);
            effectsApplied.push(`アニメーション切り替え: ${action.targetId}`);
            break;

          case 'effect':
            this.effectManager.executeEffectAction(action, context);
            effectsApplied.push(`エフェクト: ${action.effect.type}`);
            break;

          case 'followDrag':
            this.executeFollowDragAction(action, context);
            effectsApplied.push(`ドラッグ追従: ${action.targetId}`);
            break;

          case 'playAnimation':
            this.executePlayAnimationAction(action, context);
            effectsApplied.push(`アニメーション${action.play ? '再生' : '停止'}: ${action.targetId}`);
            break;

          case 'setAnimationSpeed':
            this.executeSetAnimationSpeedAction(action, context);
            effectsApplied.push(`アニメーション速度変更: ${action.targetId}`);
            break;

          case 'setAnimationFrame':
            this.executeSetAnimationFrameAction(action, context);
            effectsApplied.push(`フレーム設定: ${action.targetId}`);
            break;

          case 'applyForce':
            this.executeApplyForceAction(action, context);
            effectsApplied.push(`力適用: ${action.targetId}`);
            break;

          case 'applyImpulse':
            this.executeApplyImpulseAction(action, context);
            effectsApplied.push(`衝撃適用: ${action.targetId}`);
            break;

          case 'setGravity':
            this.executeSetGravityAction(action, context);
            effectsApplied.push(`重力変更: ${action.targetId}`);
            break;

          case 'setPhysics':
            this.executeSetPhysicsAction(action, context);
            effectsApplied.push(`物理設定変更: ${action.targetId}`);
            break;

          case 'randomAction':
            const randomResult = this.executeRandomAction(action, context, ruleId, executionCounts);
            effectsApplied.push(...randomResult.effectsApplied);
            errors.push(...randomResult.errors);
            counterChanges.push(...randomResult.counterChanges);
            break;

          default:
            break;
        }
      } catch (error) {
        console.error(`❌ アクション実行エラー:`, error);
        errors.push(`アクション実行エラー: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      effectsApplied,
      newGameState,
      errors,
      counterChanges
    };
  }

  // ==================== 基本アクション ====================

  /**
   * 表示アクション
   */
  private executeShowAction(
    action: Extract<GameAction, { type: 'show' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }

    // 元の状態を保存
    if (targetObj.originalScale === undefined) {
      targetObj.originalScale = targetObj.scale;
    }
    if (targetObj.originalX === undefined) {
      targetObj.originalX = targetObj.x;
    }
    if (targetObj.originalY === undefined) {
      targetObj.originalY = targetObj.y;
    }

    targetObj.visible = true;
  }

  /**
   * 非表示アクション
   */
  private executeHideAction(
    action: Extract<GameAction, { type: 'hide' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }

    targetObj.visible = false;
  }

  /**
   * 音声再生アクション
   */
  private executePlaySoundAction(
    action: Extract<GameAction, { type: 'playSound' }>,
    context: RuleExecutionContext
  ): void {
    if (context.audioSystem) {
      const volume = action.volume !== undefined ? action.volume : 1.0;
      context.audioSystem.playSound(action.soundId, volume).catch(() => {});
    }
  }

  /**
   * アニメーション切り替えアクション（拡張版）
   */
  private executeSwitchAnimationAction(
    action: Extract<GameAction, { type: 'switchAnimation' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }

    targetObj.animationIndex = action.animationIndex;
    
    const startFrame = action.startFrame ?? action.animationIndex ?? 0;
    targetObj.currentFrame = startFrame;
    
    if (action.autoPlay !== undefined) {
      targetObj.animationPlaying = action.autoPlay;
    }
    
    if (action.loop !== undefined) {
      targetObj.animationLoop = action.loop;
    }
    
    if (action.speed !== undefined) {
      targetObj.animationSpeed = action.speed;
    }
    
    if (action.reverse !== undefined) {
      targetObj.animationReverse = action.reverse;
    }
    
    console.log(`🎬 アニメーション切替: ${action.targetId} → index ${action.animationIndex}`);
  }

  // ==================== 移動アクション ====================

  /**
   * 移動アクション（8方向移動対応）
   */
  private executeMoveAction(
    action: Extract<GameAction, { type: 'move' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }

    const { movement } = action;
    const speed = movement.speed || 1.0;

    switch (movement.type) {
      case 'straight':
        this.executeMoveStraight(targetObj, movement, speed, context);
        break;

      case 'teleport':
        this.executeMoveTeleport(targetObj, movement, context);
        break;

      case 'wander':
        this.executeMoveWander(targetObj, speed);
        break;

      case 'stop':
        targetObj.vx = 0;
        targetObj.vy = 0;
        break;

      case 'swap':
        this.executeMoveSwap(targetObj, movement, context);
        break;

      case 'approach':
        this.executeMoveApproach(targetObj, movement, speed, context);
        break;

      case 'orbit':
        this.executeMoveOrbit(targetObj, movement, speed, context);
        break;

      case 'bounce':
        this.executeMoveBounce(targetObj, context);
        break;

      default:
        break;
    }
  }

  private executeMoveStraight(
    targetObj: GameObject,
    movement: any,
    speed: number,
    context: RuleExecutionContext
  ): void {
    if (movement.direction) {
      // 8方向移動
      const direction = movement.direction as DirectionType;
      const dirVector = DIRECTION_VECTORS[direction];
      
      if (dirVector) {
        targetObj.vx = dirVector.vx * speed;
        targetObj.vy = dirVector.vy * speed;
      }
    } else if (movement.target) {
      // ターゲット座標への移動
      let targetX: number, targetY: number;
      
      if (typeof movement.target === 'string') {
        const targetObject = context.objects.get(movement.target);
        if (targetObject) {
          const targetScale = targetObject.scale || 1;
          targetX = targetObject.x + (targetObject.width * targetScale) / 2;
          targetY = targetObject.y + (targetObject.height * targetScale) / 2;
        } else {
          return;
        }
      } else {
        targetX = movement.target.x * context.canvas.width;
        targetY = movement.target.y * context.canvas.height;
      }
      
      const objScale = targetObj.scale || 1;
      const objCenterX = targetObj.x + (targetObj.width * objScale) / 2;
      const objCenterY = targetObj.y + (targetObj.height * objScale) / 2;
      
      const dx = targetX - objCenterX;
      const dy = targetY - objCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        targetObj.vx = (dx / distance) * speed;
        targetObj.vy = (dy / distance) * speed;
      }
    }
  }

  private executeMoveTeleport(
    targetObj: GameObject,
    movement: any,
    context: RuleExecutionContext
  ): void {
    if (movement.target) {
      if (typeof movement.target === 'string') {
        const targetObject = context.objects.get(movement.target);
        if (targetObject) {
          targetObj.x = targetObject.x;
          targetObj.y = targetObject.y;
        }
      } else {
        targetObj.x = movement.target.x * context.canvas.width;
        targetObj.y = movement.target.y * context.canvas.height;
      }

      targetObj.vx = 0;
      targetObj.vy = 0;
    }
  }

  private executeMoveWander(targetObj: GameObject, speed: number): void {
    const randomAngle = Math.random() * Math.PI * 2;
    targetObj.vx = Math.cos(randomAngle) * speed;
    targetObj.vy = Math.sin(randomAngle) * speed;
  }

  private executeMoveSwap(
    targetObj: GameObject,
    movement: any,
    context: RuleExecutionContext
  ): void {
    if (movement.target && typeof movement.target === 'string') {
      const targetObject = context.objects.get(movement.target);
      if (targetObject) {
        const tempX = targetObj.x;
        const tempY = targetObj.y;
        targetObj.x = targetObject.x;
        targetObj.y = targetObject.y;
        targetObject.x = tempX;
        targetObject.y = tempY;
      }
    }
  }

  private executeMoveApproach(
    targetObj: GameObject,
    movement: any,
    speed: number,
    context: RuleExecutionContext
  ): void {
    if (movement.target) {
      let targetX: number, targetY: number;
      
      if (typeof movement.target === 'string') {
        const targetObject = context.objects.get(movement.target);
        if (targetObject) {
          targetX = targetObject.x;
          targetY = targetObject.y;
        } else {
          return;
        }
      } else {
        targetX = movement.target.x;
        targetY = movement.target.y;
      }
      
      const dx = targetX - targetObj.x;
      const dy = targetY - targetObj.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 5) {
        targetObj.vx = (dx / distance) * speed;
        targetObj.vy = (dy / distance) * speed;
      } else {
        targetObj.vx = 0;
        targetObj.vy = 0;
      }
    }
  }

  private executeMoveOrbit(
    targetObj: GameObject,
    movement: any,
    speed: number,
    context: RuleExecutionContext
  ): void {
    if (movement.target) {
      let centerX: number, centerY: number;
      
      if (typeof movement.target === 'string') {
        const targetObject = context.objects.get(movement.target);
        if (targetObject) {
          centerX = targetObject.x;
          centerY = targetObject.y;
        } else {
          return;
        }
      } else {
        centerX = movement.target.x;
        centerY = movement.target.y;
      }
      
      const dx = targetObj.x - centerX;
      const dy = targetObj.y - centerY;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const currentAngle = Math.atan2(dy, dx);
      
      const angularSpeed = speed * 0.01;
      const newAngle = currentAngle + angularSpeed;
      
      targetObj.x = centerX + Math.cos(newAngle) * radius;
      targetObj.y = centerY + Math.sin(newAngle) * radius;
    }
  }

  private executeMoveBounce(
    targetObj: GameObject,
    context: RuleExecutionContext
  ): void {
    const margin = 10;
    
    if (targetObj.x <= margin || targetObj.x + targetObj.width >= context.canvas.width - margin) {
      targetObj.vx = -(targetObj.vx || 0);
    }
    if (targetObj.y <= margin || targetObj.y + targetObj.height >= context.canvas.height - margin) {
      targetObj.vy = -(targetObj.vy || 0);
    }
  }

  // ==================== 高度なアクション ====================

  /**
   * ドラッグ追従アクション
   */
  private executeFollowDragAction(
    action: Extract<GameAction, { type: 'followDrag' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }
    
    const dragEvents = context.events.filter(e => 
      e.type === 'touch' && e.data.type === 'drag'
    );
    
    if (!dragEvents.length) {
      return;
    }
    
    const latestDrag = dragEvents[dragEvents.length - 1];
    const dragX = latestDrag.data.x;
    const dragY = latestDrag.data.y;
    
    const offset = action.offset || { x: 0, y: 0 };
    let targetX = dragX + offset.x;
    let targetY = dragY + offset.y;
    
    const constraint = action.constraint || 'none';
    if (constraint === 'horizontal') {
      targetY = targetObj.y;
    } else if (constraint === 'vertical') {
      targetX = targetObj.x;
    }
    
    if (action.smooth) {
      const smoothFactor = action.smoothFactor || 0.2;
      targetObj.x += (targetX - targetObj.x) * smoothFactor;
      targetObj.y += (targetY - targetObj.y) * smoothFactor;
    } else {
      targetObj.x = targetX;
      targetObj.y = targetY;
    }
  }

  /**
   * アニメーション再生/停止アクション
   */
  private executePlayAnimationAction(
    action: Extract<GameAction, { type: 'playAnimation' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }
    
    targetObj.animationPlaying = action.play;
  }

  /**
   * アニメーション速度変更アクション
   */
  private executeSetAnimationSpeedAction(
    action: Extract<GameAction, { type: 'setAnimationSpeed' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }
    
    targetObj.animationSpeed = action.speed;
  }

  /**
   * アニメーションフレーム設定アクション
   */
  private executeSetAnimationFrameAction(
    action: Extract<GameAction, { type: 'setAnimationFrame' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }
    
    targetObj.currentFrame = action.frame;
  }

  // ==================== 物理アクション ====================

  /**
   * 力適用アクション
   */
  private executeApplyForceAction(
    action: Extract<GameAction, { type: 'applyForce' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj || !targetObj.physics) {
      return;
    }
    
    const mass = targetObj.physics.mass || 1.0;
    const accX = action.force.x / mass;
    const accY = action.force.y / mass;
    
    targetObj.vx = (targetObj.vx || 0) + accX * 0.016; // 16ms
    targetObj.vy = (targetObj.vy || 0) + accY * 0.016;
    
    console.log(`💪 力適用: ${action.targetId}`);
  }

  /**
   * 衝撃適用アクション
   */
  private executeApplyImpulseAction(
    action: Extract<GameAction, { type: 'applyImpulse' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj || !targetObj.physics) {
      return;
    }
    
    const mass = targetObj.physics.mass || 1.0;
    const deltaVx = action.impulse.x / mass;
    const deltaVy = action.impulse.y / mass;
    
    targetObj.vx = (targetObj.vx || 0) + deltaVx;
    targetObj.vy = (targetObj.vy || 0) + deltaVy;
    
    console.log(`⚡ 衝撃適用: ${action.targetId}`);
  }

  /**
   * 重力変更アクション
   */
  private executeSetGravityAction(
    action: Extract<GameAction, { type: 'setGravity' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj || !targetObj.physics) {
      return;
    }
    
    targetObj.physics.gravity = action.gravity;
  }

  /**
   * 物理設定変更アクション
   */
  private executeSetPhysicsAction(
    action: Extract<GameAction, { type: 'setPhysics' }>,
    context: RuleExecutionContext
  ): void {
    const targetObj = context.objects.get(action.targetId);
    if (!targetObj) {
      return;
    }
    
    targetObj.physics = {
      ...targetObj.physics,
      ...action.physics
    } as PhysicsProperties;
  }

  // ==================== ランダムアクション ====================

  /**
   * ランダムアクション - 複数アクションから確率的に選択して実行
   */
  private executeRandomAction(
    action: Extract<GameAction, { type: 'randomAction' }>,
    context: RuleExecutionContext,
    ruleId: string,
    executionCounts: Map<string, number>
  ): ActionExecutionResult {
    const effectsApplied: string[] = [];
    const errors: string[] = [];
    const counterChanges: CounterChangeEvent[] = [];

    try {
      const selectionMode = action.selectionMode || 'weighted';
      let selectedAction: GameAction;

      // 選択モードに応じてアクションを選択
      if (selectionMode === 'uniform') {
        // 均等確率
        const index = Math.floor(Math.random() * action.actions.length);
        selectedAction = action.actions[index].action;
      } else if (selectionMode === 'probability') {
        // 確率指定
        const random = Math.random();
        let cumulative = 0;
        selectedAction = action.actions[0].action;
        
        for (const option of action.actions) {
          cumulative += option.probability || (1 / action.actions.length);
          if (random <= cumulative) {
            selectedAction = option.action;
            break;
          }
        }
      } else {
        // 重み付け
        const weights = action.weights || action.actions.map(opt => opt.weight || 1);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const random = Math.random() * totalWeight;
        let cumulative = 0;
        let selectedIndex = 0;
        
        for (let i = 0; i < weights.length; i++) {
          cumulative += weights[i];
          if (random <= cumulative) {
            selectedIndex = i;
            break;
          }
        }
        
        selectedAction = action.actions[selectedIndex].action;
      }

      // ダミールールを作成して選択されたアクションを実行
      const now = new Date().toISOString();
      const dummyRule: GameRule = {
        id: `random_action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Random Action Selector',
        enabled: true,
        priority: 50,
        targetObjectId: 'stage',
        triggers: {
          operator: 'AND',
          conditions: []
        },
        actions: [selectedAction],
        createdAt: now,
        lastModified: now
      };

      const result = this.executeActions(dummyRule, context, executionCounts);
      effectsApplied.push(...result.effectsApplied);
      errors.push(...result.errors);
      counterChanges.push(...result.counterChanges);

    } catch (error) {
      errors.push(`ランダムアクション実行エラー: ${error}`);
    }

    return {
      success: errors.length === 0,
      effectsApplied,
      newGameState: {},
      errors,
      counterChanges
    };
  }

  /**
   * リセット
   * 
   * ActionExecutor自体は状態を持たないため、何もしない
   */
  reset(): void {
    // 状態を持たないため、リセット不要
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo(): any {
    return {
      managerType: 'ActionExecutor',
      description: '全アクションタイプの実行システム',
      supportedActions: [
        '基本: success, failure, addScore, show, hide, playSound',
        'フラグ: setFlag, toggleFlag',
        'カウンター: counter',
        '移動: move (8方向+各種移動タイプ)',
        'アニメーション: switchAnimation, playAnimation, setAnimationSpeed, setAnimationFrame',
        'エフェクト: effect (EffectManagerにデリゲート)',
        '高度: followDrag',
        '物理: applyForce, applyImpulse, setGravity, setPhysics',
        'ランダム: randomAction'
      ]
    };
  }
}