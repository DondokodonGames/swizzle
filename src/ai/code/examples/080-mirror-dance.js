// 080-mirror-dance.js
// ミラーダンス — 左のダンサーの動きを右に鏡写しでコピーする瞬発力
// 操作: スワイプで方向を入力（左ダンサーの動きをミラーして再現）
// 成功: 1回正解  失敗: 3回ミス or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'MIRROR DANCE';
  var HOW_TO_PLAY = 'MIRROR THE DANCER (SWIPE)';
  var MAX_TIME = 30;
  var NEEDED = 1;           // 修正2: 10 → 1
  var MAX_MISS = 3;
  var SHOW_TIME = 1.4, DANCER_Y = H * 0.5;

  var MOVES = [
    { dir: 'up',    sym: 'UP',    arm: [0, -1] },
    { dir: 'down',  sym: 'DOWN',  arm: [0, 1] },
    { dir: 'left',  sym: 'LEFT',  arm: [-1, 0] },
    { dir: 'right', sym: 'RIGHT', arm: [1, 0] }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var cur, phase, showTimer, score, misses, timeLeft, done, feedback, feedbackOk;

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

  function mirrorDir(dir) { if (dir === 'left') return 'right'; if (dir === 'right') return 'left'; return dir; }

  // ドット絵ダンサー（多矩形のスティック像）
  function drawDancer(cx, cy, arm, color) {
    cx = snap(cx); cy = snap(cy);
    game.draw.rect(cx - 24, cy - 200, 48, 48, color);        // 頭
    game.draw.rect(cx - 16, cy - 200, 8, 8, '#000000');
    game.draw.rect(cx + 8, cy - 200, 8, 8, '#000000');
    game.draw.rect(cx - 16, cy - 144, 32, 120, color);       // 胴
    // 腕（arm方向に伸ばすポーズ）
    var sy = cy - 128;                                        // 肩の高さ
    if (arm[1] < 0) {          // 上げ
      game.draw.rect(cx - 40, sy - 72, 24, 88, color);
      game.draw.rect(cx + 16, sy - 72, 24, 88, color);
    } else if (arm[1] > 0) {   // 下げ
      game.draw.rect(cx - 40, sy, 24, 88, color);
      game.draw.rect(cx + 16, sy, 24, 88, color);
    } else if (arm[0] < 0) {   // 左
      game.draw.rect(cx - 96, sy, 88, 24, color);
      game.draw.rect(cx - 96, sy + 40, 88, 24, color);
    } else {                   // 右
      game.draw.rect(cx + 8, sy, 88, 24, color);
      game.draw.rect(cx + 8, sy + 40, 88, 24, color);
    }
    // 足
    game.draw.rect(cx - 48, cy - 24, 24, 96, color);
    game.draw.rect(cx + 24, cy - 24, 24, 96, color);
  }

  function initGame() { cur = null; phase = 'wait'; showTimer = 0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; nextMove(); }
  function nextMove() { if (state !== S.PLAYING || done) return; cur = MOVES[Math.floor(Math.random() * MOVES.length)]; phase = 'show'; showTimer = SHOW_TIME; }

  function onCorrect() { score++; feedbackOk = true; feedback = 0.4; game.audio.play('se_tap', 0.8); if (score >= NEEDED) finish(true); }
  function onWrong() { misses++; feedbackOk = false; feedback = 0.4; game.audio.play('se_failure', 0.6); if (misses >= MAX_MISS) finish(false); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || phase !== 'input') return;
    phase = 'feedback';
    if (dir === mirrorDir(cur.dir)) onCorrect(); else onWrong();
    setTimeout(nextMove, 500);
  });

  // 世界観: ネオンのダンスステージ。左のダンサーの動きを鏡写しで再現する。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(0, snap(H * 0.78), W, H * 0.22, '#12002a');
    for (var i = 0; i < 6; i++) { var lx = snap(i * W / 5); game.draw.rect(lx - 4, 300, 8, 120, C.d, 0.4); }
    game.draw.rect(snap(W / 2) - 4, snap(H * 0.24), 8, snap(H * 0.5), C.d);
    txt('DANCE STAGE', W / 2, 250, 34, C.b);
    txt('MIRROR', W / 2, H * 0.22, 30, C.d);
  }

  function drawScene() {
    var leftCX = W * 0.28, rightCX = W * 0.72;
    var leftColor = phase === 'feedback' ? (feedbackOk ? C.b : C.a) : C.f;
    if (cur) drawDancer(leftCX, DANCER_Y, cur.arm, leftColor);
    if (phase === 'input' || phase === 'feedback') {
      var mdir = mirrorDir(cur.dir), mMove = MOVES.filter(function(m) { return m.dir === mdir; })[0];
      drawDancer(rightCX, DANCER_Y, mMove ? mMove.arm : [0, -1], C.e);
    } else {
      game.draw.rect(snap(rightCX) - 24, snap(DANCER_Y - 200), 48, 48, '#221040');
      game.draw.rect(snap(rightCX) - 16, snap(DANCER_Y - 144), 32, 120, '#221040');
    }
    if (phase === 'show' && cur) txt(cur.sym, leftCX, H * 0.72, 64, C.f);
    if (phase === 'input') txt('SWIPE!', rightCX, H * 0.72, 60, C.e);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawDancer(W * 0.28, DANCER_Y, MOVES[Math.floor(game.time.elapsed) % 4].arm, C.f);
      drawDancer(W * 0.72, DANCER_Y, MOVES[Math.floor(game.time.elapsed) % 4].arm, C.e);
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
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
      if (phase === 'show') { showTimer -= dt; if (showTimer <= 0) phase = 'input'; }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt(feedbackOk ? 'PERFECT!' : 'MISS!', W / 2, H * 0.28, 80, feedbackOk ? C.b : C.a);
    timeBar();
    txt('COPY ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
