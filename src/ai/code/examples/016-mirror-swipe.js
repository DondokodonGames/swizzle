// 016-mirror-swipe.js
// 鏡スワイプ — 左右が逆転した世界で正しく動く認知の混乱
// 操作: 表示と反対方向にスワイプ（左矢印→右スワイプ）
// 成功: 7問正解  失敗: 3ミス or 18秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0a0a1a',
    mirror:   '#1e1e3a',
    arrow:    '#818cf8',
    arrowHi:  '#c7d2fe',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    ui:       '#475569'
  };

  var DIRS = ['left', 'right', 'up', 'down'];
  // What the arrow shows vs what you must swipe
  // Left arrow = swipe RIGHT (mirror)
  var MIRROR = { left: 'right', right: 'left', up: 'down', down: 'up' };
  var ARROWS = { left: '←', right: '→', up: '↑', down: '↓' };
  var HINT_ARROWS = { left: '→', right: '←', up: '↓', down: '↑' }; // correct answer

  var currentDir = '';
  var score = 0;
  var needed = 7;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 18;
  var done = false;

  var feedback = 0;
  var feedbackOk = false;
  var waiting = false;

  function nextQuestion() {
    currentDir = DIRS[Math.floor(Math.random() * DIRS.length)];
    feedback = 0;
    waiting = false;
  }

  game.onSwipe(function(dir) {
    if (done || waiting || !currentDir) return;
    feedback = 0.4;
    waiting = true;

    var correct = MIRROR[currentDir]; // what player should swipe
    if (dir === correct) {
      score++;
      feedbackOk = true;
      game.audio.play('se_tap', 0.9);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 15 + Math.ceil(timeLeft) * 5);
        }, 500);
        return;
      }
    } else {
      misses++;
      feedbackOk = false;
      game.audio.play('se_failure', 0.6);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }

    setTimeout(function() {
      if (!done) nextQuestion();
    }, 380);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // mirror lines radiating from center
    var cx = W / 2;
    var cy = H * 0.46;
    for (var r = 80; r <= 500; r += 120) {
      game.draw.circle(cx, cy, r, '#1a1a3a', 0.2);
    }
    // vertical mirror line
    game.draw.rect(W / 2 - 2, H * 0.2, 4, H * 0.52, '#312e81', 0.5);

    // timer bar
    var ratio = Math.max(0, timeLeft / 18);
    game.draw.rect(0, 0, W, 72, '#0d0d20');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#6366f1' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // score & misses
    game.draw.text(score + ' / ' + needed, W / 2, 130, { size: 56, color: C.arrowHi, bold: true });
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 60;
      game.draw.circle(mx, 200, 18, m < misses ? C.wrong : '#1e1e3a');
    }

    // main arrow display
    var arrowColor = C.arrow;
    if (feedback > 0) arrowColor = feedbackOk ? C.correct : C.wrong;

    var arrowScale = 1.0;
    if (feedback > 0) arrowScale = feedbackOk ? 1.15 : 0.9;

    // "MIRROR" label
    game.draw.text('⬡ MIRROR MODE ⬡', W / 2, H * 0.3, { size: 36, color: '#4338ca' });

    // Main direction arrow
    game.draw.text(ARROWS[currentDir] || '', W / 2, cy, {
      size: Math.floor(480 * arrowScale),
      color: arrowColor,
      bold: true
    });

    // feedback text
    if (feedback > 0) {
      var prog = 1 - feedback / 0.4;
      if (feedbackOk) {
        game.draw.text('正解！', W / 2, cy - 340 - prog * 60, { size: 80, color: C.correct, bold: true });
      } else {
        var correct = MIRROR[currentDir];
        game.draw.text('→ ' + HINT_ARROWS[currentDir], W / 2, cy - 340, { size: 80, color: C.wrong, bold: true });
      }
    }

    // guide
    game.draw.text('反対方向にスワイプ！', W / 2, H - 220, { size: 52, color: C.ui });
    game.draw.text('←は右に、↑は下に', W / 2, H - 160, { size: 38, color: '#334155' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    nextQuestion();
  });
})(game);
