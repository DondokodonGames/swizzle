import * as PIXI from 'pixi.js';
import { GameTemplate } from './GameTemplate';

export interface CuteTapSettings {
  timeLimit: number;
  difficulty: 'easy' | 'normal' | 'hard';
  theme: string;
}

export class CuteTapGame extends GameTemplate {
  private tapTarget: PIXI.Graphics;
  private tapCount: number = 0;
  private targetSize: number = 100;
  private animationSpeed: number = 0.1;

  constructor(app: PIXI.Application, settings: CuteTapSettings) {
    // CuteTapSettingsをGameSettingsに変換
    const gameSettings = {
      timeLimit: settings.timeLimit,
      difficulty: settings.difficulty,
      theme: settings.theme,
      duration: settings.duration || settings.timeLimit,
      targetScore: settings.targetScore || 100
    };
    
    super(app, gameSettings);
    this.gameType = 'cute-tap';
  }

  async createScene(): Promise<void> {
    // 背景作成
    this.createBackground();
    
    // タップターゲット作成
    this.createTapTarget();
    
    // UI作成
    this.createUI();
    
    // イベント設定
    this.setupEventHandlers();
  }

  private createBackground(): void {
    const background = new PIXI.Graphics();
    background.beginFill(0x87CEEB); // 空色
    background.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    background.endFill();
    this.gameContainer.addChild(background);
  }

  private createTapTarget(): void {
    this.tapTarget = new PIXI.Graphics();
    this.tapTarget.beginFill(0xFF69B4); // ピンク
    this.tapTarget.drawCircle(0, 0, this.targetSize);
    this.tapTarget.endFill();
    
    // 中央配置
    this.tapTarget.x = this.app.screen.width / 2;
    this.tapTarget.y = this.app.screen.height / 2;
    
    // インタラクティブ設定
    this.tapTarget.eventMode = 'static';
    this.tapTarget.cursor = 'pointer';
    
    this.gameContainer.addChild(this.tapTarget);
  }

  private setupEventHandlers(): void {
    this.tapTarget.on('pointerdown', this.handleTap.bind(this));
  }

  private handleTap(): void {
    this.tapCount++;
    this.updateScore(this.tapCount * 10);
    
    // タップエフェクト
    this.playTapEffect();
    
    // ターゲット移動
    this.moveTarget();
  }

  private playTapEffect(): void {
    // 簡単なスケールアニメーション
    const originalScale = this.tapTarget.scale.x;
    this.tapTarget.scale.set(1.2);
    
    setTimeout(() => {
      if (this.tapTarget) {
        this.tapTarget.scale.set(originalScale);
      }
    }, 150);
  }

  private moveTarget(): void {
    const margin = this.targetSize;
    this.tapTarget.x = margin + Math.random() * (this.app.screen.width - margin * 2);
    this.tapTarget.y = margin + Math.random() * (this.app.screen.height - margin * 2);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    
    // タップターゲットのアニメーション
    if (this.tapTarget) {
      this.tapTarget.rotation += this.animationSpeed * deltaTime;
    }
  }

  destroy(): void {
    if (this.tapTarget) {
      this.tapTarget.removeAllListeners();
    }
    super.destroy();
  }
}