import * as PIXI from 'pixi.js';

// ゲーム状態の定義
export type GameState = 'ready' | 'playing' | 'completed' | 'failed';

// ゲーム結果の定義
export interface GameResult {
  success: boolean;
  score: number;
  timeElapsed: number;
  message: string;
}

// ゲーム設定の基本構造
export interface GameSettings {
  duration: number; // 秒
  targetScore: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

// ゲームテンプレートの基底クラス
export abstract class GameTemplate {
  protected app: PIXI.Application;
  protected container: PIXI.Container;
  protected gameState: GameState = 'ready';
  protected settings: GameSettings;
  
  // ゲーム進行用の変数
  protected startTime: number = 0;
  protected currentScore: number = 0;
  protected gameTimer: number | null = null;
  
  // UI要素
  protected scoreText: PIXI.Text | null = null;
  protected timerText: PIXI.Text | null = null;
  protected messageText: PIXI.Text | null = null;

  // 破棄フラグ（重要：二重破棄を防ぐ）
  private isDestroyed: boolean = false;
  private isStageAttached: boolean = false;

  constructor(app: PIXI.Application, settings: GameSettings) {
    console.log('🏗️ GameTemplate constructor called');
    
    this.app = app;
    this.container = new PIXI.Container();
    this.settings = settings;
    
    // 🚑 重要修正: stage追加を遅延実行
    // コンストラクタでは追加せず、createScene時に追加
    console.log('✅ GameTemplate constructor completed (stage attachment deferred)');
  }

  // 各テンプレートで実装必須のメソッド
  abstract createScene(): Promise<void>;
  abstract handleInput(event: PIXI.FederatedPointerEvent): void;
  abstract updateGame(deltaTime: number): void;
  
  // 🔧 Stage添付の安全な実行
  protected ensureStageAttachment(): void {
    if (this.isStageAttached || this.isDestroyed) return;
    
    try {
      if (this.app && this.app.stage && this.container) {
        // 既にstageに追加されているかチェック
        if (!this.app.stage.children.includes(this.container)) {
          this.app.stage.addChild(this.container);
          this.isStageAttached = true;
          console.log('✅ Container attached to stage');
        }
      } else {
        console.error('❌ Cannot attach to stage - app, stage, or container is null');
        throw new Error('Invalid PIXI.Application or stage is null');
      }
    } catch (error) {
      console.error('❌ Stage attachment failed:', error);
      throw error;
    }
  }

  // 結果表示処理（継承クラスでオーバーライド可能）
  protected showResult(result: GameResult): void {
    console.log(`GameTemplate.showResult called: ${result.success ? 'SUCCESS' : 'FAILED'}, Score: ${result.score}`);
    
    this.showMessage(
      `${result.message}\nスコア: ${result.score}\n時間: ${result.timeElapsed.toFixed(1)}秒`,
      5000
    );
    
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.showRestartOption();
      }
    }, 3000);
  }

  // 🔧 修正版初期化メソッド
  async initialize(): Promise<void> {
    if (this.isDestroyed) return;
    
    console.log('🔧 GameTemplate.initialize() called');
    
    // Stage添付を確実に実行
    this.ensureStageAttachment();
    
    // シーン作成
    await this.createScene();
    
    // UI作成
    this.createUI();
    
    this.gameState = 'ready';
    console.log('✅ GameTemplate.initialize() completed');
  }

  start(): void {
    if (this.isDestroyed) return;
    
    console.log(`GameTemplate.start() called, gameState=${this.gameState}`);
    
    if (this.gameState !== 'ready') {
      console.warn(`Cannot start game in state: ${this.gameState}`);
      return;
    }
    
    // Stage添付を再確認
    this.ensureStageAttachment();
    
    this.gameState = 'playing';
    this.startTime = Date.now();
    this.currentScore = 0;
    
    console.log('GameTemplate: Game started, state=playing');
    
    // ゲームタイマー開始
    this.startGameTimer();
    
    // ゲームループ開始（PixiJSのTicker使用）
    if (this.app && this.app.ticker) {
      this.app.ticker.add(this.gameLoop, this);
    }
    
    this.showMessage('スタート！', 1000);
  }

  protected gameLoop(deltaTime: number): void {
    if (this.isDestroyed || this.gameState !== 'playing') return;
    
    try {
      this.updateGame(deltaTime);
      this.updateUI();
      
      // 勝利条件チェック
      if (this.checkWinCondition()) {
        this.endGame(true);
      }
    } catch (error) {
      console.error('GameLoop error:', error);
      this.endGame(false);
    }
  }

  protected startGameTimer(): void {
    if (this.isDestroyed) return;
    
    console.log(`GameTemplate: Starting timer for ${this.settings.duration} seconds`);
    
    this.gameTimer = window.setTimeout(() => {
      console.log('GameTemplate: Timer expired');
      if (!this.isDestroyed && this.gameState === 'playing') {
        this.endGame(this.checkWinCondition());
      }
    }, this.settings.duration * 1000);
  }

  protected checkWinCondition(): boolean {
    return this.currentScore >= this.settings.targetScore;
  }

  protected endGame(success: boolean): void {
    if (this.isDestroyed) return;
    
    console.log(`GameTemplate.endGame called: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    this.gameState = success ? 'completed' : 'failed';
    
    // タイマー停止
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
      this.gameTimer = null;
    }
    
    // ゲームループ停止
    if (this.app && this.app.ticker) {
      this.app.ticker.remove(this.gameLoop, this);
    }
    
    // 結果表示
    const timeElapsed = (Date.now() - this.startTime) / 1000;
    const result: GameResult = {
      success,
      score: this.currentScore,
      timeElapsed,
      message: success ? 'やったね！🎉' : 'もう一回チャレンジ！💪'
    };
    
    console.log('GameTemplate: Calling showResult...');
    this.showResult(result);
  }

  protected createUI(): void {
    if (this.isDestroyed || !this.app || !this.container) return;
    
    try {
      console.log('🎨 Creating UI elements...');
      
      const style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 0x52525b,
        fontWeight: 'bold'
      });

      // スコア表示
      this.scoreText = new PIXI.Text(`スコア: ${this.currentScore}`, style);
      this.scoreText.x = 20;
      this.scoreText.y = 20;
      this.container.addChild(this.scoreText);

      // タイマー表示
      this.timerText = new PIXI.Text(`時間: ${this.settings.duration}`, style);
      this.timerText.anchor.x = 1;
      this.timerText.x = this.app.screen.width - 20;
      this.timerText.y = 20;
      this.container.addChild(this.timerText);

      // メッセージ表示（最初は非表示）
      const messageStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xd946ef,
        fontWeight: 'bold',
        align: 'center'
      });
      
      this.messageText = new PIXI.Text('', messageStyle);
      this.messageText.anchor.set(0.5);
      this.messageText.x = this.app.screen.width / 2;
      this.messageText.y = 100;
      this.messageText.visible = false;
      this.container.addChild(this.messageText);
      
      console.log('✅ UI elements created successfully');
    } catch (error) {
      console.error('❌ UI作成エラー:', error);
    }
  }

  protected updateUI(): void {
    if (this.isDestroyed) return;
    
    try {
      if (this.scoreText) {
        this.scoreText.text = `スコア: ${this.currentScore}`;
      }
      
      if (this.timerText && this.gameState === 'playing') {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const remaining = Math.max(0, this.settings.duration - elapsed);
        this.timerText.text = `時間: ${remaining.toFixed(1)}`;
      }
    } catch (error) {
      console.error('❌ UI更新エラー:', error);
    }
  }

  protected showMessage(message: string, duration: number = 2000): void {
    if (this.isDestroyed || !this.messageText) return;
    
    try {
      this.messageText.text = message;
      this.messageText.visible = true;
      
      setTimeout(() => {
        if (!this.isDestroyed && this.messageText) {
          this.messageText.visible = false;
        }
      }, duration);
    } catch (error) {
      console.error('❌ メッセージ表示エラー:', error);
    }
  }

  protected showRestartOption(): void {
    console.log('ゲーム終了 - リスタートオプション表示');
  }

  // 🚑 完全修正版destroy
  destroy(): void {
    if (this.isDestroyed) {
      console.log('GameTemplate already destroyed, skipping...');
      return;
    }
    
    console.log('🗑️ GameTemplate.destroy() called');
    this.isDestroyed = true;
    
    try {
      // ゲーム状態をリセット
      this.gameState = 'ready';
      
      // タイマー停止
      if (this.gameTimer) {
        clearTimeout(this.gameTimer);
        this.gameTimer = null;
      }
      
      // ゲームループ停止（安全チェック付き）
      if (this.app && this.app.ticker && typeof this.app.ticker.remove === 'function') {
        this.app.ticker.remove(this.gameLoop, this);
      }
      
      // UI要素の安全な削除
      this.scoreText = null;
      this.timerText = null;
      this.messageText = null;
      
      // 🚑 重要修正: Stage添付状態の安全な確認・削除
      if (this.isStageAttached && this.container && this.app && this.app.stage) {
        try {
          // stage.children が存在し、containerが含まれているかチェック
          if (this.app.stage.children && 
              Array.isArray(this.app.stage.children) && 
              this.app.stage.children.includes(this.container)) {
            this.app.stage.removeChild(this.container);
            console.log('✅ Container removed from stage');
          }
        } catch (error) {
          console.warn('⚠️ Container removal warning:', error);
        }
        this.isStageAttached = false;
      }
      
      // コンテナの破棄（安全チェック付き）
      if (this.container && typeof this.container.destroy === 'function') {
        try {
          this.container.destroy({ 
            children: true, 
            texture: false, // テクスチャは保持（再利用のため）
            baseTexture: false 
          });
          console.log('✅ Container destroyed');
        } catch (error) {
          console.warn('⚠️ Container destroy warning:', error);
        }
      }
      
      this.container = null as any;
      
    } catch (error) {
      console.error('❌ GameTemplate.destroy() error (non-fatal):', error);
      // エラーが発生してもアプリケーションを続行
    }
    
    console.log('✅ GameTemplate.destroy() completed successfully');
  }
}