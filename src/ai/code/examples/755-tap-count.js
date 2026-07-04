// 755-tap-count.js
// タップカウント — 表示された数字と同じ回数だけ、制限時間内に素早くタップする
// 操作: 数字を覚え、その回数ぴったりタップ。多くても少なくてもミス
// 成功: 8問 正解  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、カウント） ──
  var C = { bg:'#04060e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TAP COUNT';
  var HOW_TO_PLAY = 'TAP EXACTLY AS MANY TIMES AS THE NUMBER SHOWN · WITHIN THE TIME WINDOW';
  var MAX_TIME = 24;
  var NEEDED   = 8;          // 修正2: 25 → 8
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var WAIT_DUR = 0.45;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetNum, tapsSoFar, windowTimer, windowDur, showTimer, showDur, waitTimer, tapPhase, score, errors, timeLeft, done, elapsed, tapDots, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#08101e');
  }

  function background() { game.draw.clear(C.bg); }

  function nextRound() { targetNum = 2 + Math.floor(Math.random() * 5); showDur = Math.max(0.5, 0.9 - score * 0.02); windowDur = Math.max(1.2, 2.2 - score * 0.04); showTimer = showDur; tapsSoFar = 0; tapDots = []; tapPhase = 'show'; }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; nextRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function evaluateTaps() {
    if (tapsSoFar === targetNum) { score++; flash = 0.25; flashCol = C.b; resultText = targetNum + '  CORRECT!'; resultTimer = 0.45; game.audio.play('se_success', 0.6); if (score >= NEEDED) { finish(true); return; } }
    else { errors++; flash = 0.3; flashCol = C.a; resultText = tapsSoFar + '  (NEEDED ' + targetNum + ')'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (errors >= MAX_ERR) { finish(false); return; } }
    tapPhase = 'wait'; waitTimer = WAIT_DUR;
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || tapPhase !== 'count') return;
    tapsSoFar++; game.audio.play('se_tap', 0.08);
    tapDots.push({ x: 120 + (tapsSoFar - 1) * 90, y: H * 0.72, life: 1.0 });
    if (tapsSoFar === targetNum) windowTimer = Math.min(windowTimer, 0.4);
    if (tapsSoFar > targetNum) evaluateTaps();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targetNum === undefined) initGame(); background();
      txt(GAME_TITLE, W / 2, H * 0.28, 90, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.33, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.60, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'COUNT MASTER!' : 'MISCOUNTED', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (tapPhase === 'show') { showTimer -= dt; if (showTimer <= 0) { tapPhase = 'count'; windowTimer = windowDur; } }
      else if (tapPhase === 'count') { windowTimer -= dt; if (windowTimer <= 0) evaluateTaps(); }
      else if (tapPhase === 'wait') { waitTimer -= dt; if (waitTimer <= 0) nextRound(); }
      for (var di = tapDots.length - 1; di >= 0; di--) { tapDots[di].life -= dt * 2.5; if (tapDots[di].life <= 0) tapDots.splice(di, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background();
    if (tapPhase === 'show') {
      txt('' + targetNum, W / 2, snap(H * 0.40) + 80, 240, C.e);
      txt('TAP THIS MANY', W / 2, snap(H * 0.62), 44, '#ffffff99');
      game.draw.rect(W / 2 - 200, snap(H * 0.68), 400, 12, '#1a1a2a', 0.9); game.draw.rect(W / 2 - 200, snap(H * 0.68), 400 * (showTimer / showDur), 12, C.e, 0.9);
    } else if (tapPhase === 'count') {
      game.draw.rect(0, H * 0.3, W, H * 0.45, C.e, 0.03);
      txt('TAP!', W / 2, snap(H * 0.45), 100, C.e);
      var cntCol = tapsSoFar > targetNum ? C.a : (tapsSoFar === targetNum ? C.b : C.f);
      txt(tapsSoFar + ' / ' + targetNum, W / 2, snap(H * 0.60), 72, cntCol);
      var wFrac = Math.max(0, windowTimer / windowDur);
      game.draw.rect(W / 2 - 240, snap(H * 0.70), 480, 14, '#1a1a2a', 0.8); game.draw.rect(W / 2 - 240, snap(H * 0.70), 480 * wFrac, 14, wFrac > 0.3 ? C.f : C.a, 0.85);
    } else txt('...', W / 2, snap(H * 0.45), 80, '#ffffff33');
    for (var di2 = 0; di2 < tapDots.length; di2++) { var td = tapDots[di2]; pc(td.x, td.y, 20 * td.life, C.f, td.life * 0.8); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 48, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#08101e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
