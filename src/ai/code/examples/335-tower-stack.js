// 335-tower-stack.js
// タワースタック — 落ちてくるブロックを積み上げて高いタワーを作る
// 操作: タップでブロックを落とす（前のブロックと重なる部分だけ積む）
// 成功: 15段  失敗: 幅3割以下になる or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0c0c14',
    sky:    '#111827',
    block:  '#3b82f6',
    blockHi:'#60a5fa',
    perfect:'#22c55e',
    perfectHi:'#86efac',
    danger: '#ef4444',
    dangerHi:'#fca5a5',
    cut:    '#94a3b8',
    ui:     '#475569',
    text:   '#f1f5f9',
    star:   '#fbbf24'
  };

  var BLOCK_H = 48;
  var START_W = 400;
  var SWING_SPEED = 260;

  var stack = []; // { x, y, w }
  var moving = { x: -START_W, w: START_W, dir: 1 };
  var stageBase = H * 0.88;
  var cameraY = 0;
  var layer = 0;
  var NEEDED = 15;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var perfectAnim = 0;
  var PERFECT_THRESHOLD = 14;
  var speedMult = 1;
  var consecutivePerfect = 0;

  var BLOCK_COLORS = [C.block, '#a78bfa', '#f59e0b', '#22c55e', '#f87171', '#34d399'];

  function getBlockColor(idx) {
    return BLOCK_COLORS[idx % BLOCK_COLORS.length];
  }

  function initGame() {
    stack = [];
    // Base block
    stack.push({ x: W / 2 - START_W / 2, w: START_W, y: stageBase - BLOCK_H, layer: 0 });
    moving = { x: -START_W, w: START_W, dir: 1 };
    layer = 0;
    cameraY = 0;
  }

  function dropBlock() {
    var prev = stack[stack.length - 1];
    var mx = moving.x;
    var mw = moving.w;
    var px = prev.x, pw = prev.w;

    var overlapLeft = Math.max(mx, px);
    var overlapRight = Math.min(mx + mw, px + pw);
    var overlapW = overlapRight - overlapLeft;

    if (overlapW <= 0) {
      // Complete miss
      done = true;
      game.audio.play('se_failure', 0.7);
      setTimeout(function() { game.end.failure(); }, 400);
      return;
    }

    var cutW = mw - overlapW;
    var isPerfect = cutW < PERFECT_THRESHOLD;

    if (isPerfect) {
      // Perfect! Keep same width
      consecutivePerfect++;
      perfectAnim = 0.8;
      game.audio.play('se_success', 0.6);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        var bx = overlapLeft + overlapW / 2;
        particles.push({ x: bx, y: stageBase - (stack.length) * BLOCK_H - cameraY, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.5, col: C.perfectHi });
      }
    } else {
      consecutivePerfect = 0;
      // Cut particle
      var cutX = mx < px ? mx : mx + mw - cutW;
      particles.push({ x: cutX + cutW / 2, y: stageBase - (stack.length) * BLOCK_H - cameraY, vx: (mx < px ? -100 : 100), vy: 200, life: 0.7, col: C.cut });
    }

    layer++;
    var newW = isPerfect ? prev.w : overlapW;
    var newX = isPerfect ? prev.x : overlapLeft;

    stack.push({ x: newX, w: newW, y: stageBase - stack.length * BLOCK_H, layer: layer });
    game.audio.play('se_tap', isPerfect ? 0.5 : 0.3);

    // Speed up
    speedMult = 1 + layer * 0.06;

    // Start new moving block
    moving = {
      x: Math.random() < 0.5 ? -newW : W,
      w: newW,
      dir: Math.random() < 0.5 ? 1 : -1
    };

    if (newW < START_W * 0.3 && !done) {
      done = true;
      game.audio.play('se_failure', 0.5);
      setTimeout(function() { game.end.failure(); }, 400);
      return;
    }

    // Scroll camera
    if (layer >= 4) {
      cameraY = (layer - 3) * BLOCK_H;
    }

    if (layer >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      setTimeout(function() { game.end.success(layer * 200 + consecutivePerfect * 50 + Math.ceil(timeLeft) * 80); }, 400);
    }
  }

  game.onTap(function() {
    if (done) return;
    dropBlock();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (perfectAnim > 0) perfectAnim -= dt * 2;

    // Move the sliding block
    if (!done) {
      moving.x += moving.dir * SWING_SPEED * speedMult * dt;
      if (moving.x > W) { moving.x = W; moving.dir = -1; }
      if (moving.x + moving.w < 0) { moving.x = -moving.w; moving.dir = 1; }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars background
    for (var si = 0; si < 20; si++) {
      var sx = (si * 137 + 50) % W;
      var sy = (si * 97 + 30) % (H * 0.7);
      game.draw.circle(sx, sy, 2 + si % 2, C.star, 0.3 + 0.2 * Math.sin(elapsed + si));
    }

    // Stack blocks
    for (var bli = 0; bli < stack.length; bli++) {
      var bl = stack[bli];
      var screenY = bl.y - cameraY;
      if (screenY > H + BLOCK_H || screenY < -BLOCK_H) continue;
      var col = getBlockColor(bl.layer);
      game.draw.rect(bl.x, screenY, bl.w, BLOCK_H - 4, col, 0.9);
      game.draw.rect(bl.x, screenY, bl.w, 10, col, 0.6);
      game.draw.rect(bl.x, screenY, bl.w, 4, '#fff', 0.2);
    }

    // Moving block
    var topStack = stack[stack.length - 1];
    var movY = topStack.y - BLOCK_H - cameraY;
    var col2 = getBlockColor(layer + 1);
    game.draw.rect(moving.x, movY, moving.w, BLOCK_H - 4, col2, 0.8);
    game.draw.rect(moving.x, movY, moving.w, 10, col2, 0.5);
    game.draw.rect(moving.x, movY, moving.w, 4, '#fff', 0.2);

    // Target zone (top of stack)
    game.draw.rect(topStack.x, topStack.y - BLOCK_H - cameraY, topStack.w, BLOCK_H, '#fff', 0.06);

    // Perfect flash
    if (perfectAnim > 0) {
      game.draw.text('PERFECT!', W / 2, H * 0.83, { size: 64, color: C.perfectHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text(layer + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.block : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    initGame();
  });
})(game);
