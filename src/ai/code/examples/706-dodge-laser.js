// 706-dodge-laser.js
// レーザー回避 — 水平に走るレーザーをジャンプでかわし続けろ
// 操作: タップでキャラクターをジャンプ
// 成功: 30秒生き延びる  失敗: レーザーに当たる5回

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060210',
    char:    '#a78bfa',
    charHi:  '#ddd6fe',
    laser:   '#ef4444',
    laserHi: '#fca5a5',
    floor:   '#1e1b4b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080118'
  };

  var FLOOR_Y = H * 0.82;
  var CHAR_X = W * 0.22;
  var CHAR_R = 38;
  var GRAVITY = 1800;
  var JUMP_V = -900;

  var charY = FLOOR_Y - CHAR_R;
  var charVY = 0;
  var onGround = true;

  var lasers = []; // { y, speed, active, flashTimer }
  var laserTimer = 0;
  var LASER_INTERVAL = 2.0;
  var LASER_W = 14;

  var surviveTime = 0;
  var NEEDED_TIME = 30;
  var hits = 0;
  var MAX_HITS = 5;
  var iframes = 0;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var trail = [];

  function spawnLaser() {
    // Random height in play area, sometimes at head/knee level
    var heights = [FLOOR_Y - CHAR_R * 2, FLOOR_Y - CHAR_R * 3.5, FLOOR_Y - CHAR_R * 5.5];
    var y = heights[Math.floor(Math.random() * heights.length)];
    var speed = 600 + elapsed * 5;
    lasers.push({ y: y, x: W + 100, speed: speed, warningTimer: 0.6, active: false, flashTimer: 0 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (onGround || charY > FLOOR_Y - CHAR_R * 4) {
      // Allow double-jump when not too high
      charVY = JUMP_V;
      onGround = false;
      game.audio.play('se_tap', 0.1);
      for (var p = 0; p < 3; p++) {
        particles.push({ x: CHAR_X, y: charY + CHAR_R, vx: (Math.random() - 0.5) * 120, vy: 60 + Math.random() * 80, life: 0.25, col: C.charHi });
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
    if (iframes > 0) iframes -= dt;

    // Character physics
    charVY += GRAVITY * dt;
    charY += charVY * dt;
    if (charY >= FLOOR_Y - CHAR_R) {
      charY = FLOOR_Y - CHAR_R;
      charVY = 0;
      onGround = true;
    } else {
      onGround = false;
    }

    trail.push({ x: CHAR_X, y: charY, life: 0.2 });
    for (var tr = trail.length - 1; tr >= 0; tr--) {
      trail[tr].life -= dt * 5;
      if (trail[tr].life <= 0) trail.splice(tr, 1);
    }

    // Spawn lasers
    laserTimer += dt;
    var interval = Math.max(1.0, LASER_INTERVAL - elapsed * 0.015);
    if (laserTimer >= interval) { laserTimer = 0; spawnLaser(); }

    // Update lasers
    for (var i = lasers.length - 1; i >= 0; i--) {
      var la = lasers[i];
      if (la.warningTimer > 0) {
        la.warningTimer -= dt;
        continue;
      }
      la.active = true;
      la.x -= la.speed * dt;
      if (la.flashTimer > 0) la.flashTimer -= dt * 4;
      if (la.x < -200) { lasers.splice(i, 1); continue; }

      // Collision
      if (iframes <= 0 && la.x < CHAR_X + CHAR_R && la.x + LASER_W * 40 > CHAR_X - CHAR_R) {
        var charTop = charY - CHAR_R;
        var charBot = charY + CHAR_R;
        var laTop = la.y - LASER_W / 2;
        var laBot = la.y + LASER_W / 2;
        if (charBot > laTop && charTop < laBot) {
          hits++;
          iframes = 1.0;
          flashAnim = 0.5;
          la.flashTimer = 1.0;
          game.audio.play('se_failure', 0.5);
          for (var p2 = 0; p2 < 6; p2++) {
            var pa2 = Math.random() * Math.PI * 2;
            particles.push({ x: CHAR_X, y: charY, vx: Math.cos(pa2) * 200, vy: Math.sin(pa2) * 200, life: 0.4, col: C.wrong });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }
    }

    if (!done) {
      surviveTime += dt;
      if (surviveTime >= NEEDED_TIME && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.floor(surviveTime * 100) + (MAX_HITS - hits) * 500); }, 700);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Floor
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, C.floor, 0.9);
    game.draw.line(0, FLOOR_Y, W, FLOOR_Y, '#ffffff18', 3);

    // Warning zones for incoming lasers
    for (var li = 0; li < lasers.length; li++) {
      var la2 = lasers[li];
      if (la2.warningTimer > 0) {
        var alpha = (Math.sin(elapsed * 12) * 0.5 + 0.5) * 0.3;
        game.draw.rect(W - 50, la2.y - LASER_W * 2, 50, LASER_W * 4, C.laserHi, alpha);
      }
    }

    // Lasers
    for (var li2 = 0; li2 < lasers.length; li2++) {
      var la3 = lasers[li2];
      if (!la3.active) continue;
      var glow = la3.flashTimer > 0 ? la3.flashTimer * 0.3 : 0;
      game.draw.rect(la3.x, la3.y - LASER_W * 2, W, LASER_W * 4, C.laser, 0.05 + glow);
      game.draw.rect(la3.x, la3.y - LASER_W / 2, W, LASER_W, C.laser, 0.9);
      game.draw.rect(la3.x, la3.y - 2, W, 4, C.laserHi, 0.8);
    }

    // Character trail
    for (var tr2 = 0; tr2 < trail.length; tr2++) {
      var t = trail[tr2];
      game.draw.circle(t.x, t.y, CHAR_R * t.life * 1.5, C.char, t.life * 0.3);
    }

    // Character
    var charAlpha = iframes > 0 ? (Math.sin(elapsed * 25) * 0.5 + 0.5) : 0.9;
    game.draw.circle(CHAR_X + 4, charY + 4, CHAR_R, '#000', 0.3);
    game.draw.circle(CHAR_X, charY, CHAR_R, C.char, charAlpha);
    game.draw.circle(CHAR_X - CHAR_R * 0.3, charY - CHAR_R * 0.3, CHAR_R * 0.25, C.charHi, charAlpha * 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.wrong, flashAnim * 0.1);

    // Survive progress bar
    var progRatio = Math.min(1, surviveTime / NEEDED_TIME);
    game.draw.rect(40, H * 0.91, W - 80, 24, C.floor, 0.7);
    game.draw.rect(40, H * 0.91, (W - 80) * progRatio, 24, C.correct, 0.85);
    game.draw.text(Math.floor(surviveTime) + ' / ' + NEEDED_TIME + 's', W / 2, H * 0.88, { size: 38, color: C.text });

    // Hit indicators
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 52 + hi * 104, H * 0.955, 20, hi < hits ? C.wrong : C.ui, 0.9);
    }

    game.draw.text('生存: ' + Math.floor(surviveTime) + 's', W / 2, 148, { size: 48, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
