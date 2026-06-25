// 152-slingshot.js
// パチンコ — ゴムの張力を感じながら狙いを定めて放つ爽快感
// 操作: スワイプで引っ張る方向と強さを決め放つ
// 成功: 10個の的を割る  失敗: 15発撃ち尽くす or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080c',
    fork:    '#6b4c1a',
    forkHi:  '#d97706',
    band:    '#dc2626',
    ball:    '#f59e0b',
    ballHi:  '#fef08a',
    target:  '#22c55e',
    targetHi:'#86efac',
    broken:  '#374151',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var FORK_X = W / 2;
  var FORK_Y = H * 0.72;
  var FORK_ARM = 80; // half-width of fork
  var MAX_PULL = 160;

  var ball = { x: FORK_X, y: FORK_Y, vx: 0, vy: 0, flying: false, r: 22 };
  var pulling = false;
  var pullX = FORK_X, pullY = FORK_Y;
  var swipeStart = null;

  // Targets arranged in rows
  var targets = [];
  var TARGET_R = 36;
  function makeTargets() {
    targets = [];
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 4; c++) {
        if (Math.random() > 0.65) continue;
        targets.push({ x: 100 + c * 260, y: H*0.12 + r * 110, r: TARGET_R, alive: true, hitTimer: 0 });
      }
    }
    // Ensure at least 10
    while (targets.length < 10) {
      targets.push({ x: 80 + Math.random()*(W-160), y: H*0.08 + Math.random()*H*0.28, r: TARGET_R, alive: true, hitTimer: 0 });
    }
  }

  var ammo = 15;
  var score = 0;
  var needed = 10;
  var timeLeft = 45;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || ball.flying) return;
    // Swipe to set pull direction and launch
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx*dx+dy*dy);
    if (len < 20) return;
    var power = Math.min(len / 2, MAX_PULL);
    // Launch opposite to swipe direction
    ball.vx = -(dx/len) * power * 5.5;
    ball.vy = -(dy/len) * power * 5.5;
    ball.x = FORK_X;
    ball.y = FORK_Y;
    ball.flying = true;
    ammo--;
    game.audio.play('se_tap', 0.8);
    if (ammo <= 0 && score < needed && !done) {
      // Will check after ball lands
    }
    // Show pull visual
    pullX = FORK_X + (dx/len) * power * 0.5;
    pullY = FORK_Y + (dy/len) * power * 0.5;
  });

  game.onTap(function(tx, ty) {
    if (done || ball.flying) return;
    // Tap sets aim and shoots based on tap position relative to fork
    var dx = tx - FORK_X, dy = ty - FORK_Y;
    var len = Math.sqrt(dx*dx+dy*dy);
    if (len < 10) return;
    var power = Math.min(len, MAX_PULL);
    ball.vx = -(dx/len) * power * 4;
    ball.vy = -(dy/len) * power * 4;
    ball.x = FORK_X;
    ball.y = FORK_Y;
    ball.flying = true;
    ammo--;
    game.audio.play('se_tap', 0.8);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (ball.flying) {
      ball.vy += 600 * dt; // gravity
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Check target collisions
      for (var ti = 0; ti < targets.length; ti++) {
        var t = targets[ti];
        if (!t.alive) continue;
        var dx = ball.x - t.x, dy = ball.y - t.y;
        if (Math.sqrt(dx*dx+dy*dy) < ball.r + t.r) {
          t.alive = false;
          t.hitTimer = 0.6;
          score++;
          feedbackOk = true;
          feedback = 0.4;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random()*Math.PI*2;
            particles.push({ x: t.x, y: t.y, vx: Math.cos(ang)*220, vy: Math.sin(ang)*220-100, life: 0.5 });
          }
          ball.flying = false;
          ball.x = FORK_X; ball.y = FORK_Y;
          if (score >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(score*50+Math.ceil(timeLeft)*15+(ammo*20)); }, 400);
          }
          break;
        }
      }

      // Ball off screen
      if (ball.x < -80 || ball.x > W+80 || ball.y > H+80) {
        ball.flying = false;
        ball.x = FORK_X; ball.y = FORK_Y;
        feedbackOk = false; feedback = 0.3;
        if (ammo <= 0 && score < needed && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var ti2 = 0; ti2 < targets.length; ti2++) {
      if (targets[ti2].hitTimer > 0) targets[ti2].hitTimer -= dt;
    }
    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx*dt; particles[pi2].y += particles[pi2].vy*dt;
      particles[pi2].vy += 600*dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Targets
    for (var ti3 = 0; ti3 < targets.length; ti3++) {
      var t2 = targets[ti3];
      if (!t2.alive && t2.hitTimer <= 0) continue;
      if (!t2.alive) {
        game.draw.circle(t2.x, t2.y, t2.r, C.broken, t2.hitTimer * 0.8);
        game.draw.text('✕', t2.x, t2.y, { size: 40, color: C.wrong, bold: true });
      } else {
        game.draw.circle(t2.x, t2.y, t2.r+8, C.targetHi, 0.25);
        game.draw.circle(t2.x, t2.y, t2.r, C.target, 0.9);
        game.draw.circle(t2.x, t2.y, t2.r*0.5, C.targetHi, 0.6);
        game.draw.circle(t2.x, t2.y, 8, '#fff', 0.8);
      }
    }

    // Fork frame
    game.draw.line(FORK_X, FORK_Y, FORK_X-FORK_ARM, FORK_Y-FORK_ARM*0.8, C.fork, 20);
    game.draw.line(FORK_X, FORK_Y, FORK_X+FORK_ARM, FORK_Y-FORK_ARM*0.8, C.fork, 20);
    game.draw.circle(FORK_X-FORK_ARM, FORK_Y-FORK_ARM*0.8, 14, C.forkHi, 0.9);
    game.draw.circle(FORK_X+FORK_ARM, FORK_Y-FORK_ARM*0.8, 14, C.forkHi, 0.9);
    game.draw.line(FORK_X, FORK_Y, FORK_X, FORK_Y+120, C.fork, 24);

    // Rubber band (when not flying)
    if (!ball.flying) {
      game.draw.line(FORK_X-FORK_ARM, FORK_Y-FORK_ARM*0.8, FORK_X, FORK_Y, C.band, 6);
      game.draw.line(FORK_X+FORK_ARM, FORK_Y-FORK_ARM*0.8, FORK_X, FORK_Y, C.band, 6);
      // Ball on sling
      game.draw.circle(FORK_X, FORK_Y, ball.r+6, C.ballHi, 0.3);
      game.draw.circle(FORK_X, FORK_Y, ball.r, C.ball, 0.9);
    } else {
      // Flying ball
      game.draw.circle(ball.x, ball.y, ball.r+6, C.ballHi, 0.4);
      game.draw.circle(ball.x, ball.y, ball.r, C.ball, 0.9);
      game.draw.circle(ball.x-ball.r*0.3, ball.y-ball.r*0.3, ball.r*0.25, '#fff', 0.5);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8*part.life*3, C.target, part.life);
    }

    // HUD
    if (!ball.flying) {
      game.draw.text('タップで発射！', W/2, H*0.9, { size: 44, color: C.ui });
    }
    game.draw.text('残り弾数: ' + ammo, W*0.25, H*0.92, { size: 36, color: ammo < 5 ? C.wrong : C.ui });

    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.12);
    }

    var ratio = Math.max(0, timeLeft/45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.ball : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.3); makeTargets(); });
})(game);
