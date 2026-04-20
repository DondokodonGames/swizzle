// src/services/editor/EditorGameBridge.ts
// Phase H完全統合版 - 正常動作保証
// ✅ bc9ae40f版ベース + 新機能（物理・エフェクト・アニメーション）統合
// ✅ FPS表示削除、描画ロジック保護、タッチハンドラ保護
// 作成日: 2025年12月4日

import { GameProject } from '../../types/editor/GameProject';
import { GameRule, TriggerCondition, GameAction, PhysicsProperties } from '../../types/editor/GameScript';
import { createDefaultInitialState, syncInitialStateWithLayout, createDefaultPhysics } from '../../types/editor/GameScript';
import { RuleEngine, RuleExecutionContext, ActionExecutionResult } from '../rule-engine/RuleEngine';
import { getBackgroundUrl, getObjectUrl, getAudioAssetUrl, getAssetFrameUrl } from '../../utils/assetUrl';

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
 * EditorGameBridge - Phase H完全統合版（正常動作保証）
 * RuleEngine.ts を使用してエディターで作成したゲームを実行
 */
export class EditorGameBridge {
  private static instance: EditorGameBridge | null = null;
  private ruleEngine: RuleEngine | null = null;
  private animationFrameId: number | null = null;
  private gameLoopTimerId: number | null = null;
  private currentContext: RuleExecutionContext | null = null;
  private shouldStopGame: boolean = false;
  private currentCanvas: HTMLCanvasElement | null = null;
  private currentHandleInteraction: ((event: MouseEvent | TouchEvent) => void) | null = null;

  static getInstance(): EditorGameBridge {
    if (!this.instance) {
      this.instance = new EditorGameBridge();
    }
    return this.instance;
  }

  /**
   * 実行中のゲームを強制停止
   */
  stopGame(): void {
    console.log('🛑 ゲーム強制停止リクエスト');
    this.shouldStopGame = true;

    // アニメーションフレームをキャンセル
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // ゲームループタイマーをキャンセル
    if (this.gameLoopTimerId) {
      clearTimeout(this.gameLoopTimerId);
      this.gameLoopTimerId = null;
    }

    // イベントリスナーを削除
    if (this.currentCanvas && this.currentHandleInteraction) {
      this.currentCanvas.removeEventListener('click', this.currentHandleInteraction);
      this.currentCanvas.removeEventListener('touchstart', this.currentHandleInteraction);
    }

    // コンテキストをクリア
    this.currentContext = null;
    this.currentCanvas = null;
    this.currentHandleInteraction = null;

    console.log('✅ ゲーム停止完了');
  }

  /**
   * ゲームが実行中かどうかを確認
   */
  isGameRunning(): boolean {
    return this.animationFrameId !== null || this.gameLoopTimerId !== null;
  }

  /**
   * ゲーム実行（RuleEngine統合版 + Phase H新機能）
   */
  async executeGame(
    project: GameProject,
    canvasElement: HTMLCanvasElement
  ): Promise<GameExecutionResult> {
    console.log('🎮 ゲーム実行開始 (Phase H統合版):', project.name || project.settings.name);

    // ゲーム停止フラグをリセット
    this.shouldStopGame = false;
    this.currentCanvas = canvasElement;

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
      // project.script.counters を優先使用（AI生成ゲームのメインパス）
      const registeredCounterNames = new Set<string>();
      const now4 = new Date().toISOString();

      if (project.script?.counters && project.script.counters.length > 0) {
        project.script.counters.forEach((counter: any) => {
          this.ruleEngine!.addCounterDefinition({
            id: counter.id || `counter_${counter.name}`,
            name: counter.name,
            initialValue: counter.initialValue ?? 0,
            currentValue: counter.initialValue ?? 0,
            min: counter.min ?? 0,
            max: counter.max ?? 9999,
            persistence: counter.persistence || 'game',
            createdAt: counter.createdAt || now4,
            lastModified: counter.lastModified || now4
          });
          registeredCounterNames.add(counter.name);
        });
        console.log(`✅ script.countersからカウンター登録: ${project.script.counters.length}個`);
      }

      // initialState.gameState.counters にのみ存在するカウンターも登録（既存ゲーム互換）
      const counters = initialState.gameState?.counters || {};
      Object.entries(counters).forEach(([name, value]) => {
        if (!registeredCounterNames.has(name)) {
          this.ruleEngine!.addCounterDefinition({
            id: `counter_${name}_${Date.now()}`,
            name: name,
            initialValue: typeof value === 'number' ? value : 0,
            currentValue: typeof value === 'number' ? value : 0,
            min: 0,
            max: 9999,
            persistence: 'game',
            createdAt: now4,
            lastModified: now4
          });
          registeredCounterNames.add(name);
        }
      });
      if (registeredCounterNames.size > 0) {
        console.log(`✅ カウンター合計登録: ${registeredCounterNames.size}個`);
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
          conditionCount: r.triggers?.conditions?.length ?? 0,
          actionCount: r.actions?.length ?? 0,
          conditions: r.triggers?.conditions?.map(c => c.type) ?? [],
          actions: r.actions?.map(a => a.type) ?? []
        })));

        const enabledRules = project.script.rules.filter(rule => rule.enabled !== false);
        console.log(`✅ 有効なルール: ${enabledRules.length}個`);

        enabledRules.forEach((rule, index) => {
          console.log(`📝 ルール登録 #${index + 1}: "${rule.name}" (id=${rule.id})`);
          console.log(`   - 対象: ${rule.targetObjectId}`);
          console.log(`   - 条件: ${rule.triggers?.conditions?.map(c => c.type).join(', ') ?? 'なし'}`);
          console.log(`   - アクション: ${rule.actions?.map(a => a.type).join(', ') ?? 'なし'}`);
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

      // 7. 画像リソース読み込み（ローディング画面表示）
      const imageCache = new Map<string, HTMLImageElement>();

      // ローディング画面を表示
      const showLoadingScreen = (progress: number, message: string) => {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

        // プログレスバー背景
        const barWidth = 600;
        const barHeight = 20;
        const barX = (canvasElement.width - barWidth) / 2;
        const barY = canvasElement.height / 2;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // プログレスバー
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);

        // テキスト
        ctx.fillStyle = '#ffffff';
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎮 Loading...', canvasElement.width / 2, barY - 60);
        ctx.font = '28px sans-serif';
        ctx.fillText(message, canvasElement.width / 2, barY + 80);
        ctx.fillText(`${Math.floor(progress * 100)}%`, canvasElement.width / 2, barY + 130);
      };

      // 読み込むべき画像の総数をカウント
      let totalImages = 0;
      let loadedImages = 0;

      if (project.assets?.background && getBackgroundUrl(project.assets.background)) {
        totalImages++;
      }
      if (project.assets?.objects) {
        for (const asset of project.assets.objects) {
          totalImages += asset.frames?.length || 0;
        }
      }

      // 初期ローディング画面表示
      showLoadingScreen(0, '画像を読み込んでいます...');

      // 画像読み込みヘルパー（リトライ付き）
      const loadImageWithRetry = async (src: string, retries: number = 3): Promise<HTMLImageElement> => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await this.loadImage(img, src, 8000); // タイムアウトを8秒に延長
            return img;
          } catch (error) {
            if (attempt === retries) {
              throw error;
            }
            console.log(`⏳ 画像読み込みリトライ (${attempt}/${retries}): ${src.substring(0, 50)}...`);
            await new Promise(r => setTimeout(r, 500 * attempt)); // 待機してリトライ
          }
        }
        throw new Error('Image load failed after retries');
      };

      // 背景画像読み込み（storageUrl / dataUrl両対応）
      if (project.assets?.background) {
        const bgUrl = getBackgroundUrl(project.assets.background);
        if (bgUrl) {
          try {
            const bgImg = await loadImageWithRetry(bgUrl);
            imageCache.set('background', bgImg);
            loadedImages++;
            showLoadingScreen(loadedImages / Math.max(totalImages, 1), '背景画像読み込み完了');
            console.log('✅ 背景画像読み込み完了');
          } catch (error) {
            warnings.push('背景画像の読み込みに失敗しました');
            loadedImages++;
            showLoadingScreen(loadedImages / Math.max(totalImages, 1), '背景画像読み込み失敗');
          }
        }
      }

      // オブジェクト画像読み込み（全フレーム対応・storageUrl / dataUrl両対応）
      if (project.assets?.objects) {
        // 全画像を並列で読み込み（高速化）
        const loadPromises: Promise<void>[] = [];

        for (const asset of project.assets.objects) {
          if (!asset.frames || asset.frames.length === 0) {
            warnings.push(`オブジェクト "${asset.name}" の画像データがありません`);
            continue;
          }

          // 全フレームを並列読み込み
          for (let frameIndex = 0; frameIndex < asset.frames.length; frameIndex++) {
            const frame = asset.frames[frameIndex];
            const frameUrl = getAssetFrameUrl(frame);
            if (!frameUrl) {
              warnings.push(`オブジェクト "${asset.name}" のフレーム${frameIndex}の画像データがありません`);
              continue;
            }

            const loadPromise = loadImageWithRetry(frameUrl)
              .then(img => {
                imageCache.set(`${asset.id}_frame${frameIndex}`, img);
                loadedImages++;
                showLoadingScreen(loadedImages / Math.max(totalImages, 1), `${asset.name} 読み込み中...`);
                console.log(`✅ オブジェクト画像読み込み完了: ${asset.name} (frame ${frameIndex})`);
              })
              .catch(error => {
                warnings.push(`オブジェクト画像 "${asset.name}" フレーム${frameIndex}の読み込みに失敗しました`);
                loadedImages++;
                showLoadingScreen(loadedImages / Math.max(totalImages, 1), `${asset.name} 読み込み失敗`);
              });

            loadPromises.push(loadPromise);
          }
        }

        // 全ての画像読み込みを待機
        await Promise.all(loadPromises);
      }

      // ローディング完了画面
      showLoadingScreen(1, 'ゲーム開始準備完了！');
      await new Promise(r => setTimeout(r, 300)); // 少し待機してユーザーに見せる

      // 7.5. 音声リソース読み込み
      const audioCache = new Map<string, HTMLAudioElement>();

      // BGM読み込み（storageUrl / dataUrl両対応）
      if (project.assets?.audio?.bgm) {
        const bgmUrl = getAudioAssetUrl(project.assets.audio.bgm);
        if (bgmUrl) {
          try {
            const bgmAudio = new Audio(bgmUrl);
            bgmAudio.crossOrigin = 'anonymous'; // CORS対応
            bgmAudio.loop = true;
            audioCache.set('bgm', bgmAudio);
            console.log('✅ BGM読み込み完了');
          } catch (error) {
            warnings.push('BGMの読み込みに失敗しました');
          }
        }
      }

      // SE読み込み（storageUrl / dataUrl両対応）
      if (project.assets?.audio?.se) {
        for (const se of project.assets.audio.se) {
          const seUrl = getAudioAssetUrl(se);
          if (!seUrl) continue;
          try {
            const seAudio = new Audio(seUrl);
            seAudio.crossOrigin = 'anonymous'; // CORS対応
            audioCache.set(se.id, seAudio);
            console.log(`✅ SE読み込み完了: ${se.name}`);
          } catch (error) {
            warnings.push(`SE "${se.name}" の読み込みに失敗しました`);
          }
        }
      }

      // AudioSystem作成
      let bgmAudio: HTMLAudioElement | null = null;
      const audioSystem = {
        playSound: async (soundId: string, volume?: number) => {
          const audio = audioCache.get(soundId);
          if (audio) {
            audio.volume = volume ?? 1.0;
            audio.currentTime = 0;
            await audio.play().catch(e => console.warn('Audio play failed:', e));
          }
        },
        stopSound: (soundId: string) => {
          const audio = audioCache.get(soundId);
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
          }
        },
        setVolume: (soundId: string, volume: number) => {
          const audio = audioCache.get(soundId);
          if (audio) {
            audio.volume = Math.max(0, Math.min(1, volume));
          }
        },
        playBGM: (soundId?: string, volume?: number) => {
          if (bgmAudio) {
            bgmAudio.pause();
            bgmAudio.currentTime = 0;
          }
          const audio = audioCache.get(soundId ?? 'bgm');
          if (audio) {
            audio.volume = Math.max(0, Math.min(1, volume ?? 0.7));
            audio.loop = true;
            audio.currentTime = 0;
            audio.play().catch(e => console.warn('BGM play failed:', e));
            bgmAudio = audio;
          }
        },
        stopBGM: () => {
          if (bgmAudio) {
            bgmAudio.pause();
            bgmAudio.currentTime = 0;
            bgmAudio = null;
          }
        }
      };

      // 8. RuleExecutionContext初期化
      const objectsMap = new Map();
      
      if (project.assets?.objects) {
        project.assets.objects.forEach((asset, index) => {
          const frame = asset.frames?.[0];
          
          // layoutから全プロパティを取得（エディターで設定した値を使用）
          const layoutObj = project.script?.layout?.objects?.find(obj => obj.objectId === asset.id);
          
          // フォールバック用にinitialStateも取得
          const initialObj = initialState!.layout?.objects?.find(obj => obj.id === asset.id);
          
          // ✅ 位置優先順位: layoutObj.position > initialObj.position > デフォルト（bc9ae40f版）
          const posX = layoutObj?.position?.x ?? initialObj?.position?.x ?? (0.2 + (index * 0.15) % 0.6);
          const posY = layoutObj?.position?.y ?? initialObj?.position?.y ?? (0.3 + (index * 0.1) % 0.4);
          
          console.log(`📍 オブジェクト "${asset.name}" 位置:`, {
            layoutPosition: layoutObj?.position,
            initialPosition: initialObj?.position,
            finalPosition: { x: posX, y: posY }
          });
          
          // 中心座標を計算
          const centerX = posX * canvasElement.width;
          const centerY = posY * canvasElement.height;
          
          // ✅ スケール優先順位: layoutObj.scale > asset.defaultScale > 1.0（bc9ae40f版）
          const layoutScaleX = layoutObj?.scale?.x;
          const layoutScaleY = layoutObj?.scale?.y;
          const defaultScale = asset.defaultScale || 1.0;
          
          // X/Yスケールが別々に設定されている場合も対応
          const scaleX = layoutScaleX ?? defaultScale;
          const scaleY = layoutScaleY ?? defaultScale;
          // 内部処理用に平均値を使用（後方互換性のため）
          const scale = (scaleX + scaleY) / 2;
          
          console.log(`📐 オブジェクト "${asset.name}" スケール:`, {
            layoutScale: layoutObj?.scale,
            defaultScale,
            finalScale: scale
          });
          
          // 回転: layoutObj.rotation を使用
          const rotation = layoutObj?.rotation ?? 0;
          
          // zIndex: layoutObj.zIndex を使用（描画順序に影響）
          const zIndex = layoutObj?.zIndex ?? index + 1;
          
          // 初期アニメーションフレーム: layoutObj.initialState.animation を使用
          const initialFrame = layoutObj?.initialState?.animation ?? 0;
          
          // 表示状態の取得
          const visible = layoutObj?.initialState?.visible ?? initialObj?.visible ?? true;
          
          // アニメーション設定
          const animationPlaying = layoutObj?.initialState?.autoStart ?? initialObj?.autoStart ?? false;
          const animationSpeed = layoutObj?.initialState?.animationSpeed ?? initialObj?.animationSpeed ?? 12;
          
          // 🆕 物理プロパティの取得（Phase H新機能）
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
          
          const width = frame?.width || 50;
          const height = frame?.height || 50;
          
          // 左上座標として保存（RuleEngine互換性）
          const x = centerX - (width * scale) / 2;
          const y = centerY - (height * scale) / 2;
          
          objectsMap.set(asset.id, {
            id: asset.id,
            x,  // 左上X（RuleEngine互換）
            y,  // 左上Y（RuleEngine互換）
            width,
            height,
            visible,
            animationIndex: 0,
            animationPlaying,
            animationSpeed,
            scale,  // layoutObj.scaleを反映
            scaleX, // ✅ X方向スケール保存（bc9ae40f版）
            scaleY, // ✅ Y方向スケール保存（bc9ae40f版）
            rotation, // layoutObj.rotationを反映
            zIndex,   // layoutObj.zIndexを反映
            vx: 0,
            vy: 0,
            frameCount: asset.frames?.length || 1,
            currentFrame: initialFrame, // 初期アニメーションフレームを反映
            lastFrameUpdate: performance.now(),
            
            // 🆕 物理プロパティ追加（Phase H新機能）
            physics
          });
        });
      }

      // 9. ゲーム状態初期化
      const gameState: RuleExecutionContext['gameState'] = {
        isPlaying: true,
        isPaused: false,
        score: initialState.gameState?.score || 0,
        timeElapsed: 0,
        flags: new Map(Object.entries(initialState.gameState?.flags || {}).map(([k, v]) => [k, Boolean(v)])),
        counters: new Map(Object.entries(initialState.gameState?.counters || {}).map(([k, v]) => [k, Number(v)]))
        // pendingEndTime と endReason は省略（新しいオブジェクトなので自動的にクリアされる）
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
        },
        audioSystem
      };

      // パーティクルプール
      interface SimpleParticle {
        x: number; y: number; vx: number; vy: number;
        size: number; color: string; alpha: number;
        createdAt: number; maxLife: number; useGravity: boolean;
      }
      const particlePool: SimpleParticle[] = [];
      this.currentContext.particleSystem = {
        emit: (config: any) => {
          const count = Math.min(config.count || 20, 80);
          const colors: string[] = config.colors || ['#FFD700'];
          const spread = config.spread || 100;
          const speed = config.speed || 200;
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = speed * (0.4 + Math.random() * 0.6);
            particlePool.push({
              x: config.x + (Math.random() - 0.5) * spread * 0.4,
              y: config.y + (Math.random() - 0.5) * spread * 0.4,
              vx: Math.cos(angle) * spd / 60,
              vy: Math.sin(angle) * spd / 60 - 1.5,
              size: (config.size || 10) * (0.4 + Math.random() * 0.6),
              color: colors[Math.floor(Math.random() * colors.length)],
              alpha: 1.0,
              createdAt: performance.now(),
              maxLife: (config.duration || 1.0) * 1000,
              useGravity: config.gravity !== false,
            });
          }
        }
      };

      console.log('✅ ゲーム初期化完了:', {
        objectCount: objectsMap.size,
        ruleCount: project.script?.rules?.length || 0,
        counters: Array.from(gameState.counters.keys()),
        flags: Array.from(gameState.flags.keys()),
        initialGameState: {
          isPlaying: gameState.isPlaying,
          timeElapsed: gameState.timeElapsed,
          pendingEndTime: gameState.pendingEndTime,
          endReason: gameState.endReason
        }
      });

      // 11. ゲームループ変数
      let running = true;
      let completed = false;
      const gameDuration = project.settings.duration?.type === 'unlimited'
        ? null
        : (project.settings.duration?.seconds || 15);

      const frameTime = 1000 / 60; // 60 FPS固定 (約16.67ms)
      const fixedDeltaTime = 1 / 60; // 物理演算用の固定deltaTime (秒)
      let lastFrameTime = performance.now();
      let fpsFrames = 0;
      let fpsTime = 0;
      let averageFPS = 60;

      // 12. ゲームループ（60fps固定）
      const gameLoop = () => {
        // ゲーム停止チェック（外部からの停止リクエストまたはゲーム終了）
        if (!running || this.shouldStopGame) {
          if (!running) {
            console.log(`🛑 [GameLoop] ゲーム停止: running=false (timeElapsed=${gameState.timeElapsed.toFixed(2)}s)`);
          }
          if (this.shouldStopGame) {
            console.log(`🛑 [GameLoop] ゲーム停止: shouldStopGame=true (timeElapsed=${gameState.timeElapsed.toFixed(2)}s)`);
          }
          if (this.gameLoopTimerId) {
            clearTimeout(this.gameLoopTimerId);
            this.gameLoopTimerId = null;
          }
          running = false;  // 外部停止時もrunningをfalseに
          return;
        }

        try {
          const currentTime = performance.now();
          const actualDeltaTime = currentTime - lastFrameTime;
          lastFrameTime = currentTime;

          // FPS計測（実際のフレームレートを測定）
          fpsFrames++;
          fpsTime += actualDeltaTime;
          if (fpsTime >= 1000) {
            averageFPS = (fpsFrames / fpsTime) * 1000;
            fpsFrames = 0;
            fpsTime = 0;
          }

          // 時間更新（固定deltaTimeを使用してフレームレート非依存）
          gameState.timeElapsed += fixedDeltaTime;
          this.currentContext!.gameState.timeElapsed = gameState.timeElapsed;

          // ホールドイベント生成（タッチ継続中）
          if (touchActive) {
            const holdDuration = Date.now() - touchStartTime;
            if (holdDuration >= 300) {
              this.currentContext!.events.push({
                type: 'touch', timestamp: Date.now(),
                data: {
                  type: 'hold', touchType: 'hold',
                  target: touchedObjectId ?? 'stage',
                  currentDuration: holdDuration,
                  holdState: holdDuration >= 1000 ? 'complete' : 'progress'
                }
              });
            }
          }

          // 🆕 Phase H新機能: 物理演算更新（固定60fps）
          if (this.ruleEngine) {
            this.ruleEngine.updatePhysics(this.currentContext!, fixedDeltaTime);
          }

          // 🆕 Phase H新機能: エフェクト更新（毎フレーム）
          if (this.ruleEngine) {
            this.ruleEngine.updateEffects(this.currentContext!);
          }

          // 🆕 Phase H新機能: アニメーション更新（毎フレーム）
          if (this.ruleEngine) {
            this.ruleEngine.updateAnimations(this.currentContext!, currentTime);
          }

          // デバッグ: ルール評価前のイベント確認
          if (this.currentContext!.events.length > 0) {
            console.log('🔍 [GameLoop] ルール評価前 - context.events:', this.currentContext!.events.map(e => ({
              type: e.type,
              timestamp: e.timestamp,
              data: e.data
            })));
          }

          // RuleEngine実行（毎フレーム）- イベントクリア前に実行
          try {
            const results = this.ruleEngine!.evaluateAndExecuteRules(this.currentContext!);
            ruleExecutionCount += results.length;

            // 実行されたルールを記録
            results.forEach((result, idx) => {
              if (result.success) {
                rulesTriggered.push('rule_executed');

                // ゲーム状態の更新を反映
                if (result.newGameState) {
                  if (result.newGameState.score !== undefined) {
                    gameState.score = result.newGameState.score;
                  }
                  // pendingEndTime処理: success/failure後の遅延終了
                  if (result.newGameState.pendingEndTime !== undefined) {
                    console.log(`🚨 [GameLoop] ルール実行により終了予約: timeElapsed=${gameState.timeElapsed.toFixed(2)}s, pendingEndTime=${result.newGameState.pendingEndTime}, endReason=${result.newGameState.endReason}, ruleIndex=${idx}`);
                    gameState.pendingEndTime = result.newGameState.pendingEndTime;
                    gameState.endReason = result.newGameState.endReason;
                  }
                  if (result.newGameState.isPlaying !== undefined) {
                    console.log(`🚨 [GameLoop] ルール実行によりisPlaying変更: ${gameState.isPlaying} -> ${result.newGameState.isPlaying}, timeElapsed=${gameState.timeElapsed.toFixed(2)}s, ruleIndex=${idx}`);
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

          // success/failure後の遅延終了チェック
          if (gameState.pendingEndTime !== undefined && Date.now() >= gameState.pendingEndTime) {
            console.log(`🏁 ${gameState.endReason === 'success' ? '成功' : '失敗'}により1秒後にゲーム終了 (timeElapsed=${gameState.timeElapsed.toFixed(2)}s, pendingEndTime=${gameState.pendingEndTime}, now=${Date.now()})`);
            running = false;
            completed = true;
            gameState.isPlaying = false;
          }

          // イベント履歴をフレーム終了時にクリア
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

          // zIndex順にソートしてから描画
          const sortedObjects = Array.from(objectsMap.entries())
            .sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0));

          // オブジェクト更新・描画（zIndex順）
          sortedObjects.forEach(([id, obj]) => {
            if (!obj.visible) return;

            // アニメーションフレーム更新
            if (obj.animationPlaying && obj.frameCount > 1) {
              const frameInterval = 1000 / (obj.animationSpeed || 12); // fps to ms
              if (currentTime - obj.lastFrameUpdate >= frameInterval) {
                obj.currentFrame = (obj.currentFrame + 1) % obj.frameCount;
                obj.lastFrameUpdate = currentTime;
              }
            }

            // RuleEngineによる移動を適用（vx/vyが0でない場合のみ）
            if (obj.vx !== undefined && obj.vx !== 0) {
              obj.x += obj.vx;
            }
            if (obj.vy !== undefined && obj.vy !== 0) {
              obj.y += obj.vy;
            }

            // arc移動（放物線パス）— vx/vyより後に実行して上書き
            if (obj.arcStartTime !== undefined && obj.arcDuration !== undefined) {
              const t = Math.min((currentTime - obj.arcStartTime) / obj.arcDuration, 1.0);
              obj.x = obj.arcStartX! + (obj.arcTargetX! - obj.arcStartX!) * t;
              obj.y = obj.arcStartY! + (obj.arcTargetY! - obj.arcStartY!) * t
                    - (obj.arcHeight! * 4 * t * (1 - t));
              if (t >= 1.0) {
                obj.arcStartTime = undefined;
                obj.arcDuration = undefined;
                obj.arcStartX = undefined;
                obj.arcStartY = undefined;
                obj.arcTargetX = undefined;
                obj.arcTargetY = undefined;
                obj.arcHeight = undefined;
              }
            }

            // ✅ 中心基準で描画（scaleX/scaleY個別対応）
            const objWidth = obj.width * (obj.scaleX ?? obj.scale);
            const objHeight = obj.height * (obj.scaleY ?? obj.scale);
            const drawCenterX = obj.x + objWidth / 2;
            const drawCenterY = obj.y + objHeight / 2;

            // 描画（現在のフレームを使用）
            const frameKey = `${id}_frame${obj.currentFrame || 0}`;
            const img = imageCache.get(frameKey);
            
            ctx.save();
            
            // ✅ 回転を適用（中心を基準に回転）- bc9ae40f版のロジック
            if (obj.rotation && obj.rotation !== 0) {
              ctx.translate(drawCenterX, drawCenterY);
              ctx.rotate((obj.rotation * Math.PI) / 180); // 度をラジアンに変換
              ctx.translate(-drawCenterX, -drawCenterY);
            }
            
            if (img && img.complete) {
              ctx.globalAlpha = obj.alpha ?? 1.0;
              ctx.drawImage(
                img,
                drawCenterX - objWidth / 2,  // 中心基準で計算した左上X
                drawCenterY - objHeight / 2,  // 中心基準で計算した左上Y
                objWidth,
                objHeight
              );
            } else {
              // フォールバック描画（画像未ロードの場合）
              ctx.globalAlpha = obj.alpha ?? 1.0;
              ctx.fillStyle = '#FF6B9D';
              ctx.fillRect(
                drawCenterX - objWidth / 2,
                drawCenterY - objHeight / 2,
                objWidth,
                objHeight
              );
              
              // オブジェクト名表示
              ctx.fillStyle = 'white';
              ctx.font = 'bold 12px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(
                project.assets?.objects?.find(a => a.id === id)?.name || 'Object',
                drawCenterX,  // 中心X
                drawCenterY   // 中心Y
              );
            }
            
            ctx.restore();
          });

          // パーティクル更新・描画
          if (particlePool.length > 0) {
            const pNow = performance.now();
            for (let pi = particlePool.length - 1; pi >= 0; pi--) {
              const p = particlePool[pi];
              const pAge = pNow - p.createdAt;
              if (pAge >= p.maxLife) {
                particlePool.splice(pi, 1);
                continue;
              }
              p.x += p.vx;
              p.y += p.vy;
              if (p.useGravity) p.vy += 0.3;
              p.alpha = 1 - pAge / p.maxLife;
              ctx.save();
              ctx.globalAlpha = p.alpha;
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }

          // ゲーム終了判定（制限時間）
          if (gameDuration && gameState.timeElapsed >= gameDuration) {
            running = false;
            completed = true;
            console.log(`⏰ 制限時間終了: timeElapsed=${gameState.timeElapsed.toFixed(2)}s >= gameDuration=${gameDuration}s`);
          }

          // 次フレーム（60fps固定）
          if (running) {
            this.gameLoopTimerId = window.setTimeout(gameLoop, frameTime);
          }

        } catch (loopError) {
          console.error('❌ ゲームループエラー:', loopError);
          running = false;
          errors.push('ゲームループでエラーが発生しました');
        }
      };

      // 13. タッチ追跡状態（swipe/flick/drag/hold 検出用）
      let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
      let lastTouchX = 0, lastTouchY = 0;
      let touchedObjectId: string | null = null;
      let touchActive = false;

      // タッチ座標をキャンバス座標に変換
      const toCanvasCoords = (clientX: number, clientY: number) => {
        const rect = canvasElement.getBoundingClientRect();
        return {
          x: (clientX - rect.left) * (canvasElement.width / rect.width),
          y: (clientY - rect.top) * (canvasElement.height / rect.height),
        };
      };

      // ヒットオブジェクトを検出
      const hitTest = (x: number, y: number): string | null => {
        const sorted = Array.from(objectsMap.entries())
          .sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0));
        for (const [id, obj] of sorted) {
          if (!obj.visible) continue;
          const w = obj.width * (obj.scaleX ?? obj.scale);
          const h = obj.height * (obj.scaleY ?? obj.scale);
          if (x >= obj.x && x <= obj.x + w && y >= obj.y && y <= obj.y + h) return id;
        }
        return null;
      };

      // タッチ方向を算出
      const getDirection = (dx: number, dy: number): string =>
        Math.abs(dx) >= Math.abs(dy)
          ? (dx >= 0 ? 'right' : 'left')
          : (dy >= 0 ? 'down' : 'up');

      // 13. ✅ タッチ・クリックイベント（bc9ae40f版のシンプルなhandleInteraction）
      const handleInteraction = (event: MouseEvent | TouchEvent) => {
        try {
          const rect = canvasElement.getBoundingClientRect();
          const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX;
          const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY;

          if (clientX === undefined || clientY === undefined) return;

          // CSS表示サイズからキャンバス内部サイズ(1080x1920)にスケーリング
          const scaleX = canvasElement.width / rect.width;
          const scaleY = canvasElement.height / rect.height;
          const x = (clientX - rect.left) * scaleX;
          const y = (clientY - rect.top) * scaleY;

          // zIndex順（逆順＝上から）でヒット判定
          const sortedForHitTest = Array.from(objectsMap.entries())
            .sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0)); // 上のオブジェクトから判定

          let hitObject: string | null = null;
          
          for (const [id, obj] of sortedForHitTest) {
            if (!obj.visible) continue;

            // ✅ scaleX/scaleY個別対応（ヒット判定）
            const objWidth = obj.width * (obj.scaleX ?? obj.scale);
            const objHeight = obj.height * (obj.scaleY ?? obj.scale);
            
            if (x >= obj.x && x <= obj.x + objWidth &&
                y >= obj.y && y <= obj.y + objHeight) {
              hitObject = id;
              objectsInteracted.push(id);
              
              // RuleEngineが期待する形式でイベント記録
              const touchEvent = {
                type: 'touch',
                timestamp: Date.now(),
                data: { 
                  target: id,
                  touchType: 'down',
                  x, 
                  y 
                }
              };
              this.currentContext!.events.push(touchEvent);
              
              console.log(`👆 オブジェクトタッチ: ${id} at (${x.toFixed(0)}, ${y.toFixed(0)})`);
              console.log('🔍 [HandleInteraction] イベント追加後 - context.events:', this.currentContext!.events);
              
              break; // 最前面のオブジェクトのみヒット
            }
          }
          
          // ステージタッチの場合
          if (!hitObject) {
            // RuleEngineが期待する形式でイベント記録
            const touchEvent = {
              type: 'touch',
              timestamp: Date.now(),
              data: { 
                target: 'stage',
                touchType: 'down',
                x, 
                y 
              }
            };
            this.currentContext!.events.push(touchEvent);
            
            console.log(`👆 ステージタッチ: at (${x.toFixed(0)}, ${y.toFixed(0)})`);
          }

          // タッチ追跡状態を更新
          touchStartX = x; touchStartY = y; touchStartTime = Date.now();
          lastTouchX = x; lastTouchY = y;
          touchedObjectId = hitObject;
          touchActive = 'touches' in event;  // タッチデバイスのみ追跡

          // ドラッグ開始イベント
          if (touchActive) {
            this.currentContext!.events.push({
              type: 'touch', timestamp: Date.now(),
              data: { type: 'drag', touchType: 'drag', dragState: 'start',
                      target: hitObject ?? 'stage', x, y }
            });
          }

        } catch (error) {
          console.warn('⚠️ インタラクション処理エラー:', error);
        }
      };

      const handleTouchMove = (event: TouchEvent) => {
        event.preventDefault();
        if (!this.currentContext || !touchActive) return;
        const touch = event.touches[0];
        if (!touch) return;
        const { x, y } = toCanvasCoords(touch.clientX, touch.clientY);
        lastTouchX = x; lastTouchY = y;
        this.currentContext.events.push({
          type: 'touch', timestamp: Date.now(),
          data: { type: 'drag', touchType: 'drag', dragState: 'dragging',
                  target: touchedObjectId ?? 'stage', x, y }
        });
      };

      const handleTouchEnd = (event: TouchEvent) => {
        if (!this.currentContext || !touchActive) return;
        touchActive = false;
        const endTime = Date.now();
        const dx = lastTouchX - touchStartX;
        const dy = lastTouchY - touchStartY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = endTime - touchStartTime;
        const velocity = duration > 0 ? (distance / duration) * 1000 : 0;
        const direction = getDirection(dx, dy);

        // ドラッグ終了
        this.currentContext.events.push({
          type: 'touch', timestamp: endTime,
          data: { type: 'drag', touchType: 'drag', dragState: 'end',
                  target: touchedObjectId ?? 'stage', x: lastTouchX, y: lastTouchY }
        });

        // タッチアップ
        this.currentContext.events.push({
          type: 'touch', timestamp: endTime,
          data: { touchType: 'up', target: touchedObjectId ?? 'stage',
                  x: lastTouchX, y: lastTouchY }
        });

        // フリック判定（速い・短距離・短時間）
        if (velocity >= 1000 && distance <= 150 && duration <= 200) {
          this.currentContext.events.push({
            type: 'touch', timestamp: endTime,
            data: { type: 'flick', touchType: 'flick', target: touchedObjectId ?? 'stage',
                    distance, duration, velocity, direction }
          });
        }
        // スワイプ判定（速い・長距離）
        else if (velocity >= 500 && distance >= 100 && duration <= 500) {
          this.currentContext.events.push({
            type: 'touch', timestamp: endTime,
            data: { type: 'swipe', touchType: 'swipe', target: touchedObjectId ?? 'stage',
                    distance, duration, velocity, direction }
          });
        }

        touchedObjectId = null;
      };

      canvasElement.addEventListener('click', handleInteraction);
      canvasElement.addEventListener('touchstart', handleInteraction, { passive: false });
      canvasElement.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvasElement.addEventListener('touchend', handleTouchEnd);

      // 外部停止用にハンドラ参照を保存
      this.currentHandleInteraction = handleInteraction;

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
      if (this.gameLoopTimerId) {
        clearTimeout(this.gameLoopTimerId);
        this.gameLoopTimerId = null;
      }
      canvasElement.removeEventListener('click', handleInteraction);
      canvasElement.removeEventListener('touchstart', handleInteraction);
      canvasElement.removeEventListener('touchmove', handleTouchMove);
      canvasElement.removeEventListener('touchend', handleTouchEnd);
      audioSystem.stopBGM();

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
      if (this.gameLoopTimerId) {
        clearTimeout(this.gameLoopTimerId);
        this.gameLoopTimerId = null;
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
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.backgroundColor = '#000000';
      
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

      // エラー表示（XSS対策: textContentを使用）
      const errorContainer = document.createElement('div');
      errorContainer.style.cssText = `
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
      `;

      const iconDiv = document.createElement('div');
      iconDiv.style.cssText = 'font-size: 64px; margin-bottom: 20px;';
      iconDiv.textContent = '⚠️';

      const titleH3 = document.createElement('h3');
      titleH3.style.cssText = 'font-size: 24px; margin-bottom: 12px; color: #C2185B;';
      titleH3.textContent = 'ゲーム実行エラー';

      const messageP = document.createElement('p');
      messageP.style.cssText = 'font-size: 16px; color: #880E4F;';
      messageP.textContent = error instanceof Error ? error.message : 'Unknown error';

      errorContainer.appendChild(iconDiv);
      errorContainer.appendChild(titleH3);
      errorContainer.appendChild(messageP);

      targetElement.innerHTML = '';
      targetElement.appendChild(errorContainer);
      
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
    if (this.gameLoopTimerId) {
      clearTimeout(this.gameLoopTimerId);
      this.gameLoopTimerId = null;
    }
    this.ruleEngine = null;
    this.currentContext = null;
    console.log('🔄 EditorGameBridge リセット完了');
  }
}

// デフォルトエクスポート
export default EditorGameBridge;