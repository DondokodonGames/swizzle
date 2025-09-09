// src/services/editor/EditorGameBridge.ts
// 修正版 - テストプレイ動作実現（真っ黒画面問題解決）

import { GameProject } from '../../types/editor/GameProject';
import { createDefaultInitialState, syncInitialStateWithLayout } from '../../types/editor/GameScript';

// ゲーム実行用データ形式（簡略化・修正版）
export interface GameExecutionData {
  id: string;
  name: string;
  
  // ゲーム設定
  settings: {
    duration: number | null;
    gameSpeed: number;
    autoStart: boolean;
  };
  
  // アセットデータ（修正版）
  assets: {
    background?: {
      url: string;
      width: number;
      height: number;
      initialVisible: boolean;
    };
    objects: Array<{
      id: string;
      name: string;
      url: string;
      width: number;
      height: number;
      initialX: number;         // 0-1正規化座標
      initialY: number;         // 0-1正規化座標
      initialVisible: boolean;
      scale: number;
    }>;
    texts: Array<{
      id: string;
      content: string;
      x: number;
      y: number;
      fontSize: number;
      color: string;
      fontFamily: string;
      initialVisible: boolean;
    }>;
  };
  
  // ルール（簡略化）
  rules: Array<{
    id: string;
    type: 'touch' | 'timer';
    targetId: string;
    condition: any;
    action: any;
    enabled: boolean;
  }>;
  
  // 初期ゲーム状態
  initialGameState: {
    score: number;
    timeLimit?: number;
    targetScore?: number;
    flags: Record<string, boolean>;
  };
}

// ゲーム実行結果（修正版）
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

// 修正版エディター↔ゲーム橋渡しクラス
export class EditorGameBridge {
  private static instance: EditorGameBridge | null = null;
  private currentGameData: GameExecutionData | null = null;
  private animationFrameId: number | null = null;
  
  static getInstance(): EditorGameBridge {
    if (!this.instance) {
      this.instance = new EditorGameBridge();
    }
    return this.instance;
  }

  // 🔧 修正: プロジェクト → ゲーム実行データ変換（堅牢版）
  convertProjectToGameData(project: GameProject): GameExecutionData {
    console.log('🔄 プロジェクト→ゲームデータ変換開始:', project.name);
    
    try {
      // 入力検証
      if (!project || !project.settings) {
        throw new Error('プロジェクトデータが不正です');
      }

      // 初期条件の取得・作成
      let initialState = project.script?.initialState;
      if (!initialState) {
        console.log('⚠️ 初期条件なし→デフォルト作成');
        initialState = createDefaultInitialState();
        if (project.script?.layout) {
          initialState = syncInitialStateWithLayout(initialState, project.script.layout);
        }
      }

      // 基本設定変換（安全な変換）
      const settings = {
        duration: project.settings.duration?.type === 'unlimited' 
          ? null 
          : (project.settings.duration?.seconds || 10),
        gameSpeed: Number(project.metadata?.gameSpeed) || 1.0,
        autoStart: true
      };

      // 🔧 修正: 背景アセット変換（null安全）
      const background = project.assets?.background?.frames?.[0] ? {
        url: project.assets.background.frames[0].dataUrl,
        width: project.assets.background.frames[0].width || 360,
        height: project.assets.background.frames[0].height || 640,
        initialVisible: initialState.layout?.background?.visible || false
      } : undefined;

      // 🔧 修正: オブジェクトアセット変換（堅牢版）
      const objects = (project.assets?.objects || []).map((asset, index) => {
        // 安全なデータアクセス
        const frame = asset.frames?.[0];
        if (!frame) {
          console.warn(`オブジェクト ${asset.name} にフレームデータがありません`);
        }

        const initialObj = initialState.layout?.objects?.find(obj => obj.id === asset.id);
        
        return {
          id: asset.id,
          name: asset.name || `Object ${index}`,
          url: frame?.dataUrl || '', // 空文字でフォールバック
          width: frame?.width || 50,
          height: frame?.height || 50,
          scale: asset.defaultScale || 1.0,
          // 🔧 修正: 安全な座標設定
          initialX: initialObj?.position?.x ?? (0.2 + (index * 0.15) % 0.6),
          initialY: initialObj?.position?.y ?? (0.3 + (index * 0.1) % 0.4),
          initialVisible: initialObj?.visible !== undefined ? initialObj.visible : true
        };
      });

      // 🔧 修正: テキストアセット変換（null安全）
      const texts = (project.assets?.texts || []).map((text, index) => {
        const initialText = initialState.layout?.texts?.find(t => t.id === text.id);
        
        return {
          id: text.id,
          content: text.content || '',
          x: initialText?.position?.x || (50 + (index * 100)),
          y: initialText?.position?.y || (100 + (index * 50)),
          fontSize: text.style?.fontSize || 16,
          color: text.style?.color || '#000000',
          fontFamily: text.style?.fontFamily || 'Arial, sans-serif',
          initialVisible: initialText?.visible !== undefined ? initialText.visible : true
        };
      });

      // 🔧 修正: ルール変換（型安全版）
      const rules = (project.script?.rules || []).map((rule, index) => {
        const firstCondition = rule.triggers?.conditions?.[0];
        const firstAction = rule.actions?.[0];
        
        return {
          id: rule.id,
          type: (firstCondition?.type === 'time' ? 'timer' : 'touch') as 'touch' | 'timer',
          targetId: rule.targetObjectId || 'stage',
          condition: firstCondition ? {
            ...firstCondition,
            // 🔧 修正: 型安全なプロパティアクセス
            // 🔧 修正: 型安全なプロパティアクセス
            seconds: firstCondition.type === 'time' && 'seconds' in firstCondition 
              ? (typeof firstCondition.seconds === 'number' ? firstCondition.seconds : 3)
              : 3
          } : null,
          action: firstAction ? { ...firstAction } : null,
          enabled: rule.enabled !== false // デフォルトtrue
        };
      });

      const gameData: GameExecutionData = {
        id: project.id || `game_${Date.now()}`,
        name: project.settings.name || 'Untitled Game',
        settings,
        assets: {
          background,
          objects,
          texts
        },
        rules,
        initialGameState: initialState.gameState || {
          score: 0,
          flags: {}
        }
      };

      console.log('✅ 変換完了:', {
        name: gameData.name,
        objectCount: objects.length,
        textCount: texts.length,
        ruleCount: rules.length,
        hasBackground: !!background
      });

      this.currentGameData = gameData;
      return gameData;
      
    } catch (error) {
      console.error('❌ プロジェクト変換エラー:', error);
      throw new Error(`ゲームデータ変換に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 🔧 修正: ゲーム実行（堅牢版）
  async executeGame(
    gameData: GameExecutionData,
    canvasElement: HTMLCanvasElement
  ): Promise<GameExecutionResult> {
    console.log('🎮 ゲーム実行開始:', gameData.name);
    
    const startTime = performance.now();
    let ruleExecutions = 0;
    const warnings: string[] = [];
    const objectsInteracted: string[] = [];
    const rulesTriggered: string[] = [];
    
    try {
      // Canvas初期化
      const ctx = canvasElement.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context を取得できません');
      }

      // キャンバスサイズ設定
      canvasElement.width = 360;
      canvasElement.height = 640;
      
      // ゲーム状態初期化
      const gameState = {
        score: gameData.initialGameState.score || 0,
        timeElapsed: 0,
        timeLimit: gameData.initialGameState.timeLimit,
        running: true,
        completed: false,
        flags: { ...gameData.initialGameState.flags },
        
        // オブジェクト状態（安全な座標変換）
        objects: gameData.assets.objects.map(obj => ({
          ...obj,
          // 🔧 修正: 安全な座標変換
          x: Math.max(0, Math.min(obj.initialX * canvasElement.width, canvasElement.width - obj.width)),
          y: Math.max(0, Math.min(obj.initialY * canvasElement.height, canvasElement.height - obj.height)),
          visible: obj.initialVisible,
          vx: (Math.random() - 0.5) * 2 * gameData.settings.gameSpeed,
          vy: (Math.random() - 0.5) * 2 * gameData.settings.gameSpeed
        })),
        texts: gameData.assets.texts.map(text => ({
          ...text,
          visible: text.initialVisible
        }))
      };

      // 🔧 修正: 画像リソース読み込み（堅牢版）
      const imageCache = new Map<string, HTMLImageElement>();
      
      // 背景画像読み込み
      if (gameData.assets.background?.url) {
        try {
          const bgImg = new Image();
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              warnings.push('背景画像の読み込みがタイムアウトしました');
              resolve(); // タイムアウトでも継続
            }, 3000);
            
            bgImg.onload = () => {
              clearTimeout(timeout);
              imageCache.set('background', bgImg);
              console.log('✅ 背景画像読み込み完了');
              resolve();
            };
            bgImg.onerror = () => {
              clearTimeout(timeout);
              warnings.push('背景画像の読み込みに失敗しました');
              resolve(); // エラーでも継続
            };
            bgImg.src = gameData.assets.background!.url;
          });
        } catch (error) {
          warnings.push('背景画像処理でエラーが発生しました');
        }
      }

      // オブジェクト画像読み込み
      for (const obj of gameData.assets.objects) {
        if (!obj.url) {
          warnings.push(`オブジェクト "${obj.name}" の画像URLが空です`);
          continue;
        }
        
        try {
          const img = new Image();
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              warnings.push(`オブジェクト画像 "${obj.name}" の読み込みがタイムアウトしました`);
              resolve();
            }, 2000);
            
            img.onload = () => {
              clearTimeout(timeout);
              imageCache.set(obj.id, img);
              console.log(`✅ オブジェクト画像読み込み完了: ${obj.name}`);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timeout);
              warnings.push(`オブジェクト画像 "${obj.name}" の読み込みに失敗しました`);
              resolve();
            };
            img.src = obj.url;
          });
        } catch (error) {
          warnings.push(`オブジェクト "${obj.name}" の画像処理でエラーが発生しました`);
        }
      }

      // 🔧 修正: ルール実行エンジン（型安全版）
      const executeRules = (eventType: string, eventData?: any) => {
        gameData.rules
          .filter(rule => rule.enabled && rule.condition)
          .forEach(rule => {
            try {
              let conditionMet = false;
              
              if (rule.type === 'touch' && eventType === 'touch') {
                if (rule.targetId === 'stage' || 
                    (eventData?.objectId && rule.targetId === eventData.objectId)) {
                  conditionMet = true;
                }
              } else if (rule.type === 'timer' && eventType === 'time') {
                const targetTime = rule.condition?.seconds || 5;
                if (Math.abs(gameState.timeElapsed - targetTime) < 0.1) {
                  conditionMet = true;
                }
              }
              
              // アクション実行
              if (conditionMet && rule.action) {
                ruleExecutions++;
                rulesTriggered.push(rule.id);
                
                switch (rule.action.type) {
                  case 'addScore':
                    gameState.score += rule.action.points || 10;
                    break;
                    
                  case 'success':
                    gameState.score += rule.action.score || 100;
                    gameState.running = false;
                    gameState.completed = true;
                    console.log('🎉 ゲーム成功!');
                    break;
                    
                  case 'failure':
                    gameState.running = false;
                    gameState.completed = false;
                    console.log('💀 ゲーム失敗');
                    break;
                }
              }
            } catch (error) {
              console.warn('ルール実行エラー:', rule.id, error);
              warnings.push(`ルール "${rule.id}" の実行でエラーが発生しました`);
            }
          });
      };

      // 🔧 修正: ゲームループ（メモリリーク対策）
      const gameLoop = () => {
        if (!gameState.running) {
          if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
          }
          return;
        }

        try {
          // 背景描画
          ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
          
          if (gameData.assets.background?.initialVisible && imageCache.has('background')) {
            const bgImg = imageCache.get('background')!;
            ctx.drawImage(bgImg, 0, 0, canvasElement.width, canvasElement.height);
          } else {
            // デフォルト背景
            const gradient = ctx.createLinearGradient(0, 0, 0, canvasElement.height);
            gradient.addColorStop(0, '#3B82F6');
            gradient.addColorStop(1, '#1D4ED8');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
          }

          // オブジェクト更新・描画
          gameState.objects.forEach(obj => {
            if (!obj.visible) return;
            
            // 位置更新
            obj.x += obj.vx || 0;
            obj.y += obj.vy || 0;

            // 境界チェック
            if (obj.x <= 0 || obj.x >= canvasElement.width - obj.width) {
              obj.vx = (obj.vx || 0) * -1;
            }
            if (obj.y <= 0 || obj.y >= canvasElement.height - obj.height) {
              obj.vy = (obj.vy || 0) * -1;
            }

            // 描画
            const img = imageCache.get(obj.id);
            if (img && img.complete) {
              ctx.save();
              ctx.drawImage(
                img,
                obj.x,
                obj.y,
                obj.width * obj.scale,
                obj.height * obj.scale
              );
              ctx.restore();
            } else {
              // フォールバック描画
              ctx.fillStyle = '#FF6B35';
              ctx.fillRect(obj.x, obj.y, obj.width * obj.scale, obj.height * obj.scale);
              
              // 名前表示
              ctx.fillStyle = 'white';
              ctx.font = '12px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(obj.name, obj.x + obj.width/2, obj.y + obj.height/2);
            }
          });

          // テキスト描画
          gameState.texts.forEach(text => {
            if (!text.visible) return;
            
            ctx.save();
            ctx.font = `${text.fontSize}px ${text.fontFamily}`;
            ctx.fillStyle = text.color;
            ctx.textAlign = 'left';
            ctx.fillText(text.content, text.x, text.y);
            ctx.restore();
          });

          // UI描画（スコア・時間）
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(10, 10, 200, 60);
          ctx.fillStyle = 'white';
          ctx.font = 'bold 16px Arial';
          ctx.fillText(`Score: ${gameState.score}`, 20, 30);
          ctx.fillText(`Time: ${gameState.timeElapsed.toFixed(1)}s`, 20, 50);
          ctx.restore();

          // 時間更新
          gameState.timeElapsed += 1/60;
          
          // 時間ルール実行
          executeRules('time');

          // ゲーム終了判定
          if (gameData.settings.duration && gameState.timeElapsed >= gameData.settings.duration) {
            gameState.running = false;
            gameState.completed = true;
          }

          // 次フレーム
          if (gameState.running) {
            this.animationFrameId = requestAnimationFrame(gameLoop);
          }
        } catch (error) {
          console.error('ゲームループエラー:', error);
          gameState.running = false;
        }
      };

      // 🔧 修正: タッチ・クリックイベント（堅牢版）
      const handleInteraction = (event: MouseEvent | TouchEvent) => {
        try {
          const rect = canvasElement.getBoundingClientRect();
          const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX;
          const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY;
          
          if (clientX === undefined || clientY === undefined) return;
          
          const x = clientX - rect.left;
          const y = clientY - rect.top;

          // オブジェクトクリック判定
          let hitObject = false;
          gameState.objects.forEach(obj => {
            if (!obj.visible) return;
            
            if (x >= obj.x && x <= obj.x + obj.width * obj.scale &&
                y >= obj.y && y <= obj.y + obj.height * obj.scale) {
              
              hitObject = true;
              objectsInteracted.push(obj.id);
              
              // タッチルール実行
              executeRules('touch', { objectId: obj.id });
              
              // デフォルト動作（位置リセット）
              obj.x = Math.random() * (canvasElement.width - obj.width);
              obj.y = Math.random() * (canvasElement.height - obj.height);
            }
          });
          
          // ステージタッチルール実行
          if (!hitObject) {
            executeRules('touch', { objectId: 'stage' });
          }
        } catch (error) {
          console.warn('インタラクション処理エラー:', error);
        }
      };

      // イベントリスナー登録
      canvasElement.addEventListener('click', handleInteraction);
      canvasElement.addEventListener('touchstart', handleInteraction);

      // ゲーム開始
      console.log('🚀 ゲームループ開始');
      gameLoop();

      // ゲーム完了まで待機
      await new Promise<void>(resolve => {
        const checkComplete = () => {
          if (!gameState.running) {
            resolve();
          } else {
            setTimeout(checkComplete, 100); // requestAnimationFrameの代わりに安全なsetTimeout
          }
        };
        checkComplete();
      });

      // クリーンアップ
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      canvasElement.removeEventListener('click', handleInteraction);
      canvasElement.removeEventListener('touchstart', handleInteraction);

      // 結果計算
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      const result: GameExecutionResult = {
        success: true,
        score: gameState.score,
        timeElapsed: gameState.timeElapsed,
        completed: gameState.completed,
        errors: [],
        warnings,
        performance: {
          averageFPS: 60,
          memoryUsage: 0,
          renderTime,
          objectCount: gameData.assets.objects.length,
          ruleExecutions
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

  // 🔧 修正: 簡易テストプレイ（SettingsTabで使用）
  async quickTestPlay(project: GameProject): Promise<GameExecutionResult> {
    console.log('🧪 クイックテストプレイ開始:', project.name);
    
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
      
      // プロジェクト変換
      const gameData = this.convertProjectToGameData(project);
      
      // 短縮実行（3秒間）
      const originalDuration = gameData.settings.duration;
      gameData.settings.duration = 3;
      
      const result = await this.executeGame(gameData, canvas);
      
      // 元の設定に戻す
      gameData.settings.duration = originalDuration;
      
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

  // フルゲーム実行（UI上のキャンバスで）
  async launchFullGame(
    project: GameProject, 
    targetElement: HTMLElement,
    onGameEnd?: (result: GameExecutionResult) => void
  ): Promise<void> {
    console.log('🎮 フルゲーム実行開始:', project.name);
    
    try {
      // ゲーム用キャンバス作成
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.maxWidth = '360px';
      canvas.style.maxHeight = '640px';
      canvas.style.border = '1px solid #ccc';
      canvas.style.borderRadius = '8px';
      canvas.style.backgroundColor = '#000';
      
      // 既存コンテンツクリア
      targetElement.innerHTML = '';
      targetElement.appendChild(canvas);
      
      // プロジェクト変換・実行
      const gameData = this.convertProjectToGameData(project);
      const result = await this.executeGame(gameData, canvas);
      
      // 結果コールバック
      if (onGameEnd) {
        onGameEnd(result);
      }
      
      console.log('✅ フルゲーム実行完了:', result);
      
    } catch (error) {
      console.error('❌ フルゲーム実行エラー:', error);
      
      // エラー表示
      targetElement.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #e53e3e;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h3>ゲーム実行エラー</h3>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
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

  // 現在のゲームデータ取得
  getCurrentGameData(): GameExecutionData | null {
    return this.currentGameData;
  }

  // リセット
  reset(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.currentGameData = null;
    console.log('🔄 EditorGameBridge リセット完了');
  }
}

// デフォルトエクスポート
export default EditorGameBridge;