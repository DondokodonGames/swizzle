// 773-tile-memory.js
// タイルメモリー — 光ったタイルを覚えて、消えた後に正確に再現せよ
// 操作: タップ（記憶フェーズは見るだけ、再現フェーズでタップ）
// 成功: 20ラウンド完璧  失敗: 8回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#08050f',
    tile:    '#1a1730',
    tileHi:  '#312e81',
    lit:     '#818cf8',
    litHi:   '#ede9fe',
    marked:  '#f97316',
    markedHi:'#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#100c1c'
  };

  var COLS = 3;
  var ROWS = 3;
  var MARGIN = 100;
  var TILE_GAP = 16;
  var TILE_W = (W - MARGIN * 2 - TILE_GAP * (COLS - 1)) / COLS;
  var TILE_H = TILE_W;
  var GRID_Y = H * 0.3;

  var phase = 'show'; // 'show' | 'recall' | 'wait'
  var showTimer = 0;
  var SHOW_DUR = 1.5;
  var waitTimer = 0;
  var WAIT_DUR = 0.45;

  var litSet = [];       // which tiles were lit
  var markedSet = [];    // which tiles player marked
  var tileCount = 2;     // number of lit tiles (increases with score)

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var particles = [];

  function getTileRect(idx) {
    var col = idx % COLS;
    var row = Math.floor(idx / COLS);
    var tx = MARGIN + col * (TILE_W + TILE_GAP);
    var ty = GRID_Y + row * (TILE_H + TILE_GAP);
    return { x: tx, y: ty, w: TILE_W, h: TILE_H };
  }

  function newRound() {
    litSet = [];
    markedSet = [];
    tileCount = Math.min(6, 2 + Math.floor(score / 5));
    // Pick random tiles to light
    while (litSet.length < tileCount) {
      var ti = Math.floor(Math.random() * COLS * ROWS);
      if (litSet.indexOf(ti) < 0) litSet.push(ti);
    }
    SHOW_DUR = Math.max(0.8, 1.5 - score * 0.02);
    showTimer = SHOW_DUR;
    phase = 'show';
  }

  function submitAnswer() {
    // Check if markedSet matches litSet exactly
    var correct = litSet.length === markedSet.length;
    if (correct) {
      for (var i = 0; i < litSet.length; i++) {
        if (markedSet.indexOf(litSet[i]) < 0) { correct = false; break; }
      }
    }
    if (correct) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.22;
      resultText = '完璧！';
      resultTimer = 0.4;
      game.audio.play('se_success', 0.65);
      for (var i2 = 0; i2 < litSet.length; i2++) {
        var r2 = getTileRect(litSet[i2]);
        for (var p = 0; p < 3; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: r2.x + r2.w / 2, y: r2.y + r2.h / 2, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.35, col: C.litHi });
        }
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 120); }, 700);
        return;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '違う！';
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    phase = 'wait';
    waitTimer = WAIT_DUR;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'recall') return;
    // Find tapped tile
    var tappedIdx = -1;
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = getTileRect(i);
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
        tappedIdx = i;
        break;
      }
    }
    if (tappedIdx < 0) return;

    // Toggle
    var mi = markedSet.indexOf(tappedIdx);
    if (mi >= 0) {
      markedSet.splice(mi, 1);
      game.audio.play('se_tap', 0.06);
    } else if (markedSet.length < litSet.length) {
      markedSet.push(tappedIdx);
      game.audio.play('se_tap', 0.09);
      // Auto-submit when enough tiles marked
      if (markedSet.length === litSet.length) {
        submitAnswer();
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

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        phase = 'recall';
      }
    } else if (phase === 'wait') {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) newRound();
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Phase label
    if (phase === 'show') {
      game.draw.text('覚えろ！', W / 2, H * 0.23, { size: 56, color: C.lit, bold: true });
      var showFrac = showTimer / SHOW_DUR;
      game.draw.rect(W / 2 - 240, H * 0.27, 480, 12, '#1a1a2a', 0.8);
      game.draw.rect(W / 2 - 240, H * 0.27, 480 * showFrac, 12, C.lit, 0.85);
    } else if (phase === 'recall') {
      game.draw.text('再現せよ！ (' + markedSet.length + '/' + litSet.length + ')', W / 2, H * 0.24, { size: 46, color: C.marked, bold: true });
    }

    // Grid
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = getTileRect(i);
      var isLit = litSet.indexOf(i) >= 0;
      var isMarked = markedSet.indexOf(i) >= 0;
      var showLit = phase === 'show' && isLit;

      game.draw.rect(r.x + 4, r.y + 4, r.w, r.h, '#000', 0.25);
      game.draw.rect(r.x, r.y, r.w, r.h, showLit ? C.tileHi : (isMarked ? '#2c1a08' : C.tile), 0.9);

      if (showLit) {
        game.draw.rect(r.x, r.y, r.w, r.h, C.lit, 0.5);
        game.draw.circle(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.3, C.litHi, 0.4);
        game.draw.rect(r.x, r.y, r.w, 8, C.litHi, 0.4);
      } else if (isMarked) {
        game.draw.rect(r.x, r.y, r.w, r.h, C.marked, 0.35);
        game.draw.circle(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.28, C.markedHi, 0.5);
      }

      // Show correct answers after wrong answer
      if (phase === 'wait' && resultTimer > 0 && flashCol === C.wrong) {
        if (isLit) {
          game.draw.rect(r.x, r.y, r.w, r.h, C.correct, 0.3);
        }
      }
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    // Tile count hint
    if (phase === 'recall') {
      game.draw.text('覚えたタイルを ' + litSet.length + ' つタップ', W / 2, H * 0.83, { size: 34, color: C.text + '77' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 56, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);
