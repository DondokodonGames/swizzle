// 560-bouncy-wall.js
// バウンシーウォール — 壁に向かってボールを投げてはね返りでターゲット破壊
// 操作: スワイプでボールを投げる方向と強さを決める
// 成功: 20ターゲット破壊  失敗: 12個ボール消費 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0814',
    wall:    '#334466',
    wallHi:  '#4466aa',
    ball:    '#ff6633',
    ballHi:  '#ffaa66',
    target:  '#22c55e',
    targetHi:'#86efac',
    broken:  '#ef4444',
    trail:   '#ff663344',
    text:    '#f1f5f9',
    ui:      '#374151',
    arrow:   '#4488ff',
    arrowHi: '#88bbff'
  };

  var WALL_THICKNESS = 40;
  var PLAY_X = WALL_THICKNESS;
  var PLAY_Y = H * 0.12;
  var PLAY_W = W - WALL_THICKNESS * 2;
  var PLAY_H = H * 0.72;
  var BALL_SPAWN_X = W / 2;
  var BALL_SPAWN_Y = PLAY_Y + PLAY_H - 100;
  var BALL_R = 30;
  var MAX_BOUNCES = 6;

  var ball = null;
  var targets = [];
  var broken = 0;
  var NEEDED = 20;
  var ballsUsed = 0;
  var MAX_BALLS = 12;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var trail = [];
  var swipeStart = null;
  var aiming = false;
  var aimVX = 0, aimVY = 0;

  function spawnTargets() {
    targets = [];
    var cols = 5, rows = 4;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (Math.random() < 0.7) {
          targets.push({
            x: PLAY_X + (c + 0.5) * PLAY_W / cols,
            y: PLAY_Y + (r + 0.5) * (PLAY_H * 0.5) / rows,
            r: 40,
            hp: Math.random() < 0.3 ? 2 : 1,
            maxHp: 1
          });
        }
      }
    }
    // Ensure enough targets
    targets.forEach(function(t) { t.maxHp = t.hp; });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (ball) return; // ball in flight
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 30) return;
    var speed = Math.min(len * 5, 1400);
    ball = {
      x: BALL_SPAWN_X, y: BALL_SPAWN_Y,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      bounces: 0,
      r: BALL_R
    };
    ballsUsed++;
    trail = [];
    game.audio.play('se_tap', 0.4);
    aimVX = (dx / len) * speed;
    aimVY = (dy / len) * speed;
    aiming = false;
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (ball) return;
    // Simple tap: launch at tap position
    var dx = tx - BALL_SPAWN_X, dy = ty - BALL_SPAWN_Y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    var speed = 900;
    ball = {
      x: BALL_SPAWN_X, y: BALL_SPAWN_Y,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      bounces: 0,
      r: BALL_R
    };
    ballsUsed++;
    trail = [];
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (ball) {
      var prevX = ball.x, prevY = ball.y;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Trail
      trail.push({ x: ball.x, y: ball.y, t: 0.35 });
      if (trail.length > 30) trail.shift();

      // Wall bounces
      if (ball.x - ball.r < PLAY_X) {
        ball.x = PLAY_X + ball.r;
        ball.vx = Math.abs(ball.vx) * 0.95;
        ball.bounces++;
        game.audio.play('se_tap', 0.3);
      }
      if (ball.x + ball.r > PLAY_X + PLAY_W) {
        ball.x = PLAY_X + PLAY_W - ball.r;
        ball.vx = -Math.abs(ball.vx) * 0.95;
        ball.bounces++;
        game.audio.play('se_tap', 0.3);
      }
      if (ball.y - ball.r < PLAY_Y) {
        ball.y = PLAY_Y + ball.r;
        ball.vy = Math.abs(ball.vy) * 0.95;
        ball.bounces++;
        game.audio.play('se_tap', 0.3);
      }

      // Target collision
      for (var ti = targets.length - 1; ti >= 0; ti--) {
        var t = targets[ti];
        var dx = ball.x - t.x, dy = ball.y - t.y;
        if (Math.sqrt(dx * dx + dy * dy) < ball.r + t.r) {
          t.hp--;
          ball.vy = -Math.abs(ball.vy) * 0.85;
          ball.vx += (Math.random() - 0.5) * 200;
          game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: t.x, y: t.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.targetHi });
          }
          if (t.hp <= 0) {
            broken++;
            targets.splice(ti, 1);
            // Replenish targets when low
            if (targets.length < 8 && !done) spawnTargets();
            if (broken >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(broken * 200 + Math.ceil(timeLeft) * 100); }, 700);
            }
          }
          ball.bounces++;
        }
      }

      // Ball lost
      if (ball.y > PLAY_Y + PLAY_H + 60 || ball.bounces > MAX_BOUNCES) {
        ball = null;
        trail = [];
        if (ballsUsed >= MAX_BALLS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var ti2 = trail.length - 1; ti2 >= 0; ti2--) {
      trail[ti2].t -= dt * 2.5;
      if (trail[ti2].t <= 0) trail.splice(ti2, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Walls
    game.draw.rect(0, PLAY_Y, WALL_THICKNESS, PLAY_H, C.wall, 0.9);
    game.draw.rect(W - WALL_THICKNESS, PLAY_Y, WALL_THICKNESS, PLAY_H, C.wall, 0.9);
    game.draw.rect(PLAY_X, PLAY_Y, PLAY_W, WALL_THICKNESS / 2, C.wall, 0.9);
    // Wall highlights
    game.draw.line(WALL_THICKNESS, PLAY_Y, WALL_THICKNESS, PLAY_Y + PLAY_H, C.wallHi, 4);
    game.draw.line(W - WALL_THICKNESS, PLAY_Y, W - WALL_THICKNESS, PLAY_Y + PLAY_H, C.wallHi, 4);

    // Targets
    for (var ti3 = 0; ti3 < targets.length; ti3++) {
      var t3 = targets[ti3];
      var pulse = 1 + Math.sin(elapsed * 3 + ti3 * 0.5) * 0.06;
      var col = t3.hp > 1 ? '#f59e0b' : C.target;
      game.draw.circle(t3.x, t3.y, (t3.r + 6) * pulse, col, 0.15);
      game.draw.circle(t3.x, t3.y, t3.r * pulse, col, 0.9);
      game.draw.circle(t3.x - t3.r * 0.3, t3.y - t3.r * 0.3, t3.r * 0.25, '#ffffff', 0.3);
      if (t3.hp > 1) {
        game.draw.text('2', t3.x, t3.y + 14, { size: 36, color: '#fff', bold: true });
      }
    }

    // Trail
    for (var tri = 0; tri < trail.length; tri++) {
      var tp = trail[tri];
      game.draw.circle(tp.x, tp.y, BALL_R * 0.6 * tp.t, C.trail, tp.t * 0.5);
    }

    // Ball
    if (ball) {
      game.draw.circle(ball.x, ball.y, ball.r + 6, C.ball, 0.2);
      game.draw.circle(ball.x, ball.y, ball.r, C.ball, 0.95);
      game.draw.circle(ball.x - 8, ball.y - 8, ball.r * 0.35, C.ballHi, 0.5);
    } else {
      // Show launcher position
      game.draw.circle(BALL_SPAWN_X, BALL_SPAWN_Y, BALL_R + 10, C.arrow, 0.2 + Math.sin(elapsed * 3) * 0.1);
      game.draw.circle(BALL_SPAWN_X, BALL_SPAWN_Y, BALL_R, C.ball, 0.7);
      game.draw.text('スワイプで投げる', BALL_SPAWN_X, BALL_SPAWN_Y + 80, { size: 36, color: C.arrowHi });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Ball counter
    for (var bi = 0; bi < MAX_BALLS; bi++) {
      game.draw.circle(W / 2 - (MAX_BALLS - 1) * 34 + bi * 68, H * 0.955, 16, bi < ballsUsed ? C.broken : C.ball, 0.9);
    }

    game.draw.text(broken + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.target : C.broken);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnTargets();
  });
})(game);
