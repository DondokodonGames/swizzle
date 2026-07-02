// 219-tempo-tap.js
// テンポタップ — 変化するBPMに合わせてビート頂点でタップし、パーフェクトを連ねるリズム修行
// 操作: マーカーが頂点に来た瞬間タップ
// 成功: 5連続パーフェクト  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズム道場） ──
  var C = { bg:'#04060a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TEMPO TAP';
  var HOW_TO_PLAY = 'TAP WHEN THE MARKER HITS THE TOP';
  var MAX_TIME = 15;
  var NEEDED   = 5;           // 修正2: 20 → 5
  var MAX_MISS = 3;
  var CX = snap(W / 2), CY = snap(H * 0.48), R = 200;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var BPM, beatInterval, beatTimer, beatPhase, lastBeat, combo, misses, timeLeft, done, feedback, feedbackTimer, feedbackCol, beatFlash, bpmTimer, rings;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.12) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0a14');
  }

  function background() { game.draw.clear(C.bg); }

  function changeBPM() { var o = [80, 100, 120, 90, 110]; BPM = o[Math.floor(Math.random() * o.length)]; beatInterval = 60 / BPM; }

  function initGame() { changeBPM(); beatTimer = 0; beatPhase = 0; lastBeat = 0; combo = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = ''; feedbackTimer = 0; feedbackCol = C.g; beatFlash = 0; bpmTimer = 6; rings = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (combo * 400 + Math.ceil(timeLeft) * 50) : combo * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var since = timeLeftElapsed() - lastBeat, toNext = beatInterval - since, diff = Math.min(since, toNext);
    if (diff < 0.07) {
      combo++; feedback = 'PERFECT!'; feedbackCol = C.b; feedbackTimer = 0.5; game.audio.play('se_success', 0.6); rings.push({ r: 40, life: 0.5 });
      if (combo >= NEEDED) { finish(true); return; }
    } else if (diff < 0.15) { feedback = 'GOOD'; feedbackCol = C.c; feedbackTimer = 0.4; game.audio.play('se_tap', 0.5); }
    else { misses++; combo = 0; feedback = 'MISS'; feedbackCol = C.a; feedbackTimer = 0.5; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  var _elapsed = 0;
  function timeLeftElapsed() { return _elapsed; }

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      ring(CX, CY, R, C.d, 0.6); pc(CX, CY - R, 20, C.b, 0.9);
      txt(GAME_TITLE, W / 2, H * 0.15, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 40, '#445566');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN THE GROOVE!' : 'OFF BEAT', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      _elapsed += dt; timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedbackTimer > 0) feedbackTimer -= dt;
      beatTimer += dt; beatPhase = (beatTimer % beatInterval) / beatInterval;
      if (beatTimer >= beatInterval) { beatTimer -= beatInterval; lastBeat = _elapsed; beatFlash = 1.0; game.audio.play('se_tap', 0.15); }
      beatFlash = Math.max(0, beatFlash - dt * 5);
      bpmTimer -= dt; if (bpmTimer <= 0) { changeBPM(); bpmTimer = 5 + Math.random() * 3; }
      for (var ri = rings.length - 1; ri >= 0; ri--) { rings[ri].r += 300 * dt; rings[ri].life -= dt; if (rings[ri].life <= 0) rings.splice(ri, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ri2 = 0; ri2 < rings.length; ri2++) ring(CX, CY, rings[ri2].r, C.b, rings[ri2].life);
    ring(CX, CY, R, C.d, 0.6);
    // 回転マーカー（頂点=-PI/2でタップ）
    var ma = -Math.PI / 2 + beatPhase * Math.PI * 2;
    pc(CX + Math.cos(ma) * R, CY + Math.sin(ma) * R, 24, C.c, 0.95);
    // 頂点ヒットゾーン
    pc(CX, CY - R, 20, beatFlash > 0.5 ? C.b : C.d, 0.9);
    txt(BPM + ' BPM', CX, CY, 52, C.e);
    if (feedbackTimer > 0) txt(feedback, CX, CY + 130, 60, feedbackCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('COMBO ' + combo + ' / ' + NEEDED, W / 2, 168, 48, combo > 0 ? C.b : C.g);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 208, 20, 20, mm < misses ? C.a : '#0a0a14');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
