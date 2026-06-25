// 148-target-lock.js
// ターゲットロック — 動く敵をロックオンしてミサイルを発射する戦術ゲーム
// 操作: タップでターゲットをロック、もう一度で発射
// 成功: 12機撃墜  失敗: 3機逃す or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020810',
    hud:     '#0f2040',
    hudHi:   '#1e4080',
    lock:    '#22c55e',
    lockHi:  '#86efac',
    target:  '#ef4444',
    targetHi:'#fca5a5',
    missile: '#f59e0b',
    missileHi:'#fef08a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155',
    stars:   '#1e3a5f'
  };

  var targets = [];
  var missiles = [];
  var lockedTarget = null;
  var lockProgress = 0;
  var LOCK_TIME = 0.8;
  var locking = false;

  var SPAWN_INTERVAL = 1.6;
  var spawnTimer = 0;
  var TARGET_SPEED = 180;

  var score = 0;
  var needed = 12;
  var escaped = 0;
  var maxEscaped = 3;
  var timeLeft = 35;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];

  var stars = [];
  for (var si = 0; si < 40; si++) {
    stars.push({ x: Math.random()*W, y: Math.random()*H, r: 1+Math.random()*2 });
  }

  function spawnTarget() {
    var side = Math.floor(Math.random() * 4);
    var x, y, vx, vy;
    if (side === 0) { x = Math.random()*W; y = -40; vx = (Math.random()-0.5)*TARGET_SPEED; vy = TARGET_SPEED; }
    else if (side === 1) { x = W+40; y = Math.random()*H; vx = -TARGET_SPEED; vy = (Math.random()-0.5)*TARGET_SPEED; }
    else if (side === 2) { x = Math.random()*W; y = H+40; vx = (Math.random()-0.5)*TARGET_SPEED; vy = -TARGET_SPEED; }
    else { x = -40; y = Math.random()*H; vx = TARGET_SPEED; vy = (Math.random()-0.5)*TARGET_SPEED; }
    targets.push({ x: x, y: y, vx: vx, vy: vy, r: 28, id: Math.random(), locked: false });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!locking && !lockedTarget) {
      // Try to tap a target
      for (var ti = 0; ti < targets.length; ti++) {
        var t = targets[ti];
        var dx = tx - t.x, dy = ty - t.y;
        if (Math.sqrt(dx*dx+dy*dy) < t.r + 40) {
          lockedTarget = t;
          t.locked = true;
          locking = true;
          lockProgress = 0;
          game.audio.play('se_tap', 0.5);
          return;
        }
      }
    } else if (lockedTarget && lockProgress >= 1) {
      // Fire missile
      missiles.push({ x: W/2, y: H*0.85, tx: lockedTarget, speed: 480, r: 8 });
      locking = false;
      lockedTarget.locked = false;
      lockedTarget = null;
      lockProgress = 0;
      game.audio.play('se_success', 0.7);
    }
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

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL * (0.7 + Math.random() * 0.6);
      spawnTarget();
    }

    // Locking progress
    if (locking && lockedTarget) {
      lockProgress += dt / LOCK_TIME;
      if (lockProgress > 1) lockProgress = 1;
    }

    // Move targets
    for (var ti2 = targets.length - 1; ti2 >= 0; ti2--) {
      var t2 = targets[ti2];
      t2.x += t2.vx * dt;
      t2.y += t2.vy * dt;
      if (t2.x < -80 || t2.x > W+80 || t2.y < -80 || t2.y > H+80) {
        if (t2 === lockedTarget) { lockedTarget = null; locking = false; lockProgress = 0; }
        targets.splice(ti2, 1);
        escaped++;
        feedbackOk = false;
        feedback = 0.4;
        if (escaped >= maxEscaped && !done) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    // Move missiles
    for (var mi = missiles.length - 1; mi >= 0; mi--) {
      var m = missiles[mi];
      if (!m.tx) { missiles.splice(mi, 1); continue; }
      var dx2 = m.tx.x - m.x, dy2 = m.tx.y - m.y;
      var dist = Math.sqrt(dx2*dx2+dy2*dy2);
      if (dist < 20) {
        // Hit!
        score++;
        feedbackOk = true;
        feedback = 0.4;
        for (var pi = 0; pi < 14; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: m.tx.x, y: m.tx.y, vx: Math.cos(ang)*250, vy: Math.sin(ang)*250, life: 0.5 });
        }
        var idx = targets.indexOf(m.tx);
        if (idx >= 0) targets.splice(idx, 1);
        if (m.tx === lockedTarget) { lockedTarget = null; locking = false; lockProgress = 0; }
        missiles.splice(mi, 1);
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score*50 + Math.ceil(timeLeft)*15); }, 400);
        }
        continue;
      }
      var spd = m.speed * dt / dist;
      m.x += dx2 * spd;
      m.y += dy2 * spd;
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 200 * dt;
      particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var s = 0; s < stars.length; s++) {
      game.draw.circle(stars[s].x, stars[s].y, stars[s].r, C.stars, 0.7);
    }

    // Targets
    for (var ti3 = 0; ti3 < targets.length; ti3++) {
      var t3 = targets[ti3];
      var col = t3.locked ? C.lockHi : C.target;
      game.draw.circle(t3.x, t3.y, t3.r + 12, col, 0.2);
      game.draw.circle(t3.x, t3.y, t3.r, col, 0.85);
      // Target crosshair
      game.draw.line(t3.x - t3.r, t3.y, t3.x + t3.r, t3.y, '#fff', 2);
      game.draw.line(t3.x, t3.y - t3.r, t3.x, t3.y + t3.r, '#fff', 2);
    }

    // Lock indicator on target
    if (lockedTarget) {
      var lx = lockedTarget.x, ly = lockedTarget.y, lr = lockedTarget.r + 28;
      var arc = lockProgress * Math.PI * 2;
      // Draw lock ring progress
      for (var la = 0; la < 40; la++) {
        var a1 = -Math.PI/2 + (la/40)*arc;
        var x1 = lx + Math.cos(a1)*lr, y1 = ly + Math.sin(a1)*lr;
        game.draw.circle(x1, y1, 5, C.lock, 0.8);
      }
      if (lockProgress >= 1) {
        game.draw.text('FIRE!', lx, ly - lr - 40, { size: 44, color: C.lock, bold: true });
      } else {
        game.draw.text('LOCKING...', lx, ly - lr - 40, { size: 36, color: C.lockHi });
      }
    }

    // Missiles
    for (var mi2 = 0; mi2 < missiles.length; mi2++) {
      var m2 = missiles[mi2];
      game.draw.circle(m2.x, m2.y, m2.r + 4, C.missileHi, 0.5);
      game.draw.circle(m2.x, m2.y, m2.r, C.missile, 0.9);
    }

    // Launch pad
    game.draw.rect(W/2 - 40, H*0.85 - 20, 80, 40, C.hud, 0.9);
    game.draw.rect(W/2 - 40, H*0.85 - 20, 80, 8, C.hudHi, 0.9);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10*part.life*2, C.missile, part.life);
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '撃墜！' : '逃がした！', W/2, H*0.3, {
        size: 80, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // HUD
    var stateText = !lockedTarget ? 'タップでロックオン' : (lockProgress < 1 ? 'ロック中...' : 'タップで発射！');
    game.draw.text(stateText, W/2, H*0.92, { size: 44, color: lockedTarget ? C.lockHi : C.ui });

    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var ei = 0; ei < maxEscaped; ei++) {
      game.draw.circle(W/2+(ei-1)*52, 218, 18, ei < escaped ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft/35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.hud : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnTarget();
    spawnTarget();
  });
})(game);
