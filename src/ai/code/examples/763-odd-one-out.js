// 763-odd-one-out.js
// 仲間はずれ — 4つの中から違う1つを素早く見つけてタップせよ
// 操作: タップで仲間はずれをタップ
// 成功: 35回正解  失敗: 8回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#070510',
    itemA:   '#818cf8',
    itemB:   '#f472b6',
    itemC:   '#34d399',
    itemD:   '#fbbf24',
    border:  '#1e1b4b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0c0a18'
  };

  var GRID_COLS = 2;
  var GRID_ROWS = 2;
  var CELL_W = W * 0.42;
  var CELL_H = H * 0.18;
  var CELL_GAP_X = (W - CELL_W * 2) / 3;
  var CELL_GAP_Y = H * 0.05;
  var GRID_TOP = H * 0.28;

  var items = []; // { x, y, w, h, color, shape, isOdd }
  var answered = false;
  var waitTimer = 0;
  var WAIT_DUR = 0.35;

  var score = 0;
  var NEEDED = 35;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  // Shape types: 'circle', 'rect', 'triangle', 'diamond'
  var SHAPES = ['circle', 'rect', 'triangle', 'diamond'];
  var COLORS = [C.itemA, C.itemB, C.itemC, C.itemD];

  function getCellPos(idx) {
    var col = idx % GRID_COLS;
    var row = Math.floor(idx / GRID_COLS);
    var cx = CELL_GAP_X + col * (CELL_W + CELL_GAP_X) + CELL_W / 2;
    var cy = GRID_TOP + row * (CELL_H + CELL_GAP_Y) + CELL_H / 2;
    return { cx: cx, cy: cy };
  }

  function newRound() {
    items = [];
    answered = false;
    // Choose majority vs odd
    var useColorDiff = Math.random() < 0.5;
    var majorShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    var majorColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    var oddIdx = Math.floor(Math.random() * 4);
    var oddShape = majorShape;
    var oddColor = majorColor;

    if (useColorDiff) {
      // 3 same color, 1 different color, all same shape
      var otherColors = COLORS.filter(function(c) { return c !== majorColor; });
      oddColor = otherColors[Math.floor(Math.random() * otherColors.length)];
    } else {
      // 3 same shape, 1 different shape, all same color
      var otherShapes = SHAPES.filter(function(s) { return s !== majorShape; });
      oddShape = otherShapes[Math.floor(Math.random() * otherShapes.length)];
    }

    for (var i = 0; i < 4; i++) {
      var pos = getCellPos(i);
      var isOdd = i === oddIdx;
      items.push({
        cx: pos.cx, cy: pos.cy,
        w: CELL_W - 24, h: CELL_H - 16,
        color: isOdd ? oddColor : majorColor,
        shape: isOdd ? oddShape : majorShape,
        isOdd: isOdd
      });
    }
  }

  function drawShape(shape, cx, cy, w, h, color) {
    var hw = w / 2;
    var hh = h / 2;
    if (shape === 'circle') {
      var r = Math.min(hw, hh) * 0.8;
      game.draw.circle(cx, cy, r, color, 0.9);
      game.draw.circle(cx - r * 0.3, cy - r * 0.3, r * 0.2, '#fff', 0.4);
    } else if (shape === 'rect') {
      game.draw.rect(cx - hw * 0.8, cy - hh * 0.8, hw * 1.6, hh * 1.6, color, 0.9);
      game.draw.rect(cx - hw * 0.8, cy - hh * 0.8, hw * 1.6, 8, '#fff', 0.2);
    } else if (shape === 'triangle') {
      // Draw as 3 lines forming a triangle using rects
      var sz = Math.min(hw, hh) * 1.4;
      // Top vertex
      var tx1 = cx; var ty1 = cy - sz * 0.7;
      // Bottom left
      var tx2 = cx - sz * 0.7; var ty2 = cy + sz * 0.5;
      // Bottom right
      var tx3 = cx + sz * 0.7; var ty3 = cy + sz * 0.5;
      game.draw.line(tx1, ty1, tx2, ty2, color, 18);
      game.draw.line(tx2, ty2, tx3, ty3, color, 18);
      game.draw.line(tx3, ty3, tx1, ty1, color, 18);
      game.draw.circle(cx, cy, sz * 0.25, color, 0.5);
    } else if (shape === 'diamond') {
      var ds = Math.min(hw, hh) * 0.85;
      game.draw.line(cx, cy - ds, cx + ds, cy, color, 18);
      game.draw.line(cx + ds, cy, cx, cy + ds, color, 18);
      game.draw.line(cx, cy + ds, cx - ds, cy, color, 18);
      game.draw.line(cx - ds, cy, cx, cy - ds, color, 18);
      game.draw.circle(cx, cy, ds * 0.25, color, 0.5);
    }
  }

  game.onTap(function(tx, ty) {
    if (done || answered || waitTimer > 0) return;
    var tappedIdx = -1;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (tx > it.cx - it.w / 2 && tx < it.cx + it.w / 2 && ty > it.cy - it.h / 2 && ty < it.cy + it.h / 2) {
        tappedIdx = i;
        break;
      }
    }
    if (tappedIdx < 0) return;
    answered = true;
    if (items[tappedIdx].isOdd) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.2;
      resultText = '正解！';
      resultTimer = 0.35;
      game.audio.play('se_success', 0.55);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 320 + Math.ceil(timeLeft) * 100); }, 700);
        return;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.28;
      resultText = '違う！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    waitTimer = WAIT_DUR;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) newRound();
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Title hint
    game.draw.text('仲間はずれを探せ！', W / 2, H * 0.23, { size: 40, color: C.text + '88' });

    // Item cells
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      // Cell background
      game.draw.rect(it.cx - it.w / 2 - 4, it.cy - it.h / 2 - 4, it.w + 8, it.h + 8, '#000', 0.3);
      game.draw.rect(it.cx - it.w / 2, it.cy - it.h / 2, it.w, it.h, C.border, 0.9);
      // Shape
      drawShape(it.shape, it.cx, it.cy, it.w * 0.7, it.h * 0.85, it.color);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.73, { size: 56, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
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
