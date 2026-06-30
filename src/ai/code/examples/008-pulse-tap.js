// 008-pulse-tap.js
// 心拍タップ — 脈打つリズムの頂点でタップする心地よさ
// 操作: 円が最大に膨らんだ瞬間にタップ
// 成功: 1回正確にタップ  失敗: タイミングを外しすぎると×（3回）

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'PULSE TAP';
  var HOW_TO_PLAY = 'TAP AT THE PEAK';
  var MAX_TIME = 25;
  var NEEDED = 1;             // 修正2: 5 → ceil(5/10) = 1
  var MAX_MISS = 3;
  var PERIOD = 1.4;
  var CY = H * 0.46;          // パルス円の中心（縦）

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var t, score, misses, timeLeft, done, feedbackTimer, feedbackOk;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step)
      for (var px = -r; px <= r; px += step)
        if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
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

  function getPulseValue(phase) {
    if (phase < 0.12) return phase / 0.12;
    if (phase < 0.22) return 1 - (phase - 0.12) / 0.10;
    if (phase < 0.35) return -0.2 * Math.sin((phase - 0.22) / 0.13 * Math.PI);
    return 0;
  }

  function initGame() {
    t = 0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false;
    feedbackTimer = 0; feedbackOk = false;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var atPeak = t > 0.04 && t < 0.22;
    feedbackTimer = 0.45;
    if (atPeak) {
      score++; feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      if (score >= NEEDED) finish(true);
    } else {
      misses++; feedbackOk = false;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS) finish(false);
    }
  });

  function background() { game.draw.clear(C.bg); }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      var demoPulse = getPulseValue((game.time.elapsed / PERIOD) % 1);
      drawPixelCircle(W / 2, CY, 180 + demoPulse * 100, C.a, 0.9);
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 46, C.e);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.74, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.82, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 42, '#888888');
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
    }
    t = (t + dt / PERIOD) % 1;
    if (feedbackTimer > 0) feedbackTimer -= dt;

    // ---- draw ----
    background();
    var pv = getPulseValue(t);
    var pulseR = 180 + pv * 120;
    drawPixelCircle(W / 2, CY, pulseR + 32, C.a, 0.2 + pv * 0.2);
    drawPixelCircle(W / 2, CY, pulseR, C.a, 0.95);
    drawPixelCircle(W / 2, CY, pulseR * 0.4, C.c, 0.7);

    if (feedbackTimer > 0) {
      if (feedbackOk) txt('♥ GOOD', W / 2, CY - 16, 96, C.b);
      else txt('✕ MISS', W / 2, CY - 16, 88, C.a);
    }

    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.g);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    var peakNear = t > 0.02 && t < 0.25;
    txt(peakNear ? 'NOW!' : score + ' / ' + NEEDED, W / 2, H - 120, peakNear ? 72 : 56, peakNear ? C.c : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
