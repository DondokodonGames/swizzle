// 093-echo-tap.js
// エコータップ — 流れたリズムパターンを聞いて同じリズムで叩き返す
// 操作: 聞いたあと、同じタイミングでタップして再現
// 成功: 1パターン再現  失敗: 3回ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'ECHO TAP';
  var HOW_TO_PLAY = 'LISTEN, THEN REPEAT THE RHYTHM';
  var MAX_TIME = 25;
  var NEEDED = 1;           // 修正2: 5 → 1
  var MAX_MISS = 3;
  var BEAT_UNIT = 0.5, TOLERANCE = 0.2;

  var PATTERNS = [[0, 0.5, 1.0], [0, 0.33, 0.66, 1.0], [0, 0.25, 0.75, 1.0], [0, 0.5, 1.0, 1.5]];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var phase, patternIdx, pattern, playbackTimer, playbackBeat, playerBeats, replayStart, replayTimer, maxReplay, score, misses, timeLeft, done, feedback, feedbackOk, drumFlash;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
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

  function loadPattern() {
    if (state !== S.PLAYING || done) return;
    pattern = PATTERNS[patternIdx % PATTERNS.length];
    maxReplay = (pattern[pattern.length - 1] + 1.0) * BEAT_UNIT;
    phase = 'listen'; playbackTimer = 0; playbackBeat = 0; playerBeats = []; replayTimer = 0;
  }
  function initGame() { patternIdx = Math.floor(Math.random() * PATTERNS.length); score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; drumFlash = 0; loadPattern(); }

  function evaluate() {
    var correct = 0, used = []; for (var u = 0; u < playerBeats.length; u++) used.push(false);
    for (var i = 0; i < pattern.length; i++) {
      var exp = pattern[i] * BEAT_UNIT, best = -1, bd = TOLERANCE + 1;
      for (var j = 0; j < playerBeats.length; j++) { if (used[j]) continue; var d = Math.abs(playerBeats[j] - exp); if (d < bd) { bd = d; best = j; } }
      if (best >= 0 && bd <= TOLERANCE) { correct++; used[best] = true; }
    }
    return correct === pattern.length && (playerBeats.length - correct) <= 1;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    setTimeout(function() { state = S.RESULT; }, 400);
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'replay') { playerBeats.push(game.time.elapsed - replayStart); drumFlash = 0.12; game.audio.play('se_tap', 0.9); }
  });

  // 世界観: ドラムマシン。流れたリズムを聞き取り、同じ間合いで叩き返す。
  function background() {
    game.draw.clear('#0a0018');
    txt('DRUM MACHINE', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    var cx = W / 2, cy = H * 0.5, r = 200;
    drawPixelCircle(cx, cy, r + 16, C.d, drumFlash / 0.12 * 0.5);
    drawPixelCircle(cx, cy, r, C.d, 1);
    drawPixelCircle(cx, cy, r - 40, C.a, 0.4);
    if (phase === 'replay') txt('TAP!', cx, cy, 60, C.g);
    else if (phase === 'listen') txt('LISTEN', cx, cy, 52, C.c);
    // タイムライン
    var ty = H * 0.28, tw = 700, tx0 = (W - tw) / 2, lastT = pattern[pattern.length - 1] * BEAT_UNIT;
    game.draw.rect(snap(tx0), snap(ty) - 4, tw, 8, '#221040');
    for (var bi = 0; bi < pattern.length; bi++) { var bx = tx0 + (pattern[bi] * BEAT_UNIT / lastT) * tw; drawPixelCircle(bx, ty, 18, C.f, 0.8); }
    if (phase === 'listen') { var cur = (playbackTimer / (lastT + 0.8)) * tw; game.draw.rect(snap(tx0 + cur) - 3, snap(ty) - 24, 6, 48, C.g, 0.7); }
    else if (phase === 'replay') {
      var rc = Math.min((replayTimer / maxReplay) * tw, tw); game.draw.rect(snap(tx0 + rc) - 3, snap(ty) - 24, 6, 48, C.g, 0.7);
      for (var pb = 0; pb < playerBeats.length; pb++) { var pbx = Math.min(tx0 + (playerBeats[pb] / lastT) * tw, tx0 + tw); drawPixelCircle(pbx, ty, 12, C.b, 0.8); }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!pattern) initGame();
      background();
      drawPixelCircle(W / 2, H * 0.5, 200, C.d, 1);
      txt('ECHO', W / 2, H * 0.5, 60, C.g);
      txt(GAME_TITLE,  W / 2, H * 0.16, 80, C.f);
      txt(HOW_TO_PLAY, W / 2, H * 0.215, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.87, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'listen') {
        playbackTimer += dt;
        if (playbackBeat < pattern.length && playbackTimer >= pattern[playbackBeat] * BEAT_UNIT) { drumFlash = 0.15; game.audio.play('se_tap', 0.8); playbackBeat++; }
        if (playbackTimer > pattern[pattern.length - 1] * BEAT_UNIT + 0.8) { phase = 'replay'; replayStart = game.time.elapsed; replayTimer = 0; }
      } else if (phase === 'replay') {
        replayTimer += dt;
        if (replayTimer >= maxReplay + 0.4) {
          phase = 'feedback'; feedbackOk = evaluate(); feedback = 0.8;
          if (feedbackOk) { score++; game.audio.play('se_success'); if (score >= NEEDED) { finish(true); return; } }
          else { misses++; game.audio.play('se_failure', 0.7); if (misses >= MAX_MISS) { finish(false); return; } }
          setTimeout(function() { if (!done && state === S.PLAYING) { patternIdx++; loadPattern(); } }, 900);
        }
      }
      if (drumFlash > 0) drumFlash -= dt;
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (phase === 'feedback' && feedback > 0) txt(feedbackOk ? 'PERFECT!' : 'OFF BEAT!', W / 2, H * 0.72, 72, feedbackOk ? C.b : C.a);
    timeBar();
    txt('ECHO ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
