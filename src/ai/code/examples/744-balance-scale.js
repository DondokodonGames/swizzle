// 744-balance-scale.js
// バランススケール — 左右の皿に重りが降る。重い側をタップして下ろし、天秤を保つ
// 操作: 画面左タップで左皿の重りを1個下ろす、右タップで右皿を下ろす。傾きすぎ注意
// 成功: 18秒 バランス維持  失敗: 3回 傾きすぎ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、天秤） ──
  var C = { bg:'#0f0c04', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BEAM = '#ff6600', BEAM_HI = '#ffe600', PLATE = '#a16207', WEIGHT = '#64748b', WEIGHT_HI = '#94a3b8';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALANCE SCALE';
  var HOW_TO_PLAY = 'TAP THE HEAVIER SIDE TO REMOVE A WEIGHT · KEEP THE BEAM LEVEL';
  var MAX_TIME = 18;
  var TARGET_TIME = 18;      // 修正2: 90 → 18
  var MAX_CRASH = 3;
  var CX = W / 2, PIVOT_Y = snap(H * 0.38), ARM_LEN = 300, PLATE_W = 180, TILT_MAX = 0.38;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tilt, tiltVel, leftWeight, rightWeight, dropRate, dropTimer, weights, survived, crashes, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil((TARGET_TIME - survived) / TARGET_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1c1400');
  }

  function background() { game.draw.clear(C.bg); }

  function dropWeight() { var side = Math.random() < 0.5 ? -1 : 1; weights.push({ x: CX + side * (100 + Math.random() * 180), y: PIVOT_Y - 200, side: side, vy: 0, r: 18 + Math.random() * 14 }); }

  function initGame() { tilt = 0; tiltVel = 0; leftWeight = 0; rightWeight = 0; dropRate = 0.9; dropTimer = dropRate; weights = []; survived = 0; crashes = 0; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; dropWeight(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(survived) * 200 + (MAX_CRASH - crashes) * 2000) : Math.floor(survived) * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(CX - 12, PIVOT_Y, 24, H * 0.45, BEAM, 0.9); pc(CX, PIVOT_Y, 18, BEAM_HI, 0.9);
    var lx = CX - Math.cos(tilt) * ARM_LEN, ly = PIVOT_Y - Math.sin(tilt) * ARM_LEN, rx = CX + Math.cos(tilt) * ARM_LEN, ry = PIVOT_Y + Math.sin(tilt) * ARM_LEN;
    game.draw.line(lx, ly, rx, ry, BEAM, 14); game.draw.line(lx, ly, rx, ry, BEAM_HI, 4);
    var lPlateY = ly + 60, rPlateY = ry + 60;
    game.draw.line(lx, ly, lx, lPlateY, BEAM_HI, 4); game.draw.line(rx, ry, rx, rPlateY, BEAM_HI, 4);
    game.draw.rect(lx - PLATE_W / 2, lPlateY, PLATE_W, 16, PLATE, 0.9); game.draw.rect(rx - PLATE_W / 2, rPlateY, PLATE_W, 16, PLATE, 0.9);
    for (var si = 0; si < leftWeight; si++) { var wy = lPlateY - si * 22 - 12; game.draw.rect(snap(lx - 30), wy - 18, 60, 20, WEIGHT, 0.85); game.draw.rect(snap(lx - 30), wy - 18, 60, 6, WEIGHT_HI, 0.4); }
    for (var si2 = 0; si2 < rightWeight; si2++) { var wy2 = rPlateY - si2 * 22 - 12; game.draw.rect(snap(rx - 30), wy2 - 18, 60, 20, WEIGHT, 0.85); game.draw.rect(snap(rx - 30), wy2 - 18, 60, 6, WEIGHT_HI, 0.4); }
    for (var wi2 = 0; wi2 < weights.length; wi2++) { var w2 = weights[wi2]; pc(w2.x, w2.y, w2.r, WEIGHT, 0.9); }
    var tiltPct = Math.abs(tilt) / TILT_MAX, tiltCol = tiltPct > 0.75 ? C.a : (tiltPct > 0.45 ? C.f : C.b);
    txt(tilt > 0.04 ? 'RIGHT HEAVY - TAP RIGHT' : (tilt < -0.04 ? 'LEFT HEAVY - TAP LEFT' : 'BALANCED!'), W / 2, snap(H * 0.83), 34, tiltCol);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var side = tx < W / 2 ? -1 : 1;
    if (side === -1 && leftWeight > 0) { leftWeight = Math.max(0, leftWeight - 1); game.audio.play('se_tap', 0.08); for (var p = 0; p < 4; p++) { var pa = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: CX - ARM_LEN * 0.85, y: PIVOT_Y + ARM_LEN * Math.sin(tilt) + 60, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.35, col: WEIGHT }); } }
    else if (side === 1 && rightWeight > 0) { rightWeight = Math.max(0, rightWeight - 1); game.audio.play('se_tap', 0.08); for (var p2 = 0; p2 < 4; p2++) { var pa2 = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: CX + ARM_LEN * 0.85, y: PIVOT_Y - ARM_LEN * Math.sin(tilt) + 60, vx: Math.cos(pa2) * 120, vy: Math.sin(pa2) * 120, life: 0.35, col: WEIGHT }); } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tilt === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT BALANCE!' : 'TIPPED OVER', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      elapsed += dt; survived += dt;
      dropRate = Math.max(0.5, 0.9 - Math.floor(survived / 5) * 0.1);
      if (survived >= TARGET_TIME) { finish(true); return; }
      dropTimer -= dt; if (dropTimer <= 0) { dropTimer = dropRate; dropWeight(); }
      for (var wi = weights.length - 1; wi >= 0; wi--) { var w = weights[wi]; w.vy += 800 * dt; w.y += w.vy * dt; var plateY = PIVOT_Y + w.side * ARM_LEN * Math.sin(tilt) + 60; if (w.y >= plateY - w.r) { if (w.side === -1) leftWeight++; else rightWeight++; weights.splice(wi, 1); } }
      var torque = (rightWeight - leftWeight) * 0.4;
      tiltVel += (torque - tilt * 2 - tiltVel * 1.5) * dt * 3; tilt += tiltVel * dt; tilt = Math.max(-TILT_MAX - 0.1, Math.min(TILT_MAX + 0.1, tilt));
      if (Math.abs(tilt) > TILT_MAX) {
        crashes++; flash = 0.5; flashCol = C.a; resultText = 'TOO TILTED!'; resultTimer = 0.7; game.audio.play('se_failure', 0.5);
        tilt = 0; tiltVel = 0; leftWeight = 0; rightWeight = 0; weights = [];
        if (crashes >= MAX_CRASH) { finish(false); return; }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 52, flashCol);

    timeBar();
    txt(Math.ceil(TARGET_TIME - survived) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(survived) + ' / ' + TARGET_TIME + 's', W / 2, 168, 48, C.b);
    for (var ci = 0; ci < MAX_CRASH; ci++) game.draw.rect(snap(W / 2 + (ci - (MAX_CRASH - 1) / 2) * 56) - 10, 224, 20, 20, ci < crashes ? C.a : '#1c1400');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
