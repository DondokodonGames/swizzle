// 260-speed-sort.js
// スピードソート — 降ってくる数字を大きい順・小さい順にソートするリフレックスゲーム
// 操作: スワイプ上で「大きい方」、スワイプ下で「小さい方」をスタックに追加
// 成功: 20問正しくソート  失敗: 5回ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030508',
    card:   '#1e293b',
    cardHi: '#334155',
    big:    '#f59e0b',
    bigHi:  '#fde68a',
    small:  '#3b82f6',
    smlHi:  '#93c5fd',
    correct:'#22c55e',
    corHi:  '#86efac',
    wrong:  '#ef4444',
    wrnHi:  '#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // Present two numbers — player must pick which goes BIG stack or SMALL stack
  var leftNum = 0;
  var rightNum = 0;
  var bigStack = [];
  var smallStack = [];
  var sorted = 0;
  var NEEDED = 20;
  var mistakes = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var animCard = null; // { num, targetX, targetY, startX, startY, timer, dur }

  function generatePair() {
    leftNum = Math.floor(Math.random() * 98) + 1;
    do { rightNum = Math.floor(Math.random() * 98) + 1; } while (rightNum === leftNum);
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || feedbackTimer > 0.1) return;

    // Determine which number was swiped
    var swipedNum, otherNum;
    if (x1 < W / 2) { swipedNum = leftNum; otherNum = rightNum; }
    else { swipedNum = rightNum; otherNum = leftNum; }

    var isBigSwipe = dir === 'up';
    var isCorrect = isBigSwipe ? (swipedNum > otherNum) : (swipedNum < otherNum);

    if (isCorrect) {
      sorted++;
      if (isBigSwipe) bigStack.push(swipedNum);
      else smallStack.push(swipedNum);
      feedback = '正解！';
      feedbackCol = C.correct;
      feedbackTimer = 0.4;
      game.audio.play('se_success', 0.6);
      for (var pi = 0; pi < 5; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: x1, y: y1, vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140, life: 0.4 });
      }
      if (sorted >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(sorted * 80 + Math.ceil(timeLeft) * 60); }, 400);
        return;
      }
      generatePair();
    } else {
      mistakes++;
      feedback = '違う！';
      feedbackCol = C.wrong;
      feedbackTimer = 0.5;
      game.audio.play('se_failure', 0.5);
      if (mistakes >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stack displays
    // Big stack (right side)
    game.draw.rect(W * 0.6, H * 0.15, W * 0.35, H * 0.22, '#0a1a08', 0.7);
    game.draw.text('大きい方 ↑', W * 0.775, H * 0.18, { size: 34, color: C.bigHi });
    for (var bi = 0; bi < Math.min(bigStack.length, 5); bi++) {
      game.draw.text(bigStack[bigStack.length - 1 - bi] + '', W * 0.775, H * 0.21 + bi * 32, { size: 28, color: C.big });
    }

    // Small stack (left side)
    game.draw.rect(W * 0.05, H * 0.15, W * 0.35, H * 0.22, '#000a1a', 0.7);
    game.draw.text('小さい方 ↑', W * 0.225, H * 0.18, { size: 34, color: C.smlHi });
    for (var si = 0; si < Math.min(smallStack.length, 5); si++) {
      game.draw.text(smallStack[smallStack.length - 1 - si] + '', W * 0.225, H * 0.21 + si * 32, { size: 28, color: C.small });
    }

    // Divider
    game.draw.line(W / 2, H * 0.42, W / 2, H * 0.78, C.ui, 3);

    // Number cards
    var leftPulse = 0.9 + 0.1 * Math.abs(Math.sin(elapsed * 3));
    var rightPulse = 0.9 + 0.1 * Math.abs(Math.sin(elapsed * 3 + 1));

    game.draw.rect(W * 0.05, H * 0.44, W * 0.4, H * 0.28, C.card, 0.8);
    game.draw.rect(W * 0.05, H * 0.44, W * 0.4, 8, C.smlHi, 0.4);
    game.draw.text(leftNum + '', W * 0.25, H * 0.58 + 20, { size: 120, color: C.text, bold: true });

    game.draw.rect(W * 0.55, H * 0.44, W * 0.4, H * 0.28, C.card, 0.8);
    game.draw.rect(W * 0.55, H * 0.44, W * 0.4, 8, C.bigHi, 0.4);
    game.draw.text(rightNum + '', W * 0.75, H * 0.58 + 20, { size: 120, color: C.text, bold: true });

    // Instructions
    game.draw.text('↑ スワイプ: この数を「大きい」スタックへ', W / 2, H * 0.76, { size: 30, color: C.big });
    game.draw.text('大きい数を上に、小さい数は無視', W / 2, H * 0.8, { size: 32, color: C.ui });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * (p.life / 0.4), C.corHi, p.life);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.86, { size: 56, color: feedbackCol, bold: true });
    }

    // Mistake dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 28 + mi * 56, H * 0.92, 16, mi < mistakes ? C.wrong : '#050810');
    }

    game.draw.text(sorted + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    generatePair();
  });
})(game);
