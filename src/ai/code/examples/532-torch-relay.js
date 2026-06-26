// 532-torch-relay.js
// トーチリレー — 炎を絶やさずにランナーに渡してゴールまで運ぶ
// 操作: タップでランナーにブーストを与え、スワイプで炎を次のランナーへ渡す
// 成功: 5人全員ゴール  失敗: 炎が消える or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020304',
    sky:     '#06090f',
    ground:  '#0d1a0a',
    groundHi:'#162a0f',
    runner:  '#3b82f6',
    runnerHi:'#93c5fd',
    torch:   '#f97316',
    torchHi: '#fed7aa',
    flame:   '#ef4444',
    flameHi: '#fde68a',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    danger:  '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var GROUND_Y = H * 0.82;
  var GOAL_X = W - 80;

  var runners = [];
  var currentRunner = 0;
  var flameLife = 1.0;  // 0 to 1
  var FLAME_DRAIN = 0.018; // per second
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flameParticles = [];
  var score = 0;
  var passAnim = 0;
  var NEEDED = 5;
  var boostCooldown = 0;

  function initRunners() {
    runners = [];
    for (var i = 0; i < NEEDED; i++) {
      runners.push({
        x: 60 + i * 60,
        y: GROUND_Y - 80,
        vx: 100 + i * 20,
        hasTorch: i === 0,
        finished: false,
        runAnim: Math.random() * Math.PI * 2
      });
    }
    flameLife = 1.0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (boostCooldown > 0) return;
    var runner = runners[currentRunner];
    if (!runner || runner.finished) return;
    runner.vx = Math.min(runner.vx + 120, 600);
    boostCooldown = 0.3;
    flameLife = Math.min(1.0, flameLife + 0.12);
    game.audio.play('se_tap', 0.3);
    for (var pi = 0; pi < 4; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: runner.x, y: runner.y - 20, vx: Math.cos(ang) * 100 + runner.vx * 0.3, vy: Math.sin(ang) * 100 - 80, life: 0.35, col: C.runnerHi });
    }
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'right') {
      // Pass torch to next runner if close enough
      var current = runners[currentRunner];
      var next = runners[currentRunner + 1];
      if (!next || !current) return;
      var dist = Math.abs(current.x - next.x);
      if (dist < 200) {
        current.hasTorch = false;
        next.hasTorch = true;
        currentRunner++;
        passAnim = 0.5;
        game.audio.play('se_success', 0.6);
        flameLife = Math.min(1.0, flameLife + 0.3);
        for (var pi2 = 0; pi2 < 8; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: (current.x + next.x) / 2, y: current.y - 30, vx: Math.cos(ang2) * 140, vy: Math.sin(ang2) * 140 - 60, life: 0.4, col: C.torchHi });
        }
      } else {
        game.audio.play('se_failure', 0.3);
      }
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

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (passAnim > 0) passAnim -= dt * 2;
    if (boostCooldown > 0) boostCooldown -= dt;

    // Drain flame
    if (!done) {
      flameLife -= FLAME_DRAIN * dt * (1 + elapsed * 0.02);
      if (flameLife <= 0) {
        flameLife = 0;
        done = true;
        flashAnim = 0.8;
        game.audio.play('se_failure', 0.8);
        setTimeout(function() { game.end.failure(); }, 700);
        return;
      }
    }

    // Update runners
    for (var i = 0; i < runners.length; i++) {
      var r = runners[i];
      if (r.finished) continue;
      r.runAnim += dt * 8;
      // Only current runner moves fast, others jog slowly
      var targetSpeed = i === currentRunner ? 150 : (i < currentRunner ? 200 : 80);
      r.vx += (targetSpeed - r.vx) * dt * 2;
      r.x += r.vx * dt;
      // Leg bob
      r.y = GROUND_Y - 80 + Math.sin(r.runAnim) * 8;

      if (r.x >= GOAL_X && !r.finished) {
        r.finished = true;
        r.x = GOAL_X;
        score++;
        game.audio.play('se_success', 0.7);
        if (r.hasTorch && currentRunner < runners.length - 1) {
          // Auto pass if current runner reaches goal
          r.hasTorch = false;
          runners[currentRunner + 1].hasTorch = true;
          currentRunner++;
          flameLife = Math.min(1.0, flameLife + 0.2);
        } else if (r.hasTorch) {
          // Last runner reached goal
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 600 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    }

    // Flame particles
    var torchRunner = runners.find(function(r) { return r.hasTorch; });
    if (torchRunner && !done && flameLife > 0.1) {
      for (var fpi = 0; fpi < 2; fpi++) {
        flameParticles.push({
          x: torchRunner.x + 10, y: torchRunner.y - 60,
          vx: (Math.random() - 0.5) * 60,
          vy: -80 - Math.random() * 80,
          life: 0.3 + Math.random() * 0.3,
          size: 10 + Math.random() * 20
        });
      }
    }

    for (var fp = flameParticles.length - 1; fp >= 0; fp--) {
      flameParticles[fp].x += flameParticles[fp].vx * dt;
      flameParticles[fp].y += flameParticles[fp].vy * dt;
      flameParticles[fp].vy += 30 * dt;
      flameParticles[fp].life -= dt * 2;
      if (flameParticles[fp].life <= 0) flameParticles.splice(fp, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, GROUND_Y, C.sky, 0.5);

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 0.9);
    game.draw.rect(0, GROUND_Y, W, 16, C.groundHi, 0.7);

    // Goal line
    game.draw.line(GOAL_X, H * 0.1, GOAL_X, GROUND_Y, C.goal, 6);
    game.draw.rect(GOAL_X - 40, H * 0.1, 80, 60, C.goal, 0.8);
    game.draw.text('GOAL', GOAL_X, H * 0.1 + 40, { size: 36, color: '#fff', bold: true });

    // Flame particles
    for (var fp2 = 0; fp2 < flameParticles.length; fp2++) {
      var fpa = flameParticles[fp2];
      var fCol = fpa.life > 0.5 ? C.torchHi : (fpa.life > 0.2 ? C.torch : C.flame);
      game.draw.circle(fpa.x, fpa.y, fpa.size * fpa.life, fCol, fpa.life * 0.8);
    }

    // Runners
    for (var ri = 0; ri < runners.length; ri++) {
      var r2 = runners[ri];
      if (r2.x > W + 40) continue;
      var rCol = ri === currentRunner ? C.runner : C.ui;
      // Body
      game.draw.circle(r2.x, r2.y - 40, 28, rCol, 0.9);
      game.draw.line(r2.x, r2.y - 12, r2.x, r2.y + 40, rCol, 14);
      // Legs
      game.draw.line(r2.x, r2.y + 40, r2.x - 20 + Math.cos(r2.runAnim) * 20, r2.y + 80, rCol, 10);
      game.draw.line(r2.x, r2.y + 40, r2.x + 20 - Math.cos(r2.runAnim) * 20, r2.y + 80, rCol, 10);
      // Arms
      game.draw.line(r2.x, r2.y + 10, r2.x + 30 + Math.cos(r2.runAnim) * 20, r2.y - 10, rCol, 8);
      // Torch
      if (r2.hasTorch) {
        var tx2 = r2.x + 32, ty2 = r2.y - 70;
        game.draw.line(r2.x + 20, r2.y + 10, tx2, ty2 + 20, C.torchHi, 8);
        game.draw.circle(tx2, ty2, 18, C.torch, 0.9);
        game.draw.circle(tx2, ty2 - 12, 14 * flameLife, flameLife > 0.5 ? C.flameHi : C.flame, 0.9);
      }
      // Finished badge
      if (r2.finished) {
        game.draw.circle(r2.x, r2.y - 80, 24, C.goal, 0.9);
        game.draw.text('✓', r2.x, r2.y - 72, { size: 28, color: '#fff', bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.danger, flashAnim * 0.15);

    // Flame meter
    var flameCol = flameLife > 0.5 ? C.torch : flameLife > 0.25 ? '#f59e0b' : C.danger;
    game.draw.rect(W / 2 - 200, H * 0.88, 400, 24, C.ui, 0.4);
    game.draw.rect(W / 2 - 200, H * 0.88, 400 * flameLife, 24, flameCol, 0.9);
    game.draw.text('炎 ' + Math.round(flameLife * 100) + '%', W / 2, H * 0.915, { size: 36, color: flameCol });

    if (flameLife < 0.3) {
      game.draw.text('タップ！', W / 2, H * 0.93 + 20, { size: 52, color: C.danger, bold: true });
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.torch : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    initRunners();
  });
})(game);
