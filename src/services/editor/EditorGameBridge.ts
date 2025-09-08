// src/services/editor/EditorGameBridge.ts
// エディター↔ゲーム連携システム - Phase 1-C実装 + 型安全性修正・初期条件対応

import { GameProject } from '../../types/editor/GameProject';
import { GameTemplate } from '../../game-engine/GameTemplate';
import { createDefaultInitialState, syncInitialStateWithLayout } from '../../types/editor/GameScript';

// ゲーム実行用データ形式（型安全性強化版）
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
  
  // 🔧 強化: 初期条件を含むアセットデータ
  assets: {
    background?: {
      url: string;
      width: number;
      height: number;
      // 🔧 追加: 初期条件
      initialVisible: boolean;
      initialFrame: number;
      animationSpeed: number;
      autoStart: boolean;
    };
    objects: Array<{
      id: string;
      name: string;
      url: string;
      width: number;
      height: number;
      scale: number;
      opacity: number;
      // 🔧 追加: 初期配置・状態
      initialX: number;         // 0-1正規化座標
      initialY: number;         // 0-1正規化座標
      initialVisible: boolean;
      initialRotation: number;
      zIndex: number;
      animationIndex: number;
      animationSpeed: number;
      autoStartAnimation: boolean;
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
      // 🔧 追加: 初期状態
      initialVisible: boolean;
      initialRotation: number;
      zIndex: number;
    }>;
    audio?: {
      bgm?: {
        url: string;
        volume: number;
        autoPlay: boolean;
      };
      se: Array<{
        id: string;
        url: string;
        trigger: string;
        volume: number;
      }>;
      // 🔧 追加: 音声初期設定
      masterVolume: number;
      seVolume: number;
    };
  };
  
  // 🔧 型安全性強化: ゲームルール
  rules: Array<{
    id: string;
    type: 'touch' | 'timer' | 'collision' | 'condition';
    condition: {
      type: string;
      target?: string;
      [key: string]: any;        // 拡張可能な条件データ
    } | null;
    action: {
      type: string;
      [key: string]: any;        // 拡張可能なアクションデータ
    } | null;
    priority: number;
    enabled: boolean;
  }>;
  
  // 🔧 型安全性強化: 成功条件
  successConditions: Array<{
    id: string;
    type: 'score' | 'time' | 'collection' | 'custom';
    target: number | string;
    current: number;
    comparison?: '>=' | '>' | '==' | '<' | '<=';
    description?: string;
  }>;
  
  // 🔧 追加: 初期ゲーム状態
  initialGameState: {
    score: number;
    timeLimit?: number;
    targetScore?: number;
    lives?: number;
    level?: number;
    flags: Record<string, boolean>;
  };
}

// ゲーム実行結果（詳細情報追加）
export interface GameExecutionResult {
  success: boolean;
  score?: number;
  timeElapsed: number;
  completed: boolean;
  errors: string[];
  warnings: string[];           // 🔧 追加: 警告情報
  performance: {
    averageFPS: number;
    memoryUsage: number;
    renderTime: number;
    objectCount: number;        // 🔧 追加: オブジェクト数
    ruleExecutions: number;     // 🔧 追加: ルール実行回数
  };
  // 🔧 追加: ゲーム終了時の状態
  finalState?: {
    score: number;
    timeElapsed: number;
    objectsInteracted: string[];
    rulesTriggered: string[];
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

  // 🔧 修正: プロジェクト → ゲーム実行データ変換（型安全性・初期条件対応）
  convertProjectToGameData(project: GameProject): GameExecutionData {
    console.log('🔄 プロジェクト→ゲームデータ変換開始:', project.name);
    
    try {
      // 🔧 初期条件の取得・作成
      let initialState = project.script.initialState;
      if (!initialState) {
        console.log('⚠️ 初期条件なし→デフォルト作成');
        initialState = createDefaultInitialState();
        // レイアウトと同期
        initialState = syncInitialStateWithLayout(initialState, project.script.layout);
      }

      // 基本設定変換
      const settings = {
        duration: project.settings.duration?.type === 'unlimited' 
          ? null 
          : project.settings.duration?.seconds || 10,
        gameSpeed: (project.metadata?.gameSpeed as number) || 1.0,
        autoStart: true
      };

      // 🔧 背景アセット変換（初期条件対応）
      const background = project.assets.background?.frames?.[0] ? {
        url: project.assets.background.frames[0].dataUrl,
        width: project.assets.background.frames[0].width,
        height: project.assets.background.frames[0].height,
        // 初期条件適用
        initialVisible: initialState.layout.background.visible,
        initialFrame: initialState.layout.background.frameIndex,
        animationSpeed: initialState.layout.background.animationSpeed,
        autoStart: initialState.layout.background.autoStart
      } : undefined;

      // 🔧 オブジェクトアセット変換（初期条件対応）
      const objects = project.assets.objects.map((asset, index) => {
        // 初期条件からマッチする設定を検索
        const initialObj = initialState.layout.objects.find(obj => obj.id === asset.id);
        
        return {
          id: asset.id,
          name: asset.name,
          url: asset.frames[0].dataUrl,
          width: asset.frames[0].width,
          height: asset.frames[0].height,
          scale: asset.defaultScale || 1.0,
          opacity: asset.defaultOpacity || 1.0,
          // 初期条件適用（フォールバック付き）
          initialX: initialObj?.position.x || (0.2 + (index * 0.15) % 0.6),
          initialY: initialObj?.position.y || (0.3 + (index * 0.1) % 0.4),
          initialVisible: initialObj?.visible !== undefined ? initialObj.visible : true,
          initialRotation: initialObj?.rotation || 0,
          zIndex: initialObj?.zIndex || index + 1,
          animationIndex: initialObj?.animationIndex || 0,
          animationSpeed: initialObj?.animationSpeed || 12,
          autoStartAnimation: initialObj?.autoStart || false
        };
      });

      // 🔧 テキストアセット変換（初期条件対応・fontFamily対応）
      const texts = project.assets.texts.map((text, index) => {
        const initialText = initialState.layout.texts.find(t => t.id === text.id);
        
        return {
          id: text.id,
          content: text.content,
          x: initialText?.position.x || (50 + (index * 100)),
          y: initialText?.position.y || (100 + (index * 50)),
          fontSize: text.style.fontSize,
          color: text.style.color,
          fontWeight: text.style.fontWeight,
          fontFamily: text.style.fontFamily || 'Inter, sans-serif', // 🔧 undefined対応
          // 初期条件適用
          initialVisible: initialText?.visible !== undefined ? initialText.visible : true,
          initialRotation: initialText?.rotation || 0,
          zIndex: initialText?.zIndex || index + 1
        };
      });

      // 🔧 型安全なルール変換（型重複・型ガード修正）
      const rules = project.script.rules.map((rule, index) => {
        const firstCondition = rule.triggers?.conditions?.[0];
        const firstAction = rule.actions?.[0];
        
        return {
          id: rule.id,
          type: 'touch' as const, // デフォルトタッチルール
          condition: firstCondition ? {
            // 🔧 修正: 型重複回避 - typeは展開に含まれるため個別指定を削除
            target: ('target' in firstCondition ? firstCondition.target : 'self'),
            ...firstCondition // 既存プロパティを安全に展開（type含む）
          } : null,
          action: firstAction ? {
            // 🔧 修正: 型重複回避 - typeは展開に含まれるため個別指定を削除
            ...firstAction // 既存プロパティを安全に展開（type含む）
          } : null,
          priority: rule.priority || index,
          enabled: rule.enabled !== undefined ? rule.enabled : true
        };
      });

      // 🔧 型安全な成功条件変換
      const successConditions = project.script.successConditions.map((condition, index) => {
        const firstCondition = condition.conditions?.[0];
        
        return {
          id: condition.id || `success_${index}`,
          type: (firstCondition?.type as 'score' | 'time' | 'collection' | 'custom') || 'custom',
          target: firstCondition?.scoreValue || 
                  firstCondition?.timeValue || 
                  firstCondition?.objectValue || 
                  100, // デフォルト目標値
          current: 0,
          comparison: firstCondition?.scoreComparison || 
                     firstCondition?.timeComparison || 
                     '>=',
          description: condition.name || '目標達成'
        };
      });

      // 🔧 音声アセット変換（初期条件対応）
      const audio = project.assets.audio.bgm || project.assets.audio.se.length > 0 ? {
        bgm: project.assets.audio.bgm ? {
          url: project.assets.audio.bgm.dataUrl,
          volume: initialState.audio.bgm?.volume || 0.8,
          autoPlay: initialState.audio.bgm?.autoPlay || false
        } : undefined,
        se: project.assets.audio.se.map(se => ({
          id: se.id,
          url: se.dataUrl,
          trigger: 'touch', // デフォルト
          volume: initialState.audio.seVolume
        })),
        masterVolume: initialState.audio.masterVolume,
        seVolume: initialState.audio.seVolume
      } : {
        se: [],
        masterVolume: initialState.audio.masterVolume,
        seVolume: initialState.audio.seVolume
      };

      const gameData: GameExecutionData = {
        id: project.id,
        name: project.settings.name || 'Untitled Game',
        type: 'user-created',
        settings,
        assets: {
          background,
          objects,
          texts,
          audio
        },
        rules,
        successConditions,
        initialGameState: initialState.gameState
      };

      console.log('✅ 変換完了:', {
        name: gameData.name,
        objectCount: objects.length,
        textCount: texts.length,
        ruleCount: rules.length,
        duration: settings.duration,
        gameSpeed: settings.gameSpeed,
        initialGameState: initialState.gameState
      });

      this.currentGameData = gameData;
      return gameData;
      
    } catch (error) {
      console.error('❌ プロジェクト変換エラー:', error);
      throw new Error(`ゲームデータ変換に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 🔧 強化: ゲーム実行（テストプレイ）
  async executeGame(
    gameData: GameExecutionData,
    canvasElement: HTMLCanvasElement
  ): Promise<GameExecutionResult> {
    console.log('🎮 ゲーム実行開始:', gameData.name);
    
    const startTime = performance.now();
    let averageFPS = 60;
    let memoryUsage = 0;
    let ruleExecutions = 0;
    const warnings: string[] = [];
    const objectsInteracted: string[] = [];
    const rulesTriggered: string[] = [];
    
    try {
      // キャンバス初期化
      const ctx = canvasElement.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context を取得できません');
      }

      // キャンバスサイズ設定
      canvasElement.width = 360;  // モバイル対応
      canvasElement.height = 640;
      
      // 🔧 初期ゲーム状態設定
      const gameState = {
        score: gameData.initialGameState.score,
        timeElapsed: 0,
        timeLimit: gameData.initialGameState.timeLimit,
        running: true,
        completed: false,
        flags: { ...gameData.initialGameState.flags }, // コピーして独立性確保
        
        // オブジェクト状態（初期条件適用）
        objects: gameData.assets.objects.map(obj => ({
          ...obj,
          x: obj.initialX * canvasElement.width,   // 正規化座標→実座標変換
          y: obj.initialY * canvasElement.height,
          visible: obj.initialVisible,
          rotation: obj.initialRotation,
          currentAnimation: obj.animationIndex,
          vx: (Math.random() - 0.5) * 2 * gameData.settings.gameSpeed,
          vy: (Math.random() - 0.5) * 2 * gameData.settings.gameSpeed
        })),
        texts: gameData.assets.texts.map(text => ({
          ...text,
          visible: text.initialVisible,
          rotation: text.initialRotation
        }))
      };

      // 背景状態
      const backgroundState = gameData.assets.background ? {
        visible: gameData.assets.background.initialVisible,
        currentFrame: gameData.assets.background.initialFrame,
        animationTimer: 0
      } : null;

      // 画像リソース読み込み
      const imageCache = new Map<string, HTMLImageElement>();
      
      // 背景画像読み込み
      if (gameData.assets.background) {
        const bgImg = new Image();
        await new Promise<void>((resolve, reject) => {
          bgImg.onload = () => resolve();
          bgImg.onerror = () => {
            warnings.push('背景画像の読み込みに失敗しました');
            resolve(); // エラーでも継続
          };
          bgImg.src = gameData.assets.background!.url;
        });
        imageCache.set('background', bgImg);
      }

      // オブジェクト画像読み込み
      for (const obj of gameData.assets.objects) {
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => {
            warnings.push(`オブジェクト画像 "${obj.name}" の読み込みに失敗しました`);
            resolve(); // エラーでも継続
          };
          img.src = obj.url;
        });
        imageCache.set(obj.id, img);
      }

      // 🔧 ルール実行エンジン
      const executeRules = (eventType: string, eventData?: any) => {
        gameData.rules
          .filter(rule => rule.enabled && rule.condition)
          .sort((a, b) => b.priority - a.priority) // 優先度順
          .forEach(rule => {
            try {
              // 条件チェック（基本実装）
              let conditionMet = false;
              
              if (rule.condition?.type === 'touch' && eventType === 'touch') {
                if (rule.condition.target === 'stage' || 
                    (eventData?.objectId && rule.condition.target === eventData.objectId)) {
                  conditionMet = true;
                }
              } else if (rule.condition?.type === 'time' && eventType === 'time') {
                // 🔧 修正: 型安全なアクセス
                const targetTime = typeof rule.condition.seconds === 'number' ? rule.condition.seconds : 5;
                if (Math.abs(gameState.timeElapsed - targetTime) < 0.1) {
                  conditionMet = true;
                }
              } else if (rule.condition?.type === 'score' && eventType === 'score') {
                // 🔧 修正: 型安全なアクセス（Line 581対応）
                if (typeof rule.condition.target === 'number' && gameState.score >= rule.condition.target) {
                  conditionMet = true;
                }
              }
              
              // アクション実行
              if (conditionMet && rule.action) {
                ruleExecutions++;
                rulesTriggered.push(rule.id);
                
                switch (rule.action.type) {
                  case 'addScore':
                    gameState.score += (rule.action as any).points || 10;
                    break;
                    
                  case 'success':
                    gameState.score += (rule.action as any).score || 100;
                    gameState.running = false;
                    gameState.completed = true;
                    break;
                    
                  case 'failure':
                    gameState.running = false;
                    gameState.completed = false;
                    break;
                    
                  case 'setFlag':
                    const flagId = (rule.action as any).flagId;
                    const flagValue = (rule.action as any).value;
                    if (flagId) {
                      gameState.flags[flagId] = flagValue;
                    }
                    break;
                }
              }
            } catch (error) {
              console.warn('ルール実行エラー:', rule.id, error);
              warnings.push(`ルール "${rule.id}" の実行でエラーが発生しました`);
            }
          });
      };

      // ゲームループ
      const gameLoop = () => {
        if (!gameState.running) return;

        // 背景描画
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        if (backgroundState?.visible && imageCache.has('background')) {
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
            ctx.translate(obj.x + obj.width/2, obj.y + obj.height/2);
            ctx.rotate(obj.rotation * Math.PI / 180);
            ctx.drawImage(
              img,
              -obj.width * obj.scale / 2,
              -obj.height * obj.scale / 2,
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
          if (!text.visible) return;
          
          ctx.save();
          ctx.font = `${text.fontWeight} ${text.fontSize}px ${text.fontFamily}`;
          ctx.fillStyle = text.color;
          ctx.textAlign = 'left';
          ctx.translate(text.x, text.y);
          ctx.rotate(text.rotation * Math.PI / 180);
          ctx.fillText(text.content, 0, 0);
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
        
        // 時間ルール実行
        executeRules('time');

        // ゲーム終了判定
        if (gameData.settings.duration && gameState.timeElapsed >= gameData.settings.duration) {
          gameState.running = false;
          gameState.completed = true;
        }

        // 成功条件チェック
        gameData.successConditions.forEach(condition => {
          if (condition.type === 'score' && typeof condition.target === 'number' && gameState.score >= condition.target) {
            gameState.running = false;
            gameState.completed = true;
          }
        });

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
        warnings,
        performance: {
          averageFPS,
          memoryUsage,
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

  // 🔧 強化: 簡易テストプレイ（SettingsTabで使用）
  async quickTestPlay(project: GameProject): Promise<GameExecutionResult> {
    console.log('🧪 クイックテストプレイ開始:', project.name);
    
    try {
      // プロジェクト検証
      const validationErrors: string[] = [];
      
      if (!project.settings.name?.trim()) {
        validationErrors.push('ゲーム名が設定されていません');
      }
      
      if (!project.assets.objects.length && !project.assets.background) {
        validationErrors.push('最低1つのオブジェクトまたは背景が必要です');
      }
      
      if (!project.script.rules.length) {
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
      gameData.settings.duration = 3; // 3秒でテスト
      
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
    this.currentGameData = null;
    this.gameInstance = null;
    console.log('🔄 EditorGameBridge リセット完了');
  }
}

// デフォルトエクスポート
export default EditorGameBridge;