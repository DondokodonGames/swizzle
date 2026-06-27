// 658-wobble-stack.js
// ゆらゆら積み — 揺れるブロックをタワーの真上でドロップせよ
// 操作: タップでブロックを落とす
// 成功: 12個積む  失敗: 3回外す or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050a14',
    tower:   '#1d4ed8',
    towerHi: '#93c5fd',
    block:   '#f59e0b',
    blockHi: '#fde68a',
    zone:    '#22c55e',
    zoneHi:  '#86efac',
    rope:    '#94a3b8',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#020610'
  };

  var BLOCK_H = 72;
  var BLOCK_W = 240;
  var CENTER_X = W / 2;
  var GROUND_Y = H * 0.84;
  var DROPPER_Y = H * 0.19;

  var dropperX = CENTER_X;
  var dropTime = 0;
  var SWING_AMP = 400;

  var allowedHW = 200;
  var MIN_HW = 72;

  var stacked = 0;
  var NEEDED = 12;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.zone;
  var resultTimer = 0, resultText = '';

  game.onTap(function(tx, ty) {
    if (done) return;
    var offset = Math.abs(dropperX - CENTER_X);
    if (offset <= allowedHW) {
      stacked++;
      allowedHW = Math.max(MIN_HW, allowedHW - 10);

      var label = offset < 40 ? 'パーフェクト！' : 'ナイス！';
      flashCol = C.zone;
      flashAnim = 0.35;
      resultText = label;
      resultTimer = 0.55;
      game.audio.play('se_success', 0.6);

      var hitY = GROUND_Y - stacked * BLOCK_H + BLOCK_H / 2;
      for (var p = 0; p < 7; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CENTER_X, y: hitY, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.45, col: C.blockHi });
      }

      if (stacked >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(stacked * 500 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = '外れ！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.35);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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
    if (resultTimer > 0) resultTimer -= dt;

    if (!done) {
      dropTime += dt;
      var freq = 1.5 + elapsed * 0.012;
      dropperX = CENTER_X + Math.sin(dropTime * freq) * SWING_AMP;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.5, '#00070f', 0.5);

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.tower, 0.3);
    game.draw.rect(0, GROUND_Y, W, 8, C.towerHi, 0.5);

    // Tower blocks
    for (var ti = 0; ti < stacked; ti++) {
      var blockTop = GROUND_Y - (ti + 1) * BLOCK_H;
      game.draw.rect(CENTER_X - BLOCK_W / 2 + 4, blockTop + 4, BLOCK_W, BLOCK_H, '#000', 0.3);
      game.draw.rect(CENTER_X - BLOCK_W / 2, blockTop, BLOCK_W, BLOCK_H, C.tower, 0.9);
      game.draw.rect(CENTER_X - BLOCK_W / 2, blockTop, BLOCK_W, 12, C.towerHi, 0.6);
    }

    // Zone indicator at top of tower
    var zoneTop = GROUND_Y - stacked * BLOCK_H - BLOCK_H;
    game.draw.rect(CENTER_X - allowedHW, zoneTop, allowedHW * 2, BLOCK_H, C.zone, 0.1);
    game.draw.rect(CENTER_X - allowedHW, zoneTop + BLOCK_H - 4, allowedHW * 2, 4, C.zoneHi, 0.5);

    // Rope
    game.draw.line(CENTER_X, H * 0.09, dropperX, DROPPER_Y - BLOCK_H / 2, C.rope, 3);

    // Dropper block
    game.draw.rect(dropperX - BLOCK_W / 2 + 4, DROPPER_Y - BLOCK_H / 2 + 4, BLOCK_W, BLOCK_H, '#000', 0.35);
    game.draw.rect(dropperX - BLOCK_W / 2, DROPPER_Y - BLOCK_H / 2, BLOCK_W, BLOCK_H, C.block, 0.92);
    game.draw.rect(dropperX - BLOCK_W / 2, DROPPER_Y - BLOCK_H / 2, BLOCK_W, 14, C.blockHi, 0.6);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.73, { size: 68, color: flashCol, bold: true });
    }
    game.draw.text('TAP!', W / 2, H * 0.78, { size: 42, color: '#ffffff33' });

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 80 + mi * 160, H * 0.955, 28, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(stacked + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.towerHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
  });
})(game);
