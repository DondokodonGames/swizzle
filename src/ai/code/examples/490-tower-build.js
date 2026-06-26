// 490-tower-build.js
// タワービルド — 左右に揺れるブロックをタップで落として積み上げる
// 操作: タップでブロックを落とす（前のブロックと重なった部分だけ残る）
// 成功: 高さ15段  失敗: 完全に外れて5回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050814',
    sky:    '#0a1020',
    ground: '#1a0e06',
    block0: '#3b82f6',
    block1: '#22c55e',
    block2: '#f59e0b',
    block3: '#a855f7',
    block4: '#ef4444',
    block5: '#06b6d4',
    falling:'#94a3b8',
    cut:    '#ef4444',
    wrong:  '#ef4444',
    correct:'#22c55e',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var BLOCK_COLORS = [C.block0, C.block1, C.block2, C.block3, C.block4, C.block5];
  var BASE_H = 40;
  var MIN_W = 60;

  var tower = [];  // {x, w, y, col}
  var sliding = null; // {x, w, y, col, vx}
  var fallingPieces = [];
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;

  var GROUND_Y = H * 0.88;
  var BLOCK_H = 60;

  function getTopY() {
    return GROUND_Y - tower.length * BLOCK_H - BLOCK_H;
  }

  function getTopBlock() {
    return tower.length > 0 ? tower[tower.length - 1] : { x: W / 2 - 200, w: 400 };
  }

  function spawnSliding() {
    var top = getTopBlock();
    var newW = Math.min(top.w + 40, 440); // slightly wider than below
    newW = Math.max(MIN_W, newW);
    var slideY = getTopY();
    var startX = Math.random() < 0.5 ? -newW : W;
    var vx = startX < 0 ? 280 + tower.length * 12 : -(280 + tower.length * 12);
    sliding = {
      x: startX, w: newW, y: slideY,
      col: BLOCK_COLORS[tower.length % BLOCK_COLORS.length],
      vx: vx
    };
  }

  function placeBlock() {
    if (!sliding) return;
    var top = getTopBlock();

    // Find overlap
    var sLeft = sliding.x;
    var sRight = sliding.x + sliding.w;
    var tLeft = top.x;
    var tRight = top.x + top.w;

    var overlapLeft = Math.max(sLeft, tLeft);
    var overlapRight = Math.min(sRight, tRight);
    var overlapW = overlapRight - overlapLeft;

    if (overlapW <= 0) {
      // Complete miss
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.5);
      fallingPieces.push({ x: sliding.x, y: sliding.y, w: sliding.w, col: sliding.col, vy: 0 });
      sliding = null;
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
      spawnSliding();
      return;
    }

    // Place overlapping part
    tower.push({ x: overlapLeft, w: overlapW, y: sliding.y, col: sliding.col });
    flashCol = C.correct;
    flashAnim = 0.25;
    game.audio.play('se_tap', 0.4 + overlapW / sliding.w * 0.3);

    // Cut-off pieces fall
    if (sLeft < overlapLeft) {
      fallingPieces.push({ x: sLeft, y: sliding.y, w: overlapLeft - sLeft, col: sliding.col, vy: 0 });
    }
    if (sRight > overlapRight) {
      fallingPieces.push({ x: overlapRight, y: sliding.y, w: sRight - overlapRight, col: sliding.col, vy: 0 });
    }

    for (var pi = 0; pi < 6; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: overlapLeft + overlapW / 2, y: sliding.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120 - 80, life: 0.5, col: sliding.col });
    }

    sliding = null;

    if (tower.length >= 15 && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(tower.length * 300 + Math.ceil(timeLeft) * 100); }, 700);
      return;
    }

    spawnSliding();
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    placeBlock();
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

    if (flashAnim > 0) flashAnim -= dt * 4;

    // Move sliding block
    if (sliding) {
      sliding.x += sliding.vx * dt;
      // Bounce at edges
      if (sliding.x < -sliding.w - 40) { sliding.x = -sliding.w - 40; sliding.vx = Math.abs(sliding.vx); }
      if (sliding.x > W + 40) { sliding.x = W + 40; sliding.vx = -Math.abs(sliding.vx); }
    }

    // Falling pieces
    for (var fp = fallingPieces.length - 1; fp >= 0; fp--) {
      fallingPieces[fp].vy += 600 * dt;
      fallingPieces[fp].y += fallingPieces[fp].vy * dt;
      if (fallingPieces[fp].y > H + 100) fallingPieces.splice(fp, 1);
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.5);

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 0.9);

    // Tower blocks
    for (var ti = 0; ti < tower.length; ti++) {
      var b = tower[ti];
      var by = GROUND_Y - (ti + 1) * BLOCK_H;
      game.draw.rect(b.x + 3, by + 3, b.w - 6, BLOCK_H - 6, b.col, 0.85);
      game.draw.rect(b.x + 3, by + 3, b.w - 6, 10, '#fff', 0.15);
    }

    // Falling pieces
    for (var fp2 = 0; fp2 < fallingPieces.length; fp2++) {
      var fp3 = fallingPieces[fp2];
      game.draw.rect(fp3.x + 2, fp3.y + 2, fp3.w - 4, BLOCK_H - 4, fp3.col, 0.6);
    }

    // Sliding block
    if (sliding) {
      game.draw.rect(sliding.x + 3, sliding.y + 3, sliding.w - 6, BLOCK_H - 6, sliding.col, 0.9);
      game.draw.rect(sliding.x + 3, sliding.y + 3, sliding.w - 6, 10, '#fff', 0.2);
      // Guide line
      if (tower.length > 0) {
        var top2 = getTopBlock();
        game.draw.line(top2.x, sliding.y + BLOCK_H, top2.x, GROUND_Y, C.ui, 2);
        game.draw.line(top2.x + top2.w, sliding.y + BLOCK_H, top2.x + top2.w, GROUND_Y, C.ui, 2);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(tower.length + ' / 15', W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.block0 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    // Base block
    tower.push({ x: W / 2 - 200, w: 400, y: GROUND_Y - BLOCK_H, col: C.ui });
    spawnSliding();
  });
})(game);
