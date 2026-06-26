// 577-tower-stack.js
// タワースタック — 揺れるブロックをタップで落として積み上げる
// 操作: タップで落とすタイミングを決める
// 成功: 15段積む  失敗: 3回はみ出し or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0c14',
    base:    '#334466',
    baseHi:  '#4466aa',
    block:   '#3b82f6',
    blockHi: '#93c5fd',
    falling: '#f59e0b',
    fallingHi:'#fcd34d',
    shadow:  '#00000044',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var TOWER_X = W / 2;
  var BASE_Y = H * 0.82;
  var BASE_W = 280;
  var BLOCK_H = 56;
  var SWING_SPEED = 2.4;
  var SWING_RANGE = W * 0.35;

  var tower = [{ x: TOWER_X, w: BASE_W }]; // stack of placed blocks
  var falling = { x: TOWER_X, w: BASE_W * 0.9, angle: 0, dir: 1 }; // swinging block
  var floorLevel = 0;
  var level = 0;
  var fails = 0;
  var MAX_FAIL = 3;
  var TARGET = 15;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var dropped = false;
  var dropAnim = 0;
  var dropY = 0;
  var viewOffset = 0;

  function getTopBlockY() {
    return BASE_Y - (tower.length - 1) * BLOCK_H - viewOffset;
  }

  function spawnFalling() {
    var topBlock = tower[tower.length - 1];
    falling = {
      x: TOWER_X + Math.cos(elapsed * SWING_SPEED + level) * SWING_RANGE,
      w: topBlock.w * (0.7 + Math.random() * 0.25),
      angle: 0,
      dir: Math.random() < 0.5 ? 1 : -1,
      t: elapsed
    };
    dropped = false;
    dropY = H * 0.08 - viewOffset;
  }

  function dropBlock() {
    if (dropped || done) return;
    dropped = true;
    dropAnim = 1.0;

    // Calculate overlap with top of tower
    var topBlock = tower[tower.length - 1];
    var left = Math.max(topBlock.x - topBlock.w / 2, falling.x - falling.w / 2);
    var right = Math.min(topBlock.x + topBlock.w / 2, falling.x + falling.w / 2);
    var overlap = right - left;

    if (overlap <= 0) {
      // Miss!
      fails++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      game.audio.play('se_failure', 0.5);
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: falling.x, y: getTopBlockY() - BLOCK_H, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.wrong });
      }
      if (fails >= MAX_FAIL && !done) {
        done = true;
        game.audio.play('se_failure', 0.7);
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        setTimeout(function() { if (!done) spawnFalling(); }, 800);
      }
      return;
    }

    // Place block
    var newX = (left + right) / 2;
    var newW = Math.min(overlap, falling.w);
    tower.push({ x: newX, w: newW });
    level++;
    game.audio.play('se_success', 0.6);
    flashCol = C.correct;
    flashAnim = 0.25;

    // Trim particles
    for (var pi2 = 0; pi2 < 6; pi2++) {
      var ang2 = Math.random() * Math.PI * 2;
      particles.push({ x: newX, y: getTopBlockY() - BLOCK_H, vx: Math.cos(ang2) * 150, vy: Math.sin(ang2) * 150, life: 0.3, col: C.correct });
    }

    if (level >= TARGET && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(level * 300 + Math.ceil(timeLeft) * 100); }, 700);
      return;
    }

    // Scroll view up if tower getting tall
    if (tower.length > 6) {
      viewOffset += BLOCK_H;
    }

    setTimeout(function() { if (!done) spawnFalling(); }, 600);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    dropBlock();
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
    if (dropAnim > 0) dropAnim -= dt * 4;

    // Swing the falling block
    if (!dropped && !done) {
      var speed = SWING_SPEED + level * 0.08;
      falling.x = TOWER_X + Math.sin((elapsed) * speed) * SWING_RANGE;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Tower blocks
    for (var ti = 0; ti < tower.length; ti++) {
      var block = tower[ti];
      var by = BASE_Y - ti * BLOCK_H - viewOffset;
      if (by > H + 20 || by < -BLOCK_H) continue;

      var bCol = ti === 0 ? C.base : C.block;
      var bHi = ti === 0 ? C.baseHi : C.blockHi;
      var alpha = 0.85 + (ti / tower.length) * 0.1;

      // Shadow
      game.draw.rect(block.x - block.w / 2 + 6, by - BLOCK_H + 6, block.w, BLOCK_H, C.shadow, 0.3);
      // Block
      game.draw.rect(block.x - block.w / 2, by - BLOCK_H, block.w, BLOCK_H, bCol, alpha);
      // Top highlight
      game.draw.rect(block.x - block.w / 2, by - BLOCK_H, block.w, 10, bHi, 0.4);
      // Side detail
      game.draw.rect(block.x - block.w / 2, by - BLOCK_H, 8, BLOCK_H, bHi, 0.2);
    }

    // Swinging block (at top)
    if (!dropped) {
      var swingY = H * 0.08 + Math.sin(elapsed * 3) * 8 - viewOffset;
      var swingW = falling.w;
      var swingX = falling.x;
      game.draw.rect(swingX - swingW / 2, swingY, swingW, BLOCK_H, C.falling, 0.9);
      game.draw.rect(swingX - swingW / 2, swingY, swingW, 10, C.fallingHi, 0.5);
      game.draw.rect(swingX - swingW / 2, swingY, 8, BLOCK_H, C.fallingHi, 0.3);

      // Shadow on top of tower (shows where it will land)
      var topY = getTopBlockY() - BLOCK_H;
      var topBlock = tower[tower.length - 1];
      var sLeft = Math.max(topBlock.x - topBlock.w / 2, swingX - swingW / 2);
      var sRight = Math.min(topBlock.x + topBlock.w / 2, swingX + swingW / 2);
      if (sRight > sLeft) {
        game.draw.rect(sLeft, topY, sRight - sLeft, BLOCK_H, C.fallingHi, 0.12);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 60 + fi * 120, H * 0.955, 24, fi < fails ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(level + ' / ' + TARGET + '段', W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.block : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnFalling();
  });
})(game);
