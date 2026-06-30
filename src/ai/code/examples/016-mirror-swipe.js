// 016-mirror-swipe.js
// 鏡スワイプ — 左右が逆転した世界で正しく動く認知の混乱
// 操作: 表示と反対方向にスワイプ（左矢印→右スワイプ）
// 成功: 1問正解  失敗: 3ミス or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'MIRROR SWIPE';
  var HOW_TO_PLAY = 'SWIPE THE OPPOSITE WAY';
  var MAX_TIME = 18;
  var NEEDED = 1;            // 修正2: 7 → 1
  var MAX_MISS = 3;
  var DIRS = ['left', 'right', 'up', 'down'];
  var MIRROR = { left: 'right', right: 'left', up: 'down', down: 'up' };
  var ARROWS = { left: '←', right: '→', up: '↑', down: '↓' };
  var HINT = { left: '→', right: '←', up: '↓', down: '↑' };
  var CY = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var currentDir, score, misses, timeLeft, done, feedback, feedbackOk, waiting;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function nextQuestion() { currentDir = DIRS[Math.floor(Math.random() * DIRS.length)]; feedback = 0; waiting = false; }
  function initGame() { score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; nextQuestion(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 200 + Math.ceil(timeLeft) * 50) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || waiting || !currentDir) return;
    feedback = 0.4; waiting = true;
    if (dir === MIRROR[currentDir]) {
      score++; feedbackOk = true;
      game.audio.play('se_tap', 0.9);
      if (score >= NEEDED) { finish(true); return; }
    } else {
      misses++; feedbackOk = false;
      game.audio.play('se_failure', 0.6);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
    setTimeout(function() { if (!done) nextQuestion(); }, 380);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(W / 2 - 3, H * 0.2, 6, H * 0.6, C.d, 0.6);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      var demoDir = DIRS[Math.floor(game.time.elapsed) % 4];
      txt(ARROWS[demoDir], W / 2, CY, 360, C.e);
      txt(GAME_TITLE,  W / 2, H * 0.18, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 42, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.85, 52, C.g);
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
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    var arrowCol = feedback > 0 ? (feedbackOk ? C.b : C.a) : C.e;
    txt('MIRROR MODE', W / 2, H * 0.3, 40, C.d);
    txt(ARROWS[currentDir] || '', W / 2, CY, 400, arrowCol);
    if (feedback > 0) {
      if (feedbackOk) txt('OK!', W / 2, CY - 320, 80, C.b);
      else txt(HINT[currentDir], W / 2, CY - 320, 100, C.a);
    }
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.g);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    txt('SWIPE OPPOSITE!', W / 2, H - 100, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
