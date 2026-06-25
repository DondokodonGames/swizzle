// 170-turret-aim.js
// 回転砲台 — ゆっくり回る砲口が的を向いた瞬間に撃て、狙い待ちの緊張感
// 操作: タップで発射
// 成功: 8発命中  失敗: 5発外す or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060408',
    gun:     '#374151',
    gunHi:   '#6b7280',
    barrel:  '#4b5563',
    shot:    '#fef08a',
    shotHi:  '#f59e0b',
    target:  '#22c55e',
    targetHi:'#86efac',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var GUN_X = W / 2;
  var GUN_Y = H * 0.78;
  var GUN_R = 72;
  var BARREL_LEN = 140;

  var gunAngle = -Math.PI / 2; // pointing up
  var GUN_SPEED = 1.1; // radians per second
  var gunDir = 1;
  var MIN_ANG = -Math.PI * 0.9;
  var MAX_ANG = -Math.PI * 0.1;

  var bullet = null;
  var BULLET_SPEED = 1200;
  var BULLET_R = 14;

  var targets = [];
  var TARGET_R = 60;
  var TARGET_COUNT = 5;
  var targetSpawnTimer = 0;

  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 45;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];

  function spawnTarget() {
    if (targets.length >= TARGET_COUNT) return;
    var tx = TARGET_R + 60 + Math.random() * (W - (TARGET_R + 60) * 2);
    var ty = H * 0.1 + Math.random() * H * 0.5;
    // Move target
    var speed = 60 + Math.random() * 120;
    targets.push({ x: tx, y: ty, vx: (Math.random() < 0.5 ? 1 : -1) * speed, alive: true, hitTimer: 0 });
  }

  game.onTap(function() {
    if (done || bullet) return;
    var tipX = GUN_X + Math.cos(gunAngle) * BARREL_LEN;
    var tipY = GUN_Y + Math.sin(gunAngle) * BARREL_LEN;
    bullet = {
      x: tipX,
      y: tipY,
      vx: Math.cos(gunAngle) * BULLET_SPEED,
      vy: Math.sin(gunAngle) * BULLET_SPEED
    };
    game.audio.play('se_tap', 0.8);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    // Rotate gun
    gunAngle += GUN_SPEED * gunDir * dt;
    if (gunAngle > MAX_ANG) { gunAngle = MAX_ANG; gunDir = -1; }
    if (gunAngle < MIN_ANG) { gunAngle = MIN_ANG; gunDir = 1; }

    // Spawn targets
    targetSpawnTimer -= dt;
    if (targetSpawnTimer <= 0 && targets.length < TARGET_COUNT) {
      targetSpawnTimer = 0.8 + Math.random() * 0.5;
      spawnTarget();
    }

    // Move targets
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti];
      if (!t.alive) {
        t.hitTimer -= dt;
        continue;
      }
      t.x += t.vx * dt;
      if (t.x < TARGET_R || t.x > W - TARGET_R) {
        t.vx *= -1;
        t.x = Math.max(TARGET_R, Math.min(W - TARGET_R, t.x));
      }
    }
    targets = targets.filter(function(t) { return t.alive || t.hitTimer > 0; });

    // Move bullet
    if (bullet) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      // Check hits
      for (var ti2 = 0; ti2 < targets.length; ti2++) {
        var t2 = targets[ti2];
        if (!t2.alive) continue;
        var dx = bullet.x - t2.x, dy = bullet.y - t2.y;
        if (Math.sqrt(dx * dx + dy * dy) < BULLET_R + TARGET_R) {
          t2.alive = false; t2.hitTimer = 0.5;
          score++;
          feedbackOk = true; feedback = 0.4;
          game.audio.play('se_success', 0.9);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: t2.x, y: t2.y, vx: Math.cos(ang) * 240, vy: Math.sin(ang) * 240, life: 0.5 });
          }
          bullet = null;
          if (score >= needed && !done) {
            done = true;
            setTimeout(function() { game.end.success(score * 80 + Math.ceil(timeLeft) * 20); }, 400);
          }
          break;
        }
      }

      // Off screen
      if (bullet && (bullet.x < -20 || bullet.x > W + 20 || bullet.y < -20 || bullet.y > H + 20)) {
        bullet = null;
        misses++;
        feedbackOk = false; feedback = 0.35;
        game.audio.play('se_failure', 0.4);
        if (misses >= maxMisses && !done) { done = true; setTimeout(function() { game.end.failure(); }, 400); }
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 400 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Targets
    for (var ti3 = 0; ti3 < targets.length; ti3++) {
      var t3 = targets[ti3];
      if (!t3.alive) {
        if (t3.hitTimer > 0) {
          game.draw.circle(t3.x, t3.y, TARGET_R, C.wrong, t3.hitTimer);
          game.draw.text('★', t3.x, t3.y, { size: 64, color: C.shot, bold: true });
        }
        continue;
      }
      game.draw.circle(t3.x, t3.y, TARGET_R + 10, C.targetHi, 0.2);
      game.draw.circle(t3.x, t3.y, TARGET_R, C.target, 0.85);
      game.draw.circle(t3.x, t3.y, TARGET_R * 0.55, C.targetHi, 0.6);
      game.draw.circle(t3.x, t3.y, 12, '#fff', 0.8);
    }

    // Aim line
    var tipX = GUN_X + Math.cos(gunAngle) * BARREL_LEN;
    var tipY = GUN_Y + Math.sin(gunAngle) * BARREL_LEN;
    for (var gl = 0; gl < 6; gl++) {
      var gd = 80 + gl * 100;
      var gx = GUN_X + Math.cos(gunAngle) * gd;
      var gy = GUN_Y + Math.sin(gunAngle) * gd;
      game.draw.circle(gx, gy, 6, C.shot, 0.15 * (1 - gl / 6));
    }

    // Gun base
    game.draw.circle(GUN_X, GUN_Y, GUN_R + 12, C.gunHi, 0.2);
    game.draw.circle(GUN_X, GUN_Y, GUN_R, C.gun, 0.95);
    game.draw.circle(GUN_X, GUN_Y, GUN_R * 0.5, C.gunHi, 0.5);

    // Barrel
    var bx2 = GUN_X + Math.cos(gunAngle) * BARREL_LEN;
    var by2 = GUN_Y + Math.sin(gunAngle) * BARREL_LEN;
    game.draw.line(GUN_X, GUN_Y, bx2, by2, C.barrel, 32);
    game.draw.line(GUN_X, GUN_Y, bx2, by2, C.gunHi, 10);
    game.draw.circle(bx2, by2, 20, C.gunHi, 0.7);

    // Bullet
    if (bullet) {
      game.draw.circle(bullet.x, bullet.y, BULLET_R + 6, C.shotHi, 0.4);
      game.draw.circle(bullet.x, bullet.y, BULLET_R, C.shot, 0.95);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, C.target, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.target : C.wrong, feedback * 0.1);
    }

    if (!bullet) game.draw.text('タップで撃て！', W / 2, H * 0.9, { size: 48, color: C.ui });
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 + (mi - 2) * 52, 218, 18, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.gun : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnTarget(); spawnTarget(); spawnTarget();
  });
})(game);
