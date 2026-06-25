// 142-snowball-roll.js
// 雪玉転がし — 転がしながら大きくなる雪玉で敵を踏み潰す爽快感
// 操作: 左右スワイプで転がす方向を変える
// 成功: 20体踏み潰す  失敗: 壁に3回ぶつかる or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06101a',
    snow:    '#e2e8f0',
    snowHi:  '#f8fafc',
    snowSha: '#94a3b8',
    enemy:   '#ef4444',
    enemyHi: '#fca5a5',
    ground:  '#1e3a5f',
    groundHi:'#2563eb',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var GROUND_Y = H * 0.78;

  var ball = {
    x: W / 2,
    y: GROUND_Y,
    r: 40,
    vx: 200,
    vy: 0,
    dir: 1 // 1=right, -1=left
  };

  var MAX_R = 160;
  var GROW_RATE = 6; // pixels per enemy crushed

  var enemies = [];
  var ENEMY_R = 28;
  var ENEMY_SPAWN_INTERVAL = 0.8;
  var spawnTimer = 0;

  var score = 0;
  var needed = 20;
  var wallHits = 0;
  var maxWallHits = 3;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];
  var bounce = 0; // visual bounce on wall hit

  function spawnEnemy() {
    var x = Math.random() * (W - 120) + 60;
    var h = 20 + Math.random() * 50;
    enemies.push({ x: x, y: GROUND_Y, h: h, alive: true, deathTimer: 0 });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') ball.dir = -1;
    if (dir === 'right') ball.dir = 1;
    ball.vx = Math.abs(ball.vx) * ball.dir;
    game.audio.play('se_tap', 0.5);
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

    // Move ball
    ball.x += ball.vx * dt;

    // Wall bounce
    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
      ball.dir = 1;
      wallHits++;
      bounce = 0.4;
      game.audio.play('se_failure', 0.4);
      if (wallHits >= maxWallHits && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
    if (ball.x + ball.r > W) {
      ball.x = W - ball.r;
      ball.vx = -Math.abs(ball.vx);
      ball.dir = -1;
      wallHits++;
      bounce = 0.4;
      game.audio.play('se_failure', 0.4);
      if (wallHits >= maxWallHits && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }

    // Spawn enemies
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = ENEMY_SPAWN_INTERVAL;
      spawnEnemy();
    }

    // Crush enemies
    for (var ei = 0; ei < enemies.length; ei++) {
      var e = enemies[ei];
      if (!e.alive) {
        e.deathTimer -= dt;
        continue;
      }
      var dx = ball.x - e.x;
      var dy = (ball.y - ball.r) - (e.y - e.h);
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < ball.r + ENEMY_R) {
        e.alive = false;
        e.deathTimer = 0.5;
        score++;
        ball.r = Math.min(MAX_R, ball.r + GROW_RATE);
        ball.vx = ball.dir * (180 + ball.r * 0.5);
        feedbackOk = true;
        feedback = 0.25;
        game.audio.play('se_success', 0.6);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: e.x, y: e.y - e.h/2, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150 - 100, life: 0.4, col: C.enemy });
        }
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score*30 + Math.ceil(timeLeft)*15); }, 400);
        }
      }
    }
    enemies = enemies.filter(function(e) { return e.deathTimer > -0.1; });

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 500 * dt;
      particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    if (feedback > 0) feedback -= dt;
    if (bounce > 0) bounce -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground);
    game.draw.rect(0, GROUND_Y, W, 6, C.groundHi);

    // Enemies
    for (var ei2 = 0; ei2 < enemies.length; ei2++) {
      var e2 = enemies[ei2];
      if (!e2.alive && e2.deathTimer <= 0) continue;
      var alpha2 = e2.alive ? 1.0 : e2.deathTimer;
      game.draw.rect(e2.x - ENEMY_R, e2.y - e2.h, ENEMY_R*2, e2.h, C.enemy, alpha2 * 0.85);
      game.draw.rect(e2.x - ENEMY_R, e2.y - e2.h, ENEMY_R*2, 8, C.enemyHi, alpha2 * 0.9);
      game.draw.circle(e2.x, e2.y - e2.h - ENEMY_R, ENEMY_R, C.enemy, alpha2 * 0.85);
      game.draw.text('👾', e2.x, e2.y - e2.h - ENEMY_R, { size: 32, color: '#fff' });
    }

    // Snow ball shadow
    game.draw.circle(ball.x, GROUND_Y + 4, ball.r * 0.6, '#000', 0.3);

    // Snow ball layers
    game.draw.circle(ball.x, ball.y - ball.r, ball.r + 4, C.snowSha, 0.5);
    game.draw.circle(ball.x, ball.y - ball.r, ball.r, C.snow, 0.95);
    // Snow texture
    for (var si = 0; si < 6; si++) {
      var sx = ball.x + Math.cos(si * 1.05) * ball.r * 0.55;
      var sy = ball.y - ball.r + Math.sin(si * 1.05) * ball.r * 0.55;
      game.draw.circle(sx, sy, ball.r * 0.12, C.snowSha, 0.4);
    }
    game.draw.circle(ball.x - ball.r*0.3, ball.y - ball.r*1.3, ball.r*0.15, C.snowHi, 0.7);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8*part.life*2.5, part.col, part.life);
    }

    // Wall hit flash
    if (bounce > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, bounce * 0.2);
    }

    // Feedback
    if (feedback > 0 && feedbackOk) {
      game.draw.text('+1', ball.x, ball.y - ball.r - 60, { size: 56, color: C.correct, bold: true });
    }

    // Score + wall hits
    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var wi = 0; wi < maxWallHits; wi++) {
      game.draw.circle(W/2+(wi-1)*52, 218, 18, wi < wallHits ? C.wrong : '#0a1020');
    }
    game.draw.text('壁', W/2 + 80, 218, { size: 28, color: C.ui });

    game.draw.text('← スワイプで方向転換 →', W/2, H * 0.88, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft/40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.snow : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnEnemy();
    spawnEnemy();
    spawnEnemy();
  });
})(game);
