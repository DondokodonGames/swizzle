// 079-reaction-chain.js
// リアクションチェーン — 現れた信号にルール通り素早く反応する反射テスト装置
// 操作: 赤→タップ、青→スワイプ上、緑→スワイプ下、黄→なにもしない
// 成功: 2回正確に反応  失敗: 3回間違える or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'REACTION CHAIN';
  var HOW_TO_PLAY = 'REACT TO THE SIGNAL BY RULE';
  var MAX_TIME = 20;
  var NEEDED = 2;            // 修正2: 12 → 2
  var MAX_WRONG = 3;        // 修正2: 5 → 3
  var SHOW_TIME = 1.2;

  var ACTIONS = [
    { color: C.e, name: 'RED',    inst: 'TAP!',        act: 'tap' },
    { color: C.a, name: 'BLUE',   inst: 'SWIPE UP!',   act: 'swipe_up' },
    { color: C.f, name: 'GREEN',  inst: 'SWIPE DOWN!', act: 'swipe_down' },
    { color: C.d, name: 'YELLOW', inst: 'DO NOTHING!', act: 'nothing' }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var cur, phase, showTimer, responded, score, wrongs, timeLeft, done, feedback, feedbackOk;

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

  function initGame() { cur = null; phase = 'wait'; showTimer = 0; responded = false; score = 0; wrongs = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; nextChallenge(); }
  function nextChallenge() { if (state !== S.PLAYING || done) return; cur = ACTIONS[Math.floor(Math.random() * ACTIONS.length)]; phase = 'show'; showTimer = SHOW_TIME; responded = false; }

  function onCorrect() { score++; feedbackOk = true; feedback = 0.4; game.audio.play('se_tap', 0.8); if (score >= NEEDED) finish(true); }
  function onWrong() { wrongs++; feedbackOk = false; feedback = 0.4; game.audio.play('se_failure', 0.6); if (wrongs >= MAX_WRONG) finish(false); }

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
    if (done || responded || phase !== 'show') return;
    responded = true;
    if (cur.act === 'tap') onCorrect(); else onWrong();
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || responded || phase !== 'show') return;
    responded = true;
    if (cur.act === 'swipe_up' && dir === 'up') onCorrect();
    else if (cur.act === 'swipe_down' && dir === 'down') onCorrect();
    else onWrong();
  });

  // 世界観: 反射神経テスト装置。中央パネルに出る信号色に従い正しく反応する。
  function background() {
    game.draw.clear('#000011');
    game.draw.rect(140, snap(H * 0.3), W - 280, snap(H * 0.34), '#000833');
    game.draw.rect(152, snap(H * 0.3) + 12, W - 304, snap(H * 0.34) - 24, '#000022');
    txt('REACTION TESTER', W / 2, 250, 34, C.b);
  }

  function drawRules() {
    var rules = [['RED', C.e, 'TAP'], ['BLUE', C.a, 'UP'], ['GREEN', C.f, 'DN'], ['YELLOW', C.d, 'WAIT']];
    for (var i = 0; i < rules.length; i++) {
      var rx = W / 2 + (i - 1.5) * 250;
      game.draw.rect(snap(rx) - 90, snap(H * 0.8), 180, 90, '#111133');
      game.draw.rect(snap(rx) - 74, snap(H * 0.8) + 14, 40, 40, rules[i][1]);
      txt(rules[i][2], rx + 24, H * 0.8 + 40, 34, C.c);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      var demo = ACTIONS[Math.floor(game.time.elapsed) % 4];
      drawPixelCircle(W / 2, H * 0.47, 150, demo.color, 0.9);
      txt(demo.name, W / 2, H * 0.47, 60, C.c);
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.b);
      drawRules();
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.9, 60, C.g);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.c);
      }
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
        if (showTimer <= 0 && !responded) {
          responded = true;
          if (cur.act === 'nothing') onCorrect(); else onWrong();
        }
        if ((showTimer <= -0.3 || responded) && phase === 'show') { phase = 'wait'; setTimeout(nextChallenge, 400); }
      }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    if (phase === 'show' && cur) {
      var pulse = 0.7 + 0.3 * Math.sin(game.time.elapsed * 12);
      drawPixelCircle(W / 2, H * 0.47, 160, cur.color, pulse);
      txt(cur.name, W / 2, H * 0.42, 64, C.c);
      txt(cur.inst, W / 2, H * 0.55, 56, cur.color);
    } else {
      txt('?', W / 2, H * 0.47, 120, '#333355');
    }
    if (feedback > 0) txt(feedbackOk ? 'GOOD!' : 'MISS!', W / 2, H * 0.24, 80, feedbackOk ? C.f : C.e);
    drawRules();
    timeBar();
    txt('OK ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var w = 0; w < MAX_WRONG; w++) game.draw.rect(W / 2 + (w - 1) * 64 - 20, 150, 40, 40, w < wrongs ? C.e : '#330000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
