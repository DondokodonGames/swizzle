#!/bin/bash
echo "=== 現在状況クイック確認 ==="
echo "日時: $(date)"
echo ""
echo "TypeScriptエラー:"
npx tsc --noEmit 2>&1 | head -3
echo ""
echo "開発サーバー:"
if pgrep -f "vite" > /dev/null; then
  echo "✅ 稼働中"
else
  echo "❌ 停止中"
fi
echo ""
echo "Git状況:"
git status --short
