// 141-countdown-stop.js
// カウントダウン止め — 0になる寸前でタップする究極の「待つ」緊張感
// 操作: タップでスタート、0に近づけてもう一度タップで止める
// 成功: 1回ジャストで止める  失敗: 4回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、タイマー装置） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COUNTDOWN STOP';
  var HOW_TO_PLAY = 'STOP THE TIMER JUST BEFORE ZERO';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var NEEDED   = 1;              // 修正2: 8 → 1
  var MAX_MISS = 4;
  var SAFE_WINDOW = 0.4;         // 修正2: 判定を甘めに
  var DIAL_X = W / 2, DIAL_Y = snap(H * 0.46), DIAL_R = 260;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var countdown, cdMax, running, stopped, stopTime, level;
  var score, misses, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  // ── ダイヤル（8pxブロックの円弧） ──
  function drawDial(ratio, col) {
    // 外周リング
    for (var a = 0; a < Math.PI * 2; a += 0.1) {
      game.draw.rect(snap(DIAL_X + Math.cos(a) * DIAL_R) - 6, snap(DIAL_Y + Math.sin(a) * DIAL_R) - 6, 12, 12, C.d, 0.5);
    }
    // 残量スイープ（12時起点）
    var end = -Math.PI / 2 + ratio * Math.PI * 2;
    for (var b = -Math.PI / 2; b < end; b += 0.08) {
      for (var rr = DIAL_R - 80; rr <= DIAL_R - 16; rr += 16) {
        game.draw.rect(snap(DIAL_X + Math.cos(b) * rr) - 8, snap(DIAL_Y + Math.sin(b) * rr) - 8, 16, 16, col, 0.9);
      }
    }
    // セーフゾーン印（0付近＝12時のすぐ手前）
    var sa = -Math.PI / 2 - 0.2;
    game.draw.rect(snap(DIAL_X + Math.cos(sa) * DIAL_R) - 8, snap(DIAL_Y + Math.sin(sa) * DIAL_R) - 8, 16, 16, C.b);
  }

  function newRound() {
    level++;
    cdMax = Math.max(2.0, 4.0 - level * 0.2);
    countdown = cdMax;
    running = true; stopped = false;
  }

  function initGame() {
    level = 0; score = 0; misses = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0;
    running = false; stopped = false; countdown = 0; cdMax = 4; stopTime = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function registerMiss() {
    misses++; feedbackOk = false; feedback = 0.7;
    game.audio.play('se_failure');
    running = false; stopped = true;
    if (misses >= MAX_MISS) { finish(false); return; }
    setTimeout(function() { if (state === S.PLAYING && !done) newRound(); }, 800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!running && !stopped) { newRound(); return; }
    if (stopped) return;
    running = false; stopped = true; stopTime = countdown;
    if (countdown <= SAFE_WINDOW) {
      score++; feedbackOk = true; feedback = 0.8;
      game.audio.play('se_success');
      if (score >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (state === S.PLAYING && !done) newRound(); }, 800);
    } else {
      registerMiss();
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawDial((Math.sin(game.time.elapsed) + 1) / 2, C.e);
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.78, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.85, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (running) {
        countdown -= dt;
        if (countdown <= 0) { countdown = 0; registerMiss(); }
      }
    }
    if (feedback > 0) feedback -= dt;

    background();
    var ratio = (running || stopped) ? Math.max(0, countdown / cdMax) : 1;
    var col = ratio < (SAFE_WINDOW / cdMax + 0.05) ? C.b : (ratio < 0.35 ? C.c : C.e);
    drawDial(ratio, col);
    // 中央数字
    var disp = running ? countdown.toFixed(1) : (stopped ? stopTime.toFixed(1) : 'GO');
    txt(disp, DIAL_X, DIAL_Y, 100, col);
    if (feedback > 0) txt(feedbackOk ? 'PERFECT!' : 'TOO EARLY', W / 2, H * 0.20, 72, feedbackOk ? C.b : C.a);
    if (!running && !stopped && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('TAP TO START', W / 2, H * 0.80, 48, C.c);
    else if (running) txt('STOP NEAR ZERO!', W / 2, H * 0.80, 44, ratio < 0.25 ? C.a : C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 216, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
