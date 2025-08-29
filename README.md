# 🌟 Swizzle - Short Game Platform

**5-30秒で完結するショートゲームプラットフォーム**  
TikTok・YouTubeショート動画のようなUXで「簡単に作って、簡単に遊ぶ」を実現

## 🎯 プロジェクト概要

### コンセプト
- **作る側**: 小学生でも作れるほど簡単
- **遊ぶ側**: 次々と面白いゲームが流れてくる体験  
- **差別化**: インタラクティブ性による既存ショート動画との差別化

### ターゲット
- **プレイヤー**: ショート動画を見る10-20歳層
- **クリエイター**: プログラミング経験不要の創作者
- **プラットフォーム**: 創作・キュレーション中心（競争より創造性重視）

## 🚀 現在の実装状況

### ✅ Phase 1: テンプレート実装（完了）
- **20種類のゲームテンプレート**: 完全実装・動作確認済み
- **PixiJS 7.x ゲームエンジン**: 軽量・高パフォーマンス
- **自動連続プレイ**: メイドイン俺風UX実現

### ✅ Phase 2: エラーハンドリング強化（完了）
- **GameErrorManager**: 8種類エラー分類・自動復旧
- **EnhancedGameCanvas**: ユーザーフレンドリーエラー表示
- **パフォーマンス監視**: FPS・メモリ使用量表示

### 🚧 Phase 3: Supabase統合（進行中 - 30%）
- **✅ 環境準備**: データベーススキーマ・接続設定完了
- **⏳ 認証システム**: ユーザー登録・ログイン実装中
- **⏳ データ保存**: ゲーム作成・お気に入り機能準備中

## 🎮 実装済みゲームテンプレート（20種類）

<details>
<summary><strong>📋 全テンプレート一覧</strong></summary>

### Action系（8種類）
1. **CuteTapGame** - キュートタップゲーム
2. **QuickDodgeGame** - 障害物回避ゲーム
3. **CollectItemsGame** - アイテム収集ゲーム
4. **JumpAdventureGame** - ジャンプアクションゲーム
5. **FriendlyShootGame** - 非暴力シューティング
6. **AnimalChaseGame** - 動物追跡ゲーム
7. **DreamyJumpGame** - 夢世界ジャンプゲーム
8. **MagicalCollectGame** - 魔法収集ゲーム

### Puzzle系（6種類）
9. **MemoryMatchGame** - 記憶マッチングゲーム
10. **PuzzlePrincessGame** - お姫様パズルゲーム
11. **SpotDifferenceGame** - 間違い探しゲーム
12. **CountStarGame** - 星数えゲーム
13. **NumberHuntGame** - 数字探しゲーム
14. **OrderMasterGame** - 順序整理ゲーム

### Reaction系（4種類）
15. **RainbowMatchGame** - 虹色マッチングゲーム
16. **SpeedFriendGame** - 早押し友達ゲーム
17. **OppositeActionGame** - 反対行動ゲーム
18. **ReactionSpeedGame** - 反応速度ゲーム

### Timing系（2種類）
19. **TimingPerfectGame** - 完璧タイミングゲーム
20. **BalanceGame** - バランス調整ゲーム

</details>

## 💻 技術スタック

### フロントエンド
- **React 18** + **TypeScript** - 型安全な開発
- **Vite** - 高速ビルド・開発サーバー
- **PixiJS 7.x** - 軽量2Dゲームエンジン
- **PWA** - オフライン対応・インストール可能

### バックエンド
- **Supabase** - PostgreSQL + 認証 + ストレージ
- **Row Level Security** - データ安全性確保
- **Edge Functions** - サーバーレス処理

### デプロイメント
- **Vercel** - 自動デプロイ・CDN
- **GitHub Actions** - CI/CD
- **GitHub Codespaces** - クラウド開発環境

## 🌐 デモ・リンク

- **ライブデモ**: [Vercel デプロイ版](https://vercel-deployed-url.vercel.app/)
- **開発環境**: [GitHub Codespaces](https://zany-yodel-g46jwq7v9g952995g-3000.app.github.dev/)
- **リポジトリ**: [GitHub - DondokodonGames/swizzle](https://github.com/DondokodonGames/swizzle)

## 🚀 セットアップ・開発

### 開発環境構築

1. **リポジトリクローン**
   ```bash
   git clone https://github.com/DondokodonGames/swizzle.git
   cd swizzle
   ```

2. **依存関係インストール**
   ```bash
   npm install
   ```

3. **環境変数設定**
   ```bash
   cp .env.example .env.local
   # .env.local に Supabase接続情報を設定
   ```

4. **開発サーバー起動**
   ```bash
   npm run dev
   ```

### Supabase設定

<details>
<summary><strong>📝 データベーススキーマ</strong></summary>

```sql
-- ユーザープロフィール拡張
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  age INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザー作成ゲーム
CREATE TABLE user_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  template_id VARCHAR(50) NOT NULL,
  game_data JSONB NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- お気に入り機能
CREATE TABLE game_favorites (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_id UUID REFERENCES user_games(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, game_id)
);

-- プレイリスト機能
CREATE TABLE playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

</details>

## 🎯 ロードマップ

### Phase 4 候補（Phase 3完了後）
- **A. UI/UX完成**: チュートリアル・設定画面・アニメーション強化
- **B. AI活用**: ChatGPT/Claude API統合・自動コンテンツ生成
- **C. 収益化**: 広告システム・プレミアム機能・アプリストア申請
- **D. 技術強化**: パフォーマンス最適化・テストスイート・CI/CD強化

### 長期ビジョン
- **1000本ゲーム**: AI自動生成によるコンテンツ大量準備
- **グローバル展開**: 多言語対応・地域別最適化
- **エデュケーション**: 教育機関向け機能・プログラミング学習支援
- **メタバース連携**: 仮想世界でのゲーム体験・ソーシャル機能強化

## 📊 プロジェクト統計

- **開発期間**: 100日計画（進行中）
- **予算**: 10万円
- **開発体制**: 一人開発
- **テンプレート数**: 20種類 完成
- **技術負債**: 最小限（型安全性・エラーハンドリング完備）
- **パフォーマンス**: モバイル60FPS・3秒以内ロード達成

## 🤝 コントリビューション

現在一人開発中ですが、将来的にはコントリビューション歓迎予定です。

### 興味のある分野
- 🎮 **ゲームテンプレート**: 新しいゲームアイデア・実装
- 🎨 **UI/UX**: デザイン改善・アクセシビリティ向上  
- 🤖 **AI活用**: コンテンツ自動生成・品質向上
- 🌐 **国際化**: 多言語対応・地域別カスタマイズ

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 📞 連絡先

- **GitHub**: [@DondokodonGames](https://github.com/DondokodonGames)
- **プロジェクト**: [Short Game Platform](https://github.com/DondokodonGames/swizzle)

---

### 🏆 達成状況
```
Phase 1: ████████████████████████████████ 100% (テンプレート実装)
Phase 2: ████████████████████████████████ 100% (エラーハンドリング)  
Phase 3: ████████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ 30%  (Supabase統合)
```

**🚀 次回アップデート**: 認証システム完成・ユーザーゲーム保存機能実装予定