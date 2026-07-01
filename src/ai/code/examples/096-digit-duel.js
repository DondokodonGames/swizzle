// 096-digit-duel.js
// 数字対決 — 2つの数が現れた瞬間に大きい方をタップする電光石火の判断力
// 操作: 左右どちらか大きい数をタップ
// 成功: 2問正解  失敗: 3回ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'DIGIT DUEL';
  var HOW_TO_PLAY = 'TAP THE BIGGER NUMBER';
  var MAX_TIME = 25;
  var NEEDED = 2;           // 修正2: 15 → 2
  var MAX_MISS = 3;         // 修正2: 5 → 3
  var SHOW_TIME = 1.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var numLeft, numRight, phase, showTimer, responded, score, misses, timeLeft, done, feedback, feedbackOk, flashSide;

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

  function nextRound() {
    if (state !== S.PLAYING || done) return;
    var a = Math.floor(Math.random() * 99) + 1, b = Math.floor(Math.random() * 99) + 1;
    while (b === a) b = Math.floor(Math.random() * 99) + 1;
    if (Math.random() > 0.6) { b = Math.max(1, Math.min(99, a + (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 5)))); if (b === a) b = a + 1; }
    numLeft = a; numRight = b; phase = 'show'; showTimer = SHOW_TIME; responded = false;
  }
  function initGame() { score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; flashSide = 0; phase = 'wait'; nextRound(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function tapSide(side) {
    if (done || responded || phase !== 'show') return;
    responded = true; flashSide = side;
    var bigger = numLeft > numRight ? -1 : 1;
    if (side === bigger) { score++; feedbackOk = true; feedback = 0.4; game.audio.play('se_tap', 1.0); if (score >= NEEDED) { finish(true); return; } }
    else { misses++; feedbackOk = false; feedback = 0.4; game.audio.play('se_failure', 0.7); if (misses >= MAX_MISS) { finish(false); return; } }
    phase = 'wait'; setTimeout(nextRound, 500);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    tapSide(tx < W / 2 ? -1 : 1);
  });

  // 世界観: 数字対決アリーナ。左右の数字が対決、大きい方を素早く選ぶ。
  function background() {
    game.draw.clear('#000011');
    game.draw.rect(snap(W / 2) - 4, 300, 8, H - 500, '#000833');
    game.draw.rect(0, snap(H * 0.3), snap(W / 2) - 8, snap(H * 0.3), '#000822');
    game.draw.rect(snap(W / 2) + 8, snap(H * 0.3), snap(W / 2), snap(H * 0.3), '#110800');
    txt('DUEL ARENA', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    if (phase === 'show' || (feedback > 0 && responded)) {
      var leftBig = numLeft > numRight, rightBig = numRight > numLeft;
      var lc = responded ? (leftBig ? C.f : '#334') : C.b, rc = responded ? (rightBig ? C.f : '#334') : C.d;
      txt(numLeft + '',  W * 0.25, H * 0.46, leftBig && responded ? 200 : 180, lc);
      txt(numRight + '', W * 0.75, H * 0.46, rightBig && responded ? 200 : 180, rc);
      if (!responded) txt('VS', W / 2, H * 0.46, 52, C.c);
      if (!responded && phase === 'show') { var tr = Math.max(0, showTimer / SHOW_TIME), bw = W * 0.8; game.draw.rect(snap(W / 2 - bw / 2), snap(H * 0.62), bw, 16, '#000833'); game.draw.rect(snap(W / 2 - bw / 2), snap(H * 0.62), snap(bw * tr), 16, tr > 0.4 ? C.b : C.e); }
    } else { txt('?', W * 0.25, H * 0.46, 180, '#223'); txt('?', W * 0.75, H * 0.46, 180, '#223'); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      txt('7',  W * 0.25, H * 0.46, 180, C.b);
      txt('4',  W * 0.75, H * 0.46, 180, C.d);
      txt('VS', W / 2, H * 0.46, 52, C.c);
      txt(GAME_TITLE,  W / 2, H * 0.16, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.215, 32, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 66, C.g);
        txt('TAP TO START', W / 2, H * 0.83, 48, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.88, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'show') {
        showTimer -= dt;
        if (showTimer <= 0 && !responded) { responded = true; misses++; feedbackOk = false; feedback = 0.4; flashSide = numLeft > numRight ? -1 : 1; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } phase = 'wait'; setTimeout(nextRound, 600); }
      }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt(feedbackOk ? 'CORRECT!' : 'WRONG!', W / 2, H * 0.28, 72, feedbackOk ? C.f : C.e);
    txt('TAP THE BIGGER!', W / 2, H * 0.72, 48, C.c);
    timeBar();
    txt('WIN ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.e : '#000833');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
