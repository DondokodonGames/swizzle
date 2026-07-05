// 794-signal-sort.js
// シグナルソート — 流れる信号を、中央に来た瞬間に正しいレーンへ振り分けろ
// 操作: 左タップ/スワイプで△(TRIANGLE)、右で○(CIRCLE)へ振り分ける
// 成功: 12個 正解  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、信号は保持） ──
  var C = { bg:'#040810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var LANE = '#0a1520', LANE_HI = '#1e2d40', TRIANGLE = '#ff6600', CIRCLE = '#00cfff';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SIGNAL SORT';
  var HOW_TO_PLAY = 'WHEN A SIGNAL REACHES CENTER, TAP LEFT FOR TRIANGLE, RIGHT FOR CIRCLE';
  var MAX_TIME = 24;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var CENTER_X = W / 2, CENTER_ZONE = 80, LANE_Y = snap(H * 0.55);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var signals, spawnTimer, signalSpeed, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 12; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'right') game.draw.rect(cx + i - size / 2, cy - w / 2, st, w, color, 0.95); else game.draw.rect(cx - i + size / 2 - st, cy - w / 2, st, w, color, 0.95); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#050a10');
  }

  function background() { game.draw.clear(C.bg); }

  function drawSignalShape(cx, cy, r, type, col, alpha) {
    if (type === 'circle') pc(cx, cy, r, col, alpha);
    else { for (var t = 0; t < 8; t++) { var w = r * 1.7 * (t / 8), yy = cy - r * 0.9 + t * r * 0.22; game.draw.rect(snap(cx - w / 2), snap(yy), snap(w), snap(r * 0.24), col, alpha); } }
  }

  function spawnSignal() { signals.push({ x: -80, y: LANE_Y, type: Math.random() < 0.5 ? 'triangle' : 'circle', answered: false, resultFlash: 0, correct: false }); }

  function initGame() { signals = []; spawnTimer = 0; signalSpeed = 420; score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnSignal(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 450 + Math.ceil(timeLeft) * 130) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function sortSignal(tappedLeft) {
    var hitSignal = null;
    for (var i = 0; i < signals.length; i++) { var s = signals[i]; if (s.answered) continue; if (Math.abs(s.x - CENTER_X) < CENTER_ZONE) { hitSignal = s; break; } }
    if (!hitSignal) return;
    hitSignal.answered = true;
    var correct = (tappedLeft && hitSignal.type === 'triangle') || (!tappedLeft && hitSignal.type === 'circle');
    hitSignal.correct = correct; hitSignal.resultFlash = 0.5;
    if (correct) {
      score++; flash = 0.16; flashCol = C.b; resultText = 'SORTED!'; resultTimer = 0.3; game.audio.play('se_tap', 0.07);
      var destX = tappedLeft ? W * 0.2 : W * 0.8;
      for (var p = 0; p < 5; p++) { var pa = Math.atan2(LANE_Y - hitSignal.y, destX - hitSignal.x) + (Math.random() - 0.5) * 0.8; particles.push({ x: hitSignal.x, y: hitSignal.y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.35, col: hitSignal.type === 'circle' ? CIRCLE : TRIANGLE }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.28; flashCol = C.a; resultText = 'WRONG LANE!'; resultTimer = 0.38; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  }

  function drawScene() {
    game.draw.rect(0, LANE_Y - 60, W, 120, LANE, 0.9); game.draw.rect(0, LANE_Y - 60, W, 4, LANE_HI, 0.5); game.draw.rect(0, LANE_Y + 56, W, 4, LANE_HI, 0.3);
    game.draw.rect(CENTER_X - CENTER_ZONE, LANE_Y - 64, CENTER_ZONE * 2, 128, '#0f2030', 0.6);
    game.draw.rect(0, LANE_Y - 180, W * 0.45, 90, '#0a0e14', 0.9); drawSignalShape(W * 0.22, LANE_Y - 136, 30, 'triangle', TRIANGLE, 0.8); arrow(W * 0.1, LANE_Y - 132, 32, 'left', TRIANGLE); txt('TRIANGLE', W * 0.32, LANE_Y - 100, 24, TRIANGLE, 'left');
    game.draw.rect(W * 0.55, LANE_Y - 180, W * 0.45, 90, '#0a0e14', 0.9); drawSignalShape(W * 0.78, LANE_Y - 136, 30, 'circle', CIRCLE, 0.8); arrow(W * 0.9, LANE_Y - 132, 32, 'right', CIRCLE); txt('CIRCLE', W * 0.68, LANE_Y - 100, 24, CIRCLE, 'right');
    for (var si2 = 0; si2 < signals.length; si2++) {
      var sig = signals[si2], col2 = sig.type === 'circle' ? CIRCLE : TRIANGLE, alpha = 0.9;
      if (sig.answered) { alpha = sig.resultFlash * 0.7; col2 = sig.correct ? C.b : C.a; }
      if (alpha <= 0) continue;
      drawSignalShape(sig.x, sig.y, 44, sig.type, col2, alpha);
    }
    if (state === S.PLAYING) { arrow(W * 0.2, snap(H * 0.85), 36, 'left', TRIANGLE); arrow(W * 0.8, snap(H * 0.85), 36, 'right', CIRCLE); }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    sortSignal(tx < W / 2);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') sortSignal(true); else if (dir === 'right') sortSignal(false);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!signals) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORT MASTER!' : 'CROSSED WIRES', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; var spawnRate = Math.max(0.7, 1.4 - score * 0.04); if (spawnTimer <= 0) { spawnTimer = spawnRate; spawnSignal(); }
      signalSpeed = Math.min(700, 420 + score * 12);
      for (var si = signals.length - 1; si >= 0; si--) {
        var s = signals[si]; s.x += signalSpeed * dt; if (s.resultFlash > 0) s.resultFlash -= dt * 3;
        if (!s.answered && s.x > CENTER_X + CENTER_ZONE + 20) { s.answered = true; s.correct = false; s.resultFlash = 0.4; errors++; flash = 0.28; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.38; game.audio.play('se_failure', 0.28); if (errors >= MAX_ERR) { finish(false); return; } }
        if (s.x > W + 100) signals.splice(si, 1);
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.8; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.28), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#050a10');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
