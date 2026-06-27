// 740-neon-dash.js
// ネオンダッシュ — 迫り来る障害物をタップでジャンプして乗り越えろ
// 操作: タップでジャンプ（空中では無効）
// 成功: 30個クリア  失敗: 5回衝突 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020612',
    ground:  '#1e3a5f',
    groundHi:'#2563eb',
    runner:  '#22c55e',
    runnerHi:'#86efac',
    obstacle:'#f97316',
    obstHi:  '#fde68a',
    speedLine:'#0d2240',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#020810'
  };

  var GROUND_Y = H * 0.74;
  var RUNNER_X = W * 0.22;
  var RUNNER_W = 52;
  var RUNNER_H = 80;

  var runnerY = GROUND_Y - RUNNER_H;
  var runnerVy = 0;
  var isGrounded = true;
  var GRAVITY = 1800;
  var JUMP_V = -900;

  var speedLines = [];
  for (var sli = 0; sli < 8; sli++) {
    speedLines.push({
      x: Math.random() * W,
      y: H * 0.08 + Math.random() * (H * 0.58),
      len: 60 + Math.random() * 90
    });
  }

  var obstacles = [];
  var spawnTimer = 1.1;
  var BASE_SPEED = 480;

  var score = 0;
  var NEEDED = 30;
  var hits = 0;
  var MAX_HITS = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var legPhase = 0;
  var hitAnim = 0;

  function spawnObstacle() {
    var h = 72 + Math.random() * 130;
    obstacles.push({ x: W + 60, h: h, scored: false, hit: false });
  }

  game.onTap(function(tx, ty) {
    if (done || !isGrounded) return;
    runnerVy = JUMP_V;
    isGrounded = false;
    game.audio.play('se_tap', 0.1);
    for (var p = 0; p < 4; p++) {
      var pa = Math.PI + (Math.random() - 0.5) * Math.PI * 0.5;
      particles.push({ x: RUNNER_X, y: GROUND_Y, vx: Math.cos(pa) * 110, vy: Math.sin(pa) * 160, life: 0.3, col: C.runner });
    }
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

    // Runner physics
    if (!done || hitAnim > 0) {
      runnerVy += GRAVITY * dt;
      runnerY += runnerVy * dt;
      if (runnerY >= GROUND_Y - RUNNER_H) {
        runnerY = GROUND_Y - RUNNER_H;
        runnerVy = 0;
        isGrounded = true;
      }
    }

    if (isGrounded) legPhase += dt * 9;
    if (hitAnim > 0) hitAnim -= dt * 3;

    // Speed lines update
    var spd = Math.min(900, BASE_SPEED + score * 8);
    for (var sli2 = 0; sli2 < speedLines.length; sli2++) {
      speedLines[sli2].x -= spd * dt * 0.28;
      if (speedLines[sli2].x < -speedLines[sli2].len) {
        speedLines[sli2].x = W + 60;
        speedLines[sli2].y = H * 0.08 + Math.random() * (H * 0.58);
      }
    }

    // Spawn obstacles
    spawnTimer -= dt;
    var rate = Math.max(0.65, 1.1 - score * 0.012);
    if (spawnTimer <= 0 && !done) {
      spawnTimer = rate;
      spawnObstacle();
    }

    for (var oi = obstacles.length - 1; oi >= 0; oi--) {
      var ob = obstacles[oi];
      ob.x -= spd * dt;

      // Score pass
      if (!ob.scored && !ob.hit && ob.x + 30 < RUNNER_X - RUNNER_W / 2) {
        ob.scored = true;
        score++;
        flashCol = C.correct;
        flashAnim = 0.18;
        resultText = 'クリア！';
        resultTimer = 0.32;
        game.audio.play('se_tap', 0.07);
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 80); }, 700);
        }
      }

      // Collision
      var oL = ob.x - 28, oR = ob.x + 28, oT = GROUND_Y - ob.h;
      var rL = RUNNER_X - RUNNER_W / 2 + 6;
      var rR = RUNNER_X + RUNNER_W / 2 - 6;
      var rB = runnerY + RUNNER_H - 4;
      var rT = runnerY + 4;

      if (!ob.scored && !ob.hit && rR > oL && rL < oR && rB > oT) {
        ob.hit = true;
        ob.scored = true;
        hits++;
        flashCol = C.wrong;
        flashAnim = 0.5;
        resultText = '衝突！！';
        resultTimer = 0.5;
        hitAnim = 0.4;
        game.audio.play('se_failure', 0.4);
        runnerVy = JUMP_V * 0.55;
        isGrounded = false;
        for (var pe = 0; pe < 7; pe++) {
          var pea = Math.random() * Math.PI * 2;
          particles.push({ x: RUNNER_X, y: runnerY + RUNNER_H / 2, vx: Math.cos(pea) * 220, vy: Math.sin(pea) * 220, life: 0.45, col: C.wrong });
        }
        if (hits >= MAX_HITS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }

      if (ob.x < -100) obstacles.splice(oi, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Speed lines
    for (var sli3 = 0; sli3 < speedLines.length; sli3++) {
      var sl = speedLines[sli3];
      game.draw.line(sl.x, sl.y, sl.x - sl.len, sl.y, C.speedLine, 0.55);
    }

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 0.9);
    game.draw.line(0, GROUND_Y, W, GROUND_Y, C.groundHi, 3);

    // Obstacles
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var ob2 = obstacles[oi2];
      game.draw.rect(ob2.x - 28 + 4, GROUND_Y - ob2.h + 4, 56, ob2.h, '#000', 0.3);
      game.draw.rect(ob2.x - 28, GROUND_Y - ob2.h, 56, ob2.h, C.obstacle, 0.9);
      game.draw.rect(ob2.x - 28, GROUND_Y - ob2.h, 56, 12, C.obstHi, 0.5);
    }

    // Runner
    var ry = runnerY;
    var shake = hitAnim > 0 ? Math.sin(elapsed * 30) * 12 * hitAnim : 0;
    var rx = RUNNER_X + shake;
    game.draw.rect(rx - RUNNER_W / 2 + 4, ry + 4, RUNNER_W, RUNNER_H, '#000', 0.3);
    game.draw.rect(rx - RUNNER_W / 2, ry, RUNNER_W, RUNNER_H, hitAnim > 0 ? C.wrong : C.runner, 0.9);
    game.draw.circle(rx, ry - 26, 24, hitAnim > 0 ? C.wrong : C.runner, 0.9);
    game.draw.circle(rx - 7, ry - 31, 9, C.runnerHi, 0.45);
    if (isGrounded) {
      var l1x = rx - 14 + Math.sin(legPhase) * 14;
      var l2x = rx + 14 - Math.sin(legPhase) * 14;
      game.draw.line(rx - 14, ry + RUNNER_H, l1x, ry + RUNNER_H + 24, C.runner, 9);
      game.draw.line(rx + 14, ry + RUNNER_H, l2x, ry + RUNNER_H + 24, C.runner, 9);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (!isGrounded) {
      game.draw.text('ジャンプ中', W / 2, H * 0.88, { size: 36, color: C.runner + '88' });
    } else if (!done) {
      game.draw.text('タップでジャンプ', W / 2, H * 0.88, { size: 38, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.18, { size: 52, color: flashCol, bold: true });
    }

    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 60 + hi * 120, H * 0.955, 22, hi < hits ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnObstacle();
  });
})(game);
