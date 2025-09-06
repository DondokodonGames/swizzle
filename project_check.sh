# #!/bin/bash

# ショートゲームプラットフォーム 環境確認・整理スクリプト
# 実行: bash project_check.sh > project_status_report.md

echo "# ショートゲームプラットフォーム 現状確認レポート"
echo "**生成日時**: $(date)"
echo "**目的**: 現在の環境状況を一挙確認・TypeScriptエラー解決"
echo ""

echo "## 🏗️ プロジェクト基本情報"
echo ""
echo "### Git状況"
echo "\`\`\`"
git status
echo "\`\`\`"
echo ""

echo "### 最近のコミット"
echo "\`\`\`"
git log --oneline -5
echo "\`\`\`"
echo ""

echo "### Node.js環境"
echo "\`\`\`"
node --version
npm --version
echo "\`\`\`"
echo ""

echo "## 📁 ファイル構造"
echo ""
echo "### 主要ディレクトリ構造"
echo "\`\`\`"
tree -L 4 src/ -I node_modules || find src -type d | head -20
echo "\`\`\`"
echo ""

echo "### game-engine ディレクトリ詳細"
echo "\`\`\`"
ls -la src/game-engine/ 2>/dev/null || echo "src/game-engine/ が存在しません"
echo "\`\`\`"
echo ""

echo "### components/editor ディレクトリ詳細"
echo "\`\`\`"
ls -la src/components/editor/ 2>/dev/null || echo "src/components/editor/ が存在しません"
echo "\`\`\`"
echo ""

echo "### types/editor ディレクトリ詳細"
echo "\`\`\`"
ls -la src/types/editor/ 2>/dev/null || echo "src/types/editor/ が存在しません"
echo "\`\`\`"
echo ""

echo "## 🚨 TypeScriptエラー確認"
echo ""
echo "### TypeScript コンパイルチェック"
echo "\`\`\`"
npx tsc --noEmit 2>&1 | head -50
echo "\`\`\`"
echo ""

echo "## 📄 重要ファイル内容確認"
echo ""

echo "### package.json"
echo "\`\`\`json"
cat package.json 2>/dev/null || echo "package.json が見つかりません"
echo "\`\`\`"
echo ""

echo "### tsconfig.json"
echo "\`\`\`json"
cat tsconfig.json 2>/dev/null || echo "tsconfig.json が見つかりません"
echo "\`\`\`"
echo ""

echo "### GameTemplateFactory.ts（先頭50行）"
echo "\`\`\`typescript"
head -50 src/game-engine/GameTemplateFactory.ts 2>/dev/null || echo "GameTemplateFactory.ts が見つかりません"
echo "\`\`\`"
echo ""

echo "### GameEditor.tsx（先頭30行）"
echo "\`\`\`typescript"
head -30 src/components/editor/GameEditor.tsx 2>/dev/null || echo "GameEditor.tsx が見つかりません"
echo "\`\`\`"
echo ""

echo "### App.tsx（先頭30行）"
echo "\`\`\`typescript"
head -30 src/App.tsx 2>/dev/null || echo "App.tsx が見つかりません"
echo "\`\`\`"
echo ""

echo "## 🔍 依存関係・インポート確認"
echo ""
echo "### GameTemplateFactoryのインポート文確認"
echo "\`\`\`typescript"
grep -n "import.*from" src/game-engine/GameTemplateFactory.ts 2>/dev/null || echo "インポート文が見つかりません"
echo "\`\`\`"
echo ""

echo "### エディター関連のインポート確認"
echo "\`\`\`typescript"
find src/components/editor/ -name "*.tsx" -exec grep -H "import.*from" {} \; 2>/dev/null | head -20
echo "\`\`\`"
echo ""

echo "## 🎮 ゲームテンプレート状況"
echo ""
echo "### 実装済みゲームファイル一覧"
echo "\`\`\`"
find src/game-engine/ -name "*Game.ts" | sort
echo "\`\`\`"
echo ""

echo "### template ディレクトリ状況"
echo "\`\`\`"
find src/game-engine/template/ -type f 2>/dev/null || echo "templateディレクトリが存在しないか空です"
echo "\`\`\`"
echo ""

echo "## 🔧 開発サーバー状況"
echo ""
echo "### 開発サーバー起動テスト（バックグラウンド）"
echo "\`\`\`"
timeout 10s npm run dev 2>&1 | head -10 || echo "開発サーバー起動に問題があります"
echo "\`\`\`"
echo ""

echo "## 📊 問題分析"
echo ""
echo "### TypeScriptエラー件数"
echo "\`\`\`"
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0件（または確認不可）"
echo "\`\`\`"
echo ""

echo "### 見つからないファイル・ディレクトリ"
echo "\`\`\`"
echo "=== 重要ファイル存在確認 ==="
[ -f src/game-engine/GameTemplateFactory.ts ] && echo "✅ GameTemplateFactory.ts" || echo "❌ GameTemplateFactory.ts"
[ -f src/components/editor/GameEditor.tsx ] && echo "✅ GameEditor.tsx" || echo "❌ GameEditor.tsx"
[ -f src/App.tsx ] && echo "✅ App.tsx" || echo "❌ App.tsx"
[ -d src/types/editor/ ] && echo "✅ types/editor/" || echo "❌ types/editor/"
[ -f package.json ] && echo "✅ package.json" || echo "❌ package.json"
echo "\`\`\`"
echo ""

echo "## 🎯 推奨修正アクション"
echo ""
echo "### 1. TypeScriptエラー修正優先度"
echo "- 型定義ファイルの不整合修正"
echo "- インポートパスエラー修正" 
echo "- 存在しないファイル参照修正"
echo ""
echo "### 2. 安定化のための手順"
echo "1. 重要ファイル存在確認"
echo "2. TypeScriptエラー0件達成"
echo "3. 開発サーバー正常起動確認"
echo "4. 既存機能動作確認"
echo ""
echo "### 3. 次回開発時の注意点"
echo "- 既存ファイル変更前にバックアップ"
echo "- 1つずつ段階的修正"
echo "- 各修正後にTypeScriptエラー確認"
echo ""

echo "---"
echo "**レポート生成完了**: $(date)"
echo "**次のアクション**: このレポートを基にTypeScriptエラー修正・環境安定化"
