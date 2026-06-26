// 524-signal-intercept.js
// シグナルインターセプト — スクロールするコード列から特定パターンを素早くタップ
// 操作: 画面をスクロールするコード列の中から目標パターンをタップ
// 成功: 15個発見  失敗: 8個見逃す or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000a00',
    scanline:'#001400',
    text:    '#00ff41',
    textDim: '#004d14',
    target:  '#ff6b00',
    targetBg:'#2a1400',
    caught:  '#22c55e',
    miss:    '#ef4444',
    ui:      '#005500',
    border:  '#00aa22'
  };

  var CHARS = '01ABCDEFabcdef';
  var PATTERNS = ['A1B2', 'FF00', 'DEAD', 'CAFE', 'BABE', '0xFF'];
  var targetPattern = PATTERNS[0];
  var COL_COUNT = 6;
  var ROW_H = 72;
  var COL_W = W / COL_COUNT;
  var VISIBLE_ROWS = Math.ceil(H / ROW_H) + 2;
  var scrollY = 0;
  var scrollSpeed = 120;

  var columns = [];
  var found = 0;
  var NEEDED = 15;
  var missed = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var scanLine = 0;
  var flashTargets = [];

  function randChar() {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  function randToken() {
    var len = 4;
    var s = '';
    for (var i = 0; i < len; i++) s += randChar();
    return s;
  }

  function initColumns() {
    for (var c = 0; c < COL_COUNT; c++) {
      columns[c] = [];
      for (var r = 0; r < VISIBLE_ROWS + 10; r++) {
        columns[c].push({ text: randToken(), isTarget: false, hit: false });
      }
    }
    placeTargets();
  }

  function placeTargets() {
    // Place targets in random cells
    for (var c = 0; c < COL_COUNT; c++) {
      for (var r = 0; r < columns[c].length; r++) {
        if (Math.random() < 0.08) {
          columns[c][r].text = targetPattern;
          columns[c][r].isTarget = true;
        }
      }
    }
  }

  function extendColumns() {
    for (var c = 0; c < COL_COUNT; c++) {
      var newCell = { text: randToken(), isTarget: false, hit: false };
      if (Math.random() < 0.08) {
        newCell.text = targetPattern;
        newCell.isTarget = true;
      }
      columns[c].push(newCell);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor(tx / COL_W);
    var adjustedY = ty + scrollY;
    var row = Math.floor(adjustedY / ROW_H);

    if (col >= 0 && col < COL_COUNT && row >= 0 && row < columns[col].length) {
      var cell = columns[col][row];
      if (cell.hit) return;
      cell.hit = true;

      if (cell.isTarget) {
        found++;
        flashAnim = 0.3;
        game.audio.play('se_success', 0.6);
        var cx = col * COL_W + COL_W / 2;
        var cy = row * ROW_H + ROW_H / 2 - scrollY;
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: cx, y: cy, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: C.caught });
        }
        flashTargets.push({ x: cx, y: cy, life: 0.5 });
        if (found >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(found * 400 + Math.ceil(timeLeft) * 100); }, 700);
        }
      } else {
        // Wrong tap
        missed++;
        game.audio.play('se_failure', 0.3);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
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

    // Scroll
    scrollY += scrollSpeed * dt;
    var rowsScrolled = Math.floor(scrollY / ROW_H);
    while (rowsScrolled > 0) {
      for (var c = 0; c < COL_COUNT; c++) {
        if (columns[c].length > 0) {
          var gone = columns[c].shift();
          // Count escaped targets
          if (gone.isTarget && !gone.hit) {
            missed++;
            if (missed >= MAX_MISS && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 500);
            }
          }
        }
      }
      extendColumns();
      scrollY -= ROW_H;
      rowsScrolled--;
    }

    scanLine = (scanLine + dt * 200) % H;

    for (var ft = flashTargets.length - 1; ft >= 0; ft--) {
      flashTargets[ft].life -= dt * 2;
      if (flashTargets[ft].life <= 0) flashTargets.splice(ft, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Column dividers
    for (var c2 = 0; c2 < COL_COUNT; c2++) {
      game.draw.line(c2 * COL_W, 0, c2 * COL_W, H, C.ui, 1);
    }

    // Draw cells
    for (var c3 = 0; c3 < COL_COUNT; c3++) {
      for (var r2 = 0; r2 < columns[c3].length; r2++) {
        var cell2 = columns[c3][r2];
        var cy2 = r2 * ROW_H - scrollY + ROW_H / 2;
        if (cy2 < -ROW_H || cy2 > H + ROW_H) continue;

        if (cell2.isTarget && !cell2.hit) {
          game.draw.rect(c3 * COL_W + 4, cy2 - ROW_H / 2 + 4, COL_W - 8, ROW_H - 8, C.targetBg, 0.8);
          game.draw.text(cell2.text, c3 * COL_W + COL_W / 2, cy2 + 20, { size: 40, color: C.target, bold: true });
        } else if (cell2.hit) {
          game.draw.text(cell2.text, c3 * COL_W + COL_W / 2, cy2 + 20, { size: 40, color: '#225522' });
        } else {
          game.draw.text(cell2.text, c3 * COL_W + COL_W / 2, cy2 + 20, { size: 40, color: C.textDim });
        }
      }
    }

    // Scan line
    game.draw.rect(0, scanLine, W, 3, C.text, 0.1);

    // Flash targets
    for (var ft2 = 0; ft2 < flashTargets.length; ft2++) {
      var f = flashTargets[ft2];
      game.draw.circle(f.x, f.y, 80 * (1 - f.life + 0.5), C.caught, f.life * 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.caught, flashAnim * 0.08);

    // Header
    game.draw.rect(0, 0, W, 72, '#000', 0.9);
    game.draw.rect(0, 0, W, 72, C.bg, 0.95);
    game.draw.text('TARGET: ' + targetPattern, W / 2, 36, { size: 36, color: C.target, bold: true });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 48 + mi * 96, H * 0.955, 18, mi < missed ? C.miss : C.ui, 0.9);
    }

    game.draw.text(found + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 8, C.border, ratio);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    targetPattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    initColumns();
  });
})(game);
