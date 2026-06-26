// 483-target-lock.js
// ターゲットロック — 画面上を動き回るターゲットにロックオンして長押しで撃破
// 操作: ターゲットに触れて長押しでロックオン→自動撃破
// 成功: 10機撃破  失敗: 5機逃す or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#000810',
    radar:  '#001a0a',
    radarLine:'#00ff41',
    target: '#ef4444',
    targetHi:'#fca5a5',
    locked: '#fbbf24',
    lockedHi:'#fde68a',
    destroyed:'#22c55e',
    reticle:'#00ff41',
    miss:   '#ef4444',
    text:   '#f1f5f9',
    ui:     '#1a4a2a'
  };

  var targets = [];
  var particles = [];
  var destroyed = 0;
  var NEEDED = 10;
  var escaped = 0;
  var MAX_ESCAPE = 5;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var nextSpawn = 1.2;
  var radarAngle = 0;

  var LOCK_REQUIRED = 0.9; // seconds to hold to lock on
  var touchX = 0, touchY = 0;
  var isTouching = false;
  var holdTime = 0;
  var lockedTarget = null;
  var flashAnim = 0;

  function spawnTarget() {
    var edge = Math.floor(Math.random() * 4);
    var x, y, vx, vy;
    var spd = 180 + Math.random() * 120 + destroyed * 8;
    if (edge === 0) { x = Math.random() * W; y = -60; vx = (Math.random() - 0.5) * spd; vy = spd * 0.5 + Math.random() * spd * 0.5; }
    else if (edge === 1) { x = W + 60; y = Math.random() * H; vx = -spd; vy = (Math.random() - 0.5) * spd * 0.6; }
    else if (edge === 2) { x = Math.random() * W; y = H + 60; vx = (Math.random() - 0.5) * spd; vy = -spd; }
    else { x = -60; y = Math.random() * H; vx = spd; vy = (Math.random() - 0.5) * spd * 0.6; }
    targets.push({
      x: x, y: y, vx: vx, vy: vy,
      r: 40,
      lockProgress: 0,
      locked: false,
      life: 5 + Math.random() * 3
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    isTouching = true;
    touchX = tx;
    touchY = ty;
    holdTime = 0;
  });

  game.onHold(function(tx, ty, duration) {
    if (done) return;
    touchX = tx;
    touchY = ty;
    holdTime = duration;
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

    radarAngle += dt * 1.2;
    if (flashAnim > 0) flashAnim -= dt * 3;

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done && targets.length < 5) {
      spawnTarget();
      nextSpawn = 0.8 + Math.random() * 0.8;
    }

    // Move targets
    for (var ti = targets.length - 1; ti >= 0; ti--) {
      var t = targets[ti];
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.life -= dt;

      // Bounce off screen edges
      if (t.x < 60) { t.x = 60; t.vx = Math.abs(t.vx); }
      if (t.x > W - 60) { t.x = W - 60; t.vx = -Math.abs(t.vx); }
      if (t.y < 80) { t.y = 80; t.vy = Math.abs(t.vy); }
      if (t.y > H - 80) { t.y = H - 80; t.vy = -Math.abs(t.vy); }

      // Check if being targeted
      var dx = touchX - t.x;
      var dy = touchY - t.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var isNearTap = dist < t.r + 40 && isTouching && holdTime > 0;

      if (isNearTap) {
        t.lockProgress += dt / LOCK_REQUIRED;
        if (t.lockProgress >= 1.0) {
          // Destroyed!
          t.locked = true;
          destroyed++;
          flashAnim = 0.3;
          game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 12; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: t.x, y: t.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.7, col: C.lockedHi });
          }
          targets.splice(ti, 1);
          holdTime = 0;
          isTouching = false;
          if (destroyed >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(destroyed * 400 + Math.ceil(timeLeft) * 100); }, 700);
          }
          continue;
        }
      } else {
        t.lockProgress = Math.max(0, t.lockProgress - dt * 2);
      }

      // Escaped
      if (t.life <= 0) {
        targets.splice(ti, 1);
        escaped++;
        game.audio.play('se_failure', 0.3);
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        continue;
      }
    }

    // Reset hold if not touching
    if (holdTime <= 0 || !isTouching) {
      isTouching = false;
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

    // Radar sweep
    game.draw.rect(0, 0, W, H, C.radar, 0.3);
    var sweepEnd = W;
    game.draw.line(W / 2, H / 2, W / 2 + Math.cos(radarAngle) * W, H / 2 + Math.sin(radarAngle) * W, C.radarLine, 2);
    // Radar rings
    for (var ri = 1; ri <= 4; ri++) {
      var r2 = ri * 200;
      for (var seg = 0; seg < 32; seg++) {
        var a1 = (seg / 32) * Math.PI * 2;
        var a2 = ((seg + 0.6) / 32) * Math.PI * 2;
        game.draw.line(W / 2 + Math.cos(a1) * r2, H / 2 + Math.sin(a1) * r2,
                       W / 2 + Math.cos(a2) * r2, H / 2 + Math.sin(a2) * r2, C.radarLine, 1);
      }
    }

    // Targets
    for (var ti2 = 0; ti2 < targets.length; ti2++) {
      var t2 = targets[ti2];
      var prog = t2.lockProgress;
      var isLocking = prog > 0;
      var tCol = isLocking ? C.locked : C.target;
      var tHi  = isLocking ? C.lockedHi : C.targetHi;

      game.draw.circle(t2.x, t2.y, t2.r + 8, tCol, 0.15);
      game.draw.circle(t2.x, t2.y, t2.r, tCol, 0.8);
      game.draw.circle(t2.x, t2.y, t2.r * 0.4, tHi, 0.5);

      // Reticle corners
      var rc = t2.r + 20;
      game.draw.line(t2.x - rc, t2.y - rc, t2.x - rc + 30, t2.y - rc, C.reticle, 4);
      game.draw.line(t2.x - rc, t2.y - rc, t2.x - rc, t2.y - rc + 30, C.reticle, 4);
      game.draw.line(t2.x + rc, t2.y - rc, t2.x + rc - 30, t2.y - rc, C.reticle, 4);
      game.draw.line(t2.x + rc, t2.y - rc, t2.x + rc, t2.y - rc + 30, C.reticle, 4);
      game.draw.line(t2.x - rc, t2.y + rc, t2.x - rc + 30, t2.y + rc, C.reticle, 4);
      game.draw.line(t2.x - rc, t2.y + rc, t2.x - rc, t2.y + rc - 30, C.reticle, 4);
      game.draw.line(t2.x + rc, t2.y + rc, t2.x + rc - 30, t2.y + rc, C.reticle, 4);
      game.draw.line(t2.x + rc, t2.y + rc, t2.x + rc, t2.y + rc - 30, C.reticle, 4);

      // Lock progress arc
      if (prog > 0) {
        var arcEnd = prog * Math.PI * 2 - Math.PI / 2;
        for (var seg2 = 0; seg2 < 20; seg2++) {
          var a = -Math.PI / 2 + (seg2 / 20) * prog * Math.PI * 2;
          var a2n = -Math.PI / 2 + ((seg2 + 0.8) / 20) * prog * Math.PI * 2;
          if (a2n > arcEnd) break;
          game.draw.line(t2.x + Math.cos(a) * rc, t2.y + Math.sin(a) * rc,
                         t2.x + Math.cos(a2n) * rc, t2.y + Math.sin(a2n) * rc, C.locked, 8);
        }
      }
    }

    // Touch indicator
    if (isTouching && holdTime > 0) {
      var holdRatio = Math.min(1, holdTime / LOCK_REQUIRED);
      game.draw.circle(touchX, touchY, 30 + holdRatio * 20, C.reticle, 0.3);
      game.draw.circle(touchX, touchY, 10, C.reticle, 0.6);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.destroyed, flashAnim * 0.1);

    // Escape dots
    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W * 0.15 + ei * (W * 0.7 / (MAX_ESCAPE - 1)), H * 0.955, 18, ei < escaped ? C.miss : C.ui, 0.9);
    }

    game.draw.text(destroyed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio2 = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio2, 72, ratio2 > 0.3 ? C.radarLine : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnTarget();
    spawnTarget();
  });
})(game);
