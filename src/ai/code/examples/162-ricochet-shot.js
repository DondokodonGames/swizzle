// 162-ricochet-shot.js
// 壁当てスナイパー — 反射角を計算して壁越しに的を狙い撃つ頭脳戦
// 操作: タップで射角を指定して発射
// 成功: 6発命中  失敗: 10発撃ち尽くす or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040810',
    wall:    '#1e3a5f',
    wallHi:  '#2563eb',
    bullet:  '#fef08a',
    bulletHi:'#fbbf24',
    gun:     '#475569',
    gunHi:   '#94a3b8',
    target:  '#ef4444',
    targetHi:'#fca5a5',
    hit:     '#22c55e',
    ui:      '#334155'
  };

  var PLAY_MARGIN = 80;
  var PLAY_X = PLAY_MARGIN;
  var PLAY_Y = H * 0.12;
  var PLAY_W = W - PLAY_MARGIN * 2;
  var PLAY_H = H * 0.68;

  var GUN_X = PLAY_X + PLAY_W / 2;
  var GUN_Y = PLAY_Y + PLAY_H - 60;
  var BULLET_R = 12;
  var BULLET_SPEED = 900;
  var TARGET_R = 44;

  var bullet = null;
  var targetX, targetY;
  var aimAngle = -Math.PI / 2; // pointing up

  var score = 0;
  var needed = 6;
  var ammo = 10;
  var timeLeft = 45;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];
  var trail = [];

  function placeTarget() {
    // Place target near top but not too close
    targetX = PLAY_X + TARGET_R + 40 + Math.random() * (PLAY_W - (TARGET_R + 40) * 2);
    targetY = PLAY_Y + TARGET_R + 20 + Math.random() * (PLAY_H * 0.4);
  }

  game.onTap(function(tx, ty) {
    if (done || bullet) return;
    // Aim from gun toward tap point
    var dx = tx - GUN_X, dy = ty - GUN_Y;
    aimAngle = Math.atan2(dy, dx);
    // Fire
    bullet = {
      x: GUN_X,
      y: GUN_Y,
      vx: Math.cos(aimAngle) * BULLET_SPEED,
      vy: Math.sin(aimAngle) * BULLET_SPEED,
      bounces: 0
    };
    trail = [];
    ammo--;
    game.audio.play('se_tap', 0.7);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    if (bullet) {
      trail.push({ x: bullet.x, y: bullet.y, life: 0.3 });

      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      // Wall bounces
      if (bullet.x < PLAY_X + BULLET_R) {
        bullet.x = PLAY_X + BULLET_R;
        bullet.vx = Math.abs(bullet.vx);
        bullet.bounces++;
        game.audio.play('se_tap', 0.2);
      }
      if (bullet.x > PLAY_X + PLAY_W - BULLET_R) {
        bullet.x = PLAY_X + PLAY_W - BULLET_R;
        bullet.vx = -Math.abs(bullet.vx);
        bullet.bounces++;
        game.audio.play('se_tap', 0.2);
      }
      if (bullet.y < PLAY_Y + BULLET_R) {
        bullet.y = PLAY_Y + BULLET_R;
        bullet.vy = Math.abs(bullet.vy);
        bullet.bounces++;
        game.audio.play('se_tap', 0.2);
      }

      // Too many bounces or off screen
      if (bullet.bounces > 6 || bullet.y > PLAY_Y + PLAY_H + 20) {
        bullet = null;
        trail = [];
        feedbackOk = false; feedback = 0.3;
        if (ammo <= 0 && score < needed && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
        return;
      }

      // Hit target
      var dx = bullet.x - targetX, dy = bullet.y - targetY;
      if (Math.sqrt(dx * dx + dy * dy) < BULLET_R + TARGET_R) {
        score++;
        feedbackOk = true; feedback = 0.5;
        game.audio.play('se_success', 0.9);
        for (var pi = 0; pi < 14; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: targetX, y: targetY, vx: Math.cos(ang) * 280, vy: Math.sin(ang) * 280, life: 0.5 });
        }
        bullet = null; trail = [];
        placeTarget();
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 100 + Math.ceil(timeLeft) * 20 + ammo * 30); }, 400);
        }
      }
    }

    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt * 2;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 400 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Play area
    game.draw.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H, '#080f1c', 0.9);
    // Walls
    game.draw.rect(PLAY_X, PLAY_Y, PLAY_W, 16, C.wallHi, 0.8);
    game.draw.rect(PLAY_X, PLAY_Y, 16, PLAY_H, C.wallHi, 0.8);
    game.draw.rect(PLAY_X + PLAY_W - 16, PLAY_Y, 16, PLAY_H, C.wallHi, 0.8);
    // Bottom open (gun position)
    game.draw.rect(PLAY_X, PLAY_Y + PLAY_H, PLAY_W, 4, C.wall, 0.4);

    // Aim guide when no bullet
    if (!bullet) {
      var aimLen = 200;
      var ax = GUN_X + Math.cos(aimAngle) * aimLen;
      var ay = GUN_Y + Math.sin(aimAngle) * aimLen;
      game.draw.line(GUN_X, GUN_Y, ax, ay, C.bulletHi, 3);
      for (var gi = 1; gi <= 3; gi++) {
        game.draw.circle(GUN_X + Math.cos(aimAngle) * aimLen * gi / 4, GUN_Y + Math.sin(aimAngle) * aimLen * gi / 4, 5, C.bulletHi, 0.3 * (1 - gi / 4));
      }
    }

    // Target
    game.draw.circle(targetX, targetY, TARGET_R + 10, C.targetHi, 0.15);
    game.draw.circle(targetX, targetY, TARGET_R, C.target, 0.9);
    game.draw.circle(targetX, targetY, TARGET_R * 0.55, C.targetHi, 0.6);
    game.draw.circle(targetX, targetY, TARGET_R * 0.25, '#fff', 0.8);

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      game.draw.circle(trail[ti2].x, trail[ti2].y, BULLET_R * trail[ti2].life * 2, C.bulletHi, trail[ti2].life * 0.5);
    }

    // Bullet
    if (bullet) {
      game.draw.circle(bullet.x, bullet.y, BULLET_R + 6, C.bullet, 0.4);
      game.draw.circle(bullet.x, bullet.y, BULLET_R, C.bullet, 0.95);
    }

    // Gun
    var gunLen = 80;
    game.draw.line(GUN_X, GUN_Y, GUN_X + Math.cos(aimAngle) * gunLen, GUN_Y + Math.sin(aimAngle) * gunLen, C.gunHi, 20);
    game.draw.circle(GUN_X, GUN_Y, 30, C.gun, 0.9);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, C.hit, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.hit : C.target, feedback * 0.12);
    }

    if (!bullet) game.draw.text('タップで狙い打ち！', W / 2, H * 0.88, { size: 40, color: C.ui });
    game.draw.text('残り弾: ' + ammo, W * 0.75, H * 0.92, { size: 36, color: ammo < 4 ? C.target : C.ui });
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wallHi : C.target);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    placeTarget();
  });
})(game);
