// 766-falling-box.js
// カラーマッチ — 落下するブロックの色が、狙いのスロットの色と一致した瞬間タップせよ
// 操作: タップ — ブロックがターゲットスロットの色と同じになった瞬間
// 成功: 12回 マッチ  失敗: 3回 ミス or 26秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、色は保持） ──
  var C = { bg:'#07080f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = ['#ff3355', '#ff8800', '#ffe600', '#00ff41', '#00cfff', '#c04dff'];
  var COLOR_NAMES = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR MATCH';
  var HOW_TO_PLAY = 'TAP THE MOMENT THE FALLING BLOCK MATCHES THE TARGET SLOT COLOR';
  var MAX_TIME = 26;
  var NEEDED   = 12;         // 修正2: 30 → 12
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var SLOT_COUNT = 4;
  var SLOT_W = 176, SLOT_H = 176, SLOT_Y = snap(H * 0.76);
  var SLOT_GAP = (W - SLOT_W * SLOT_COUNT) / (SLOT_COUNT + 1);
  var BOX_W = 152, BOX_H = 152, BOX_START_Y = -BOX_H;
  var WAIT_DUR = 0.4;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var box, slotColors, waitTimer, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0c0d16');
  }

  function background() { game.draw.clear(C.bg); }

  function getSlotX(i) { return SLOT_GAP + i * (SLOT_W + SLOT_GAP) + SLOT_W / 2; }

  function randomizeSlots() {
    slotColors = []; var used = [];
    while (slotColors.length < SLOT_COUNT) { var ci = Math.floor(Math.random() * COLORS.length); if (used.indexOf(ci) < 0) { used.push(ci); slotColors.push(ci); } }
  }

  function spawnBox() {
    var targetSlot = Math.floor(Math.random() * SLOT_COUNT), targetColorIdx = slotColors[targetSlot], startSlot = Math.floor(Math.random() * SLOT_COUNT), boxX = getSlotX(startSlot);
    var seq = [targetColorIdx], others = [];
    for (var ci = 0; ci < COLORS.length; ci++) if (ci !== targetColorIdx) others.push(ci);
    for (var si2 = others.length - 1; si2 > 0; si2--) { var sj = Math.floor(Math.random() * (si2 + 1)), tmp = others[si2]; others[si2] = others[sj]; others[sj] = tmp; }
    for (var si = 0; si < Math.min(4, others.length); si++) seq.push(others[si]);
    for (var si3 = seq.length - 1; si3 > 0; si3--) { var sj2 = Math.floor(Math.random() * (si3 + 1)), tmp2 = seq[si3]; seq[si3] = seq[sj2]; seq[sj2] = tmp2; }
    var fallSpeed = Math.min(560, 200 + score * 10);
    box = { x: snap(boxX), y: BOX_START_Y, speed: fallSpeed, colorSeq: seq, colorTimer: 0, colorDur: Math.max(0.20, 0.34 - score * 0.006), colorIdx: 0, targetSlot: targetSlot, targetColorIdx: targetColorIdx, scored: false };
  }

  function initGame() {
    score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0;
    randomizeSlots(); spawnBox();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 450 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var si = 0; si < SLOT_COUNT; si++) {
      var sx = getSlotX(si) - SLOT_W / 2, sy = SLOT_Y;
      game.draw.rect(sx - 6, sy - 6, SLOT_W + 12, SLOT_H + 12, '#000000', 0.5);
      game.draw.rect(sx, sy, SLOT_W, SLOT_H, COLORS[slotColors[si]], 0.9);
      game.draw.rect(sx, sy, SLOT_W, 12, C.g, 0.2);
      txt(COLOR_NAMES[slotColors[si]], getSlotX(si), sy + SLOT_H / 2 + 8, 30, C.g);
    }
    if (box) {
      var tsx = getSlotX(box.targetSlot), pulse = 0.5 + 0.4 * Math.sin(elapsed * 6);
      game.draw.rect(tsx - SLOT_W / 2 - 8, SLOT_Y - 8, SLOT_W + 16, SLOT_H + 16, COLORS[box.targetColorIdx], pulse * 0.45);
      var idx = box.colorSeq[box.colorIdx % box.colorSeq.length], currColor = COLORS[idx], isMatch = idx === box.targetColorIdx;
      game.draw.rect(snap(box.x - BOX_W / 2) + 6, snap(box.y) + 6, BOX_W, BOX_H, '#000000', 0.35);
      game.draw.rect(snap(box.x - BOX_W / 2), snap(box.y), BOX_W, BOX_H, currColor, 0.92);
      game.draw.rect(snap(box.x - BOX_W / 2), snap(box.y), BOX_W, 14, C.g, 0.2);
      if (isMatch) { game.draw.rect(snap(box.x - BOX_W / 2) - 8, snap(box.y) - 8, BOX_W + 16, BOX_H + 16, currColor, 0.25 + 0.15 * Math.sin(elapsed * 10)); txt('!', box.x, box.y + BOX_H / 2 + 8, 60, C.g); }
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !box || box.scored || waitTimer > 0) return;
    var currentColorIdx = box.colorSeq[box.colorIdx % box.colorSeq.length], isMatch = currentColorIdx === box.targetColorIdx;
    box.scored = true;
    if (isMatch) {
      score++; flash = 0.2; flashCol = C.b; resultText = COLOR_NAMES[currentColorIdx] + ' MATCH!'; resultTimer = 0.38; game.audio.play('se_success', 0.6);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: box.x, y: box.y + BOX_H / 2, vx: Math.cos(pa) * (100 + Math.random() * 150), vy: Math.sin(pa) * (100 + Math.random() * 150), life: 0.4, col: COLORS[currentColorIdx] }); }
      box = null; waitTimer = WAIT_DUR;
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG COLOR!'; resultTimer = 0.42; game.audio.play('se_failure', 0.28);
      box = null; waitTimer = WAIT_DUR;
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!slotColors) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.40, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'COLOR MASTER!' : 'MISMATCH', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) spawnBox(); }
      if (box) {
        box.y += box.speed * dt; box.colorTimer += dt;
        if (box.colorTimer >= box.colorDur) { box.colorTimer -= box.colorDur; box.colorIdx++; }
        if (box.y > SLOT_Y + SLOT_H + 20 && !box.scored) {
          errors++; box.scored = true; box = null; flash = 0.28; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.38; game.audio.play('se_failure', 0.22); waitTimer = WAIT_DUR;
          if (errors >= MAX_ERR) { finish(false); return; }
        }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 350 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 6, snap(p2.y) - 6, 12, 12, p2.col, p2.life * 2.2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.30), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0c0d16');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
