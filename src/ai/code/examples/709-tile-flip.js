// 709-tile-flip.js
// タイル返し — タップしたタイルとその隣が色反転、全部同じ色にそろえろ
// 操作: タップでタイルを反転（十字状に4方向も反転）
// 成功: 20問クリア  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030710',
    tileOff: '#1e3a5f',
    tileOn:  '#38bdf8',
    tileHi:  '#7dd3fc',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#040a14'
  };

  var COLS = 5;
  var ROWS = 5;
  var CELL = 168;
  var GAP = 14;
  var GRID_W = COLS * CELL + (COLS - 1) * GAP;
  var GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = (H - GRID_H) / 2 + 80;

  var tiles = [];
  var round = 0;
  var NEEDED = 20;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var resultTimer = 0, resultText = '';
  var waitTimer = 0;
  var tapFlash = -1, tapFlashTimer = 0;

  function newPuzzle() {
    // Start with all tiles OFF, apply N random flips to create solvable puzzle
    tiles = [];
    for (var i = 0; i < COLS * ROWS; i++) tiles.push(0);
    var moves = 5 + Math.floor(round / 3);
    for (var m = 0; m < moves; m++) {
      var idx = Math.floor(Math.random() * COLS * ROWS);
      flipAt(idx);
    }
    waitTimer = 0;
  }

  function flipAt(idx) {
    var col = idx % COLS;
    var row = Math.floor(idx / COLS);
    tiles[idx] ^= 1;
    if (col > 0) tiles[idx - 1] ^= 1;
    if (col < COLS - 1) tiles[idx + 1] ^= 1;
    if (row > 0) tiles[idx - COLS] ^= 1;
    if (row < ROWS - 1) tiles[idx + COLS] ^= 1;
  }

  function allSame() {
    var first = tiles[0];
    for (var i = 1; i < tiles.length; i++) {
      if (tiles[i] !== first) return false;
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0) return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP));
    var row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    var localX = (tx - GRID_X) - col * (CELL + GAP);
    var localY = (ty - GRID_Y) - row * (CELL + GAP);
    if (localX > CELL || localY > CELL) return;

    var idx = row * COLS + col;
    tapFlash = idx;
    tapFlashTimer = 0.2;
    flipAt(idx);
    game.audio.play('se_tap', 0.1);

    if (allSame()) {
      round++;
      flashAnim = 0.35;
      resultText = 'クリア！';
      resultTimer = 0.6;
      game.audio.play('se_success', 0.65);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H / 2, vx: Math.cos(pa) * 240, vy: Math.sin(pa) * 240, life: 0.5, col: C.tileHi });
      }
      if (round >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(round * 400 + Math.ceil(timeLeft) * 70); }, 700);
      } else {
        waitTimer = 0.8;
      }
    }
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (tapFlashTimer > 0) tapFlashTimer -= dt * 5;

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) newPuzzle();
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var row2 = 0; row2 < ROWS; row2++) {
      for (var col2 = 0; col2 < COLS; col2++) {
        var idx2 = row2 * COLS + col2;
        var cx = GRID_X + col2 * (CELL + GAP);
        var cy = GRID_Y + row2 * (CELL + GAP);
        var on = tiles[idx2] === 1;
        var isTap = idx2 === tapFlash && tapFlashTimer > 0;
        var tCol = on ? C.tileOn : C.tileOff;
        var tAlpha = isTap ? 0.95 : (on ? 0.85 : 0.7);
        if (isTap) tCol = C.tileHi;
        game.draw.rect(cx + 3, cy + 3, CELL, CELL, '#000', 0.2);
        game.draw.rect(cx, cy, CELL, CELL, tCol, tAlpha);
        if (on) {
          game.draw.rect(cx, cy, CELL, 10, C.tileHi, 0.3);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.9, { size: 64, color: C.correct, bold: true });
    }

    game.draw.text(round + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newPuzzle();
  });
})(game);
