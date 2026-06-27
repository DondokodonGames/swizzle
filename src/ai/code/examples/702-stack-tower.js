// 702-stack-tower.js
// タワー積み — スライドするブロックをタップして寸分たがわず積み上げろ
// 操作: タップでブロックを止める
// 成功: 15段積む  失敗: はみ出しゼロで落下 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030810',
    blockA:  '#6366f1',
    blockB:  '#8b5cf6',
    blockC:  '#a78bfa',
    ground:  '#1e293b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#05080f'
  };

  var BLOCK_COLORS = [C.blockA, C.blockB, C.blockC, '#0ea5e9', '#06b6d4', '#10b981', '#f59e0b'];

  var GROUND_Y = H * 0.86;
  var BLOCK_H = 60;
  var MAX_W = 500;
  var MIN_W = 60;

  var stack = []; // { x, w, y, col }
  var currentBlock = null;
  var blockDir = 1;
  var blockSpeed = 340;

  var level = 0;
  var NEEDED = 15;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var dropAnim = null; // block that fell off
  var waitTimer = 0;

  function getTopY() {
    return GROUND_Y - stack.length * BLOCK_H - BLOCK_H;
  }

  function spawnBlock() {
    var prevW = stack.length > 0 ? stack[stack.length - 1].w : MAX_W;
    var blockW = Math.min(prevW, MAX_W);
    var col = BLOCK_COLORS[level % BLOCK_COLORS.length];
    var startX = Math.random() > 0.5 ? -blockW : W;
    blockDir = startX < 0 ? 1 : -1;
    blockSpeed = 340 + level * 12;
    currentBlock = {
      x: startX,
      w: blockW,
      y: getTopY(),
      col: col
    };
  }

  game.onTap(function(tx, ty) {
    if (done || !currentBlock || waitTimer > 0) return;
    // Determine overlap with block below
    var prev = stack.length > 0 ? stack[stack.length - 1] : { x: (W - MAX_W) / 2, w: MAX_W };
    var bLeft = currentBlock.x;
    var bRight = currentBlock.x + currentBlock.w;
    var pLeft = prev.x;
    var pRight = prev.x + prev.w;

    var overlapLeft = Math.max(bLeft, pLeft);
    var overlapRight = Math.min(bRight, pRight);
    var overlapW = overlapRight - overlapLeft;

    if (overlapW <= 0) {
      // Complete miss — fall
      dropAnim = { x: currentBlock.x, y: currentBlock.y, w: currentBlock.w, col: currentBlock.col, vy: 0 };
      currentBlock = null;
      done = true;
      flashCol = C.wrong;
      flashAnim = 0.5;
      resultText = '落ちた！';
      resultTimer = 0.8;
      game.audio.play('se_failure', 0.6);
      setTimeout(function() { game.end.failure(); }, 800);
      return;
    }

    // Trim block to overlap
    var newBlock = {
      x: overlapLeft,
      w: overlapW,
      y: currentBlock.y,
      col: currentBlock.col
    };

    // Drop animation for trimmed part
    if (overlapW < currentBlock.w) {
      var trimX = bLeft < pLeft ? bLeft : overlapRight;
      var trimW = currentBlock.w - overlapW;
      dropAnim = { x: trimX, y: currentBlock.y, w: trimW, col: currentBlock.col, vy: 0 };
    }

    stack.push(newBlock);
    level++;
    game.audio.play('se_tap', 0.15);

    var perfectThresh = 12;
    if (overlapW >= currentBlock.w - perfectThresh) {
      // Perfect!
      newBlock.x = prev.x + (prev.w - overlapW) / 2; // center snap
      newBlock.w = overlapW;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = overlapW >= currentBlock.w ? 'ぴったり！' : 'いい感じ！';
      game.audio.play('se_success', 0.45);
    } else {
      resultText = '+' + Math.round(overlapW) + 'px';
    }
    resultTimer = 0.5;

    for (var p = 0; p < 4; p++) {
      var pa = Math.random() * Math.PI * 2;
      particles.push({ x: overlapLeft + overlapW / 2, y: newBlock.y, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150 - 80, life: 0.4, col: newBlock.col });
    }

    currentBlock = null;
    if (level >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(level * 400 + Math.ceil(timeLeft) * 80); }, 700);
    } else {
      waitTimer = 0.3;
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
    if (resultTimer > 0) resultTimer -= dt;

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) spawnBlock();
    }

    // Scroll camera: keep top of stack visible
    var targetScrollY = 0;
    if (stack.length > 8) {
      targetScrollY = (stack.length - 8) * BLOCK_H;
    }

    if (currentBlock) {
      currentBlock.x += blockDir * blockSpeed * dt;
      if (currentBlock.x > W + 20) { currentBlock.x = W + 20; blockDir = -1; }
      if (currentBlock.x + currentBlock.w < -20) { currentBlock.x = -20 - currentBlock.w; blockDir = 1; }
    }

    if (dropAnim) {
      dropAnim.vy += 800 * dt;
      dropAnim.y += dropAnim.vy * dt;
      if (dropAnim.y > H + 100) dropAnim = null;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    var scroll = targetScrollY;
    var sy = function(y) { return y + scroll; };

    // Ground
    game.draw.rect(0, sy(GROUND_Y), W, BLOCK_H * 2, C.ground, 0.9);

    // Stack
    for (var si = 0; si < stack.length; si++) {
      var bl = stack[si];
      var by = sy(bl.y);
      if (by > H + 20 || by + BLOCK_H < -20) continue;
      game.draw.rect(bl.x + 3, by + 3, bl.w, BLOCK_H, '#000', 0.25);
      game.draw.rect(bl.x, by, bl.w, BLOCK_H, bl.col, 0.9);
      game.draw.rect(bl.x, by, bl.w, 8, '#ffffff22', 1);
    }

    // Current sliding block
    if (currentBlock) {
      var cby = sy(currentBlock.y);
      game.draw.rect(currentBlock.x + 3, cby + 3, currentBlock.w, BLOCK_H, '#000', 0.25);
      game.draw.rect(currentBlock.x, cby, currentBlock.w, BLOCK_H, currentBlock.col, 0.9);
      game.draw.rect(currentBlock.x, cby, currentBlock.w, 8, '#ffffff33', 1);
    }

    // Drop animation
    if (dropAnim) {
      var dby = sy(dropAnim.y);
      game.draw.rect(dropAnim.x, dby, dropAnim.w, BLOCK_H, dropAnim.col, 0.6);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, sy(p2.y), 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.07);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 56, color: flashCol, bold: true });
    }

    game.draw.text(level + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    // Initial platform
    stack.push({ x: (W - MAX_W) / 2, w: MAX_W, y: GROUND_Y, col: C.ground });
    spawnBlock();
  });
})(game);
