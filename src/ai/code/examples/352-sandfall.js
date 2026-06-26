// 352-sandfall.js
// サンドフォール — 落ちてくる砂を受け止めて目標量を集める
// 操作: タップで受け皿を左右に動かす（タップした方向へ移動）
// 成功: 砂を500粒集める  失敗: 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1a0f00',
    sky:    '#0a0800',
    sand:   '#d97706',
    sandHi: '#fbbf24',
    sandDark:'#92400e',
    cup:    '#78350f',
    cupHi:  '#a16207',
    ground: '#0c0800',
    ui:     '#78716c',
    text:   '#fef3c7',
    miss:   '#ef4444'
  };

  var CUP_W = 200;
  var CUP_H = 80;
  var cupX = W / 2;
  var cupY = H * 0.78;
  var CUP_SPEED = 500;
  var cupDir = 0;

  var grains = [];
  var collected = 0;
  var NEEDED = 500;
  var missed = 0;
  var MAX_MISS = 100;
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var spawnTimer = 0;
  var SPAWN_RATE = 0.04;
  var cupGrains = []; // grains sitting in the cup

  function spawnGrain() {
    var spoutX = W * 0.15 + Math.random() * W * 0.7;
    grains.push({
      x: spoutX,
      y: 200,
      vx: (Math.random() - 0.5) * 80,
      vy: 0,
      r: 5 + Math.random() * 5
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    cupDir = tx < W / 2 ? -1 : 1;
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') cupDir = -1;
    if (dir === 'right') cupDir = 1;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Move cup
    cupX += cupDir * CUP_SPEED * dt;
    cupX = Math.max(CUP_W / 2 + 20, Math.min(W - CUP_W / 2 - 20, cupX));
    // Decelerate
    cupDir *= (1 - 3 * dt);
    if (Math.abs(cupDir) < 0.01) cupDir = 0;

    // Spawn grains
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnGrain();
      spawnTimer = SPAWN_RATE * (0.7 + Math.random() * 0.6);
    }

    // Update grains
    for (var gi = grains.length - 1; gi >= 0; gi--) {
      var g = grains[gi];
      g.vy += 600 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;

      // Bounce off walls
      if (g.x < g.r) { g.x = g.r; g.vx = Math.abs(g.vx); }
      if (g.x > W - g.r) { g.x = W - g.r; g.vx = -Math.abs(g.vx); }

      // Check cup
      if (g.y > cupY - CUP_H && g.y < cupY + 20 &&
          g.x > cupX - CUP_W / 2 && g.x < cupX + CUP_W / 2) {
        collected++;
        grains.splice(gi, 1);
        if (collected >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.8);
          setTimeout(function() { game.end.success(collected * 20 + Math.ceil(timeLeft) * 100); }, 400);
          return;
        }
        continue;
      }

      // Off screen
      if (g.y > H) {
        missed++;
        grains.splice(gi, 1);
        if (missed >= MAX_MISS && !done) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 300);
          return;
        }
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Hourglass source
    game.draw.rect(W * 0.15, 140, W * 0.7, 60, C.sandDark, 0.6);
    game.draw.rect(W * 0.15, 140, W * 0.7, 60, C.sand, 0.1);
    // Sand stream effect
    for (var si = 0; si < 3; si++) {
      var sx = W * 0.35 + si * W * 0.15;
      game.draw.line(sx, 200, sx + Math.sin(elapsed * 5 + si) * 10, cupY - CUP_H, C.sand, 2 + Math.sin(elapsed * 3 + si));
    }

    // Grains
    for (var gi2 = 0; gi2 < grains.length; gi2++) {
      var g2 = grains[gi2];
      game.draw.circle(g2.x, g2.y, g2.r, C.sand, 0.85);
    }

    // Cup
    // Cup left wall
    game.draw.rect(cupX - CUP_W / 2 - 10, cupY - CUP_H, 14, CUP_H + 10, C.cup, 0.9);
    game.draw.rect(cupX - CUP_W / 2 - 10, cupY - CUP_H, 14, CUP_H + 10, C.cupHi, 0.2);
    // Cup right wall
    game.draw.rect(cupX + CUP_W / 2 - 4, cupY - CUP_H, 14, CUP_H + 10, C.cup, 0.9);
    game.draw.rect(cupX + CUP_W / 2 - 4, cupY - CUP_H, 14, CUP_H + 10, C.cupHi, 0.2);
    // Cup bottom
    game.draw.rect(cupX - CUP_W / 2 - 10, cupY - 10, CUP_W + 20, 16, C.cup, 0.9);
    game.draw.rect(cupX - CUP_W / 2 - 10, cupY - 10, CUP_W + 20, 16, C.cupHi, 0.3);

    // Sand level in cup
    var fillLevel = Math.min(1, collected / NEEDED);
    var sandH = fillLevel * (CUP_H - 10);
    if (sandH > 2) {
      game.draw.rect(cupX - CUP_W / 2 + 2, cupY - sandH, CUP_W - 4, sandH, C.sand, 0.8);
      game.draw.rect(cupX - CUP_W / 2 + 2, cupY - sandH, CUP_W - 4, 8, C.sandHi, 0.4);
    }

    // Ground
    game.draw.rect(0, H * 0.88, W, H * 0.12, C.ground, 0.9);

    // Miss indicator
    if (missed > 0) {
      var missRatio = Math.min(1, missed / MAX_MISS);
      game.draw.rect(0, H * 0.88, W * missRatio, 8, C.miss, 0.7);
    }

    // Progress
    var prog = Math.min(1, collected / NEEDED);
    game.draw.rect(W * 0.1, H * 0.91, W * 0.8, 20, '#1a0a00', 0.8);
    game.draw.rect(W * 0.1, H * 0.91, W * 0.8 * prog, 20, C.sandHi, 0.8);
    game.draw.text(collected + ' / ' + NEEDED, W / 2, H * 0.96, { size: 36, color: C.text });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.sand : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
