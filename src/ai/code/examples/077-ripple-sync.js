// 077-ripple-sync.js
// リップルシンク — 複数の波紋が同期した瞬間にタップする共鳴装置
// 操作: 全ての波紋が重なった瞬間にタップ
// 成功: 1回シンク成功  失敗: 3回外す or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'RIPPLE SYNC';
  var HOW_TO_PLAY = 'TAP WHEN ALL RINGS ALIGN';
  var MAX_TIME = 25;
  var NEEDED = 1;             // 修正2: 5 → 1
  var MAX_MISS = 3;
  var CENTER_X = W / 2, CENTER_Y = H * 0.44, MAX_R = 280, SYNC_TOL = 0.12;

  var RINGS = [
    { period: 1.8, phase: 0.0, color: C.e },
    { period: 2.4, phase: 0.6, color: C.d },
    { period: 1.5, phase: 1.1, color: C.a }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var score, misses, timeLeft, done, feedback, feedbackOk, syncFlash;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function drawPixelRing(px, py, r, color, alpha) {
    var step = 8, r2o = r * r, r2i = (r - 12) * (r - 12); px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step) { var d = xx * xx + yy * yy; if (d <= r2o && d >= r2i) game.draw.rect(px + xx, py + yy, step, step, color, alpha); }
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function phases() { var t = game.time.elapsed; return RINGS.map(function(r) { return ((t + r.phase) % r.period) / r.period; }); }
  function isSynced() { return phases().every(function(p) { return Math.abs(p - 0.5) < SYNC_TOL; }); }

  function initGame() { score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; syncFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    if (isSynced()) { score++; feedbackOk = true; feedback = 0.5; syncFlash = 0.3; game.audio.play('se_tap', 1.0); if (score >= NEEDED) finish(true); }
    else { misses++; feedbackOk = false; feedback = 0.4; game.audio.play('se_failure', 0.6); if (misses >= MAX_MISS) finish(false); }
  });

  // 世界観: 共鳴チャンバー。3つの発振器の波紋が中央で重なる瞬間を捉える。
  function background() {
    game.draw.clear('#0a0018');
    if (syncFlash > 0) game.draw.rect(0, 0, W, H, C.b, syncFlash / 0.3 * 0.2);
    game.draw.rect(snap(CENTER_X) - MAX_R - 24, snap(CENTER_Y) - MAX_R - 24, (MAX_R + 24) * 2, (MAX_R + 24) * 2, '#12002a');
    txt('RESONANCE CHAMBER', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    var ph = phases(), synced = isSynced();
    for (var i = 0; i < RINGS.length; i++) {
      var p = ph[i], r = 40 + p * MAX_R, alpha = (1 - p) * (synced ? 1.0 : 0.7);
      if (r > 20) drawPixelRing(CENTER_X, CENTER_Y, r, RINGS[i].color, alpha);
    }
    if (synced) { drawPixelCircle(CENTER_X, CENTER_Y, 72, C.b, 0.5 + 0.3 * Math.sin(game.time.elapsed * 12)); txt('NOW!', CENTER_X, CENTER_Y, 56, C.g); }
    else drawPixelCircle(CENTER_X, CENTER_Y, 36, '#334', 1);
    // 同期率バー
    var minDiff = 0; for (var k = 0; k < ph.length; k++) minDiff = Math.max(minDiff, Math.abs(ph[k] - 0.5));
    var pct = Math.max(0, 1 - minDiff / SYNC_TOL), bw = 500;
    game.draw.rect(snap(W / 2 - bw / 2), snap(H * 0.82), bw, 40, '#12002a');
    game.draw.rect(snap(W / 2 - bw / 2), snap(H * 0.82), snap(bw * pct), 40, synced ? C.b : C.e);
    txt('SYNC ' + Math.floor(pct * 100) + '%', W / 2, H * 0.82 - 40, 36, C.c);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (score === undefined) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.12, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.175, 32, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.9, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedback > 0) feedback -= dt;
      if (syncFlash > 0) syncFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt(feedbackOk ? 'SYNC!' : 'MISS!', W / 2, H * 0.28, 88, feedbackOk ? C.b : C.a);
    timeBar();
    txt('SYNC ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    txt('TAP WHEN RINGS ALIGN!', W / 2, H - 90, 42, C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
