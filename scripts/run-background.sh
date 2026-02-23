#!/bin/bash
# Codespace切断後もゲーム生成を継続するためのバックグラウンド実行スクリプト
#
# 使い方:
#   chmod +x scripts/run-background.sh
#   ./scripts/run-background.sh 200
#
# 進捗確認:
#   tail -f ~/generation.log
#
# 停止:
#   kill $(cat ~/generation.pid)

COUNT=${1:-200}
LOG_FILE="$HOME/generation.log"
PID_FILE="$HOME/generation.pid"

echo "🚀 バックグラウンドで $COUNT 件の生成を開始します..."
echo "   ログ: $LOG_FILE"
echo "   PID: $PID_FILE"
echo ""
echo "切断後の進捗確認コマンド:"
echo "   tail -f $LOG_FILE"
echo ""

# 既存のプロセスが動いていれば警告
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "⚠️  既存のプロセス (PID: $OLD_PID) が動いています。"
    echo "   停止するには: kill $OLD_PID"
    echo "   強制続行するには: rm $PID_FILE && $0 $COUNT"
    exit 1
  fi
fi

# nohup でバックグラウンド実行
nohup npm run "ai:neta:$COUNT" > "$LOG_FILE" 2>&1 &
PID=$!
echo $PID > "$PID_FILE"

echo "✅ 開始しました (PID: $PID)"
echo ""
echo "数秒後にログを確認:"
sleep 3
tail -n 20 "$LOG_FILE"
