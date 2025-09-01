# ショートゲームプラットフォーム 引き継ぎプロンプト

## 📋 プロジェクト基本情報
**現在フェーズ**: Phase 6.1 - エディター機能実装開始（データ構造・基盤実装）
**完了**: Phase 5.5 EditableTemplate統合完了（TypeScriptエラー修正済み）
**次の作業**: エディター仕様書に基づくデータ構造実装

## 🎯 エディター機能開発開始

### 仕様書参照
プロジェクト内 `docs/editor/editor-specification.md` を必ず参照してください。
- データ構造全体設計
- UI仕様詳細  
- 4タブ構成（絵・音・スクリプト・設定公開）
- 容量制限・最適化仕様

### Phase 6.1: データ構造・基盤実装（Day 1-3）
**Day 1**: 型定義・インターフェース実装
- [ ] `src/types/editor/GameProject.ts`
- [ ] `src/types/editor/ProjectAssets.ts`  
- [ ] `src/types/editor/GameScript.ts`
- [ ] `src/constants/EditorLimits.ts`

**Day 2**: メインエディター画面実装
- [ ] `src/components/editor/GameEditor.tsx`
- [ ] `src/components/editor/ProjectSelector.tsx`
- [ ] タブ切り替え基本UI

**Day 3**: プロジェクト管理システム
- [ ] `src/hooks/editor/useGameProject.ts`
- [ ] `src/services/editor/ProjectStorage.ts`

## 🌐 作業環境
- GitHub Codespace: zany-yodel
- 開発サーバー: `npm run dev`
- 仕様書: `docs/editor/editor-specification.md`
- 進捗: `docs/editor/implementation-progress.json`

## 💡 重要原則
1. 既存機能（Phase 1-5）完全保護
2. EditableTemplateシステムとの統合
3. 「小学生でも使える」ユーザビリティ
4. 段階的実装・動作確認重視

## 🚀 開始指示
エディター仕様書を読み、Phase 6.1 Day 1のTypeScript型定義実装から開始してください。
