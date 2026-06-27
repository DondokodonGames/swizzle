// 758-gravity-flip.js
// グラビティフリップ — 重力を反転させてパイプの隙間を抜け続けろ
// 操作: タップで重力の向きを上下切り替え
// 成功: 30回通過  失敗: 7回接触 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080f',
    pipe:    '#16a34a',
    pipeHi:  '#4ade80',
    player:  '#f97316',
    playerHi:'#fde68a',
    trail:   '#f97316',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080c14',
    star:    '#94a3b8'
  };

  var playerX = W * 0.22;
  var playerY = H / 2;
  var playerVy = 0;
  var gravDir = 1; // 1 = down, -1 = up
  var GRAVITY = 1800;
  var PLAYER_R = 32;

  var pipes = [];
  var pipeSpeedBase = 440;
  var pipeTimer = 1.1;
  var GAP_H = 260;

  var score = 0;
  var NEEDED = 30;
  var hits = 0;
  var MAX_HITS = 7;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var trail = [];
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  // Background stars
  var stars = [];
  for (var si = 0; si < 40; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 3, sp: 0.3 + Math.random() * 0.4 });
  }

  function spawnPipe() {
    var gapY = GAP_H / 2 + 80 + Math.random() * (H - GAP_H - 160);
    pipes.push({ x: W + 60, gapY: gapY, scored: false, hit: false });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    gravDir *= -1;
    game.audio.play('se_tap', 0.08);
    for (var p = 0; p < 3; p++) {
      var pa = Math.random() * Math.PI * 2;
      particles.push({ x: playerX, y: playerY, vx: Math.cos(pa) * 80, vy: Math.sin(pa) * 120, life: 0.25, col: C.playerHi });
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

    // Player physics
    playerVy += GRAVITY * gravDir * dt;
    playerVy = Math.max(-1400, Math.min(1400, playerVy));
    playerY += playerVy * dt;

    // Ceiling / floor
    if (playerY - PLAYER_R < 0) {
      playerY = PLAYER_R;
      playerVy = 0;
      gravDir = 1;
    }
    if (playerY + PLAYER_R > H) {
      playerY = H - PLAYER_R;
      playerVy = 0;
      gravDir = -1;
    }

    // Trail
    trail.push({ x: playerX, y: playerY, life: 0.4 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt * 3;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Pipe spawning
    pipeTimer -= dt;
    var rate = Math.max(0.7, 1.1 - score * 0.01);
    if (pipeTimer <= 0 && !done) {
      pipeTimer = rate;
      spawnPipe();
    }

    var pspd = Math.min(780, pipeSpeedBase + score * 10);

    for (var pi = pipes.length - 1; pi >= 0; pi--) {
      var pp = pipes[pi];
      pp.x -= pspd * dt;

      // Score check
      if (!pp.scored && !pp.hit && pp.x + 40 < playerX - PLAYER_R) {
        pp.scored = true;
        score++;
        flashCol = C.correct;
        flashAnim = 0.18;
        resultText = '通過！';
        resultTimer = 0.3;
        game.audio.play('se_tap', 0.07);
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 320 + Math.ceil(timeLeft) * 120); }, 700);
        }
      }

      // Collision
      if (!pp.hit && !pp.scored && pp.x - 40 < playerX + PLAYER_R && pp.x + 40 > playerX - PLAYER_R) {
        var inGap = playerY > pp.gapY - GAP_H / 2 - PLAYER_R && playerY < pp.gapY + GAP_H / 2 + PLAYER_R;
        if (!inGap) {
          pp.hit = true;
          pp.scored = true;
          hits++;
          flashCol = C.wrong;
          flashAnim = 0.45;
          resultText = '衝突！！';
          resultTimer = 0.5;
          playerVy = -playerVy * 0.5;
          gravDir *= -1;
          game.audio.play('se_failure', 0.4);
          for (var pe = 0; pe < 6; pe++) {
            var pea = Math.random() * Math.PI * 2;
            particles.push({ x: playerX, y: playerY, vx: Math.cos(pea) * 220, vy: Math.sin(pea) * 220, life: 0.38, col: C.wrong });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }

      if (pp.x < -120) pipes.splice(pi, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp2 = particles.length - 1; pp2 >= 0; pp2--) {
      particles[pp2].x += particles[pp2].vx * dt;
      particles[pp2].y += particles[pp2].vy * dt;
      particles[pp2].life -= dt * 2.6;
      if (particles[pp2].life <= 0) particles.splice(pp2, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars (scrolling slowly)
    for (var sti = 0; sti < stars.length; sti++) {
      var st = stars[sti];
      st.x -= st.sp * pspd * dt * 0.05;
      if (st.x < 0) st.x = W;
      game.draw.circle(st.x, st.y, st.r, C.star, 0.5);
    }

    // Gravity indicator
    var arrowY = gravDir === 1 ? H - 60 : 60;
    var arrowDY = gravDir === 1 ? -24 : 24;
    game.draw.text(gravDir === 1 ? '▼' : '▲', W * 0.05, arrowY, { size: 56, color: C.player + 'aa', bold: true });

    // Pipes
    for (var pi2 = 0; pi2 < pipes.length; pi2++) {
      var g = pipes[pi2];
      var gapTop = g.gapY - GAP_H / 2;
      var gapBot = g.gapY + GAP_H / 2;
      // Top pipe
      if (gapTop > 0) {
        game.draw.rect(g.x - 40, 0, 80, gapTop, C.pipe, 0.9);
        game.draw.rect(g.x - 48, gapTop - 40, 96, 44, C.pipe, 0.95);
        game.draw.rect(g.x - 48, gapTop - 40, 96, 8, C.pipeHi, 0.5);
      }
      // Bottom pipe
      if (gapBot < H) {
        game.draw.rect(g.x - 40, gapBot, 80, H - gapBot, C.pipe, 0.9);
        game.draw.rect(g.x - 48, gapBot, 96, 44, C.pipe, 0.95);
        game.draw.rect(g.x - 48, gapBot + 36, 96, 8, C.pipeHi, 0.5);
      }
      // Gap highlight
      game.draw.rect(g.x - 40, gapTop, 80, GAP_H, '#22c55e', 0.04);
    }

    // Trail
    for (var tri = 0; tri < trail.length; tri++) {
      var tr = trail[tri];
      game.draw.circle(tr.x, tr.y, PLAYER_R * 0.5 * tr.life, C.trail, tr.life * 0.3);
    }

    // Player
    var shake = flashAnim > 0.3 ? Math.sin(elapsed * 32) * 6 : 0;
    game.draw.circle(playerX + shake + 3, playerY + 3, PLAYER_R, '#000', 0.3);
    game.draw.circle(playerX + shake, playerY, PLAYER_R, C.player, 0.92);
    game.draw.circle(playerX + shake - 10, playerY - 10, 12, C.playerHi, 0.45);
    // Direction indicator on player
    game.draw.text(gravDir === 1 ? '▼' : '▲', playerX + shake, playerY + 8, { size: 28, color: '#fff', bold: true });

    for (var pp3 = 0; pp3 < particles.length; pp3++) {
      var p = particles[pp3];
      game.draw.circle(p.x, p.y, 9 * p.life, p.col, p.life);
    }

    if (!done) {
      game.draw.text('タップで反転', W / 2, H * 0.88, { size: 36, color: C.text + '33' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.18, { size: 52, color: flashCol, bold: true });
    }

    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 64 + hi * 128, H * 0.955, 24, hi < hits ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnPipe();
  });
})(game);
