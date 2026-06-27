// 792-chain-reaction.js
// チェーンリアクション — 最小限のタップで最大の連鎖爆発を引き起こせ
// 操作: タップ — 爆発を起こし隣接する玉を巻き込む（2個以上の連鎖を作れ）
// 成功: 20回連鎖達成  失敗: 10回連鎖なし or 80秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050204',
    ball:    '#dc2626',
    ballHi:  '#fca5a5',
    chain1:  '#f97316',
    chain2:  '#fbbf24',
    chain3:  '#4ade80',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080408'
  };

  var BALL_R = 44;
  var EXPLODE_R = 110;
  var balls = [];
  var explosions = []; // { x, y, r, maxR, life }
  var pendingExplosion = []; // queue of ball indices to explode next
  var chainCount = 0;
  var chainActive = false;
  var chainTimer = 0;
  var CHAIN_DELAY = 0.12;

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 80;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var waitTimer = 0;
  var WAIT_DUR = 0.5;

  function spawnBalls() {
    balls = [];
    var count = 6 + Math.floor(score / 4);
    if (count > 14) count = 14;
    var attempts = 0;
    while (balls.length < count && attempts < 200) {
      attempts++;
      var bx = BALL_R * 1.5 + Math.random() * (W - BALL_R * 3);
      var by = H * 0.22 + Math.random() * (H * 0.58);
      var ok = true;
      for (var i = 0; i < balls.length; i++) {
        var dx = bx - balls[i].x;
        var dy = by - balls[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < BALL_R * 2.5) { ok = false; break; }
      }
      if (ok) balls.push({ x: bx, y: by, alive: true, explodeTimer: -1 });
    }
    chainCount = 0;
    chainActive = false;
  }

  function explodeBall(idx) {
    var b = balls[idx];
    if (!b || !b.alive) return;
    b.alive = false;
    chainCount++;

    // Explosion visual
    explosions.push({ x: b.x, y: b.y, r: 0, maxR: EXPLODE_R, life: 1.0 });

    // Particles
    for (var p = 0; p < 6; p++) {
      var pa = Math.random() * Math.PI * 2;
      var col2 = chainCount === 1 ? C.chain1 : (chainCount <= 3 ? C.chain2 : C.chain3);
      particles.push({ x: b.x, y: b.y, vx: Math.cos(pa) * (150 + Math.random() * 150), vy: Math.sin(pa) * (150 + Math.random() * 150), life: 0.45, col: col2 });
    }

    // Find nearby balls to chain
    for (var i = 0; i < balls.length; i++) {
      if (!balls[i].alive) continue;
      var dx = balls[i].x - b.x;
      var dy = balls[i].y - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < EXPLODE_R + BALL_R) {
        pendingExplosion.push(i);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done || chainActive || waitTimer > 0) return;
    // Check if tapped a ball
    var hitIdx = -1;
    var bestDist = Infinity;
    for (var i = 0; i < balls.length; i++) {
      if (!balls[i].alive) continue;
      var dx = tx - balls[i].x;
      var dy = ty - balls[i].y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < BALL_R + 20 && dist < bestDist) {
        bestDist = dist;
        hitIdx = i;
      }
    }
    if (hitIdx < 0) return;

    game.audio.play('se_tap', 0.08);
    chainActive = true;
    chainTimer = 0;
    pendingExplosion = [hitIdx];
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) spawnBalls();
    }

    // Chain processing
    if (chainActive) {
      chainTimer -= dt;
      if (chainTimer <= 0 && pendingExplosion.length > 0) {
        var nextIdx = pendingExplosion.shift();
        explodeBall(nextIdx);
        chainTimer = CHAIN_DELAY;
      } else if (pendingExplosion.length === 0 && chainTimer <= 0) {
        // Chain ended
        chainActive = false;
        var reached = chainCount;
        if (reached >= 2) {
          score++;
          var chainCol = reached >= 5 ? C.chain3 : (reached >= 3 ? C.chain2 : C.chain1);
          flashCol = C.correct;
          flashAnim = 0.22;
          resultText = reached + '連鎖！';
          resultTimer = 0.42;
          game.audio.play('se_success', 0.7);
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 150); }, 700);
            return;
          }
        } else {
          errors++;
          flashCol = C.wrong;
          flashAnim = 0.3;
          resultText = '連鎖なし...';
          resultTimer = 0.42;
          game.audio.play('se_failure', 0.3);
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
            return;
          }
        }
        waitTimer = WAIT_DUR;
      }
    }

    // Update explosions
    for (var ei = explosions.length - 1; ei >= 0; ei--) {
      var e = explosions[ei];
      e.r += 400 * dt;
      e.life = 1 - e.r / e.maxR;
      if (e.life <= 0) explosions.splice(ei, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Explosions (blast radius ring)
    for (var ex = 0; ex < explosions.length; ex++) {
      var exp = explosions[ex];
      for (var ri = 0; ri < 16; ri++) {
        var ra = ri * Math.PI * 2 / 16;
        game.draw.circle(exp.x + Math.cos(ra) * exp.r, exp.y + Math.sin(ra) * exp.r, 10 * exp.life, C.chain1, exp.life * 0.8);
      }
      game.draw.circle(exp.x, exp.y, exp.r * 0.5, C.chain2, exp.life * 0.1);
    }

    // Balls
    for (var bi = 0; bi < balls.length; bi++) {
      if (!balls[bi].alive) continue;
      var b2 = balls[bi];
      game.draw.circle(b2.x + 4, b2.y + 4, BALL_R, '#000', 0.3);
      game.draw.circle(b2.x, b2.y, BALL_R, C.ball, 0.9);
      game.draw.circle(b2.x - BALL_R * 0.3, b2.y - BALL_R * 0.3, BALL_R * 0.25, C.ballHi, 0.5);
      // Show explosion radius (faint)
      if (!chainActive) {
        game.draw.circle(b2.x, b2.y, EXPLODE_R, C.ball, 0.04);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    // Chain counter
    if (chainActive && chainCount > 0) {
      var cCol = chainCount >= 5 ? C.chain3 : (chainCount >= 3 ? C.chain2 : C.chain1);
      game.draw.text(chainCount + '連鎖！', W / 2, H * 0.88, { size: 56, color: cCol, bold: true });
    } else if (!chainActive && !waitTimer) {
      game.draw.text('玉をタップ', W / 2, H * 0.88, { size: 40, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0 && !chainActive) {
      game.draw.text(resultText, W / 2, H * 0.15, { size: 52, color: flashCol, bold: true });
    }

    for (var ei2 = 0; ei2 < MAX_ERR; ei2++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 44 + ei2 * 88, H * 0.955, 18, ei2 < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 80);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnBalls();
  });
})(game);
