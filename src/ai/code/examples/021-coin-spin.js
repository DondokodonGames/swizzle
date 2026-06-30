// 021-coin-spin.js
// コインスピン — 倒れそうなコインが止まる瞬間を見極める賭け
// 操作: コインが表を向いた瞬間にタップ
// 成功: 1回表で止める  失敗: 裏で止める3回 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'COIN SPIN';
  var HOW_TO_PLAY = 'TAP ON HEADS';
  var MAX_TIME = 15;
  var NEEDED = 1;            // 修正2: 5 → 1
  var MAX_MISS = 3;
  var CY = H * 0.45;
  var COIN_R = 300;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var spinAngle, spinSpeed, done, timeLeft, score, misses, feedback, feedbackOk, paused, pauseTimer;

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

  function isHeads() { return Math.cos(spinAngle) > 0; }
  function initGame() {
    spinAngle = 0; spinSpeed = 4.5; done = false; timeLeft = MAX_TIME;
    score = 0; misses = 0; feedback = 0; feedbackOk = false; paused = false; pauseTimer = 0;
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
    if (done || paused) return;
    feedback = 0.4; paused = true; pauseTimer = 0.42;
    if (isHeads()) {
      score++; feedbackOk = true;
      game.audio.play('se_tap', 0.9);
      if (score >= NEEDED) finish(true);
    } else {
      misses++; feedbackOk = false;
      game.audio.play('se_failure', 0.6);
      if (misses >= MAX_MISS) finish(false);
    }
  });

  function background() { game.draw.clear(C.bg); }

  function drawCoin() {
    var cosA = Math.cos(spinAngle), heads = cosA > 0;
    var sqW = snap(COIN_R * Math.abs(cosA));
    var col = heads ? C.d : '#5577ff';
    if (sqW > 4) {
      game.draw.rect(snap(W / 2 - sqW), snap(CY - COIN_R), sqW * 2, COIN_R * 2, col);
      game.draw.rect(snap(W / 2 - sqW), snap(CY - COIN_R), sqW * 2, 16, C.g, 0.5);
      if (sqW > 120) txt(heads ? '¥' : '♦', W / 2, CY, Math.floor(sqW * 1.2), heads ? C.f : C.b);
      // 縁
      game.draw.rect(snap(W / 2 - sqW), snap(CY - COIN_R), sqW * 2, 16, heads ? C.f : C.a);
      game.draw.rect(snap(W / 2 - sqW), snap(CY + COIN_R) - 16, sqW * 2, 16, heads ? C.f : C.a);
    }
    return heads;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      spinAngle = game.time.elapsed * 4;
      drawCoin();
      txt(GAME_TITLE,  W / 2, H * 0.14, 84, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 44, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.85, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 42, '#888888');
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
      if (paused) { pauseTimer -= dt; if (pauseTimer <= 0) paused = false; }
      else spinAngle += (spinSpeed + score * 0.6) * dt;
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    var heads = drawCoin();
    if (feedback > 0) {
      if (feedbackOk) txt('HEADS!', W / 2, CY - COIN_R - 100, 88, C.f);
      else txt('TAILS...', W / 2, CY - COIN_R - 100, 80, C.e);
    }
    txt(heads ? 'HEADS' : 'TAILS', W / 2, CY + COIN_R + 80, 52, heads ? C.d : C.b);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.c);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.e : '#330000');
    txt('TAP ON HEADS!', W / 2, H - 100, 56, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
