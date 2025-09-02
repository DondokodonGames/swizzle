import * as PIXI from 'pixi.js';
import { EditableTemplate, EditableAssets, EditableTemplateConfig } from '../EditableTemplate';
import { UnifiedGameSettings } from '../../GameTemplateFactory';

/**
 * キュートタップゲーム - EditableTemplate対応版
 * 
 * フィードバック反映内容:
 * - キャラクター画像表示（差し替え可能）
 * - 背景画像設定（差し替え可能）
 * - 画面中央固定表示
 * - 達成時特別メッセージ
 * - BGM・タップSE対応
 * - アセット完全差し替え対応
 */
export class CuteTapGame extends EditableTemplate {
  // ゲーム要素
  private background!: PIXI.Sprite;
  private character!: PIXI.Sprite;
  private tapEffectContainer!: PIXI.Container;
  // ✅ messageTextを削除（親クラスから継承される可能性があるため）
  private gameMessageText!: PIXI.Text;
  
  // ゲーム状態
  private currentTaps = 0;
  private targetTaps = 30;
  private isGameActive = false;
  private tapMessages: string[] = [];
  
  // アニメーション
  private characterTween?: any;
  private messageTimeout?: NodeJS.Timeout;

  constructor(
    app: PIXI.Application, 
    settings: UnifiedGameSettings,
    config: EditableTemplateConfig,
    assets?: Partial<EditableAssets>
  ) {
    super(app, settings, config, assets);
    
    // パラメータ設定
    this.targetTaps = this.getParameter('targetTaps', 30);
    this.tapMessages = Array.isArray(this.assets.texts.tapMessages) 
      ? this.assets.texts.tapMessages as string[]
      : (this.assets.texts.tapMessages as string).split('\n').filter(msg => msg.trim());
      
    console.log('CuteTapGame: 初期化完了', {
      targetTaps: this.targetTaps,
      tapMessages: this.tapMessages.length,
      duration: this.getParameter('duration', 10)
    });
  }

  async createScene(): Promise<void> {
    try {
      // アセット事前読み込み
      await this.preloadAssets();
      
      // 背景作成
      this.createBackground();
      
      // キャラクター作成（画面中央固定）
      this.createCharacter();
      
      // エフェクト用コンテナ
      this.createEffectContainer();
      
      // メッセージテキスト
      this.createMessageText();
      
      // タッチイベント設定
      this.setupTouchEvents();
      
      console.log('CuteTapGame: シーン作成完了');
    } catch (error) {
      console.error('CuteTapGame: シーン作成エラー:', error);
      this.createFallbackScene();
    }
  }

  /**
   * 背景作成
   */
  private createBackground(): void {
    const backgroundTexture = this.getTexture('background');
    this.background = new PIXI.Sprite(backgroundTexture);
    
    // 画面サイズに合わせてスケール
    const scaleX = this.app.screen.width / this.background.width;
    const scaleY = this.app.screen.height / this.background.height;
    const scale = Math.max(scaleX, scaleY);
    
    this.background.scale.set(scale);
    this.background.x = (this.app.screen.width - this.background.width * scale) / 2;
    this.background.y = (this.app.screen.height - this.background.height * scale) / 2;
    
    this.container.addChild(this.background);
  }

  /**
   * キャラクター作成（画面中央固定）
   */
  private createCharacter(): void {
    const characterTexture = this.getTexture('characterNormal');
    this.character = new PIXI.Sprite(characterTexture);
    
    // 画面中央に配置（大きく表示）
    this.character.anchor.set(0.5);
    this.character.x = this.app.screen.width / 2;
    this.character.y = this.app.screen.height / 2;
    
    // 適度なサイズに調整（画面の30%程度）
    const targetSize = Math.min(this.app.screen.width, this.app.screen.height) * 0.3;
    const scale = targetSize / Math.max(this.character.width, this.character.height);
    this.character.scale.set(scale);
    
    // インタラクティブに設定
    this.character.eventMode = 'static';
    this.character.cursor = 'pointer';
    
    this.container.addChild(this.character);
  }

  /**
   * エフェクトコンテナ作成
   */
  private createEffectContainer(): void {
    this.tapEffectContainer = new PIXI.Container();
    this.container.addChild(this.tapEffectContainer);
  }

  /**
   * メッセージテキスト作成
   */
  private createMessageText(): void {
    this.gameMessageText = new PIXI.Text('', {
      fontSize: 28,
      fill: 0xffffff,
      align: 'center',
      fontWeight: 'bold',
      stroke: 0x000000,
      strokeThickness: 4,
      dropShadow: true,
      dropShadowDistance: 2,
      dropShadowAlpha: 0.5
    });
    
    this.gameMessageText.anchor.set(0.5);
    this.gameMessageText.x = this.app.screen.width / 2;
    this.gameMessageText.y = this.app.screen.height * 0.15; // 画面上部
    this.gameMessageText.alpha = 0;
    
    this.container.addChild(this.gameMessageText);
  }

  /**
   * タッチイベント設定
   */
  private setupTouchEvents(): void {
    this.character.on('pointerdown', this.handleCharacterTap.bind(this));
  }

  /**
   * キャラクタータップ処理
   */
  private handleCharacterTap(event: PIXI.FederatedPointerEvent): void {
    if (!this.isGameActive) return;

    this.currentTaps++;
    
    // タップ音再生
    this.playSound('tap', 0.7);
    
    // キャラクター画像切り替え
    this.switchCharacterTexture();
    
    // タップエフェクト表示
    this.showTapEffect(event.global.x, event.global.y);
    
    // タップメッセージ表示
    this.showTapMessage();
    
    // キャラクタープルプルアニメーション
    this.playCharacterAnimation();
    
    // 目標達成チェック
    if (this.currentTaps >= this.targetTaps) {
      this.handleGameSuccess(this.currentTaps);
    }
    
    console.log(`Tap: ${this.currentTaps}/${this.targetTaps}`);
  }

  /**
   * キャラクター画像切り替え（タッチ後 → 通常）
   */
  private switchCharacterTexture(): void {
    // タッチ後の画像に切り替え
    const tappedTexture = this.getTexture('characterTapped');
    this.character.texture = tappedTexture;
    
    // 300ms後に通常画像に戻す
    setTimeout(() => {
      if (this.character) {
        const normalTexture = this.getTexture('characterNormal');
        this.character.texture = normalTexture;
      }
    }, 300);
  }

  /**
   * タップエフェクト表示
   */
  private showTapEffect(x: number, y: number): void {
    const effectTexture = this.getTexture('tapEffect');
    const effect = new PIXI.Sprite(effectTexture);
    
    // グローバル座標をローカル座標に変換
    const localPos = this.tapEffectContainer.toLocal({ x, y });
    
    effect.anchor.set(0.5);
    effect.x = localPos.x;
    effect.y = localPos.y;
    effect.scale.set(0.1);
    effect.alpha = 1;
    
    this.tapEffectContainer.addChild(effect);
    
    // エフェクトアニメーション
    const startTime = Date.now();
    const duration = 500;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (effect && effect.parent) {
        effect.scale.set(0.1 + progress * 0.4);
        effect.alpha = 1 - progress;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.tapEffectContainer.removeChild(effect);
          effect.destroy();
        }
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * タップメッセージ表示
   */
  private showTapMessage(): void {
    if (this.tapMessages.length === 0) return;
    
    // ランダムメッセージ選択
    const message = this.tapMessages[Math.floor(Math.random() * this.tapMessages.length)];
    this.gameMessageText.text = message;
    
    // フェードイン/アウト
    this.gameMessageText.alpha = 1;
    
    // 前のタイマーをクリア
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    
    // 1秒後にフェードアウト
    this.messageTimeout = setTimeout(() => {
      if (this.gameMessageText) {
        const startTime = Date.now();
        const duration = 300;
        
        const fadeOut = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          if (this.gameMessageText) {
            this.gameMessageText.alpha = 1 - progress;
            
            if (progress < 1) {
              requestAnimationFrame(fadeOut);
            }
          }
        };
        
        requestAnimationFrame(fadeOut);
      }
    }, 1000);
  }

  /**
   * キャラクタープルプルアニメーション
   */
  private playCharacterAnimation(): void {
    if (!this.character) return;
    
    const originalScale = this.character.scale.x;
    const startTime = Date.now();
    const duration = 200;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (this.character) {
        // プルプル効果（スケールの微小変化）
        const wiggle = Math.sin(progress * Math.PI * 4) * 0.05;
        this.character.scale.set(originalScale * (1 + wiggle));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.character.scale.set(originalScale);
        }
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * フォールバックシーン作成（アセット読み込み失敗時）
   */
  private createFallbackScene(): void {
    console.warn('CuteTapGame: フォールバックシーン使用');
    
    // 単色背景
    const background = new PIXI.Graphics();
    background.beginFill(0x667eea);
    background.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    background.endFill();
    this.container.addChild(background);
    
    // フォールバックキャラクター（円形）
    const character = new PIXI.Graphics();
    character.beginFill(0xffd700);
    character.drawCircle(0, 0, 80);
    character.endFill();
    character.x = this.app.screen.width / 2;
    character.y = this.app.screen.height / 2;
    character.eventMode = 'static';
    character.cursor = 'pointer';
    character.on('pointerdown', this.handleCharacterTap.bind(this));
    
    this.character = character as any;
    this.container.addChild(character);
    
    // フォールバックメッセージ
    this.createMessageText();
    this.tapMessages = ['タップ！', 'いいね！', 'すごい！'];
    this.createEffectContainer();
  }

  /**
   * ゲーム開始
   */
  start(): void {
    console.log('CuteTapGame: ゲーム開始', {
      targetTaps: this.targetTaps,
      duration: this.getParameter('duration', 10)
    });
    
    this.isGameActive = true;
    this.currentTaps = 0;
    
    // BGM開始
    this.startBGM(0.4);
    
    // 制限時間後に終了
    const duration = this.getParameter('duration', 10) * 1000;
    setTimeout(() => {
      if (this.isGameActive) {
        if (this.currentTaps >= this.targetTaps) {
          this.handleGameSuccess(this.currentTaps);
        } else {
          this.handleGameFailure(this.currentTaps);
        }
      }
    }, duration);
  }

  /**
   * フレーム更新 - ✅ updateGameメソッドを実装
   */
  updateGame(deltaTime: number): void {
    // 特別な更新処理は不要（タップベースゲーム）
  }

  /**
   * 入力処理
   */
  handleInput(event: PIXI.FederatedPointerEvent): void {
    // キャラクター以外のタップは無視
    // （キャラクターのタップは setupTouchEvents で処理）
  }

  /**
   * 成功時処理（メソッド名変更でコンフリクト回避）
   */
  private handleGameSuccess(score: number = 0): void {
    this.isGameActive = false;
    
    // 成功音再生
    this.playSound('success', 0.8);
    
    // 達成時特別メッセージ表示
    const successMessage = this.getText('successMessage');
    this.gameMessageText.text = successMessage;
    this.gameMessageText.alpha = 1;
    
    // キャラクター勝利ポーズ（タッチ後画像固定）
    const tappedTexture = this.getTexture('characterTapped');
    if (this.character.texture !== tappedTexture) {
      this.character.texture = tappedTexture;
    }
    
    // 勝利アニメーション（回転）
    this.playVictoryAnimation();
    
    console.log(`🎉 CuteTapGame 成功: ${score}/${this.targetTaps} タップ`);
    
    // 1秒後にゲーム終了
    setTimeout(() => {
      // ✅ 親クラスのendGameメソッドを呼び出し
      this.endGame(true, score);
    }, 1000);
  }

  /**
   * 失敗時処理（メソッド名変更でコンフリクト回避）
   */
  private handleGameFailure(score: number = 0): void {
    this.isGameActive = false;
    
    // 失敗音再生
    this.playSound('failure', 0.6);
    
    // 失敗メッセージ表示
    const failureMessage = this.getText('failureMessage');
    this.gameMessageText.text = failureMessage;
    this.gameMessageText.alpha = 1;
    
    console.log(`😅 CuteTapGame 失敗: ${score}/${this.targetTaps} タップ`);
    
    // 1秒後にゲーム終了
    setTimeout(() => {
      // ✅ 親クラスのendGameメソッドを呼び出し
      this.endGame(false, score);
    }, 1000);
  }

  /**
   * 勝利アニメーション
   */
  private playVictoryAnimation(): void {
    if (!this.character) return;
    
    const startTime = Date.now();
    const duration = 1000;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (this.character) {
        // ゆっくり回転
        this.character.rotation = progress * Math.PI * 2;
        
        // 上下にバウンス
        const bounce = Math.sin(progress * Math.PI * 3) * 20;
        this.character.y = this.app.screen.height / 2 - bounce;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * リソース解放
   */
  dispose(): void {
    // タイマークリア
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    
    // ゲーム状態リセット
    this.isGameActive = false;
    this.currentTaps = 0;
    
    // 親クラスの解放処理
    super.dispose();
  }

  /**
   * デバッグ情報取得
   */
  public getDebugInfo(): any {
    return {
      ...super.getAssetInfo(),
      gameState: {
        currentTaps: this.currentTaps,
        targetTaps: this.targetTaps,
        isActive: this.isGameActive,
        tapMessagesCount: this.tapMessages.length
      }
    };
  }
}