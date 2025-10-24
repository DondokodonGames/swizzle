#!/bin/bash

echo "# ショートゲームプラットフォーム 現在状況" > CURRENT_HANDOVER.md
echo "" >> CURRENT_HANDOVER.md
echo "## 基本情報" >> CURRENT_HANDOVER.md
echo "- **更新日時**: $(date)" >> CURRENT_HANDOVER.md
echo "- **Git状況**: $(git branch --show-current)" >> CURRENT_HANDOVER.md
echo "- **基本進捗**: implementation-status.json参照" >> CURRENT_HANDOVER.md
echo "" >> CURRENT_HANDOVER.md

echo "## 現在の技術的状況" >> CURRENT_HANDOVER.md
echo "### TypeScriptエラー" >> CURRENT_HANDOVER.md
npx tsc --noEmit 2>&1 | head -10 >> CURRENT_HANDOVER.md

echo "" >> CURRENT_HANDOVER.md
echo "### 開発サーバー状況" >> CURRENT_HANDOVER.md
if pgrep -f "vite" > /dev/null; then
  echo "✅ 開発サーバー稼働中" >> CURRENT_HANDOVER.md
else
  echo "❌ 開発サーバー停止中 (npm run dev で起動)" >> CURRENT_HANDOVER.md
fi

echo "" >> CURRENT_HANDOVER.md
echo "### Git状況" >> CURRENT_HANDOVER.md
git status --short >> CURRENT_HANDOVER.md

echo "" >> CURRENT_HANDOVER.md
echo "## 引き継ぎ指示" >> CURRENT_HANDOVER.md
echo "新しいチャットでは以下を実行：" >> CURRENT_HANDOVER.md
echo "'implementation-status.json と CURRENT_HANDOVER.md を確認して作業を継続してください'" >> CURRENT_HANDOVER.md

echo "引き継ぎファイル更新完了: $(date)"
