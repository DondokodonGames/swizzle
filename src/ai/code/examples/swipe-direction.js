// swipe-direction.js
// 画面に表示された矢印の方向にスワイプする（5問 or 10秒）
// SwizzleGameAPI few-shot example #3

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  var DIRS = ['up', 'down', 'left', 'right'];
  var ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };
  var COLORS = { up: '#3b82f6', down: '#f59e0b', left: '#ec4899', right: '#22c55e' };

  var score = 0;
  var required = 5;
  var currentDir = '';
  var feedback = '';     // '' | 'ok' | 'ng'
  var feedbackTimer = 0;
  var timeLeft = 10;
  var waiting = false;   // アニメーション中は入力不可

  function nextQuestion() {
    currentDir = DIRS[Math.floor(Math.random() * DIRS.length)];
    feedback = '';
    waiting = false;
  }

  game.onSwipe(function(dir) {
    if (waiting || !currentDir) return;

    if (dir === currentDir) {
      score++;
      feedback = 'ok';
      game.audio.play('se_success', 0.8);
      if (score >= required) {
        waiting = true;
        setTimeout(function() { game.end.success(score * 20); }, 600);
        return;
      }
    } else {
      feedback = 'ng';
      game.audio.play('se_failure', 0.6);
    }

    waiting = true;
    feedbackTimer = 0.5;
    setTimeout(function() {
      waiting = false;
      nextQuestion();
    }, 500);
  });

  game.onUpdate(function(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0 && !waiting) {
      game.end.failure();
      return;
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    // 描画
    game.draw.clear('#0f0f1a');

    // タイムバー
    var ratio = Math.max(0, timeLeft / 10);
    game.draw.rect(0, 0, W, 80, '#1e293b');
    game.draw.rect(0, 0, W * ratio, 80, ratio > 0.3 ? '#a855f7' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 40, { size: 48, color: '#fff', bold: true });

    // スコア
    game.draw.text(score + ' / ' + required, W / 2, 160, { size: 64, color: '#94a3b8', bold: true });

    // 大きな矢印
    var col = COLORS[currentDir] || '#ffffff';
    if (feedback === 'ok') col = '#22c55e';
    if (feedback === 'ng') col = '#ef4444';

    game.draw.text(ARROWS[currentDir] || '', W / 2, H / 2, { size: 480, color: col, bold: true });

    // フィードバックテキスト
    if (feedback === 'ok') {
      game.draw.text('OK!', W / 2, H / 2 + 400, { size: 120, color: '#22c55e', bold: true });
    } else if (feedback === 'ng') {
      game.draw.text('NG!', W / 2, H / 2 + 400, { size: 120, color: '#ef4444', bold: true });
    } else {
      game.draw.text('スワイプ！', W / 2, H - 200, { size: 60, color: '#64748b' });
    }
  });

  game.onStart(function() {
    nextQuestion();
    game.audio.bgm('bgm_main', 0.4);
  });
})(game);
