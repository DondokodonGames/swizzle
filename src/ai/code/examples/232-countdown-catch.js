// 232-countdown-catch.js
// カウントダウンキャッチ — ゼロになる直前のボールを捕まえる判断力ゲーム
// 操作: タップでキャッチ（残り時間1秒以内でのみ有効）
// 成功: 10個キャッチ  失敗: 5回早すぎ・遅すぎ or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04060a',
    ball:   '#3b82f6',
    ballHi: '#93c5fd',
    timer:  '#f59e0b',
    timerDanger: '#ef4444',
    catchZone: '#22c55e',
    miss:   '#ef4444',
    ui:     '#475569'
  };

  var balls = [];
  var caught = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 1.8;
  var BALL_R = 50;
  var CATCH_WINDOW = 1.0; // seconds remaining to trigger catch
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];

  function spawnBall() {
    var countFrom = 3.0 + Math.random() * 3.0; // 3-6 second countdown
    balls.push({
      x: 80 + Math.random() * (W - 160),
      y: H * 0.2 + Math.random() * H * 0.6,
      timer: countFrom,
      totalTimer: countFrom,
      r: BALL_R,
      phase: 'counting', // 'counting' | 'caught' | 'expired'
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];
      if (b.phase !== 'counting') continue;
      var dx = tx - b.x, dy = ty - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < b.r + 30) {
        if (b.timer <= CATCH_WINDOW) {
          // Valid catch!
          b.phase = 'caught';
          caught++;
          feedback = 'CATCH! (' + b.timer.toFixed(2) + 's)';
          feedbackCol = C.catchZone;
          feedbackTimer = 0.6;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.5 });
          }
          if (caught >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(caught * 100 + Math.ceil(timeLeft) * 30); }, 400);
          }
        } else {
          // Too early!
          misses++;
          feedback = 'TOO EARLY! (' + b.timer.toFixed(2) + 's)';
          feedbackCol = C.miss;
          feedbackTimer = 0.7;
          game.audio.play('se_failure', 0.5);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        hit = true;
        break;
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

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnBall();
      spawnTimer = SPAWN_INTERVAL * (0.7 + Math.random() * 0.6);
    }

    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.x = Math.max(b.r, Math.min(W - b.r, b.x));
      b.y = Math.max(b.r + 80, Math.min(H - b.r - 100, b.y));
      if (b.x <= b.r || b.x >= W - b.r) b.vx = -b.vx;
      if (b.y <= b.r + 80 || b.y >= H - b.r - 100) b.vy = -b.vy;

      if (b.phase === 'counting') {
        b.timer -= dt;
        if (b.timer <= 0) {
          b.phase = 'expired';
          misses++;
          game.audio.play('se_failure', 0.3);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
          setTimeout(function() { }, 400);
        }
      } else if (b.phase === 'caught') {
        b.r += 200 * dt;
        b.r > 200 && balls.splice(bi, 1);
      } else if (b.phase === 'expired') {
        b.r -= 100 * dt;
        if (b.r <= 0) balls.splice(bi, 1);
      }
    }

    for (var pi = particles.length - 1; pi >= 0; pi--) {
      particles[pi].x += particles[pi].vx * dt;
      particles[pi].y += particles[pi].vy * dt;
      particles[pi].vy += 200 * dt;
      particles[pi].life -= dt;
      if (particles[pi].life <= 0) particles.splice(pi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b2 = balls[bi2];
      var inWindow = b2.phase === 'counting' && b2.timer <= CATCH_WINDOW;
      var col = b2.phase === 'expired' ? '#334155' : inWindow ? C.catchZone : C.ball;
      var hi = inWindow ? '#86efac' : C.ballHi;

      if (inWindow) {
        var pulse = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * 10));
        game.draw.circle(b2.x, b2.y, b2.r + 20, hi, pulse * 0.5);
      }
      game.draw.circle(b2.x, b2.y, b2.r + 6, hi, 0.2);
      game.draw.circle(b2.x, b2.y, b2.r, col, b2.phase === 'expired' ? 0.3 : 0.85);
      game.draw.circle(b2.x - b2.r * 0.3, b2.y - b2.r * 0.3, b2.r * 0.2, '#fff', 0.4);

      if (b2.phase === 'counting') {
        var tColor = b2.timer <= CATCH_WINDOW ? C.timerDanger : b2.timer <= 2 ? C.timer : '#f1f5f9';
        game.draw.text(b2.timer.toFixed(1), b2.x, b2.y, { size: 44, color: tColor, bold: true });
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var p = particles[pp];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, C.catchZone, p.life);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.14, { size: 46, color: feedbackCol, bold: true });
    }

    // Catch window hint
    game.draw.text('残り1秒以内でキャッチ！', W / 2, H * 0.9, { size: 38, color: C.ui });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 28 + mi * 56, H * 0.94, 18, mi < misses ? C.miss : '#0a0a14');
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ball : C.timerDanger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 0.5;
  });
})(game);
