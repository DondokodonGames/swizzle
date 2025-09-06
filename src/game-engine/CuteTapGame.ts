import * as PIXI from 'pixi.js';
import { GameTemplate, GameSettings } from './GameTemplate';

// 最小限の設定（型エラー回避）
export interface CuteTapSettings extends GameSettings {
  // duration や targetScore は GameSettings から継承される（必須）
  // 追加プロパティは全てオプション
  theme?: string;
}

// 最小限のCuteTapGame（削除予定・デバッグ表示のみ）
export class CuteTapGame extends GameTemplate {
  constructor(app: PIXI.Application, settings: CuteTapSettings) {
    // targetScoreがundefinedの場合はデフォルト値を設定（例: 0）
    const safeSettings: GameSettings = {
      ...settings,
      targetScore: settings.targetScore ?? 0
    };
    super(app, safeSettings);
    // gameType設定（型安全性のため any でキャスト）
    (this as any).gameType = 'cute-tap';
  }

  async createScene(): Promise<void> {
    // エラー表示のみ
    this.createErrorDisplay();
  }

  // GameTemplateの抽象メソッド実装（最小限）
  handleInput(_event: PIXI.FederatedPointerEvent): void {
    // 何もしない
  }

  // GameTemplateの抽象メソッド実装（最小限）
  updateGame(_deltaTime: number): void {
    // 何もしない
  }

  private createErrorDisplay(): void {
    // エラー表示テキスト
    const errorText = new PIXI.Text('ErrorCuteTap\n(削除予定)', {
      fontSize: 32,
      fill: 0xff0000,
      align: 'center',
      fontWeight: 'bold'
    });
    
    // 中央配置（app プロパティ使用）
    errorText.x = this.app.screen.width / 2;
    errorText.y = this.app.screen.height / 2;
    errorText.anchor.set(0.5);
    
    // コンテナに追加
    this.container.addChild(errorText);

    // 削除予定メッセージ
    const deleteText = new PIXI.Text('Phase 7で削除・再実装予定', {
      fontSize: 16,
      fill: 0xffff00,
      align: 'center'
    });
    
    deleteText.x = this.app.screen.width / 2;
    deleteText.y = this.app.screen.height / 2 + 60;
    deleteText.anchor.set(0.5);
    
    this.container.addChild(deleteText);
  }

  destroy(): void {
    // 最小限のクリーンアップ
    super.destroy();
  }
}