// 675-odd-pixel.js
// オッドピクセル — 格子の中で1マスだけ微妙に色が違うマスを見つけてタップする
// 操作: 違う色のマスをタップ。ラウンドが進むほど色差が小さくなり難しくなる
// 成功: 8問 正解  失敗: 3回 誤答 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、色覚検査／マス色は生成コンテンツ） ──
  var C = { bg:'#030508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ODD PIXEL';
  var HOW_TO_PLAY = 'TAP THE ONE TILE WITH A SLIGHTLY DIFFERENT COLOR · IT GETS HARDER';
  var MAX_TIME = 25;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_MISS = 3;          // 修正2: 6 → 3
  var GRID_N = 4, CELL = 200, GAP = 8, GRID_W = GRID_N * CELL + (GRID_N - 1) * GAP, GRID_X = snap((W - GRID_W) / 2), GRID_Y = snap(H * 0.26), DIFF_START = 60;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var baseColor, oddColor, oddRow, oddCol, round, correct, misses, timeLeft, done, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#04060c');
  }

  function background() { game.draw.clear(C.bg); }

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function rgbStr(r, g, b) { return '#' + ('00' + Math.max(0, Math.min(255, r)).toString(16)).slice(-2) + ('00' + Math.max(0, Math.min(255, g)).toString(16)).slice(-2) + ('00' + Math.max(0, Math.min(255, b)).toString(16)).slice(-2); }

  function newRound() {
    var diff = Math.max(20, DIFF_START - round * 4);
    var hue = Math.random();
    if (hue < 0.33) baseColor = [randInt(100, 200), randInt(20, 80), randInt(120, 200)];
    else if (hue < 0.66) baseColor = [randInt(20, 80), randInt(100, 200), randInt(150, 220)];
    else baseColor = [randInt(180, 240), randInt(100, 160), randInt(20, 60)];
    var ch = randInt(0, 2); oddColor = [baseColor[0], baseColor[1], baseColor[2]];
    oddColor[ch] = Math.max(0, Math.min(255, oddColor[ch] + (Math.random() > 0.5 ? diff : -diff)));
    oddRow = randInt(0, GRID_N - 1); oddCol = randInt(0, GRID_N - 1);
  }

  function initGame() { round = 0; correct = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 100) : correct * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var r = 0; r < GRID_N; r++) for (var c = 0; c < GRID_N; c++) {
      var cx = GRID_X + c * (CELL + GAP), cy = GRID_Y + r * (CELL + GAP), isOdd = r === oddRow && c === oddCol, col = isOdd ? oddColor : baseColor;
      game.draw.rect(cx, cy, CELL, CELL, rgbStr(col[0], col[1], col[2]), 0.95);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP)), row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= GRID_N || row < 0 || row >= GRID_N) return;
    if (row === oddRow && col === oddCol) { correct++; round++; flash = 0.3; flashCol = C.b; resultText = 'FOUND IT!'; resultTimer = 0.5; game.audio.play('se_success', 0.55); if (correct >= NEEDED) { finish(true); return; } newRound(); }
    else { misses++; flash = 0.35; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!baseColor) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYES!' : 'COLOR BLIND', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    txt('FIND THE ODD ONE', W / 2, snap(H * 0.20), 40, '#ffffff66');
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.86), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#04060c');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
