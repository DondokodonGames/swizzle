// 132-equation-rush.js
// 計算ラッシュ — 流れる数式の答えが正しいか素早く判断するスピード暗算の脳トレ
// 操作: 画面左タップ=正しい / 画面右タップ=間違い
// 成功: 2問連続判断  失敗: 5回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、計算端末） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#66ff66', c:'#ccffcc', d:'#009922', e:'#ffcc00', f:'#ff3300', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'EQUATION RUSH';
  var HOW_TO_PLAY = 'LEFT = CORRECT · RIGHT = WRONG';
  var MAX_TIME = 15;             // 修正2: 35 → 15
  var NEEDED   = 2;              // 修正2: 20 → 2
  var MAX_MISS = 5;
  var TOP    = 220;
  var BOTTOM = H - 180;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var current, nextEq, score, misses, timeLeft, done, feedback, feedbackOk;

  // ── ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18);
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.a : '#003300');
  }

  function genEquation() {
    var ops = ['+', '-', '*'];
    var op = ops[Math.floor(Math.random() * ops.length)];
    var a, b, answer;
    if (op === '+') { a = Math.floor(Math.random() * 20) + 1; b = Math.floor(Math.random() * 20) + 1; answer = a + b; }
    else if (op === '-') { a = Math.floor(Math.random() * 20) + 10; b = Math.floor(Math.random() * a); answer = a - b; }
    else { a = Math.floor(Math.random() * 9) + 2; b = Math.floor(Math.random() * 9) + 2; answer = a * b; }
    var isCorrect = Math.random() > 0.45;
    var shown = answer;
    if (!isCorrect) {
      shown = answer + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
      if (shown === answer) shown = answer + 2;
    }
    return { text: a + ' ' + op + ' ' + b + ' = ' + shown, isCorrect: isCorrect };
  }

  function background() {
    game.draw.clear(C.bg);
    // 左（正）・右（誤）パネル
    var la = (feedback > 0 && feedbackOk) ? 0.35 : 0.12;
    var ra = (feedback > 0 && !feedbackOk) ? 0.35 : 0.12;
    game.draw.rect(0, TOP, W / 2, BOTTOM - TOP, C.a, la);
    game.draw.rect(W / 2, TOP, W / 2, BOTTOM - TOP, C.f, ra);
    game.draw.rect(snap(W / 2) - 4, TOP, 8, BOTTOM - TOP, C.c, 0.5);
  }

  function initGame() {
    current = genEquation();
    nextEq = genEquation();
    score = 0; misses = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || feedback > 0) return;
    var saysCorrect = x < W / 2;
    if (saysCorrect === current.isCorrect) {
      score++; feedbackOk = true; feedback = 0.28;
      game.audio.play('se_tap', 0.8);
      if (score >= NEEDED) { finish(true); return; }
    } else {
      misses++; feedbackOk = false; feedback = 0.28;
      game.audio.play('se_failure', 0.6);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
    current = nextEq;
    nextEq = genEquation();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      txt(GAME_TITLE,  W / 2, H * 0.28, 78, C.c);
      txt('12 + 7 = 19 ?', W / 2, H * 0.44, 64, C.g);
      txt(HOW_TO_PLAY, W / 2, H * 0.52, 34, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 64, C.e);
        txt('TAP TO START', W / 2, H * 0.85, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.91, 40, '#448844');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GENIUS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.a : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }
    if (feedback > 0) feedback -= dt;

    background();
    txt('CORRECT?', W / 4, H * 0.80, 48, C.a);
    txt('WRONG?', W * 3 / 4, H * 0.80, 48, C.f);
    txt('O', W / 4, H * 0.88, 96, C.a);
    txt('X', W * 3 / 4, H * 0.88, 96, C.f);

    var scale = feedback > 0 ? 72 + (0.28 - feedback) * 40 : 72;
    var eqCol = feedback > 0 ? (feedbackOk ? C.a : C.f) : C.g;
    txt(current.text, W / 2, H * 0.46, scale, eqCol);
    txt(nextEq.text, W / 2, H * 0.58, 36, C.d);

    if (feedback > 0) txt(feedbackOk ? 'YES!' : 'NO!', W / 2, H * 0.30, 72, feedbackOk ? C.a : C.f);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 216, 24, 24, mm < misses ? C.f : '#003300');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
