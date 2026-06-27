// 675-odd-pixel.js
// 違う一点 — 微妙に色が違うマスを素早く見つけてタップせよ
// 操作: タップで違うマスを選ぶ
// 成功: 20問正解  失敗: 6回間違い or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030508',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#04060c'
  };

  var GRID_N = 4; // 4x4 grid
  var CELL = 200;
  var GAP = 8;
  var GRID_W = GRID_N * CELL + (GRID_N - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = H * 0.22;

  var baseColor = [0, 0, 0];
  var oddColor = [0, 0, 0];
  var oddRow = 0, oddCol = 0;
  var round = 0;
  var DIFF_START = 60; // initial color difference
  var animTimer = 0;

  var correct = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 6;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  function rgbStr(r, g, b) {
    return '#' + ('00' + Math.max(0, Math.min(255, r)).toString(16)).slice(-2) +
                 ('00' + Math.max(0, Math.min(255, g)).toString(16)).slice(-2) +
                 ('00' + Math.max(0, Math.min(255, b)).toString(16)).slice(-2);
  }

  function newRound() {
    animTimer = 0;
    // Increase difficulty: difference shrinks
    var diff = Math.max(18, DIFF_START - round * 2);

    // Pick a vivid base color
    var hue = Math.random();
    if (hue < 0.33) { baseColor = [randInt(100, 200), randInt(20, 80), randInt(120, 200)]; }
    else if (hue < 0.66) { baseColor = [randInt(20, 80), randInt(100, 200), randInt(150, 220)]; }
    else { baseColor = [randInt(180, 240), randInt(100, 160), randInt(20, 60)]; }

    // Odd cell: shift one channel by diff
    var channel = randInt(0, 2);
    oddColor = [baseColor[0], baseColor[1], baseColor[2]];
    oddColor[channel] = Math.max(0, Math.min(255, oddColor[channel] + (Math.random() > 0.5 ? diff : -diff)));

    oddRow = randInt(0, GRID_N - 1);
    oddCol = randInt(0, GRID_N - 1);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP));
    var row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= GRID_N || row < 0 || row >= GRID_N) return;

    if (row === oddRow && col === oddCol) {
      correct++;
      round++;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = '正解！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.55);
      if (correct >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correct * 400 + Math.ceil(timeLeft) * 80); }, 700);
      } else {
        newRound();
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultText = '違う！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      animTimer += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Difficulty label
    var diff2 = Math.max(18, DIFF_START - round * 2);
    game.draw.text('難易度 ' + Math.min(10, Math.floor(round / 2) + 1), W / 2, H * 0.16, { size: 36, color: '#ffffff44' });

    // Grid
    for (var r = 0; r < GRID_N; r++) {
      for (var c = 0; c < GRID_N; c++) {
        var cx2 = GRID_X + c * (CELL + GAP);
        var cy2 = GRID_Y + r * (CELL + GAP);
        var isOdd = r === oddRow && c === oddCol;
        var col2 = isOdd ? oddColor : baseColor;
        var colStr = rgbStr(col2[0], col2[1], col2[2]);

        game.draw.rect(cx2 + 3, cy2 + 3, CELL, CELL, '#000', 0.25);
        game.draw.rect(cx2, cy2, CELL, CELL, colStr, 0.92);
      }
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 64, color: flashCol, bold: true });
    }
    game.draw.text('違う色を探せ！', W / 2, H * 0.13, { size: 40, color: '#ffffff66' });

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 52 + mi * 104, H * 0.955, 22, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);
