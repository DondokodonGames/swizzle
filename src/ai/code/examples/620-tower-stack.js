// 620-tower-stack.js
// タワースタック — 揺れるブロックをタイミングよく積み上げろ
// 操作: タップで落とす、はみ出た部分は切り落とされる
// 成功: 15段  失敗: ブロックが消滅 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030810',
    b1:     '#3b82f6',
    b2:     '#8b5cf6',
    b3:     '#ec4899',
    b4:     '#f59e0b',
    b5:     '#22c55e',
    shadow: '#00000040',
    hit:    '#22c55e',
    miss:   '#ef4444',
    text:   '#f1f5f9',
    ui:     '#0a1020',
    perfect:'#fbbf24'
  };

  var BLOCK_COLORS = [C.b1, C.b2, C.b3, C.b4, C.b5];
  var INITIAL_W = 500;
  var BLOCK_H = 60;
  var BASE_Y = H * 0.9;

  var stack = []; // { x, y, w, col }
  var currentBlock = null;
  var swingDir = 1;
  var swingX = W / 2;
  var swingSpeed = 280;
  var level = 0;
  var NEEDED = 15;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.hit;
  var resultText = '';
  var resultTimer = 0;
  var dropped = false;
  var cameraOffY = 0; // camera shift as tower grows

  function newBlock() {
    var w = stack.length > 0 ? stack[stack.length - 1].w : INITIAL_W;
    var y = BASE_Y - (stack.length + 1) * BLOCK_H + cameraOffY;
    var col = BLOCK_COLORS[stack.length % BLOCK_COLORS.length];
    currentBlock = { x: W / 2, y: y, w: w, col: col };
    swingX = -currentBlock.w / 2;
    swingDir = 1;
    dropped = false;
    // Increase speed slightly
    swingSpeed = 280 + level * 12;
  }

  game.onTap(function(tx, ty) {
    if (done || dropped) return;
    if (!currentBlock) return;
    dropped = true;

    // Find overlap with top of stack
    var top = stack.length > 0 ? stack[stack.length - 1] : { x: W / 2, w: INITIAL_W };
    var topLeft = top.x - top.w / 2;
    var topRight = top.x + top.w / 2;
    var curLeft = currentBlock.x - currentBlock.w / 2;
    var curRight = currentBlock.x + currentBlock.w / 2;

    var overlapLeft = Math.max(topLeft, curLeft);
    var overlapRight = Math.min(topRight, curRight);
    var overlapW = overlapRight - overlapLeft;

    if (overlapW <= 0) {
      // Completely missed
      resultText = '落下!';
      resultTimer = 0.8;
      flashCol = C.miss;
      flashAnim = 0.35;
      game.audio.play('se_failure', 0.5);
      for (var p = 0; p < 8; p++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: currentBlock.x, y: currentBlock.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: currentBlock.col });
      }
      currentBlock = null;
      // Game over on miss
      done = true;
      setTimeout(function() { game.end.failure(); }, 700);
      return;
    }

    // Perfect check
    var isPerfect = Math.abs(overlapW - top.w) < 8;
    var newW = isPerfect ? top.w : overlapW;
    var newX = (overlapLeft + overlapRight) / 2;

    // Add to stack
    stack.push({ x: newX, y: currentBlock.y, w: newW, col: currentBlock.col });
    level++;

    // Particles for cut pieces
    if (!isPerfect) {
      // Left cut
      if (curLeft < topLeft) {
        var cx = (curLeft + topLeft) / 2;
        for (var p2 = 0; p2 < 4; p2++) {
          var a2 = Math.random() * Math.PI * 2;
          particles.push({ x: cx, y: currentBlock.y, vx: Math.cos(a2) * 180, vy: Math.sin(a2) * 180 + 200, life: 0.4, col: currentBlock.col });
        }
      }
      // Right cut
      if (curRight > topRight) {
        var cx2 = (curRight + topRight) / 2;
        for (var p3 = 0; p3 < 4; p3++) {
          var a3 = Math.random() * Math.PI * 2;
          particles.push({ x: cx2, y: currentBlock.y, vx: Math.cos(a3) * 180, vy: Math.sin(a3) * 180 + 200, life: 0.4, col: currentBlock.col });
        }
      }
    }

    if (isPerfect) {
      resultText = 'パーフェクト!';
      flashCol = C.perfect;
    } else {
      resultText = '+' + Math.round(overlapW) + 'px';
      flashCol = C.hit;
    }
    resultTimer = 0.6;
    flashAnim = 0.25;
    game.audio.play('se_success', isPerfect ? 0.8 : 0.5);

    // Camera pan up as tower grows
    if (level > 5) {
      cameraOffY = (level - 5) * BLOCK_H;
    }

    if (level >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(level * 400 + Math.ceil(timeLeft) * 100); }, 800);
      return;
    }

    // Next block
    setTimeout(function() { if (!done) newBlock(); }, 400);
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

    // Swing current block
    if (currentBlock && !dropped) {
      swingX += swingDir * swingSpeed * dt;
      currentBlock.x = W / 2 + swingX;
      var limit = W / 2 + currentBlock.w / 2 + 60;
      if (swingX > limit) { swingX = limit; swingDir = -1; }
      if (swingX < -limit) { swingX = -limit; swingDir = 1; }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 500 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stack
    for (var si = 0; si < stack.length; si++) {
      var s = stack[si];
      var sy = s.y + cameraOffY * 0;
      // Stack Y is fixed, camera moves by offsetting all Y values
      var drawY = s.y + (cameraOffY > 0 ? -(cameraOffY - (level > 5 ? (level - 5) * BLOCK_H : 0)) : 0);
      // simpler: just use relative position from base
      var absY = BASE_Y - (si + 1) * BLOCK_H + (level > 5 ? (level - 5) * BLOCK_H : 0);
      game.draw.rect(s.x - s.w / 2 + 4, absY + 4, s.w - 8, BLOCK_H - 2, '#000', 0.25);
      game.draw.rect(s.x - s.w / 2, absY, s.w, BLOCK_H - 2, s.col, 0.9);
      game.draw.rect(s.x - s.w / 2, absY, s.w, 10, s.col, 0.4);
      // Shine
      game.draw.rect(s.x - s.w / 2 + 8, absY + 8, s.w * 0.3, 6, '#fff', 0.25);
    }

    // Current block
    if (currentBlock) {
      var cbY = BASE_Y - (stack.length + 1) * BLOCK_H + (level > 5 ? (level - 5) * BLOCK_H : 0);
      game.draw.rect(currentBlock.x - currentBlock.w / 2 + 4, cbY + 4, currentBlock.w - 8, BLOCK_H - 2, '#000', 0.25);
      game.draw.rect(currentBlock.x - currentBlock.w / 2, cbY, currentBlock.w, BLOCK_H - 2, currentBlock.col, 0.9);
      game.draw.rect(currentBlock.x - currentBlock.w / 2, cbY, currentBlock.w, 10, currentBlock.col, 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) game.draw.text(resultText, W / 2, H * 0.88, { size: 56, color: flashCol, bold: true });

    game.draw.text(level + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.b1 : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    // Base block
    stack.push({ x: W / 2, y: BASE_Y - BLOCK_H, w: INITIAL_W, col: C.b1 });
    newBlock();
  });
})(game);
