// 057-pulse-beat.js
// パルスビート — 画面の鼓動に合わせてタップするリズム同期の快感
// 操作: 画面の波紋が最大になった瞬間にタップ
// 成功: 1回ジャストタイミング  失敗: 5回外れる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'PULSE BEAT';
  var HOW_TO_PLAY = 'TAP WHEN THE RING PEAKS';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 10 → 1
  var MAX_MISS = 5;
  var BPM = 90, BEAT_INTERVAL = 60 / 90, HIT_WINDOW = 0.15, CY = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var beatTimer, beatPhase, beatNum, rings, score, misses, timeLeft, done, lastTapBeat, feedback, feedbackOk, tapFlash;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function pixelRing(cx, cy, r, color, alpha) {
    var step = 8, r2 = r * r, ri2 = (r - 12) * (r - 12); cx = snap(cx); cy = snap(cy);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step) { var d = xx * xx + yy * yy; if (d <= r2 && d >= ri2) game.draw.rect(cx + xx, cy + yy, step, step, color, alpha); }
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

  function initGame() { beatTimer = BEAT_INTERVAL * 0.3; beatPhase = 0; beatNum = 0; rings = []; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; lastTapBeat = -1; feedback = 0; feedbackOk = false; tapFlash = 0; }

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
    var inWindow = Math.abs(beatPhase - 0.5) < HIT_WINDOW;
    if (lastTapBeat === beatNum && !inWindow) return;
    if (inWindow) {
      if (lastTapBeat !== beatNum) { score++; feedbackOk = true; feedback = 0.35; tapFlash = 0.2; lastTapBeat = beatNum; game.audio.play('se_tap', 1.0); if (score >= NEEDED) finish(true); }
    } else { misses++; feedbackOk = false; feedback = 0.3; game.audio.play('se_failure', 0.6); if (misses >= MAX_MISS) finish(false); }
  });

  // 世界観: 巨大な音響コアの鼓動。波紋が最大になる拍にタップして同期する。
  function background() { game.draw.clear('#0a0018'); }

  function drawPulse() {
    var mp = Math.sin(beatPhase * Math.PI);
    for (var r = 0; r < rings.length; r++) pixelRing(W / 2, CY, rings[r].r, C.d, (rings[r].life / (BEAT_INTERVAL * 0.9)) * 0.5);
    var orbR = 100 + mp * 90;
    drawPixelCircle(W / 2, CY, orbR, C.a, 0.9);
    drawPixelCircle(W / 2, CY, orbR * 0.5, C.c, 0.6);
    var inWin = Math.abs(beatPhase - 0.5) < HIT_WINDOW;
    if (inWin) { pixelRing(W / 2, CY, orbR + 40, C.b, 0.8); txt('NOW!', W / 2, CY + orbR + 120, 64, C.b); }
    if (tapFlash > 0) game.draw.rect(0, 0, W, H, C.g, tapFlash / 0.2 * 0.15);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (beatTimer === undefined) initGame();
      background();
      beatPhase = (game.time.elapsed % BEAT_INTERVAL) / BEAT_INTERVAL; rings = [];
      drawPulse();
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.8, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 42, '#888888');
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
      beatTimer += dt;
      if (beatTimer >= BEAT_INTERVAL) { beatTimer -= BEAT_INTERVAL; beatNum++; rings.push({ r: 40, maxR: 440, life: BEAT_INTERVAL * 0.9 }); game.audio.play('se_tap', 0.2); }
      beatPhase = beatTimer / BEAT_INTERVAL;
      for (var i = rings.length - 1; i >= 0; i--) { rings[i].life -= dt; rings[i].r = (1 - rings[i].life / (BEAT_INTERVAL * 0.9)) * rings[i].maxR; if (rings[i].life <= 0) rings.splice(i, 1); }
      if (feedback > 0) feedback -= dt;
      if (tapFlash > 0) tapFlash -= dt;
    }

    // ---- draw ----
    background();
    drawPulse();
    if (feedback > 0) txt(feedbackOk ? 'JUST!' : 'MISS!', W / 2, H * 0.24, 72, feedbackOk ? C.b : C.a);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.g);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 2) * 56, 150, 40, 40, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
