// 344-ice-skate.js
// アイススケート — 滑り続けながらゴールフラグへ向かう
// 操作: タップで方向転換（左右交互タップでスピード維持）
// 成功: 10個のフラグ通過  失敗: 壁に当たる3回 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#e0f2fe',
    ice:    '#bae6fd',
    iceHi:  '#f0f9ff',
    wall:   '#1e3a5f',
    skater: '#1d4ed8',
    skaterHi:'#fff',
    flag:   '#ef4444',
    flagHi: '#fca5a5',
    trail:  '#7dd3fc',
    ui:     '#0369a1',
    text:   '#0c4a6e'
  };

  var skaterX = W / 2;
  var skaterY = H * 0.5;
  var velX = 300;
  var velY = 0;
  var SPEED = 380;
  var dir = 1; // 1=right, -1=left
  var angle = 0;

  var flags = [];
  var FLAG_COUNT = 10;
  var walls = [];
  var WALL_GAP = 360;
  var WALL_W = 60;

  var flagsPassed = 0;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var invincible = 0;
  var trail = [];
  var particles = [];
  var cameraY = 0;

  function spawnFlag(y) {
    flags.push({ x: W * 0.2 + Math.random() * W * 0.6, y: y });
  }

  function spawnWall(y) {
    var gapX = W * 0.15 + Math.random() * (W * 0.7 - WALL_GAP);
    walls.push({ x: gapX, gapX: gapX, gapEnd: gapX + WALL_GAP, y: y });
  }

  function initLevel() {
    flags = [];
    walls = [];
    var startY = H * 0.3;
    for (var i = 0; i < FLAG_COUNT; i++) {
      spawnFlag(startY - i * 400);
    }
    // Walls between flags
    for (var j = 0; j < FLAG_COUNT - 1; j++) {
      spawnWall(startY - j * 400 - 200);
    }
  }

  game.onTap(function() {
    if (done) return;
    dir = -dir;
    velX = dir * SPEED;
    velY = -SPEED * 0.4;
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (invincible > 0) invincible -= dt;

    // Ice friction — speed decays slightly
    var speed = Math.sqrt(velX * velX + velY * velY);
    if (speed > 0) {
      var friction = 20 * dt;
      velX -= velX / speed * friction;
      velY -= velY / speed * friction;
    }
    // Gravity pull downward (screen space Y+ = down, but we scroll up)
    velY += 80 * dt;

    skaterX += velX * dt;
    skaterY += velY * dt;

    // Bounce off side walls
    if (skaterX < 40) { skaterX = 40; velX = Math.abs(velX); dir = 1; }
    if (skaterX > W - 40) { skaterX = W - 40; velX = -Math.abs(velX); dir = -1; }

    // Camera follows skater upward
    cameraY = skaterY - H * 0.6;

    // Trail
    trail.push({ x: skaterX, y: skaterY, life: 0.4 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Check flags
    for (var fi = flags.length - 1; fi >= 0; fi--) {
      var f = flags[fi];
      if (Math.hypot(skaterX - f.x, skaterY - f.y) < 60) {
        flags.splice(fi, 1);
        flagsPassed++;
        game.audio.play('se_success', 0.5);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: f.x, y: f.y, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life:0.6, col: C.flag });
        }
        if (flagsPassed >= FLAG_COUNT && !done) {
          done = true;
          setTimeout(function() { game.end.success(flagsPassed * 300 + Math.ceil(timeLeft) * 80); }, 400);
          return;
        }
      }
    }

    // Check walls
    if (invincible <= 0) {
      for (var wi = 0; wi < walls.length; wi++) {
        var w = walls[wi];
        var inWallY = Math.abs(skaterY - w.y) < 30;
        var inGap = skaterX > w.gapX && skaterX < w.gapEnd;
        if (inWallY && !inGap) {
          hits++;
          invincible = 1.5;
          velX = -velX;
          game.audio.play('se_failure', 0.4);
          for (var pi2 = 0; pi2 < 6; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: skaterX, y: skaterY, vx: Math.cos(ang2)*160, vy: Math.sin(ang2)*160, life:0.5, col: C.wall });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
            return;
          }
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ice surface
    game.draw.rect(0, 0, W, H, C.ice, 0.5);
    // Ice sparkles
    for (var sx = 0; sx < W; sx += 120) {
      for (var sy = 0; sy < H; sy += 100) {
        var sparkX = (sx + elapsed * 30) % W;
        var sparkY = (sy - cameraY) % H;
        if (sparkY > 0 && sparkY < H) {
          game.draw.circle(sparkX, sparkY, 4 + Math.sin(elapsed * 2 + sx) * 2, C.iceHi, 0.5);
        }
      }
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y - cameraY, 12 * t.life * 2, C.trail, t.life * 0.6);
    }

    // Walls
    for (var wi2 = 0; wi2 < walls.length; wi2++) {
      var w2 = walls[wi2];
      var wy = w2.y - cameraY;
      if (wy > -50 && wy < H + 50) {
        game.draw.rect(0, wy - 20, w2.gapX, 40, C.wall, 0.9);
        game.draw.rect(w2.gapEnd, wy - 20, W - w2.gapEnd, 40, C.wall, 0.9);
        game.draw.line(0, wy - 20, w2.gapX, wy - 20, '#4a90d9', 3);
        game.draw.line(w2.gapEnd, wy - 20, W, wy - 20, '#4a90d9', 3);
      }
    }

    // Flags
    for (var fi2 = 0; fi2 < flags.length; fi2++) {
      var f2 = flags[fi2];
      var fy = f2.y - cameraY;
      if (fy > -80 && fy < H + 80) {
        game.draw.line(f2.x, fy, f2.x, fy - 80, C.ui, 4);
        game.draw.rect(f2.x, fy - 80, 50, 40, C.flag, 0.9);
        game.draw.circle(f2.x, fy, 20, C.flag, 0.6);
      }
    }

    // Skater
    var sy2 = skaterY - cameraY;
    var palpha = invincible > 0 ? (Math.sin(elapsed * 20) * 0.4 + 0.5) : 1.0;
    game.draw.circle(skaterX, sy2, 40, C.skater, 0.9 * palpha);
    game.draw.circle(skaterX, sy2 - 44, 24, C.skaterHi, 0.9 * palpha);
    // Skates
    game.draw.line(skaterX - 20, sy2 + 44, skaterX + 20, sy2 + 44, C.skaterHi, 6);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y - cameraY, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 28 + hi * 56, H * 0.9, 16, hi < hits ? C.flag : C.ice);
    }

    game.draw.text(flagsPassed + ' / ' + FLAG_COUNT, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.skater : C.flag);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    initLevel();
    velX = SPEED;
  });
})(game);
