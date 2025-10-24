// src/game-engine/CuteTapGame.ts
// 最小限実装 - エラー表示のみ（Day 5で削除・新実装予定）

import { GameTemplate } from './GameTemplate';
import { GameSettings } from './GameTemplate';
import * as PIXI from 'pixi.js';

export class CuteTapGame extends GameTemplate {
  constructor(app: PIXI.Application, settings: GameSettings) {
    super(app, settings);
    console.log('CuteTapGame - 最小限実装で作成');
  }

  async createScene(): Promise<void> {
    // エラー表示のみの最小限実装
    const errorText = new PIXI.Text('ErrorCuteTap\n削除予定\nDay 5で再実装', {
      fontSize: 32,
      fill: 0xff6b6b,
      align: 'center',
      fontFamily: 'Arial',
      stroke: 0xffffff,
      strokeThickness: 2
    });
    
    errorText.x = this.app.screen.width / 2;
    errorText.y = this.app.screen.height / 2;
    errorText.anchor.set(0.5);
    
    this.container.addChild(errorText);
    
    console.log('CuteTapGame - ErrorCuteTap表示のみ');
  }

  handleInput(event: any): void {
    // 入力処理なし
    console.log('CuteTapGame - 入力処理は実装されていません');
  }

  updateGame(deltaTime: number): void {
    // ゲーム更新処理なし
  }

  destroy(): void {
    super.destroy();
    console.log('CuteTapGame - 削除完了');
  }
}
