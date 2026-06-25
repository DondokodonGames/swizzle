// 273-plasma-bounce.js
// プラズマバウンス — 壁で跳ね返るプラズマボールを打ち返してターゲットを破壊
// 操作: タップで画面下のパドルを動かしてボールを反射
// 成功: 20個のターゲットを破壊  失敗: 3回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030210',
    ball:   '#a855f7',
    ballHi: '#e879f9',
    trail:  '#7c3aed',
    paddle: '#22c55e',
    padHi:  '#86efac',
    target: '#ef4444',
    tgtHi:  '#fca5a5',
    tgt2:   '#f59e0b',
    tgt2Hi: '#fde68a',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var PADDLE_W = 200;
  var PADDLE_H = 24;
  var PADDLE_Y = H * 0.85;
  var paddleX = W / 2 - PADDLE_W / 2;

  var ball = {
    x: W / 2, y: H * 0.5,
    vx: 280, vy: -340,
    r: 18,
    trail: []
  };

  var targets = [];
  var destroyed = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];

  function buildTargets() {
    var cols = 6, rows = 4;
    var tw = (W - 80) / cols;
    var th = 52;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        targets.push({
          x: 40 + c * tw,
          y: H * 0.18 + r * (th + 10),
          w: tw - 10,
          h: th,
          hp: r < 2 ? 1 : 2,
          col: r < 2 ? C.target : C.tgt2,
          hiCol: r < 2 ? C.tgtHi : C.tgt2Hi
        });
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    paddleX = Math.max(0, Math.min(W - PADDLE_W, tx - PADDLE_W / 2));
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Move ball
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 12) ball.trail.shift();

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Wall bounces
    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

    // Paddle collision
    if (ball.y + ball.r >= PADDLE_Y && ball.y + ball.r < PADDLE_Y + PADDLE_H + 20 &&
        ball.x >= paddleX - 10 && ball.x <= paddleX + PADDLE_W + 10 && ball.vy > 0) {
      ball.vy = -Math.abs(ball.vy);
      var hitPos = (ball.x - paddleX) / PADDLE_W - 0.5; // -0.5 to 0.5
      ball.vx += hitPos * 300;
      ball.vx = Math.max(-500, Math.min(500, ball.vx));
      game.audio.play('se_tap', 0.2);
    }

    // Ball fell off screen
    if (ball.y - ball.r > H) {
      misses++;
      game.audio.play('se_failure', 0.5);
      ball.x = W / 2;
      ball.y = H * 0.5;
      ball.vx = (Math.random() - 0.5) * 400;
      ball.vy = -360;
      ball.trail = [];
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }

    // Target collisions
    for (var ti = targets.length - 1; ti >= 0; ti--) {
      var t = targets[ti];
      if (ball.x + ball.r > t.x && ball.x - ball.r < t.x + t.w &&
          ball.y + ball.r > t.y && ball.y - ball.r < t.y + t.h) {
        // Bounce
        var fromLeft = ball.x < t.x || ball.x > t.x + t.w;
        if (fromLeft) ball.vx *= -1;
        else ball.vy *= -1;

        t.hp--;
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: t.x + t.w / 2, y: t.y + t.h / 2, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.5, col: t.col });
        }
        if (t.hp <= 0) {
          destroyed++;
          targets.splice(ti, 1);
          game.audio.play('se_success', 0.4);
          if (destroyed >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(destroyed * 100 + Math.ceil(timeLeft) * 80); }, 400);
            return;
          }
        } else {
          t.col = t.hiCol;
          game.audio.play('se_tap', 0.3);
        }
        break;
      }
    }

    // Respawn targets if cleared early
    if (targets.length === 0) buildTargets();

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Targets
    for (var ti2 = 0; ti2 < targets.length; ti2++) {
      var t2 = targets[ti2];
      game.draw.rect(t2.x, t2.y, t2.w, t2.h, t2.col, 0.85);
      game.draw.rect(t2.x, t2.y, t2.w, 8, t2.hiCol, 0.5);
      if (t2.hp > 1) {
        game.draw.rect(t2.x + 4, t2.y + t2.h / 2, t2.w - 8, 6, t2.hiCol, 0.4);
      }
    }

    // Ball trail
    for (var tri = 0; tri < ball.trail.length; tri++) {
      var a = (tri / ball.trail.length) * 0.6;
      game.draw.circle(ball.trail[tri].x, ball.trail[tri].y, ball.r * a, C.trail, a * 0.7);
    }

    // Ball
    game.draw.circle(ball.x, ball.y, ball.r + 6, C.ballHi, 0.2);
    game.draw.circle(ball.x, ball.y, ball.r, C.ball, 0.95);
    game.draw.circle(ball.x - 5, ball.y - 5, ball.r * 0.3, C.ballHi, 0.7);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 7 * p.life * 2, p.col, p.life * 0.8);
    }

    // Paddle
    game.draw.rect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, C.paddle, 0.9);
    game.draw.rect(paddleX, PADDLE_Y, PADDLE_W, 6, C.padHi, 0.7);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 28 + mi * 56, H * 0.92, 16, mi < misses ? C.target : '#060210');
    }

    game.draw.text(destroyed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ball : C.target);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    buildTargets();
  });
})(game);
