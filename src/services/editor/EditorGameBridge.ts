// src/services/editor/EditorGameBridge.ts
// Phase 1+2 完全統合版 - RuleEngine.ts 統合対応
// 🔧 修正: オブジェクト自動移動削除 + タッチイベント修正

import { GameProject } from '../../types/editor/GameProject';
import { GameRule, TriggerCondition, GameAction } from '../../types/editor/GameScript';
import { createDefaultInitialState, syncInitialStateWithLayout } from '../../types/editor/GameScript';
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

/**
 * EditorGameBridge - Phase 1+2 完全統合版
 * RuleEngine.ts を使用してエディターで作成したゲームを実行
 */
export class EditorGameBridge {
  private static instance: EditorGameBridge | null = null;
  private ruleEngine: RuleEngine | null = null;
  private animationFrameId: number | null = null;
  private currentContext: RuleExecutionContext | null = null;
  
  static getInstance(): EditorGameBridge {
    if (!this.instance) {
      this.instance = new EditorGameBridge();
    }
    return this.instance;
  }

  /**
   * ゲーム実行（RuleEngine統合版）
   */
  async executeGame(
    project: GameProject,
    canvasElement: HTMLCanvasElement
  ): Promise<GameExecutionResult> {
    console.log('🎮 ゲーム実行開始 (RuleEngine統合版):', project.name || project.settings.name);
    
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

      canvasElement.width = 360;
      canvasElement.height = 640;
      
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

      // オブジェクト画像読み込み
      if (project.assets?.objects) {
        for (const asset of project.assets.objects) {
          const frame = asset.frames?.[0];
          if (!frame?.dataUrl) {
            warnings.push(`オブジェクト "${asset.name}" の画像データがありません`);
            continue;
          }
          
          try {
            const img = new Image();
            await this.loadImage(img, frame.dataUrl, 2000);
            imageCache.set(asset.id, img);
            console.log(`✅ オブジェクト画像読み込み完了: ${asset.name}`);
          } catch (error) {
            warnings.push(`オブジェクト画像 "${asset.name}" の読み込みに失敗しました`);
          }
        }
      }

      // 8. RuleExecutionContext初期化
      const objectsMap = new Map();
      
      if (project.assets?.objects) {
        project.assets.objects.forEach((asset, index) => {
          const frame = asset.frames?.[0];
          const initialObj = initialState!.layout?.objects?.find(obj => obj.id === asset.id);
          
          // 初期位置（0-1正規化座標をピクセル座標に変換）
          const initialX = initialObj?.position?.x ?? (0.2 + (index * 0.15) % 0.6);
          const initialY = initialObj?.position?.y ?? (0.3 + (index * 0.1) % 0.4);
          
          // 🔧 修正: vx, vy を 0 に初期化（勝手に動かない）
          objectsMap.set(asset.id, {
            id: asset.id,
            x: initialX * canvasElement.width,
            y: initialY * canvasElement.height,
            width: frame?.width || 50,
            height: frame?.height || 50,
            visible: initialObj?.visible !== false,
            animationIndex: 0,
            animationPlaying: false,
            scale: asset.defaultScale || 1.0,
            rotation: 0,
            vx: 0,  // ✅ 0に初期化（ルールで制御）
            vy: 0,  // ✅ 0に初期化（ルールで制御）
            frameCount: asset.frames?.length || 1,
            currentFrame: 0
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

          // ✅ RuleEngine実行（毎フレーム）- イベントクリア前に実行
          try {
            const results = this.ruleEngine!.evaluateAndExecuteRules(this.currentContext!);
            ruleExecutionCount += results.length;
            
            // 実行されたルールを記録
            results.forEach(result => {
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

          // オブジェクト更新・描画
          objectsMap.forEach((obj, id) => {
            if (!obj.visible) return;

            // ✅ RuleEngineによる移動を適用（vx/vyが0でない場合のみ）
            if (obj.vx !== undefined && obj.vx !== 0) {
              obj.x += obj.vx;
            }
            if (obj.vy !== undefined && obj.vy !== 0) {
              obj.y += obj.vy;
            }

            // 画面外チェック（オブジェクトが画面外に出た場合、画面端で停止）
            if (obj.x < 0) {
              obj.x = 0;
              obj.vx = 0;
            }
            if (obj.x + obj.width * obj.scale > canvasElement.width) {
              obj.x = canvasElement.width - obj.width * obj.scale;
              obj.vx = 0;
            }
            if (obj.y < 0) {
              obj.y = 0;
              obj.vy = 0;
            }
            if (obj.y + obj.height * obj.scale > canvasElement.height) {
              obj.y = canvasElement.height - obj.height * obj.scale;
              obj.vy = 0;
            }

            // 描画
            const img = imageCache.get(id);
            if (img && img.complete) {
              ctx.save();
              ctx.globalAlpha = 1.0;
              ctx.drawImage(
                img,
                obj.x,
                obj.y,
                obj.width * obj.scale,
                obj.height * obj.scale
              );
              ctx.restore();
            } else {
              // フォールバック描画（画像未ロードの場合）
              ctx.fillStyle = '#FF6B9D';
              ctx.fillRect(obj.x, obj.y, obj.width * obj.scale, obj.height * obj.scale);
              
              // オブジェクト名表示
              ctx.fillStyle = 'white';
              ctx.font = 'bold 12px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(
                project.assets?.objects?.find(a => a.id === id)?.name || 'Object',
                obj.x + (obj.width * obj.scale) / 2,
                obj.y + (obj.height * obj.scale) / 2
              );
            }
          });

          // UI描画（残り時間プログレスバー）- 問題14対応：画面下部に配置
          if (gameDuration) {
            ctx.save();

            const barHeight = 16;
            const barPadding = 20;
            const barY = canvasElement.height - barHeight - barPadding; // 画面下部に配置
            const barWidth = canvasElement.width - (barPadding * 2);

            // 残り時間の割合を計算
            const remainingTime = Math.max(0, gameDuration - gameState.timeElapsed);
            const progress = remainingTime / gameDuration;

            // プログレスバーの背景（暗い背景）
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(barPadding, barY, barWidth, barHeight);

            // プログレスバーの色を残り時間に応じて変更
            let barColor;
            if (progress > 0.5) {
              barColor = '#10b981'; // 緑 (十分時間がある)
            } else if (progress > 0.25) {
              barColor = '#f59e0b'; // 黄色 (半分以下)
            } else {
              barColor = '#ef4444'; // 赤 (残りわずか)
            }

            // プログレスバー本体
            const currentBarWidth = barWidth * progress;
            ctx.fillStyle = barColor;
            ctx.fillRect(barPadding, barY, currentBarWidth, barHeight);

            // プログレスバーの枠線
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(barPadding, barY, barWidth, barHeight);

            ctx.restore();
          }

          // ゲーム終了判定（制限時間）
          if (gameDuration && gameState.timeElapsed >= gameDuration) {
            running = false;
            completed = true;
            console.log('⏰ 制限時間終了');
          }

          // 次フレーム
          if (running) {
            this.animationFrameId = requestAnimationFrame(gameLoop);
          }
          
        } catch (loopError) {
          console.error('❌ ゲームループエラー:', loopError);
          running = false;
          errors.push('ゲームループでエラーが発生しました');
        }
      };

      // 13. タッチ・クリックイベント
      const handleInteraction = (event: MouseEvent | TouchEvent) => {
        try {
          const rect = canvasElement.getBoundingClientRect();
          const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX;
          const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY;
          
          if (clientX === undefined || clientY === undefined) return;
          
          const x = clientX - rect.left;
          const y = clientY - rect.top;

          // オブジェクトクリック判定
          let hitObject: string | null = null;
          
          objectsMap.forEach((obj, id) => {
            if (!obj.visible) return;
            
            if (x >= obj.x && x <= obj.x + obj.width * obj.scale &&
                y >= obj.y && y <= obj.y + obj.height * obj.scale) {
              hitObject = id;
              objectsInteracted.push(id);
              
              // 🔧 修正: RuleEngineが期待する形式でイベント記録
              this.currentContext!.events.push({
                type: 'touch',
                timestamp: Date.now(),
                data: { 
                  target: id,  // ✅ 'target' キーを使用
                  x, 
                  y 
                }
              });
              
              console.log(`👆 オブジェクトタッチ: ${id} at (${x.toFixed(0)}, ${y.toFixed(0)})`);
            }
          });
          
          // ステージタッチの場合
          if (!hitObject) {
            // 🔧 修正: RuleEngineが期待する形式でイベント記録
            this.currentContext!.events.push({
              type: 'touch',
              timestamp: Date.now(),
              data: { 
                target: 'stage',  // ✅ 'target' キーを使用
                x, 
                y 
              }
            });
            
            console.log(`👆 ステージタッチ: at (${x.toFixed(0)}, ${y.toFixed(0)})`);
          }
          
        } catch (error) {
          console.warn('⚠️ インタラクション処理エラー:', error);
        }
      };

      canvasElement.addEventListener('click', handleInteraction);
      canvasElement.addEventListener('touchstart', handleInteraction);

      // 14. ゲーム開始
      console.log('🚀 ゲームループ開始');
      gameLoop();

      // 15. ゲーム完了まで待機
      await new Promise<void>(resolve => {
        const checkComplete = () => {
          if (!running) {
            resolve();
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });

      // 16. クリーンアップ
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      canvasElement.removeEventListener('click', handleInteraction);
      canvasElement.removeEventListener('touchstart', handleInteraction);

      // 17. 結果計算
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      const result: GameExecutionResult = {
        success: true,
        score: gameState.score,
        timeElapsed: gameState.timeElapsed,
        completed,
        errors,
        warnings,
        performance: {
          averageFPS,
          memoryUsage: 0,
          renderTime,
          objectCount: objectsMap.size,
          ruleExecutions: ruleExecutionCount
        },
        finalState: {
          score: gameState.score,
          timeElapsed: gameState.timeElapsed,
          objectsInteracted: [...new Set(objectsInteracted)],
          rulesTriggered: [...new Set(rulesTriggered)]
        }
      };

      console.log('✅ ゲーム実行完了:', result);
      return result;

    } catch (error) {
      console.error('❌ ゲーム実行エラー:', error);
      
      // クリーンアップ
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      
      return {
        success: false,
        timeElapsed: (performance.now() - startTime) / 1000,
        completed: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings,
        performance: {
          averageFPS: 0,
          memoryUsage: 0,
          renderTime: performance.now() - startTime,
          objectCount: 0,
          ruleExecutions: 0
        }
      };
    }
  }

  /**
   * 画像読み込みヘルパー
   */
  private loadImage(img: HTMLImageElement, src: string, timeout: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
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
      
      img.src = src;
    });
  }

  /**
   * フルゲーム実行（UI上のキャンバスで）
   */
  async launchFullGame(
    project: GameProject, 
    targetElement: HTMLElement,
    onGameEnd?: (result: GameExecutionResult) => void
  ): Promise<void> {
    console.log('🎮 フルゲーム実行開始:', project.name || project.settings.name);
    
    try {
      // ゲーム用キャンバス作成
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.maxWidth = '360px';
      canvas.style.maxHeight = '640px';
      canvas.style.border = '2px solid #E91E63';
      canvas.style.borderRadius = '12px';
      canvas.style.backgroundColor = '#FFE5F1';
      canvas.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      
      // 既存コンテンツクリア
      targetElement.innerHTML = '';
      targetElement.appendChild(canvas);
      
      // ゲーム実行
      const result = await this.executeGame(project, canvas);
      
      // 結果コールバック
      if (onGameEnd) {
        onGameEnd(result);
      }
      
      console.log('✅ フルゲーム実行完了:', result);
      
    } catch (error) {
      console.error('❌ フルゲーム実行エラー:', error);
      
      // エラー表示
      targetElement.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          padding: 40px;
          color: #e53e3e;
          background: linear-gradient(135deg, #FFE5F1 0%, #FFC0E0 100%);
          border-radius: 12px;
        ">
          <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
          <h3 style="font-size: 24px; margin-bottom: 12px; color: #C2185B;">ゲーム実行エラー</h3>
          <p style="font-size: 16px; color: #880E4F;">${error instanceof Error ? error.message : 'Unknown error'}</p>
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
      canvas.width = 360;
      canvas.height = 640;
      
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
    console.log('🔄 EditorGameBridge リセット完了');
  }
}

// デフォルトエクスポート
export default EditorGameBridge;