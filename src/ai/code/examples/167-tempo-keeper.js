// 167-tempo-keeper.js
// テンポキーパー — メトロノームのテンポを感じて正確に再現する音楽感覚ゲーム
// 操作: タップでビートを刻む
// 成功: 1回ジャスト判定  失敗: 外れが5回 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、音楽室） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TEMPO KEEPER';
  var HOW_TO_PLAY = 'TAP ON THE BEAT AT EACH SWING END';
  var MAX_TIME = 15;             // 修正2: 35 → 15
  var NEEDED   = 1;              // 修正2: 8 → 1
  var MAX_MISS = 5;
  var BPM = 80, BEAT = 60 / 80;
  var GOOD_WINDOW = 0.18;        // 修正2: 判定甘め
  var GUIDE_BEATS = 2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var metroTimer, metroAngle, metroDir, beatFlash, expectedBeat, firstTap;
  var streak, misses, timeLeft, done, feedback, feedbackKind, rings, guidePhase, guideBeat;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function pl(x1, y1, x2, y2, color, w) {
    var steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
    for (var i = 0; i <= steps; i++) { var t = i / steps; game.draw.rect(snap(x1 + (x2 - x1) * t) - w / 2, snap(y1 + (y2 - y1) * t) - w / 2, w, w, color, 1); }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawMetronome() {
    var mcx = W / 2, base = H * 0.68, top = H * 0.26;
    game.draw.rect(mcx - 160, base - 40, 320, 48, C.d, 0.9);
    game.draw.rect(mcx - 140, top, 280, base - top - 40, C.d, 0.7);
    game.draw.rect(mcx - 140, top, 280, 12, C.a);
    var bobX = mcx + Math.sin(metroAngle) * 150, bobY = base - 220;
    pl(mcx, base - 40, bobX, top + 30, C.g, 8);
    pc(bobX, bobY, 28, C.c, 1);
    if (beatFlash > 0) pc(mcx + (metroAngle > 0 ? 200 : -200), top + 40, 36, C.e, beatFlash * 3);
    txt(BPM + ' BPM', mcx, top - 40, 44, C.b);
  }

  function initGame() {
    metroTimer = 0; metroAngle = 0; metroDir = 1; beatFlash = 0;
    expectedBeat = 0; firstTap = false;
    streak = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackKind = 0;
    rings = []; guidePhase = true; guideBeat = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (200 + streak * 100 + Math.ceil(timeLeft) * 30) : streak * 60;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || guidePhase) return;
    var now = metroTimer;
    if (!firstTap) { firstTap = true; expectedBeat = now + BEAT; feedbackKind = 1; feedback = 0.4; game.audio.play('se_tap', 0.8); rings.push({ r: 0, life: 0.5, kind: 1 }); return; }
    var diff = Math.abs(now - expectedBeat);
    if (diff < GOOD_WINDOW) { feedbackKind = 2; feedback = 0.5; streak++; game.audio.play('se_success', 1.0); }
    else { feedbackKind = 0; feedback = 0.5; streak = 0; misses++; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } }
    rings.push({ r: 0, life: 0.5, kind: feedbackKind });
    expectedBeat = now + BEAT;
    if (streak >= NEEDED) { finish(true); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      metroAngle += 2.8 * metroDir * dt; if (Math.abs(metroAngle) >= 0.7) { metroDir *= -1; metroAngle = 0.7 * metroDir; }
      drawMetronome();
      txt(GAME_TITLE, W / 2, H * 0.12, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.82, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN TEMPO!' : 'OFF BEAT', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      metroTimer += dt;
      metroAngle += 2.8 * metroDir * dt;
      if (Math.abs(metroAngle) >= 0.7) {
        metroDir *= -1; metroAngle = 0.7 * metroDir; beatFlash = 0.15;
        if (guidePhase) { game.audio.play('se_tap', 0.3); guideBeat++; if (guideBeat >= GUIDE_BEATS * 2) { guidePhase = false; metroTimer = 0; firstTap = false; } }
      }
    }
    if (beatFlash > 0) beatFlash -= dt;
    if (feedback > 0) feedback -= dt;
    for (var ri = rings.length - 1; ri >= 0; ri--) { rings[ri].r += 300 * dt; rings[ri].life -= dt; if (rings[ri].life <= 0) rings.splice(ri, 1); }

    // ---- 描画 ----
    background();
    drawMetronome();
    for (var ri2 = 0; ri2 < rings.length; ri2++) { var rg = rings[ri2]; ring(W / 2, H * 0.55, rg.r, rg.kind === 2 ? C.c : (rg.kind === 1 ? C.b : C.a), rg.life); }
    if (guidePhase) txt('FEEL THE BEAT... ' + Math.max(0, GUIDE_BEATS - Math.floor(guideBeat / 2)), W / 2, H * 0.78, 48, C.c);
    else {
      if (feedback > 0) txt(feedbackKind === 2 ? 'PERFECT!' : (feedbackKind === 1 ? 'GO!' : 'MISS'), W / 2, H * 0.76, 52, feedbackKind === 2 ? C.c : (feedbackKind === 1 ? C.b : C.a));
      txt('TAP ON THE BEAT!', W / 2, H * 0.83, 40, C.e);
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(streak + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 208, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
