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

  constructor(app: PIXI.Application, settings: GameSettings) {
    this.app = app;
    this.container = new PIXI.Container();
    this.settings = settings;
    
    // 重要修正: app.stageの存在確認
    if (app && app.stage) {
      app.stage.addChild(this.container);
    } else {
      console.error('GameTemplate: Invalid PIXI.Application or stage is null');
    }
  }

  // 各テンプレートで実装必須のメソッド
  abstract createScene(): Promise<void>;
  abstract handleInput(event: PIXI.FederatedPointerEvent): void;
  abstract updateGame(deltaTime: number): void;
  
  // 結果表示処理（継承クラスでオーバーライド可能）
  protected showResult(result: GameResult): void {
    console.log(`GameTemplate.showResult called: ${result.success ? 'SUCCESS' : 'FAILED'}, Score: ${result.score}`);
    
    this.showMessage(
      `${result.message}\nスコア: ${result.score}\n時間: ${result.timeElapsed.toFixed(1)}秒`,
      5000
    );
    
    setTimeout(() => {
      this.showRestartOption();
    }, 3000);
  }

  // 共通のゲーム制御メソッド
  async initialize(): Promise<void> {
    await this.createScene();
    this.createUI();
    this.gameState = 'ready';
  }

  start(): void {
    console.log(`GameTemplate.start() called, gameState=${this.gameState}`);
    
    if (this.gameState !== 'ready') return;
    
    this.gameState = 'playing';
    this.startTime = Date.now();
    this.currentScore = 0;
    
    console.log('GameTemplate: Game started, state=playing');
    
    // ゲームタイマー開始
    this.startGameTimer();
    
    // ゲームループ開始（PixiJSのTicker使用）
    this.app.ticker.add(this.gameLoop, this);
    
    this.showMessage('スタート！', 1000);
  }

  protected gameLoop(deltaTime: number): void {
    if (this.gameState === 'playing') {
      this.updateGame(deltaTime);
      this.updateUI();
      
      // 勝利条件チェック
      if (this.checkWinCondition()) {
        this.endGame(true);
      }
    }
  }

  protected startGameTimer(): void {
    console.log(`GameTemplate: Starting timer for ${this.settings.duration} seconds`);
    
    this.gameTimer = window.setTimeout(() => {
      console.log('GameTemplate: Timer expired');
      if (this.gameState === 'playing') {
        this.endGame(this.checkWinCondition());
      }
    }, this.settings.duration * 1000);
  }

  protected checkWinCondition(): boolean {
    return this.currentScore >= this.settings.targetScore;
  }

  protected endGame(success: boolean): void {
    console.log(`GameTemplate.endGame called: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    this.gameState = success ? 'completed' : 'failed';
    
    // タイマー停止
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
      this.gameTimer = null;
    }
    
    // ゲームループ停止
    this.app.ticker.remove(this.gameLoop, this);
    
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
  }

  protected updateUI(): void {
    if (this.scoreText) {
      this.scoreText.text = `スコア: ${this.currentScore}`;
    }
    
    if (this.timerText && this.gameState === 'playing') {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const remaining = Math.max(0, this.settings.duration - elapsed);
      this.timerText.text = `時間: ${remaining.toFixed(1)}`;
    }
  }

  protected showMessage(message: string, duration: number = 2000): void {
    if (this.messageText) {
      this.messageText.text = message;
      this.messageText.visible = true;
      
      setTimeout(() => {
        if (this.messageText) {
          this.messageText.visible = false;
        }
      }, duration);
    }
  }

  protected showRestartOption(): void {
    // 後で実装：リスタートボタンの表示
    console.log('ゲーム終了 - リスタートオプション表示');
  }

  // クリーンアップ
  destroy(): void {
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
    }
    
    this.app.ticker.remove(this.gameLoop, this);
    
    if (this.app && this.app.stage && this.container) {
      this.app.stage.removeChild(this.container);
    }
    
    this.container.destroy({ children: true });
  }
}