// 244-number-bounce.js
// ナンバーバウンス — 弾む数字を昇順にタップする瞬発暗算ゲーム
// 操作: 数字を1→2→3→...の順にタップ
// 成功: 1〜20を全部順にタップ  失敗: 間違いタップ or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020510',
    ball:   '#3b82f6',
    ballHi: '#93c5fd',
    next:   '#22c55e',
    nextHi: '#86efac',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var TOTAL = 20;
  var balls = [];
  var nextTarget = 1;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];

  function initBalls() {
    balls = [];
    for (var i = 1; i <= TOTAL; i++) {
      var r = 44;
      var x = r + Math.random() * (W - r * 2);
      var y = 160 + Math.random() * (H - 300 - r * 2) + r;
      var speed = 80 + Math.random() * 120;
      var angle = Math.random() * Math.PI * 2;
      balls.push({
        n: i,
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: r,
        col: '#' + Math.floor(0x1a3a6a + Math.random() * 0x1a1a1a).toString(16).padStart(6, '0'),
        tapped: false,
        tapFlash: 0
      });
    }
  }

  game.onTap(function(tx, ty) {
    if (done || feedbackTimer > 0.15) return;

    var hit = -1;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.tapped) continue;
      var dx = tx - b.x, dy = ty - b.y;
      if (dx * dx + dy * dy < (b.r + 10) * (b.r + 10)) {
        hit = i;
        break;
      }
    }

    if (hit < 0) return;

    var b = balls[hit];
    if (b.n === nextTarget) {
      b.tapped = true;
      b.tapFlash = 0.5;
      nextTarget++;
      game.audio.play('se_tap', 0.4);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160, life: 0.4, col: C.nextHi });
      }
      if (nextTarget > TOTAL && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(TOTAL * 100 + Math.ceil(timeLeft) * 50); }, 400);
      }
    } else {
      feedback = '順番が違う！ ' + b.n + ' ≠ ' + nextTarget;
      feedbackCol = C.wrong;
      feedbackTimer = 0.7;
      game.audio.play('se_failure', 0.4);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.tapped) { if (b.tapFlash > 0) b.tapFlash -= dt; continue; }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < 160) { b.y = 160 + b.r; b.vy = Math.abs(b.vy); }
      if (b.y + b.r > H - 60) { b.y = H - 60 - b.r; b.vy = -Math.abs(b.vy); }
    }

    for (var pi = particles.length - 1; pi >= 0; pi--) {
      particles[pi].x += particles[pi].vx * dt;
      particles[pi].y += particles[pi].vy * dt;
      particles[pi].life -= dt;
      if (particles[pi].life <= 0) particles.splice(pi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    for (var i2 = 0; i2 < balls.length; i2++) {
      var b2 = balls[i2];
      if (b2.tapped) {
        if (b2.tapFlash > 0) {
          game.draw.circle(b2.x, b2.y, b2.r * (1 + b2.tapFlash), C.nextHi, b2.tapFlash * 0.5);
        }
        continue;
      }
      var isNext = b2.n === nextTarget;
      var col = isNext ? C.next : C.ball;
      var hiCol = isNext ? C.nextHi : C.ballHi;
      var pulse = isNext ? (0.85 + 0.15 * Math.abs(Math.sin(elapsed * 6))) : 1;
      game.draw.circle(b2.x, b2.y, b2.r * pulse + 6, hiCol, 0.2);
      game.draw.circle(b2.x, b2.y, b2.r * pulse, col, 0.9);
      game.draw.circle(b2.x - b2.r * 0.3, b2.y - b2.r * 0.3, b2.r * 0.2, '#fff', 0.5);
      game.draw.text(b2.n + '', b2.x, b2.y + 16, { size: isNext ? 56 : 46, color: '#fff', bold: true });
    }

    for (var pp = 0; pp < particles.length; pp++) {
      var p = particles[pp];
      game.draw.circle(p.x, p.y, 8 * p.life / 0.4, p.col, p.life * 0.8);
    }

    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.85, { size: 46, color: feedbackCol, bold: true });
    }

    game.draw.text('次: ' + nextTarget, W / 2, H * 0.92, { size: 56, color: C.next, bold: true });

    game.draw.text((nextTarget - 1) + ' / ' + TOTAL, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.next : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initBalls();
  });
})(game);
