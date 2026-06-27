// 766-falling-box.js
// カラーマッチ — 落下するブロックの色が地面の色と一致した瞬間タップせよ
// 操作: タップ — ブロックが地面スロットの色と同じになった瞬間
// 成功: 30回成功  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#07080f',
    slot:    '#1e293b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0c0d16'
  };

  var COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
  var COLOR_NAMES = ['赤', 'オレンジ', '黄', '緑', '青', '紫'];

  var SLOT_COUNT = 4;
  var SLOT_W = 160;
  var SLOT_H = 160;
  var SLOT_Y = H * 0.78;
  var SLOT_GAP = (W - SLOT_W * SLOT_COUNT) / (SLOT_COUNT + 1);

  var BOX_W = 140;
  var BOX_H = 140;
  var BOX_START_Y = -BOX_H;

  var box = null;
  var waitTimer = 0;
  var WAIT_DUR = 0.4;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  // Slot colors (randomize at start)
  var slotColors = [];
  function randomizeSlots() {
    slotColors = [];
    var used = [];
    while (slotColors.length < SLOT_COUNT) {
      var ci = Math.floor(Math.random() * COLORS.length);
      if (used.indexOf(ci) < 0) {
        used.push(ci);
        slotColors.push(ci);
      }
    }
  }

  function getSlotX(i) {
    return SLOT_GAP + i * (SLOT_W + SLOT_GAP) + SLOT_W / 2;
  }

  function spawnBox() {
    // Pick target slot
    var targetSlot = Math.floor(Math.random() * SLOT_COUNT);
    var targetColorIdx = slotColors[targetSlot];
    // Pick box start slot (falling X)
    var startSlot = Math.floor(Math.random() * SLOT_COUNT);
    var boxX = getSlotX(startSlot);

    // Color sequence: box cycles through colors, one of which matches target
    // Build a color sequence including the target
    var seq = [targetColorIdx];
    var others = [];
    for (var ci = 0; ci < COLORS.length; ci++) {
      if (ci !== targetColorIdx) others.push(ci);
    }
    // Shuffle others and take 3-5
    for (var si2 = others.length - 1; si2 > 0; si2--) {
      var sj = Math.floor(Math.random() * (si2 + 1));
      var tmp = others[si2]; others[si2] = others[sj]; others[sj] = tmp;
    }
    for (var si = 0; si < Math.min(4, others.length); si++) seq.push(others[si]);
    // Shuffle sequence
    for (var si3 = seq.length - 1; si3 > 0; si3--) {
      var sj2 = Math.floor(Math.random() * (si3 + 1));
      var tmp2 = seq[si3]; seq[si3] = seq[sj2]; seq[sj2] = tmp2;
    }

    var fallSpeed = Math.min(600, 200 + score * 8);
    box = {
      x: boxX,
      y: BOX_START_Y,
      speed: fallSpeed,
      colorSeq: seq,
      colorTimer: 0,
      colorDur: Math.max(0.18, 0.32 - score * 0.003),
      colorIdx: 0,
      targetSlot: targetSlot,
      targetColorIdx: targetColorIdx,
      scored: false
    };
  }

  game.onTap(function(tx, ty) {
    if (done || !box || box.scored || waitTimer > 0) return;
    var currentColorIdx = box.colorSeq[box.colorIdx % box.colorSeq.length];
    var isMatch = currentColorIdx === box.targetColorIdx;

    box.scored = true;
    if (isMatch) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.2;
      resultText = COLOR_NAMES[currentColorIdx] + 'でマッチ！';
      resultTimer = 0.38;
      game.audio.play('se_success', 0.6);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({
          x: box.x, y: box.y,
          vx: Math.cos(pa) * (100 + Math.random() * 150),
          vy: Math.sin(pa) * (100 + Math.random() * 150),
          life: 0.4, col: COLORS[currentColorIdx]
        });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 350 + Math.ceil(timeLeft) * 100); }, 700);
        return;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '色が違う！';
      resultTimer = 0.42;
      game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    box = null;
    waitTimer = WAIT_DUR;
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) spawnBox();
    }

    if (box) {
      box.y += box.speed * dt;
      box.colorTimer += dt;
      if (box.colorTimer >= box.colorDur) {
        box.colorTimer -= box.colorDur;
        box.colorIdx++;
      }

      // Box passed bottom — miss
      if (box.y > SLOT_Y + SLOT_H + 20 && !box.scored) {
        errors++;
        box.scored = true;
        box = null;
        flashCol = C.wrong;
        flashAnim = 0.28;
        resultText = '逃がした！';
        resultTimer = 0.38;
        game.audio.play('se_failure', 0.22);
        waitTimer = WAIT_DUR;
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 350 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Slots (ground)
    for (var si = 0; si < SLOT_COUNT; si++) {
      var sx = getSlotX(si) - SLOT_W / 2;
      var sy = SLOT_Y;
      game.draw.rect(sx - 4, sy - 4, SLOT_W + 8, SLOT_H + 8, '#000', 0.4);
      game.draw.rect(sx, sy, SLOT_W, SLOT_H, COLORS[slotColors[si]], 0.9);
      game.draw.rect(sx, sy, SLOT_W, 12, '#fff', 0.2);
      game.draw.text(COLOR_NAMES[slotColors[si]], getSlotX(si), sy + SLOT_H / 2 + 8, { size: 36, color: '#fff', bold: true });
    }

    // Slot highlight (target slot when box exists)
    if (box) {
      var tsx = getSlotX(box.targetSlot);
      // Pulsing ring around target slot
      var pulse = 0.6 + 0.4 * Math.sin(elapsed * 5);
      game.draw.rect(tsx - SLOT_W / 2 - 6, SLOT_Y - 6, SLOT_W + 12, SLOT_H + 12, COLORS[box.targetColorIdx], pulse * 0.4);
    }

    // Falling box
    if (box) {
      var currColor = COLORS[box.colorSeq[box.colorIdx % box.colorSeq.length]];
      var isMatch2 = box.colorSeq[box.colorIdx % box.colorSeq.length] === box.targetColorIdx;
      game.draw.rect(box.x - BOX_W / 2 + 4, box.y + 4, BOX_W, BOX_H, '#000', 0.25);
      game.draw.rect(box.x - BOX_W / 2, box.y, BOX_W, BOX_H, currColor, 0.92);
      game.draw.rect(box.x - BOX_W / 2, box.y, BOX_W, 14, '#fff', 0.2);
      if (isMatch2) {
        // Match indicator
        game.draw.rect(box.x - BOX_W / 2 - 8, box.y - 8, BOX_W + 16, BOX_H + 16, currColor, 0.25 + 0.15 * Math.sin(elapsed * 10));
        game.draw.text('✓', box.x, box.y + BOX_H / 2 + 8, { size: 56, color: '#fff', bold: true });
      }
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    // Guide
    if (!done && !box) {
      game.draw.text('色が一致したらタップ！', W / 2, H * 0.22, { size: 38, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.22, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    randomizeSlots();
    spawnBox();
  });
})(game);
