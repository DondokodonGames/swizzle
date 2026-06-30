// 032-quickdraw.js
// クイックドロー — 「今だ！」の瞬間に最速でタップする反射神経
// 操作: 「DRAW!」が出た瞬間にタップ（早すぎも失敗）
// 成功: 0.5秒以内に1回反応  失敗: 0.5秒超過 or 早打ち3回 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'QUICK DRAW';
  var HOW_TO_PLAY = 'TAP WHEN "DRAW!" APPEARS';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 5 → 1
  var MAX_EARLY = 3;
  var DRAW_TIMEOUT = 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var score, earlyShots, timeLeft, done, phase, waitTimer, drawTimer, resultTimer, reactionTime, feedbackOk;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function nextRound() { phase = 'wait'; waitTimer = 1.2 + Math.random() * 2.0; }
  function initGame() { score = 0; earlyShots = 0; timeLeft = MAX_TIME; done = false; reactionTime = 0; feedbackOk = false; nextRound(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.round((DRAW_TIMEOUT - reactionTime) * 400) + Math.ceil(timeLeft) * 20) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'wait') {
      earlyShots++; feedbackOk = false; reactionTime = 0; phase = 'result'; resultTimer = 0.8;
      game.audio.play('se_failure', 0.7);
      if (earlyShots >= MAX_EARLY) finish(false);
    } else if (phase === 'draw') {
      reactionTime = drawTimer;
      if (reactionTime <= DRAW_TIMEOUT) {
        score++; feedbackOk = true;
        game.audio.play('se_tap', 1.0);
        if (score >= NEEDED) { finish(true); return; }
      } else { feedbackOk = false; game.audio.play('se_failure', 0.5); }
      phase = 'result'; resultTimer = 0.7;
    }
  });

  function background() { game.draw.clear(C.bg); }

  function drawScene() {
    // 砂漠の地平
    game.draw.rect(0, H * 0.62, W, H * 0.38, C.d, 0.4);
    drawSun();
    // ── ドット絵スプライト: カウボーイのシルエット ──
    var px = snap(W * 0.5), py = snap(H * 0.62), sil = '#000033';
    game.draw.rect(px - 16, py - 120, 16, 120, sil);   // 左脚
    game.draw.rect(px + 4,  py - 120, 16, 120, sil);   // 右脚
    game.draw.rect(px - 36, py - 280, 72, 168, sil);   // 胴
    game.draw.rect(px + 36, py - 250, 96, 20, sil);    // 銃を構えた腕
    game.draw.rect(px - 28, py - 360, 56, 80, sil);    // 頭
    game.draw.rect(px - 56, py - 372, 112, 20, sil);   // ハットのつば
    game.draw.rect(px - 32, py - 412, 64, 44, sil);    // ハットの山
    game.draw.rect(px - 56, py - 366, 112, 6, C.f, 0.3); // つばハイライト
  }
  function drawSun() { game.draw.rect(snap(W * 0.7 - 110), snap(H * 0.34), 220, 220, C.f, 0.8); }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.2, 88, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.8, 52, C.g);
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
      if (phase === 'wait') { waitTimer -= dt; if (waitTimer <= 0) { phase = 'draw'; drawTimer = 0; game.audio.play('se_tap', 0.3); } }
      else if (phase === 'draw') { drawTimer += dt; if (drawTimer > DRAW_TIMEOUT + 0.3) { feedbackOk = false; reactionTime = drawTimer; phase = 'result'; resultTimer = 0.8; game.audio.play('se_failure', 0.4); } }
      else if (phase === 'result') { resultTimer -= dt; if (resultTimer <= 0 && !done) nextRound(); }
    }

    // ---- draw ----
    background();
    drawScene();
    if (phase === 'draw') txt('DRAW!', W / 2, H * 0.42, 180, C.c);
    else if (phase === 'wait') txt('...', W / 2, H * 0.42, 120, C.f);
    else if (phase === 'result') {
      if (feedbackOk) txt(Math.round(reactionTime * 1000) + 'ms!', W / 2, H * 0.4, 100, C.b);
      else if (reactionTime === 0) txt('TOO EARLY!', W / 2, H * 0.4, 90, C.a);
      else txt('TOO SLOW!', W / 2, H * 0.4, 90, C.a);
    }
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.g);
    for (var e = 0; e < MAX_EARLY; e++)
      game.draw.rect(W / 2 + (e - 1) * 64 - 20, 150, 40, 40, e < earlyShots ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
