import * as PIXI from 'pixi.js';
import { GameTemplate, GameSettings } from './GameTemplate';

export interface CuteTapSettings extends GameSettings {
  targetTaps: number;
  characterType: 'girl' | 'animal' | 'child';
}

export class CuteTapGame extends GameTemplate {
  private character: PIXI.Graphics | null = null;
  private tapEffect: PIXI.Graphics | null = null;
  private tapCount: number = 0;
  protected settings: CuteTapSettings;
  
  // ゲーム終了時のコールバック
  public onGameEnd?: (success: boolean, score: number) => void;

  // キャラクターの反応メッセージ
  private reactions: string[] = [
    'えへへ♪',
    'もっと！',
    'きゃー！',
    'うれしい！',
    'たのしー！'
  ];

  constructor(app: PIXI.Application, settings: CuteTapSettings) {
    super(app, settings);
    this.settings = settings;
    console.log('CuteTapGame: Constructor completed');
  }

  async createScene(): Promise<void> {
    console.log('CuteTapGame: Creating scene...');
    
    // PIXI.Application のプロパティ確認とフォールバック
    const width = this.app.renderer?.width || this.app.view?.width || 375;
    const height = this.app.renderer?.height || this.app.view?.height || 600;
    
    console.log(`CuteTapGame: Using dimensions ${width}x${height}`);
    
    // 背景グラデーション
    this.createBackground(width, height);
    
    // メインキャラクター作成
    this.createCharacter(width, height);
    
    // タップエフェクト準備（非表示）
    this.createTapEffect();
    
    // 重要: ベースクラスのUIを作成（タイマー・スコア等）
    this.createUI();
    
    console.log('CuteTapGame: Scene creation completed');
  }

  private createBackground(width: number, height: number): void {
    const background = new PIXI.Graphics();
    
    // グラデーション風の背景（簡易版）
    background.beginFill(0xfce7ff); // 薄ピンク
    background.drawRect(0, 0, width, height);
    background.endFill();
    
    // 装飾的な円を配置
    for (let i = 0; i < 5; i++) {
      const circle = new PIXI.Graphics();
      circle.beginFill(0xd946ef, 0.1); // 半透明のピンク
      circle.drawCircle(0, 0, 20 + Math.random() * 30);
      circle.endFill();
      
      circle.x = Math.random() * width;
      circle.y = Math.random() * height;
      
      background.addChild(circle);
    }
    
    this.container.addChild(background);
  }

  private createCharacter(width: number, height: number): void {
    this.character = new PIXI.Graphics();
    
    // キャラクターの種類に応じて描画
    switch (this.settings.characterType) {
      case 'girl':
        this.drawGirlCharacter();
        break;
      case 'animal':
        this.drawAnimalCharacter();
        break;
      case 'child':
        this.drawChildCharacter();
        break;
    }
    
    // 画面中央に配置
    this.character.x = width / 2;
    this.character.y = height / 2;
    
    // インタラクティブに設定
    this.character.eventMode = 'static';
    this.character.cursor = 'pointer';
    
    // タップイベント
    this.character.on('pointerdown', this.handleTap.bind(this));
    
    this.container.addChild(this.character);
    console.log('CuteTapGame: Character created and added to container');
  }

  private drawGirlCharacter(): void {
    if (!this.character) return;
    
    // シンプルな女の子キャラ（円と基本図形で）
    // 顔
    this.character.beginFill(0xffdbac); // 肌色
    this.character.drawCircle(0, -20, 40);
    this.character.endFill();
    
    // 目
    this.character.beginFill(0x000000);
    this.character.drawCircle(-15, -30, 5);
    this.character.drawCircle(15, -30, 5);
    this.character.endFill();
    
    // 目のハイライト
    this.character.beginFill(0xffffff);
    this.character.drawCircle(-13, -32, 2);
    this.character.drawCircle(17, -32, 2);
    this.character.endFill();
    
    // 口
    this.character.lineStyle(2, 0xff69b4);
    this.character.arc(0, -10, 8, 0, Math.PI);
    this.character.lineStyle();
    
    // 髪（ピンク）
    this.character.beginFill(0xffc0cb);
    this.character.drawCircle(-25, -45, 25);
    this.character.drawCircle(25, -45, 25);
    this.character.drawCircle(0, -50, 35);
    this.character.endFill();
    
    // 体（シンプルな服）
    this.character.beginFill(0xd946ef);
    this.character.drawRoundedRect(-30, 20, 60, 80, 10);
    this.character.endFill();
    
    // 手
    this.character.beginFill(0xffdbac);
    this.character.drawCircle(-40, 40, 12);
    this.character.drawCircle(40, 40, 12);
    this.character.endFill();
  }

  private drawAnimalCharacter(): void {
    if (!this.character) return;
    
    // シンプルな猫キャラ
    // 体
    this.character.beginFill(0xffa500); // オレンジ
    this.character.drawCircle(0, 0, 50);
    this.character.endFill();
    
    // 頭
    this.character.beginFill(0xffa500);
    this.character.drawCircle(0, -60, 35);
    this.character.endFill();
    
    // 耳
    this.character.beginFill(0xffa500);
    this.character.drawPolygon([
      -20, -80,
      -30, -95,
      -10, -85
    ]);
    this.character.drawPolygon([
      20, -80,
      30, -95,
      10, -85
    ]);
    this.character.endFill();
    
    // 目
    this.character.beginFill(0x000000);
    this.character.drawCircle(-12, -65, 4);
    this.character.drawCircle(12, -65, 4);
    this.character.endFill();
    
    // 鼻
    this.character.beginFill(0xff69b4);
    this.character.drawPolygon([
      0, -50,
      -5, -45,
      5, -45
    ]);
    this.character.endFill();
  }

  private drawChildCharacter(): void {
    if (!this.character) return;
    
    // シンプルな子供キャラ（より小さく、丸っこく）
    // 顔（より大きな頭）
    this.character.beginFill(0xffdbac);
    this.character.drawCircle(0, -10, 45);
    this.character.endFill();
    
    // 目（より大きく）
    this.character.beginFill(0x000000);
    this.character.drawCircle(-18, -20, 8);
    this.character.drawCircle(18, -20, 8);
    this.character.endFill();
    
    // 目のハイライト（大きく）
    this.character.beginFill(0xffffff);
    this.character.drawCircle(-15, -23, 4);
    this.character.drawCircle(21, -23, 4);
    this.character.endFill();
    
    // 体（小さめ）
    this.character.beginFill(0x14b8a6); // ミント色
    this.character.drawRoundedRect(-25, 35, 50, 60, 15);
    this.character.endFill();
  }

  private createTapEffect(): void {
    this.tapEffect = new PIXI.Graphics();
    this.tapEffect.visible = false;
    this.container.addChild(this.tapEffect);
  }

  private handleTap(event: PIXI.FederatedPointerEvent): void {
    console.log(`CuteTapGame: handleTap called, gameState=${this.gameState}`);
    
    if (this.gameState !== 'playing') return;
    
    this.tapCount++;
    this.currentScore = this.tapCount;
    
    console.log(`CuteTapGame: tap count: ${this.tapCount}/${this.settings.targetTaps}`);
    
    // キャラクターリアクション
    this.showCharacterReaction();
    
    // タップエフェクト
    this.showTapEffect(event.global.x, event.global.y);
    
    // ランダムなリアクションメッセージ
    const reaction = this.reactions[Math.floor(Math.random() * this.reactions.length)];
    this.showMessage(reaction, 800);
    
    // 勝利条件チェック
    if (this.checkWinCondition()) {
      console.log('CuteTap: Target reached! Calling endGame(true)...');
      this.endGame(true);
      console.log('CuteTap: endGame(true) called');
    }
  }

  private showCharacterReaction(): void {
    if (!this.character) return;
    
    // スケールアニメーション
    this.character.scale.set(1.1);
    
    // 色変化（少し明るく）
    this.character.tint = 0xffaaaa;
    
    setTimeout(() => {
      if (this.character) {
        this.character.scale.set(1.0);
        this.character.tint = 0xffffff;
      }
    }, 150);
  }

  private showTapEffect(x: number, y: number): void {
    if (!this.tapEffect) return;
    
    // タップ位置にエフェクト表示
    this.tapEffect.clear();
    this.tapEffect.beginFill(0xd946ef, 0.6);
    this.tapEffect.drawCircle(0, 0, 20);
    this.tapEffect.endFill();
    
    this.tapEffect.x = x;
    this.tapEffect.y = y;
    this.tapEffect.visible = true;
    this.tapEffect.scale.set(0.5);
    
    // アニメーション
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / 300; // 0.3秒
      
      if (progress < 1 && this.tapEffect) {
        this.tapEffect.scale.set(0.5 + progress * 0.5);
        this.tapEffect.alpha = 1 - progress;
        requestAnimationFrame(animate);
      } else if (this.tapEffect) {
        this.tapEffect.visible = false;
      }
    };
    animate();
  }

  protected checkWinCondition(): boolean {
    return this.tapCount >= this.settings.targetTaps;
  }

  handleInput(event: PIXI.FederatedPointerEvent): void {
    // 基底クラスで必要だが、タップ処理は個別のオブジェクトで処理
  }

  updateGame(deltaTime: number): void {
    // 必要に応じて継続的な更新処理
    // 現在は特に処理なし
  }

  // showResult メソッドをオーバーライドして、結果をコールバックで渡す
  protected showResult(result: { success: boolean; score: number; message: string }): void {
    console.log(`CuteTap showResult called: ${result.success ? 'SUCCESS' : 'FAILED'}, Score: ${result.score}`);
    console.log(`CuteTap onGameEnd callback exists: ${!!this.onGameEnd}`);
    
    // 結果をコールバックで即座に渡す（表示は GameSequence が担当）
    if (this.onGameEnd) {
      console.log('CuteTap: Calling onGameEnd callback...');
      this.onGameEnd(result.success, result.score);
      console.log('CuteTap: onGameEnd callback completed');
    } else {
      console.warn('CuteTap: onGameEnd callback is not set!');
    }
    
    // 親クラスのshowResultは呼ばない（UI重複回避）
  }

  // フォールバック用のカスタマイズメソッド（GameTemplateFactory用）
  customizeDisplayForFallback(name: string, instruction: string): void {
    // タイトルテキストをカスタマイズ（存在する場合）
    const titleText = this.container.children.find(child => 
      child instanceof PIXI.Text && child.text.includes('キュートタップ')
    ) as PIXI.Text;
    
    if (titleText) {
      titleText.text = name;
    }
    
    // 指示テキストをカスタマイズ（存在する場合）
    const instructionText = this.container.children.find(child => 
      child instanceof PIXI.Text && child.text.includes('タップして')
    ) as PIXI.Text;
    
    if (instructionText) {
      instructionText.text = instruction;
    }
  }
}