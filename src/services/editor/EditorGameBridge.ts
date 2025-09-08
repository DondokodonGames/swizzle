// src/services/editor/EditorGameBridge.ts
// エディター↔ゲーム連携システム - Phase 1-C実装

import { GameProject } from '../../types/editor/GameProject';
import { GameTemplate } from '../../game-engine/GameTemplate';

// ゲーム実行用データ形式
export interface GameExecutionData {
  id: string;
  name: string;
  type: 'user-created' | 'template-based';
  
  // ゲーム設定
  settings: {
    duration: number | null;  // nullは無制限
    gameSpeed: number;        // ゲームスピード倍率
    autoStart: boolean;
  };
  
  // アセットデータ
  assets: {
    background?: {
      url: string;
      width: number;
      height: number;
    };
    objects: Array<{
      id: string;
      name: string;
      url: string;
      width: number;
      height: number;
      scale: number;
      opacity: number;
    }>;
    texts: Array<{
      id: string;
      content: string;
      x: number;
      y: number;
      fontSize: number;
      color: string;
      fontWeight: 'normal' | 'bold';
      fontFamily: string;
    }>;
    audio?: {
      bgm?: string;
      se: Array<{
        id: string;
        url: string;
        trigger: string;
      }>;
    };
  };
  
  // ゲームルール
  rules: Array<{
    id: string;
    type: 'touch' | 'timer' | 'collision' | 'condition';
    condition: any;
    action: any;
    priority: number;
  }>;
  
  // 成功条件
  successConditions: Array<{
    type: 'score' | 'time' | 'collection' | 'custom';
    target: number | string;
    current: number;
  }>;
}

// ゲーム実行結果
export interface GameExecutionResult {
  success: boolean;
  score?: number;
  timeElapsed: number;
  completed: boolean;
  errors: string[];
  performance: {
    averageFPS: number;
    memoryUsage: number;
    renderTime: number;
  };
}

// エディター↔ゲーム橋渡しクラス
export class EditorGameBridge {
  private static instance: EditorGameBridge | null = null;
  private currentGameData: GameExecutionData | null = null;
  private gameInstance: any = null; // 実際のゲームインスタンス
  
  // シングルトンパターン
  static getInstance(): EditorGameBridge {
    if (!this.instance) {
      this.instance = new EditorGameBridge();
    }
    return this.instance;
  }

  // プロジェクト → ゲーム実行データ変換
  convertProjectToGameData(project: GameProject): GameExecutionData {
    console.log('プロジェクト→ゲームデータ変換開始:', project.name);
    
    try {
      // 基本設定変換
      const settings = {
        duration: project.settings.duration?.type === 'unlimited' 
          ? null 
          : project.settings.duration?.seconds || 10,
        gameSpeed: (project.metadata?.gameSpeed as number) || 1.0,
        autoStart: true
      };

      // 背景アセット変換
      const background = project.assets.background?.frames?.[0] ? {
        url: project.assets.background.frames[0].dataUrl,
        width: project.assets.background.frames[0].width,
        height: project.assets.background.frames[0].height
      } : undefined;

      // オブジェクトアセット変換
      const objects = project.assets.objects.map((obj, index) => ({
        id: obj.id,
        name: obj.name,
        url: obj.frames[0].dataUrl,
        width: obj.frames[0].width,
        height: obj.frames[0].height,
        scale: obj.defaultScale || 1.0,
        opacity: obj.defaultOpacity || 1.0
      }));

      // 🔧 テキストアセット変換（fontFamily undefined対応）
      const texts = project.assets.texts.map((text, index) => ({
        id: text.id,
        content: text.content,
        x: 50 + (index * 100), // デフォルト配置
        y: 100 + (index * 50),
        fontSize: text.style.fontSize,
        color: text.style.color,
        fontWeight: text.style.fontWeight,
        fontFamily: text.style.fontFamily || 'Inter, sans-serif' // 🔧 undefined対応
      }));

      // 🔧 ルール変換（正しい型アクセス）
      const rules = project.script.rules.map((rule, index) => ({
        id: rule.id,
        type: 'touch' as const, // デフォルトタッチルール
        // 🔧 修正: rule.triggers.conditions から安全にアクセス
        condition: rule.triggers?.conditions?.[0] || null,
        // 🔧 修正: rule.actions から安全にアクセス  
        action: rule.actions?.[0] || null,
        priority: index
      }));

      // 🔧 成功条件変換（正しい型アクセス）
      const successConditions = project.script.successConditions.map(condition => ({
        // 🔧 修正: condition.conditions[0]?.type から安全にアクセス
        type: (condition.conditions?.[0]?.type as 'score' | 'time' | 'collection' | 'custom') || 'custom',
        // 🔧 修正: 具体的な条件値を安全に取得
        target: condition.conditions?.[0]?.scoreValue || 
                condition.conditions?.[0]?.timeValue || 
                'default',
        current: 0
      }));

      const gameData: GameExecutionData = {
        id: project.id,
        name: project.settings.name || 'Untitled Game',
        type: 'user-created',
        settings,
        assets: {
          background,
          objects,
          texts,
          audio: project.assets.audio.bgm ? {
            bgm: project.assets.audio.bgm.dataUrl,
            se: project.assets.audio.se.map(se => ({
              id: se.id,
              url: se.dataUrl,
              trigger: 'touch' // デフォルト
            }))
          } : { se: [] }
        },
        rules,
        successConditions
      };

      console.log('変換完了:', {
        name: gameData.name,
        objectCount: objects.length,
        textCount: texts.length,
        ruleCount: rules.length,
        duration: settings.duration,
        gameSpeed: settings.gameSpeed
      });

      this.currentGameData = gameData;
      return gameData;
      
    } catch (error) {
      console.error('プロジェクト変換エラー:', error);
      throw new Error(`ゲームデータ変換に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ゲーム実行（テストプレイ）
  async executeGame(
    gameData: GameExecutionData,
    canvasElement: HTMLCanvasElement
  ): Promise<GameExecutionResult> {
    console.log('ゲーム実行開始:', gameData.name);
    
    const startTime = performance.now();
    let averageFPS = 60;
    let memoryUsage = 0;
    
    try {
      // キャンバス初期化
      const ctx = canvasElement.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context を取得できません');
      }

      // キャンバスサイズ設定
      canvasElement.width = 360;  // モバイル対応
      canvasElement.height = 640;
      
      // ゲーム状態初期化
      const gameState = {
        score: 0,
        timeElapsed: 0,
        running: true,
        completed: false,
        objects: gameData.assets.objects.map(obj => ({
          ...obj,
          x: Math.random() * (canvasElement.width - 100) + 50,
          y: Math.random() * (canvasElement.height - 100) + 50,
          vx: (Math.random() - 0.5) * 2 * gameData.settings.gameSpeed,
          vy: (Math.random() - 0.5) * 2 * gameData.settings.gameSpeed
        })),
        texts: gameData.assets.texts
      };

      // 画像リソース読み込み
      const imageCache = new Map<string, HTMLImageElement>();
      
      // 背景画像読み込み
      if (gameData.assets.background) {
        const bgImg = new Image();
        await new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = gameData.assets.background!.url;
        });
        imageCache.set('background', bgImg);
      }

      // オブジェクト画像読み込み
      for (const obj of gameData.assets.objects) {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => resolve(null); // エラーは無視
          img.src = obj.url;
        });
        imageCache.set(obj.id, img);
      }

      // ゲームループ
      const gameLoop = () => {
        if (!gameState.running) return;

        // 背景描画
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        if (imageCache.has('background')) {
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
          // 位置更新
          obj.x += obj.vx;
          obj.y += obj.vy;

          // 境界チェック
          if (obj.x <= 0 || obj.x >= canvasElement.width - obj.width) {
            obj.vx *= -1;
          }
          if (obj.y <= 0 || obj.y >= canvasElement.height - obj.height) {
            obj.vy *= -1;
          }

          // 描画
          const img = imageCache.get(obj.id);
          if (img) {
            ctx.save();
            ctx.globalAlpha = obj.opacity;
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
          }
        });

        // テキスト描画
        gameState.texts.forEach(text => {
          ctx.save();
          ctx.font = `${text.fontWeight} ${text.fontSize}px ${text.fontFamily}`;
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
        gameState.timeElapsed += 1/60; // 60FPS想定

        // ゲーム終了判定
        if (gameData.settings.duration && gameState.timeElapsed >= gameData.settings.duration) {
          gameState.running = false;
          gameState.completed = true;
        }

        // 次フレーム
        if (gameState.running) {
          requestAnimationFrame(gameLoop);
        }
      };

      // タッチ・クリックイベント
      const handleInteraction = (event: MouseEvent | TouchEvent) => {
        const rect = canvasElement.getBoundingClientRect();
        const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
        const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
        
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // オブジェクトクリック判定
        gameState.objects.forEach(obj => {
          if (x >= obj.x && x <= obj.x + obj.width * obj.scale &&
              y >= obj.y && y <= obj.y + obj.height * obj.scale) {
            gameState.score += 10;
            
            // オブジェクト位置リセット
            obj.x = Math.random() * (canvasElement.width - obj.width);
            obj.y = Math.random() * (canvasElement.height - obj.height);
          }
        });
      };

      canvasElement.addEventListener('click', handleInteraction);
      canvasElement.addEventListener('touchstart', handleInteraction);

      // ゲーム開始
      gameLoop();

      // ゲーム完了まで待機
      await new Promise<void>(resolve => {
        const checkComplete = () => {
          if (!gameState.running) {
            resolve();
          } else {
            requestAnimationFrame(checkComplete);
          }
        };
        checkComplete();
      });

      // クリーンアップ
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
        performance: {
          averageFPS,
          memoryUsage,
          renderTime
        }
      };

      console.log('ゲーム実行完了:', result);
      return result;

    } catch (error) {
      console.error('ゲーム実行エラー:', error);
      
      return {
        success: false,
        timeElapsed: (performance.now() - startTime) / 1000,
        completed: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        performance: {
          averageFPS: 0,
          memoryUsage: 0,
          renderTime: performance.now() - startTime
        }
      };
    }
  }

  // 簡易テストプレイ（SettingsTabで使用）
  async quickTestPlay(project: GameProject): Promise<GameExecutionResult> {
    console.log('クイックテストプレイ開始:', project.name);
    
    try {
      // 仮想キャンバス作成
      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 640;
      
      // プロジェクト変換
      const gameData = this.convertProjectToGameData(project);
      
      // 短縮実行（2秒間）
      const originalDuration = gameData.settings.duration;
      gameData.settings.duration = 2; // 2秒でテスト
      
      const result = await this.executeGame(gameData, canvas);
      
      // 元の設定に戻す
      gameData.settings.duration = originalDuration;
      
      console.log('クイックテストプレイ完了:', result);
      return result;
      
    } catch (error) {
      console.error('クイックテストプレイエラー:', error);
      return {
        success: false,
        timeElapsed: 0,
        completed: false,
        errors: [error instanceof Error ? error.message : 'Test failed'],
        performance: {
          averageFPS: 0,
          memoryUsage: 0,
          renderTime: 0
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
    console.log('フルゲーム実行開始:', project.name);
    
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
      
      console.log('フルゲーム実行完了:', result);
      
    } catch (error) {
      console.error('フルゲーム実行エラー:', error);
      
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
          performance: { averageFPS: 0, memoryUsage: 0, renderTime: 0 }
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
    this.currentGameData = null;
    this.gameInstance = null;
    console.log('EditorGameBridge リセット完了');
  }
}

// デフォルトエクスポート
export default EditorGameBridge;