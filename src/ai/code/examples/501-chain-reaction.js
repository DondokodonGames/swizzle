// 501-chain-reaction.js
// チェーンリアクション — 爆発の連鎖を一箇所のタップで最大化させよ
// 操作: タップで最初の爆発を起こす（連鎖で10個以上巻き込む）
// 成功: 爆発連鎖で60個破壊  失敗: 3回試みてもクリアできず or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0200',
    ball:   '#f97316',
    ballHi: '#fed7aa',
    explode:'#fbbf24',
    explodeHi:'#fef08a',
    chain:  '#ef4444',
    safe:   '#22c55e',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var BALL_R = 40;
  var EXPLODE_R = 130;
  var balls = [];
  var explosions = [];
  var particles = [];
  var destroyed = 0;
  var totalDestroyed = 0;
  var NEEDED = 60;
  var tries = 0;
  var MAX_TRIES = 3;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var phase = 'aim'; // 'aim' | 'exploding'
  var chainCount = 0;
  var chainText = '';
  var chainLife = 0;

  function spawnBalls() {
    balls = [];
    var NUM = 50;
    for (var i = 0; i < NUM; i++) {
      var attempts = 0, bx, by, ok;
      do {
        bx = BALL_R + 20 + Math.random() * (W - BALL_R * 2 - 40);
        by = H * 0.18 + Math.random() * (H * 0.65);
        ok = true;
        for (var j = 0; j < balls.length; j++) {
          var dx = bx - balls[j].x, dy = by - balls[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < BALL_R * 2 + 10) { ok = false; break; }
        }
        attempts++;
      } while (!ok && attempts < 30);
      balls.push({ x: bx, y: by, alive: true, exploding: false, explodeTimer: 0, triggered: false });
    }
    destroyed = 0;
    phase = 'aim';
    chainCount = 0;
    explosions = [];
  }

  function triggerExplosion(bx, by) {
    explosions.push({ x: bx, y: by, r: 0, maxR: EXPLODE_R, timer: 0.5 });
    for (var pi = 0; pi < 8; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: bx, y: by, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 0.5, col: C.explodeHi });
    }
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'aim') return;
    tries++;
    phase = 'exploding';
    chainCount = 0;
    triggerExplosion(tx, ty);
    game.audio.play('se_failure', 0.5);
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

    if (chainLife > 0) chainLife -= dt * 2;

    if (phase === 'exploding') {
      // Update explosions
      for (var ei = explosions.length - 1; ei >= 0; ei--) {
        var exp = explosions[ei];
        exp.timer -= dt;
        exp.r = (1 - exp.timer / 0.5) * exp.maxR;
        if (exp.timer <= 0) {
          explosions.splice(ei, 1);
          continue;
        }
        // Check balls in range
        for (var bi = 0; bi < balls.length; bi++) {
          if (!balls[bi].alive || balls[bi].triggered) continue;
          var dx = balls[bi].x - exp.x, dy = balls[bi].y - exp.y;
          if (Math.sqrt(dx * dx + dy * dy) <= exp.r + BALL_R) {
            balls[bi].alive = false;
            balls[bi].triggered = true;
            destroyed++;
            totalDestroyed++;
            chainCount++;
            chainText = chainCount + '連鎖！';
            chainLife = 0.6;
            game.audio.play('se_tap', 0.2);
            triggerExplosion(balls[bi].x, balls[bi].y);
          }
        }
      }

      // If no more explosions, round is done
      if (explosions.length === 0) {
        if (destroyed >= 10) {
          game.audio.play('se_success', 0.8);
        } else {
          game.audio.play('se_failure', 0.3);
        }

        if (totalDestroyed >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(totalDestroyed * 100 + Math.ceil(timeLeft) * 100); }, 700);
          return;
        }

        if (tries >= MAX_TRIES && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }

        // Next round
        setTimeout(function() { if (!done) spawnBalls(); }, 800);
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      if (!balls[bi2].alive) continue;
      var b = balls[bi2];
      game.draw.circle(b.x, b.y, BALL_R + 4, C.ballHi, 0.15);
      game.draw.circle(b.x, b.y, BALL_R, C.ball, 0.85);
      game.draw.circle(b.x - BALL_R * 0.25, b.y - BALL_R * 0.25, BALL_R * 0.2, '#fff', 0.35);
    }

    // Explosions
    for (var ei2 = 0; ei2 < explosions.length; ei2++) {
      var ex = explosions[ei2];
      var prog = 1 - ex.timer / 0.5;
      game.draw.circle(ex.x, ex.y, ex.r, C.explode, (1 - prog) * 0.6);
      game.draw.circle(ex.x, ex.y, ex.r * 0.6, C.explodeHi, (1 - prog) * 0.5);
      game.draw.circle(ex.x, ex.y, ex.r * 0.3, '#fff', (1 - prog) * 0.8);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Chain text
    if (chainLife > 0) {
      game.draw.text(chainText, W / 2, H * 0.5, { size: 72, color: C.explode, bold: true });
    }

    if (phase === 'aim') {
      game.draw.text('タップで爆発！', W / 2, H * 0.88, { size: 48, color: C.text });
      game.draw.text('残り' + (MAX_TRIES - tries) + '回', W / 2, H * 0.93, { size: 40, color: C.ui });
    }

    // Tries
    for (var ti = 0; ti < MAX_TRIES; ti++) {
      game.draw.circle(W / 2 - (MAX_TRIES - 1) * 60 + ti * 120, H * 0.955, 22, ti < tries ? C.chain : C.ui, 0.9);
    }

    game.draw.text(totalDestroyed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ball : C.chain);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    spawnBalls();
  });
})(game);
