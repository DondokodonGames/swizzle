// src/services/editor/EditorGameBridge.ts
// Phase 1+2 完全統合版 - RuleEngine.ts 統合対応
// 🔧 修正: 描画を中心基準に変更（左に動く問題を解決）
// 🔧 修正: 画面外チェック削除（オブジェクトが画面外に出られるように）
// 🔧 修正: layoutObj の全プロパティを反映（position, scale, rotation, zIndex, animation）
// 🔍 デバッグ: タッチイベント詳細ログ追加
// 🆕 拡張（2025-12-03）: タッチ拡張、物理演算、エフェクト、アニメーション統合
// ✅ 修正（2025-12-03 18:00）: TypeScriptエラー3個修正

import { GameProject } from '../../types/editor/GameProject';
import { GameRule, TriggerCondition, GameAction, PhysicsProperties } from '../../types/editor/GameScript';
import { createDefaultInitialState, syncInitialStateWithLayout, createDefaultPhysics } from '../../types/editor/GameScript';
import { RuleEngine, RuleExecutionContext, ActionExecutionResult } from '../rule-engine/RuleEngine';

// ゲーム実行結果
export interface GameExecutionResult {
  success: boolean;
  score?: number;
  timeElapsed: number;
  completed: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    averageFPS: number;
    memoryUsage: number;
    renderTime: number;
    objectCount: number;
    ruleExecutions: number;
  };
  finalState?: {
    score: number;
    timeElapsed: number;
    objectsInteracted: string[];
    rulesTriggered: string[];
  };
}

// 🆕 タッチ追跡情報
interface TouchTracker {
  targetId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  lastMoveTime: number;
  isDragging: boolean;
  isHolding: boolean;
  holdProgress: number;
}

/**
 * EditorGameBridge - Phase 1+2 完全統合版 + 全プロパティ反映版 + 新機能統合版 + エラー修正版
 * RuleEngine.ts を使用してエディターで作成したゲームを実行
 */
export class EditorGameBridge {
  private static instance: EditorGameBridge | null = null;
  private ruleEngine: RuleEngine | null = null;
  private animationFrameId: number | null = null;
  private currentContext: RuleExecutionContext | null = null;
  
  // 🆕 タッチ追跡
  private touchTracker: TouchTracker | null = null;
  
  static getInstance(): EditorGameBridge {
    if (!this.instance) {
      this.instance = new EditorGameBridge();
    }
    return this.instance;
  }

  /**
   * ゲーム実行（RuleEngine統合版 + 新機能統合版 + エラー修正版）
   */
  async executeGame(
    project: GameProject,
    canvasElement: HTMLCanvasElement
  ): Promise<GameExecutionResult> {
    console.log('🎮 ゲーム実行開始 (RuleEngine統合版 + 新機能 + エラー修正):', project.name || project.settings.name);
    
    const startTime = performance.now();
    let ruleExecutionCount = 0;
    const warnings: string[] = [];
    const errors: string[] = [];
    const objectsInteracted: string[] = [];
    const rulesTriggered: string[] = [];
    
    try {
      // 1. Canvas初期化
      const ctx = canvasElement.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context を取得できません');
      }

      canvasElement.width = 1080;
      canvasElement.height = 1920;
      
      // 2. 初期状態の取得・作成
      let initialState = project.script?.initialState;
      if (!initialState) {
        console.log('⚠️ 初期条件なし→デフォルト作成');
        initialState = createDefaultInitialState();
        if (project.script?.layout) {
          initialState = syncInitialStateWithLayout(initialState, project.script.layout);
        }
      }

      // 3. RuleEngine初期化
      this.ruleEngine = new RuleEngine();
      console.log('✅ RuleEngine初期化完了');

      // 4. カウンター定義を登録
      const counters = initialState.gameState?.counters || {};
      if (Object.keys(counters).length > 0) {
        Object.entries(counters).forEach(([name, value]) => {
          const now = new Date().toISOString();
          this.ruleEngine!.addCounterDefinition({
            id: `counter_${name}_${Date.now()}`,
            name: name,
            initialValue: typeof value === 'number' ? value : 0,
            currentValue: typeof value === 'number' ? value : 0,
            min: 0,
            max: 9999,
            persistence: 'game',
            createdAt: now,
            lastModified: now
          });
        });
        console.log(`✅ カウンター登録: ${Object.keys(counters).length}個`);
      }

      // 5. フラグ初期化
      const flags = initialState.gameState?.flags || {};
      if (Object.keys(flags).length > 0) {
        Object.entries(flags).forEach(([name, value]) => {
          this.ruleEngine!.setFlag(name, typeof value === 'boolean' ? value : false);
        });
        console.log(`✅ フラグ登録: ${Object.keys(flags).length}個`);
      }

      // 6. ルールを登録
      if (project.script?.rules) {
        console.log(`📋 ルール読み込み開始: ${project.script.rules.length}個のルールを検出`);
        console.log(`📋 ルール詳細:`, project.script.rules.map(r => ({
          id: r.id,
          name: r.name,
          enabled: r.enabled,
          targetObjectId: r.targetObjectId,
          conditionCount: r.triggers.conditions.length,
          actionCount: r.actions.length,
          conditions: r.triggers.conditions.map(c => c.type),
          actions: r.actions.map(a => a.type)
        })));

        const enabledRules = project.script.rules.filter(rule => rule.enabled !== false);
        console.log(`✅ 有効なルール: ${enabledRules.length}個`);

        enabledRules.forEach((rule, index) => {
          console.log(`📝 ルール登録 #${index + 1}: "${rule.name}" (id=${rule.id})`);
          console.log(`   - 対象: ${rule.targetObjectId}`);
          console.log(`   - 条件: ${rule.triggers.conditions.map(c => c.type).join(', ')}`);
          console.log(`   - アクション: ${rule.actions.map(a => a.type).join(', ')}`);
          this.ruleEngine!.addRule(rule);
        });
        console.log(`✅ ルール登録完了: ${enabledRules.length}個`);

        if (enabledRules.length === 0) {
          warnings.push('有効なルールが1つもありません。ルールを有効化してください。');
        }
      } else {
        console.warn('⚠️ project.script.rules が undefined または null です');
        warnings.push('ルールが1つも設定されていません');
      }

      // 7. 画像リソース読み込み
      const imageCache = new Map<string, HTMLImageElement>();
      
      // 背景画像読み込み
      if (project.assets?.background?.frames?.[0]) {
        const bgFrame = project.assets.background.frames[0];
        try {
          const bgImg = new Image();
          await this.loadImage(bgImg, bgFrame.dataUrl, 3000);
          imageCache.set('background', bgImg);
          console.log('✅ 背景画像読み込み完了');
        } catch (error) {
          warnings.push('背景画像の読み込みに失敗しました');
        }
      }

      // オブジェクト画像読み込み（全フレーム対応）
      if (project.assets?.objects) {
        for (const asset of project.assets.objects) {
          if (!asset.frames || asset.frames.length === 0) {
            warnings.push(`オブジェクト "${asset.name}" の画像データがありません`);
            continue;
          }

          // 全フレームを読み込み
          for (let frameIndex = 0; frameIndex < asset.frames.length; frameIndex++) {
            const frame = asset.frames[frameIndex];
            if (!frame?.dataUrl) {
              warnings.push(`オブジェクト "${asset.name}" のフレーム${frameIndex}の画像データがありません`);
              continue;
            }

            try {
              const img = new Image();
              await this.loadImage(img, frame.dataUrl, 2000);
              imageCache.set(`${asset.id}_frame${frameIndex}`, img);
              console.log(`✅ オブジェクト画像読み込み完了: ${asset.name} (frame ${frameIndex})`);
            } catch (error) {
              warnings.push(`オブジェクト画像 "${asset.name}" フレーム${frameIndex}の読み込みに失敗しました`);
            }
          }
        }
      }

      // 8. RuleExecutionContext初期化
      const objectsMap = new Map();
      
      if (project.assets?.objects) {
        project.assets.objects.forEach((asset, index) => {
          const frame = asset.frames?.[0];
          
          // 🔧 修正: layoutから全プロパティを取得（エディターで設定した値を使用）
          const layoutObj = project.script?.layout?.objects?.find(obj => obj.objectId === asset.id);
          
          // フォールバック用にinitialStateも取得
          const initialObj = initialState!.layout?.objects?.find(obj => obj.id === asset.id);
          
          // ✅ 位置優先順位: layoutObj.position > initialObj.position > デフォルト
          const posX = layoutObj?.position?.x ?? initialObj?.position?.x ?? (0.2 + (index * 0.15) % 0.6);
          const posY = layoutObj?.position?.y ?? initialObj?.position?.y ?? 0.3;
          
          // ✅ スケール優先順位: layoutObj.scale > initialObj.scale > asset.defaultScale > 1.0
          const scale = layoutObj?.scale ?? initialObj?.scale ?? asset.defaultScale ?? 1.0;
          
          // ✅ scaleX/scaleY も個別に取得（横長・縦長対応）
          //const scaleX = layoutObj?.scaleX ?? scale;
          //const scaleY = layoutObj?.scaleY ?? scale;
          const scaleValue = typeof scale === 'number' ? scale : 1.0;

          // ✅ Rotation優先順位: layoutObj.rotation > initialObj.rotation > 0
          const rotation = layoutObj?.rotation ?? initialObj?.rotation ?? 0;
          
          // ✅ zIndex優先順位: layoutObj.zIndex > initialObj.zIndex > (index + 1)
          const zIndex = layoutObj?.zIndex ?? initialObj?.zIndex ?? index + 1;
          
          console.log(`🎬 オブジェクト "${asset.name}" 配置情報:`, {
            posX, posY, scale, rotation, zIndex,
            layoutObjPos: layoutObj?.position,
            initialObjPos: initialObj?.position
          });
          
          const width = frame?.width || 50;
          const height = frame?.height || 50;
          
          // ✅ 中心座標を計算（0-1の正規化座標 → ピクセル座標）
          const centerX = posX * canvasElement.width;
          const centerY = posY * canvasElement.height;
          
          // ✅ 初期アニメーションフレーム: layoutObj.initialState.animation を使用
          const initialFrame = layoutObj?.initialState?.animation ?? 0;
          
          // ✅ 表示状態の取得
          const visible = layoutObj?.initialState?.visible ?? initialObj?.visible ?? true;
          
          // ✅ アニメーション設定
          const animationPlaying = layoutObj?.initialState?.autoStart ?? initialObj?.autoStart ?? false;
          const animationSpeed = layoutObj?.initialState?.animationSpeed ?? initialObj?.animationSpeed ?? 12;
          
          // 🆕 物理プロパティの取得
          const physics = layoutObj?.physics || createDefaultPhysics();
          
          console.log(`🎬 オブジェクト "${asset.name}" その他:`, {
            rotation,
            zIndex,
            initialFrame,
            visible,
            animationPlaying,
            animationSpeed,
            physics
          });
          
          // ✅ 左上座標として保存（RuleEngine互換性）
          const x = centerX - (width * scaleValue) / 2;
          const y = centerY - (height * scaleValue) / 2;
          
          objectsMap.set(asset.id, {
            id: asset.id,
            x,  // ✅ 左上X（RuleEngine互換）
            y,  // ✅ 左上Y（RuleEngine互換）
            width,
            height,
            visible,
            animationIndex: 0,
            animationPlaying,
            animationSpeed,
            scale: scaleValue,  // ✅ layoutObj.scaleを反映
            //scaleX, // ✅ X方向スケール保存
            //scaleY, // ✅ Y方向スケール保存
            rotation, // ✅ layoutObj.rotationを反映
            zIndex,   // ✅ layoutObj.zIndexを反映
            vx: 0,
            vy: 0,
            frameCount: asset.frames?.length || 1,
            currentFrame: initialFrame, // ✅ 初期アニメーションフレームを反映
            lastFrameUpdate: performance.now(),
            
            // 🆕 物理プロパティ追加
            physics
          });
        });
      }

      // 9. ゲーム状態初期化
      const gameState = {
        isPlaying: true,
        isPaused: false,
        score: initialState.gameState?.score || 0,
        timeElapsed: 0,
        flags: new Map(Object.entries(initialState.gameState?.flags || {}).map(([k, v]) => [k, Boolean(v)])),
        counters: new Map(Object.entries(initialState.gameState?.counters || {}).map(([k, v]) => [k, Number(v)]))
      };

      // 10. RuleExecutionContext構築
      this.currentContext = {
        gameState,
        objects: objectsMap,
        events: [],
        canvas: {
          width: canvasElement.width,
          height: canvasElement.height,
          context: ctx
        }
      };

      console.log('✅ ゲーム初期化完了:', {
        objectCount: objectsMap.size,
        ruleCount: project.script?.rules?.length || 0,
        counters: Array.from(gameState.counters.keys()),
        flags: Array.from(gameState.flags.keys())
      });

      // 11. ゲームループ変数
      let running = true;
      let completed = false;
      const gameDuration = project.settings.duration?.type === 'unlimited' 
        ? null 
        : (project.settings.duration?.seconds || 15);
      
      const frameTime = 1000 / 60; // 60 FPS
      let lastFrameTime = performance.now();
      let fpsFrames = 0;
      let fpsTime = 0;
      let averageFPS = 60;

      // 12. ゲームループ
      const gameLoop = () => {
        if (!running) {
          if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
          }
          return;
        }

        try {
          const currentTime = performance.now();
          const deltaTime = currentTime - lastFrameTime;
          lastFrameTime = currentTime;

          // FPS計測
          fpsFrames++;
          fpsTime += deltaTime;
          if (fpsTime >= 1000) {
            averageFPS = (fpsFrames / fpsTime) * 1000;
            fpsFrames = 0;
            fpsTime = 0;
          }

          // 時間更新
          gameState.timeElapsed += deltaTime / 1000;
          this.currentContext!.gameState.timeElapsed = gameState.timeElapsed;

          // 🆕 物理演算更新（毎フレーム）
          if (this.ruleEngine) {
            this.ruleEngine.updatePhysics(this.currentContext!, deltaTime / 1000);
          }

          // 🆕 エフェクト更新（毎フレーム）
          // ✅ 修正: currentTime 引数を削除
          if (this.ruleEngine) {
            this.ruleEngine.updateEffects(this.currentContext!);
          }

          // 🆕 アニメーション更新（毎フレーム）
          if (this.ruleEngine) {
            this.ruleEngine.updateAnimations(this.currentContext!, currentTime);
          }

          // 🔍 デバッグ: ルール評価前のイベント確認
          if (this.currentContext!.events.length > 0) {
            console.log('🔍 [GameLoop] ルール評価前 - context.events:', this.currentContext!.events.map(e => ({
              type: e.type,
              timestamp: e.timestamp,
              data: e.data
            })));
          }

          // ✅ RuleEngine実行（毎フレーム）- イベントクリア前に実行
          // ✅ 修正: evaluateAndExecuteRules → evaluateRules + executeActions
          try {
            const triggeredRules = this.ruleEngine!.evaluateRules(this.currentContext!);
            
            // ✅ 各トリガーされたルールに対してアクションを実行
            triggeredRules.forEach((rule: GameRule) => {
              const result: ActionExecutionResult = this.ruleEngine!.executeActions(rule, this.currentContext!);
              
              ruleExecutionCount++;
              
              // 実行されたルールを記録
              if (result.success) {
                rulesTriggered.push('rule_executed');
                
                // ゲーム状態の更新を反映
                if (result.newGameState) {
                  if (result.newGameState.score !== undefined) {
                    gameState.score = result.newGameState.score;
                  }
                  if (result.newGameState.isPlaying !== undefined) {
                    running = result.newGameState.isPlaying;
                    completed = !result.newGameState.isPlaying;
                  }
                }
              }
            });
          } catch (ruleError) {
            console.error('❌ ルール実行エラー:', ruleError);
            warnings.push('ルール実行中にエラーが発生しました');
          }

          // 🔧 修正: イベント履歴をフレーム終了時にクリア
          if (this.currentContext!.events.length > 0) {
            console.log('🔍 [GameLoop] イベントクリア実行 - クリア前の件数:', this.currentContext!.events.length);
          }
          this.currentContext!.events = [];

          // 背景描画
          ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
          
          if (imageCache.has('background')) {
            const bgImg = imageCache.get('background')!;
            ctx.drawImage(bgImg, 0, 0, canvasElement.width, canvasElement.height);
          } else {
            // デフォルト背景
            const gradient = ctx.createLinearGradient(0, 0, 0, canvasElement.height);
            gradient.addColorStop(0, '#FFE5F1');
            gradient.addColorStop(1, '#FFC0E0');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
          }

          // ✅ zIndex順にソートしてから描画
          const sortedObjects = Array.from(objectsMap.entries())
            .sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0));

          // オブジェクト更新・描画（zIndex順）
          sortedObjects.forEach(([id, obj]) => {
            if (!obj.visible) return;

            // ✅ アニメーションフレーム更新（RuleEngineのupdateAnimationsで処理済み）
            // このブロックは削除せず残す（RuleEngine未使用時の後方互換性のため）
            if (obj.animationPlaying && obj.frameCount > 1) {
              const frameInterval = 1000 / (obj.animationSpeed || 12); // fps to ms
              if (currentTime - obj.lastFrameUpdate >= frameInterval) {
                obj.currentFrame = (obj.currentFrame + 1) % obj.frameCount;
                obj.lastFrameUpdate = currentTime;
              }
            }

            // ✅ エフェクト更新（RuleEngineのupdateEffectsで処理済み）
            // このブロックは削除せず残す（RuleEngine未使用時の後方互換性のため）
            if (obj.effectStartTime !== undefined && obj.effectDuration !== undefined) {
              const elapsed = currentTime - obj.effectStartTime;

              if (elapsed < obj.effectDuration) {
                // エフェクト実行中
                if (obj.effectType === 'scale') {
                  // 🔧 修正: baseScaleが未定義の場合のフォールバック
                  if (obj.baseScale === undefined) {
                    obj.baseScale = obj.scale;
                  }
                  
                  const progress = elapsed / obj.effectDuration;
                  const easedProgress = 1 - Math.pow(1 - progress, 3);
                  obj.effectScale = 1 + (obj.scaleAmount - 1) * (1 - easedProgress);
                }
              } else {
                // エフェクト終了
                obj.effectStartTime = undefined;
                obj.effectDuration = undefined;
                obj.effectType = undefined;
                obj.effectScale = undefined;
                obj.baseScale = undefined;
              }
            }

            // 現在のフレーム画像を取得
            const currentFrameIndex = obj.currentFrame || 0;
            const imgKey = `${id}_frame${currentFrameIndex}`;
            const img = imageCache.get(imgKey);

            if (!img) {
              console.warn(`⚠️ 画像が見つかりません: ${imgKey}`);
              return;
            }

            // ✅ 中心座標を計算（左上 → 中心）
            const centerX = obj.x + (obj.width * obj.scale) / 2;
            const centerY = obj.y + (obj.height * obj.scale) / 2;

            ctx.save();

            // ✅ 中心を基準に変形
            ctx.translate(centerX, centerY);
            
            // ✅ Rotation適用
            if (obj.rotation) {
              ctx.rotate(obj.rotation * Math.PI / 180);
            }

            // ✅ エフェクトスケール適用
            const effectiveScale = obj.effectScale ? obj.scale * obj.effectScale : obj.scale;
            
            // ✅ 中心基準で描画（translate済みなので相対座標）
            const drawX = -(obj.width * effectiveScale) / 2;
            const drawY = -(obj.height * effectiveScale) / 2;
            const drawWidth = obj.width * effectiveScale;
            const drawHeight = obj.height * effectiveScale;

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

            ctx.restore();
          });

          // デバッグ情報表示
          ctx.fillStyle = '#000';
          ctx.font = '24px Arial';
          ctx.fillText(`Score: ${gameState.score}`, 20, 50);
          ctx.fillText(`Time: ${gameState.timeElapsed.toFixed(1)}s`, 20, 85);
          ctx.fillText(`FPS: ${Math.round(averageFPS)}`, 20, 120);

          // 制限時間チェック
          if (gameDuration && gameState.timeElapsed >= gameDuration) {
            running = false;
            completed = true;
            console.log('⏰ 時間切れ - ゲーム終了');
          }

          // 次のフレーム
          if (running) {
            this.animationFrameId = requestAnimationFrame(gameLoop);
          }

        } catch (loopError) {
          console.error('❌ ゲームループエラー:', loopError);
          running = false;
          errors.push(loopError instanceof Error ? loopError.message : 'Game loop error');
        }
      };

      // 13. タッチイベントハンドラ設定（🆕 拡張版）
      const handlePointerDown = (e: PointerEvent) => {
        const rect = canvasElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * canvasElement.width;
        const y = ((e.clientY - rect.top) / rect.height) * canvasElement.height;
        
        console.log('👆 [PointerDown]', { x, y, timestamp: performance.now() });

        // タッチ追跡開始
        this.touchTracker = {
          targetId: null,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          startTime: performance.now(),
          lastMoveTime: performance.now(),
          isDragging: false,
          isHolding: false,
          holdProgress: 0
        };

        // タップされたオブジェクトを特定
        let touchedObject: string | null = null;
        
        objectsMap.forEach((obj, id) => {
          if (!obj.visible) return;
          
          const centerX = obj.x + (obj.width * obj.scale) / 2;
          const centerY = obj.y + (obj.height * obj.scale) / 2;
          const halfWidth = (obj.width * obj.scale) / 2;
          const halfHeight = (obj.height * obj.scale) / 2;
          
          if (x >= centerX - halfWidth && x <= centerX + halfWidth &&
              y >= centerY - halfHeight && y <= centerY + halfHeight) {
            touchedObject = id;
          }
        });

        this.touchTracker.targetId = touchedObject || 'stage';

        // タッチイベント発行
        this.currentContext!.events.push({
          type: 'touch',
          timestamp: performance.now(),
          data: {
            type: 'down',
            target: this.touchTracker.targetId,
            x, y,
            startX: x,
            startY: y
          }
        });

        console.log('👆 [PointerDown] Target:', this.touchTracker.targetId);
      };

      const handlePointerMove = (e: PointerEvent) => {
        if (!this.touchTracker) return;

        const rect = canvasElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * canvasElement.width;
        const y = ((e.clientY - rect.top) / rect.height) * canvasElement.height;

        this.touchTracker.currentX = x;
        this.touchTracker.currentY = y;
        this.touchTracker.lastMoveTime = performance.now();

        const dx = x - this.touchTracker.startX;
        const dy = y - this.touchTracker.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // ドラッグ判定（5px以上移動）
        if (distance > 5 && !this.touchTracker.isDragging) {
          this.touchTracker.isDragging = true;
          
          // dragイベント発行（start）
          this.currentContext!.events.push({
            type: 'touch',
            timestamp: performance.now(),
            data: {
              type: 'drag',
              dragType: 'start',
              target: this.touchTracker.targetId,
              x, y,
              startX: this.touchTracker.startX,
              startY: this.touchTracker.startY,
              dx, dy,
              distance
            }
          });

          console.log('🖱️ [Drag Start]', { target: this.touchTracker.targetId, distance });
        }

        // dragging中のイベント発行
        if (this.touchTracker.isDragging) {
          this.currentContext!.events.push({
            type: 'touch',
            timestamp: performance.now(),
            data: {
              type: 'drag',
              dragType: 'dragging',
              target: this.touchTracker.targetId,
              x, y,
              startX: this.touchTracker.startX,
              startY: this.touchTracker.startY,
              dx, dy,
              distance
            }
          });
        }
      };

      const handlePointerUp = (e: PointerEvent) => {
        if (!this.touchTracker) return;

        const rect = canvasElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * canvasElement.width;
        const y = ((e.clientY - rect.top) / rect.height) * canvasElement.height;

        const duration = performance.now() - this.touchTracker.startTime;
        const dx = x - this.touchTracker.startX;
        const dy = y - this.touchTracker.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = duration > 0 ? distance / duration * 1000 : 0; // px/sec

        console.log('👆 [PointerUp]', { 
          target: this.touchTracker.targetId, 
          duration, 
          distance, 
          velocity,
          isDragging: this.touchTracker.isDragging 
        });

        // Drag End
        if (this.touchTracker.isDragging) {
          this.currentContext!.events.push({
            type: 'touch',
            timestamp: performance.now(),
            data: {
              type: 'drag',
              dragType: 'end',
              target: this.touchTracker.targetId,
              x, y,
              startX: this.touchTracker.startX,
              startY: this.touchTracker.startY,
              dx, dy,
              distance,
              duration,
              velocity
            }
          });

          console.log('🖱️ [Drag End]', { distance, duration, velocity });
        }

        // Swipe検出（距離100px以上、500ms以内、速度500px/s以上）
        if (distance >= 100 && duration <= 500 && velocity >= 500) {
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          let direction: string = 'any';
          
          if (angle >= -45 && angle < 45) direction = 'right';
          else if (angle >= 45 && angle < 135) direction = 'down';
          else if (angle >= 135 || angle < -135) direction = 'left';
          else direction = 'up';

          this.currentContext!.events.push({
            type: 'touch',
            timestamp: performance.now(),
            data: {
              type: 'swipe',
              target: this.touchTracker.targetId,
              direction,
              distance,
              duration,
              velocity,
              angle,
              startX: this.touchTracker.startX,
              startY: this.touchTracker.startY,
              endX: x,
              endY: y
            }
          });

          console.log('👉 [Swipe]', { direction, distance, duration, velocity, angle });
        }

        // Flick検出（距離150px以下、200ms以内、速度1000px/s以上）
        if (distance <= 150 && duration <= 200 && velocity >= 1000) {
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          let direction: string = 'any';
          
          if (angle >= -45 && angle < 45) direction = 'right';
          else if (angle >= 45 && angle < 135) direction = 'down';
          else if (angle >= 135 || angle < -135) direction = 'left';
          else direction = 'up';

          this.currentContext!.events.push({
            type: 'touch',
            timestamp: performance.now(),
            data: {
              type: 'flick',
              target: this.touchTracker.targetId,
              direction,
              distance,
              duration,
              velocity,
              angle
            }
          });

          console.log('⚡ [Flick]', { direction, distance, duration, velocity });
        }

        // Hold検出（移動距離10px以下、1000ms以上）
        if (distance <= 10 && duration >= 1000) {
          this.currentContext!.events.push({
            type: 'touch',
            timestamp: performance.now(),
            data: {
              type: 'hold',
              target: this.touchTracker.targetId,
              duration,
              holdState: 'complete',
              currentDuration: duration,
              x: this.touchTracker.startX,
              y: this.touchTracker.startY
            }
          });

          console.log('⏱️ [Hold Complete]', { duration });
        }

        // upイベント発行
        this.currentContext!.events.push({
          type: 'touch',
          timestamp: performance.now(),
          data: {
            type: 'up',
            target: this.touchTracker.targetId,
            x, y,
            duration,
            distance
          }
        });

        // タッチ追跡リセット
        this.touchTracker = null;
      };

      // Holdプログレスチェック（100ms間隔）
      const holdCheckInterval = setInterval(() => {
        if (!this.touchTracker || this.touchTracker.isDragging) return;

        const currentDuration = performance.now() - this.touchTracker.startTime;
        const dx = this.touchTracker.currentX - this.touchTracker.startX;
        const dy = this.touchTracker.currentY - this.touchTracker.startY;
        const moveDistance = Math.sqrt(dx * dx + dy * dy);

        // 移動距離が許容範囲内（10px以下）
        if (moveDistance <= 10) {
          this.touchTracker.holdProgress = currentDuration / 1000; // 秒単位

          // Hold progressイベント発行
          this.currentContext!.events.push({
            type: 'touch',
            timestamp: performance.now(),
            data: {
              type: 'hold',
              target: this.touchTracker.targetId,
              duration: 1000, // 目標時間
              holdState: 'progress',
              currentDuration,
              progress: this.touchTracker.holdProgress,
              x: this.touchTracker.startX,
              y: this.touchTracker.startY
            }
          });
        }
      }, 100);

      canvasElement.addEventListener('pointerdown', handlePointerDown);
      canvasElement.addEventListener('pointermove', handlePointerMove);
      canvasElement.addEventListener('pointerup', handlePointerUp);

      // 14. ゲームループ開始
      console.log('🎬 ゲームループ開始');
      this.animationFrameId = requestAnimationFrame(gameLoop);

      // 15. ゲーム終了を待つ
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!running) {
            clearInterval(checkInterval);
            clearInterval(holdCheckInterval);
            canvasElement.removeEventListener('pointerdown', handlePointerDown);
            canvasElement.removeEventListener('pointermove', handlePointerMove);
            canvasElement.removeEventListener('pointerup', handlePointerUp);
            resolve();
          }
        }, 100);
      });

      // 16. 実行結果を返す
      const endTime = performance.now();
      const executionTime = (endTime - startTime) / 1000;

      const result: GameExecutionResult = {
        success: completed && gameState.score > 0,
        score: gameState.score,
        timeElapsed: gameState.timeElapsed,
        completed,
        errors,
        warnings,
        performance: {
          averageFPS,
          memoryUsage: 0,
          renderTime: executionTime,
          objectCount: objectsMap.size,
          ruleExecutions: ruleExecutionCount
        },
        finalState: {
          score: gameState.score,
          timeElapsed: gameState.timeElapsed,
          objectsInteracted: Array.from(new Set(objectsInteracted)),
          rulesTriggered: Array.from(new Set(rulesTriggered))
        }
      };

      console.log('✅ ゲーム実行完了:', result);
      return result;

    } catch (error) {
      console.error('❌ ゲーム実行エラー:', error);
      return {
        success: false,
        timeElapsed: 0,
        completed: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings,
        performance: {
          averageFPS: 0,
          memoryUsage: 0,
          renderTime: 0,
          objectCount: 0,
          ruleExecutions: 0
        }
      };
    }
  }

  /**
   * 画像読み込みヘルパー（タイムアウト付き）
   */
  private loadImage(img: HTMLImageElement, dataUrl: string, timeout: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, timeout);

      img.onload = () => {
        clearTimeout(timer);
        resolve();
      };

      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Image load failed'));
      };

      img.src = dataUrl;
    });
  }

  /**
   * ゲーム起動（HTMLコンテナに描画）
   */
  async launchFullGame(
    project: GameProject,
    containerElement: HTMLElement,
    onGameEnd?: (result: GameExecutionResult) => void
  ): Promise<void> {
    console.log('🚀 ゲーム起動:', project.name || project.settings.name);
    
    try {
      // 既存のキャンバスをクリア
      containerElement.innerHTML = '';
      
      // 新しいキャンバスを作成
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.maxWidth = '540px';
      canvas.style.maxHeight = '960px';
      canvas.style.margin = '0 auto';
      canvas.style.display = 'block';
      canvas.style.backgroundColor = '#FFE5F1';
      canvas.style.borderRadius = '8px';
      canvas.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
      
      containerElement.appendChild(canvas);
      
      // ゲーム実行
      const result = await this.executeGame(project, canvas);
      
      // 結果表示
      const resultOverlay = document.createElement('div');
      resultOverlay.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 32px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        text-align: center;
        z-index: 1000;
      `;
      
      resultOverlay.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">
          ${result.success ? '🎉' : '😔'}
        </div>
        <h2 style="margin: 0 0 16px 0; font-size: 28px; color: #1f2937;">
          ${result.success ? 'クリア！' : 'ゲームオーバー'}
        </h2>
        <p style="margin: 8px 0; font-size: 20px; color: #6b7280;">
          スコア: <strong>${result.score || 0}</strong>
        </p>
        <p style="margin: 8px 0; font-size: 16px; color: #9ca3af;">
          時間: ${result.timeElapsed.toFixed(1)}秒
        </p>
        ${result.warnings.length > 0 ? `
          <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              ⚠️ ${result.warnings.join(', ')}
            </p>
          </div>
        ` : ''}
      `;
      
      containerElement.style.position = 'relative';
      containerElement.appendChild(resultOverlay);
      
      if (onGameEnd) {
        onGameEnd(result);
      }
      
    } catch (error) {
      console.error('❌ ゲーム起動エラー:', error);
      containerElement.innerHTML = `
        <div style="padding: 32px; text-align: center; color: #dc2626;">
          <h3 style="margin: 0 0 16px 0;">ゲーム起動エラー</h3>
          <p style="margin: 0;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      `;
      
      if (onGameEnd) {
        onGameEnd({
          success: false,
          timeElapsed: 0,
          completed: false,
          errors: [error instanceof Error ? error.message : 'Launch failed'],
          warnings: [],
          performance: { averageFPS: 0, memoryUsage: 0, renderTime: 0, objectCount: 0, ruleExecutions: 0 }
        });
      }
    }
  }

  /**
   * クイックテストプレイ（短縮版）
   */
  async quickTestPlay(project: GameProject): Promise<GameExecutionResult> {
    console.log('🧪 クイックテストプレイ開始:', project.name || project.settings.name);
    
    try {
      // プロジェクト検証
      const validationErrors: string[] = [];
      
      if (!project.settings?.name?.trim()) {
        validationErrors.push('ゲーム名が設定されていません');
      }
      
      if ((!project.assets?.objects?.length) && (!project.assets?.background)) {
        validationErrors.push('最低1つのオブジェクトまたは背景が必要です');
      }
      
      if (!project.script?.rules?.length) {
        validationErrors.push('最低1つのルールが必要です');
      }
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }
      
      // 仮想キャンバス作成
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      
      // 短縮実行（5秒間）
      const originalDuration = project.settings.duration;
      project.settings.duration = { type: 'fixed', seconds: 5 };
      
      const result = await this.executeGame(project, canvas);
      
      // 元の設定に戻す
      project.settings.duration = originalDuration;
      
      console.log('✅ クイックテストプレイ完了:', result);
      return result;
      
    } catch (error) {
      console.error('❌ クイックテストプレイエラー:', error);
      return {
        success: false,
        timeElapsed: 0,
        completed: false,
        errors: [error instanceof Error ? error.message : 'Test failed'],
        warnings: [],
        performance: {
          averageFPS: 0,
          memoryUsage: 0,
          renderTime: 0,
          objectCount: 0,
          ruleExecutions: 0
        }
      };
    }
  }

  /**
   * リセット
   */
  reset(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.ruleEngine = null;
    this.currentContext = null;
    this.touchTracker = null;
    console.log('🔄 EditorGameBridge リセット完了');
  }
}

// デフォルトエクスポート
export default EditorGameBridge;