# Swizzle - Short Game Platform

5-30秒で完結するミニゲームを連続自動プレイできるプラットフォーム

## 🚀 クイックスタート

```bash
npm run dev
```

開発サーバー: https://zany-yodel-g46jwq7v9g952995g.github.dev/

## 📊 実装状況

**進捗**: 2/20 テンプレート完成 (10%)

### ✅ 実装済み
- **CuteTap**: キャラクタータップゲーム
- **MemoryMatch**: カードめくりペアゲーム

### 🔄 自動進行システム
CuteTap ↔ MemoryMatch の連続自動プレイが動作中

### 🧪 テストモード
画面右上の「🧪テストモード」で実装状況確認可能
- 🔵青色: 完全実装済み
- 🟢緑色: ファイル存在、登録待ち
- 🟡黄色: 未実装、フォールバック動作

## 🏗️ アーキテクチャ

```
src/
├── game-engine/
│   ├── GameTemplate.ts          # 基底クラス
│   ├── GameTemplateFactory.ts   # テンプレート管理
│   ├── CuteTapGame.ts          # 実装済み
│   ├── MemoryMatchGame.ts      # 実装済み
│   └── [Other]Game.ts          # 実装予定
├── components/
│   ├── GameCanvas.tsx          # ゲーム描画
│   └── GameSequence.tsx       # 連続プレイ制御
└── App.tsx
```

## 🎯 次に実装すべきテンプレート

### 高優先度
1. **QuickDodgeGame** - 障害物回避ゲーム
2. **TimingPerfectGame** - タイミングゲーム
3. **CollectItemsGame** - アイテム収集ゲーム

## 🛠️ テンプレート実装手順

### 1. ファイル作成
`src/game-engine/[Name]Game.ts` を作成

### 2. 基本構造
```typescript
import * as PIXI from 'pixi.js';
import { GameTemplate, GameSettings } from './GameTemplate';

export interface [Name]Settings extends GameSettings {
  // ゲーム固有設定
}

export class [Name]Game extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;
  protected settings: [Name]Settings;

  constructor(app: PIXI.Application, settings: [Name]Settings) {
    super(app, settings);
    this.settings = settings;
  }

  async createScene(): Promise<void> {
    // ゲーム要素作成
    this.createUI(); // 必須: タイマー・スコア表示
  }

  handleInput(event: PIXI.FederatedPointerEvent): void {
    // 入力処理
  }

  updateGame(deltaTime: number): void {
    // ゲーム更新
  }

  protected checkWinCondition(): boolean {
    return this.currentScore >= this.settings.targetScore;
  }

  protected showResult(result: { success: boolean; score: number; message: string }): void {
    if (this.onGameEnd) {
      this.onGameEnd(result.success, result.score);
    }
  }
}
```

### 3. Factory登録
`GameTemplateFactory.ts` の `createInstance` メソッドに追加:

```typescript
} else if (config.id === '[template_id]') {
  const { [Name]Game } = await import('./[Name]Game');
  return new [Name]Game(app, {
    duration: settings.duration,
    targetScore: settings.targetScore,
    // ゲーム固有設定
    characterType: settings.characterType
  });
```

### 4. 実装状況更新
`registerTemplateFromConfig` の `implementationStatus` を `'implemented'` に変更

### 5. テスト
1. 🧪テストモードで青色表示確認
2. 個別プレイテスト
3. 自動進行テスト

## 🐛 トラブルシューティング

### テンプレートが黄色表示
**原因**: GameTemplateFactory に登録されていない
**解決**: createInstance メソッドに import と case を追加

### ゲームが自動進行しない
**原因**: onGameEnd コールバックが未設定または未呼び出し
**解決**: showResult メソッドを正しくオーバーライド

### PIXI初期化エラー
**原因**: app.stage が null または プロパティアクセス失敗
**解決**: null チェックとフォールバック処理を追加

### キャラクターが表示されない
**原因**: 画面サイズの取得失敗
**解決**: `app.renderer?.width` や `app.view?.width` でフォールバック

## 📈 開発データ

### 技術スタック
- **Frontend**: React 18 + TypeScript
- **Game Engine**: PixiJS 7.x
- **Build Tool**: Vite
- **Environment**: GitHub Codespaces

### パフォーマンス目標
- 初回ロード: < 3秒
- ゲーム切り替え: < 1秒
- フレームレート: 60 FPS
- メモリ使用量: < 50MB

## 📝 開発ログ

実装状況の詳細は `implementation-status.json` を参照

### 最近の修正
- 2025-01-27: CuteTap自動進行修正
- 2025-01-27: MemoryMatch完全実装
- 2025-01-27: PIXI初期化エラー解決

## 🔄 チャット引継ぎ用

### 新しいチャットでの確認手順
1. 環境URL動作確認 (30秒)
2. 前回変更の動作確認 (30秒)  
3. 実装状況確認 (テストモード) (30秒)
4. 次の実装対象決定 (30秒)
5. 実装作業開始

### 標準的な引継ぎプロンプト
```
# ショートゲームプラットフォーム開発継続

URL: https://zany-yodel-g46jwq7v9g952995g.github.dev/
実装済み: CuteTap ↔ MemoryMatch (自動進行動作中)
次タスク: [次のテンプレート名]

現状確認後、[次のテンプレート]の実装を開始してください。
実装パターンは README.md 参照。
```

---

**重要**: 各テンプレート実装後は `implementation-status.json` を更新してください