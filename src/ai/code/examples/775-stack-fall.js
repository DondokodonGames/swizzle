// 775-stack-fall.js
// スタックフォール — 振り子のように揺れるブロックを積み重ねろ
// 操作: タップでブロックを落とす（下のブロックに重なった部分だけが残る）
// 成功: 高さ20段達成  失敗: 3回ブロックが全部外れる or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#05080f',
    block:   ['#818cf8','#f97316','#22c55e','#f472b6','#fbbf24','#38bdf8'],
    blockHi: '#ffffff',
    shadow:  '#000000',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080c14',
    danger:  '#ef4444'
  };

  var BLOCK_H = 52;
  var BASE_W = 320;
  var BASE_X = W / 2;
  var BASE_Y = H - 140;

  var stack = []; // { x, w, colorIdx }
  var swingBlock = null;
  var swingAngle = 0;
  var swingSpeed = 1.4;
  var SWING_R = W * 0.55;

  var score = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var camOffset = 0; // scroll camera as tower grows

  function spawnSwing() {
    var topBlock = stack[stack.length - 1] || { x: BASE_X, w: BASE_W };
    var newW = topBlock.w;
    var colorIdx = stack.length % C.block.length;
    swingBlock = {
      w: newW,
      colorIdx: colorIdx,
      angle: -Math.PI * 0.55
    };
    swingAngle = -Math.PI * 0.55;
    swingSpeed = Math.min(2.8, 1.4 + score * 0.06);
  }

  function getSwingX() {
    return W / 2 + Math.sin(swingAngle) * SWING_R;
  }

  function getTopStackY() {
    return BASE_Y - stack.length * BLOCK_H;
  }

  game.onTap(function(tx, ty) {
    if (done || !swingBlock) return;
    var dropX = getSwingX();
    var topBlock = stack[stack.length - 1] || { x: BASE_X, w: BASE_W };
    var topLeft = topBlock.x - topBlock.w / 2;
    var topRight = topBlock.x + topBlock.w / 2;
    var dropLeft = dropX - swingBlock.w / 2;
    var dropRight = dropX + swingBlock.w / 2;

    // Intersection
    var overlapLeft = Math.max(topLeft, dropLeft);
    var overlapRight = Math.min(topRight, dropRight);
    var overlap = overlapRight - overlapLeft;

    if (overlap <= 0) {
      // Miss
      misses++;
      swingBlock = null;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = '外れた！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.35);
      // Particles
      for (var p = 0; p < 5; p++) {
        var pa = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        particles.push({ x: dropX, y: getTopStackY(), vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 120, life: 0.4, col: C.block[swingBlock ? swingBlock.colorIdx : 0] });
      }
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        setTimeout(function() { if (!done) spawnSwing(); }, 500);
      }
    } else {
      // Landed!
      var newX = (overlapLeft + overlapRight) / 2;
      var newW = overlap;
      var colorIdx = swingBlock.colorIdx;
      stack.push({ x: newX, w: newW, colorIdx: colorIdx });
      swingBlock = null;
      score++;

      // Perfect bonus
      var isPerfect = Math.abs(overlap - topBlock.w) < 8;
      if (isPerfect) {
        // Restore width
        stack[stack.length - 1].w = topBlock.w;
        stack[stack.length - 1].x = topBlock.x;
        flashCol = C.correct;
        flashAnim = 0.28;
        resultText = 'パーフェクト！';
        resultTimer = 0.4;
        game.audio.play('se_success', 0.7);
      } else {
        game.audio.play('se_tap', 0.1);
        resultText = Math.round(overlap) + 'px 重複';
        resultTimer = 0.28;
        flashCol = C.correct;
        flashAnim = 0.15;
      }

      // Cut-off chunk falls
      for (var p2 = 0; p2 < 4; p2++) {
        var offX = (dropLeft < topLeft) ? dropLeft + (topLeft - dropLeft) / 2 : topRight + (dropRight - topRight) / 2;
        var pa2 = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        particles.push({ x: offX, y: getTopStackY(), vx: (Math.random() - 0.5) * 100, vy: -50, life: 0.5, col: C.block[colorIdx] });
      }

      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 120); }, 700);
        return;
      }
      spawnSwing();
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

    // Pendulum
    if (swingBlock) {
      swingAngle += swingSpeed * dt;
      if (swingAngle > Math.PI * 0.55 || swingAngle < -Math.PI * 0.55) {
        swingSpeed *= -1;
        swingAngle = Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, swingAngle));
      }
    }

    // Camera follows tower
    var topY = BASE_Y - stack.length * BLOCK_H;
    var targetCam = Math.min(0, H * 0.4 - topY);
    camOffset += (targetCam - camOffset) * dt * 4;

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 600 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stack blocks (with camera offset)
    for (var si = 0; si < stack.length; si++) {
      var bl = stack[si];
      var bx = bl.x;
      var by = BASE_Y - si * BLOCK_H + camOffset;
      if (by > H + BLOCK_H || by < -BLOCK_H * 2) continue;
      var col = C.block[bl.colorIdx];
      game.draw.rect(bx - bl.w / 2 + 3, by + 3, bl.w, BLOCK_H, '#000', 0.2);
      game.draw.rect(bx - bl.w / 2, by, bl.w, BLOCK_H, col, 0.88);
      game.draw.rect(bx - bl.w / 2, by, bl.w, 10, C.blockHi, 0.15);
    }

    // Ground platform
    game.draw.rect(BASE_X - BASE_W / 2 - 20, BASE_Y + camOffset, BASE_W + 40, BLOCK_H + 20, '#334155', 0.9);
    game.draw.rect(BASE_X - BASE_W / 2 - 20, BASE_Y + camOffset, BASE_W + 40, 8, '#94a3b8', 0.4);

    // Swinging block
    if (swingBlock) {
      var sx = getSwingX();
      var sy = getTopStackY() - BLOCK_H * 0.5 + camOffset;
      var col2 = C.block[swingBlock.colorIdx];
      // Swing arm
      game.draw.line(W / 2, -40, sx, sy - BLOCK_H / 2, '#334155', 4);
      // Block shadow
      game.draw.rect(sx - swingBlock.w / 2 + 3, sy + 3, swingBlock.w, BLOCK_H, '#000', 0.2);
      game.draw.rect(sx - swingBlock.w / 2, sy, swingBlock.w, BLOCK_H, col2, 0.9);
      game.draw.rect(sx - swingBlock.w / 2, sy, swingBlock.w, 10, C.blockHi, 0.2);
      // Drop guide
      game.draw.line(sx, sy + BLOCK_H, sx, sy + BLOCK_H + 30, col2, 3);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y + camOffset, 9 * p3.life, p3.col, p3.life);
    }

    if (!done && swingBlock) {
      game.draw.text('タップ！', W / 2, H * 0.88, { size: 48, color: C.text + '55', bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.15, { size: 50, color: flashCol, bold: true });
    }

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 64 + mi * 128, H * 0.955, 24, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    stack.push({ x: BASE_X, w: BASE_W, colorIdx: 0 });
    spawnSwing();
  });
})(game);
