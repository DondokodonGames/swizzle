// 471-speed-typer.js
// 残像タイパー — フラッシュする数字を記憶して順番にタップ
// 操作: 表示された数字が消えた後、1→2→3→...の順でタップ
// 成功: 8ラウンドクリア  失敗: 3ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020310',
    card:   '#0d1035',
    num:    '#60a5fa',
    numHi:  '#bfdbfe',
    flash:  '#f0f9ff',
    correct:'#22c55e',
    wrong:  '#ef4444',
    next:   '#fbbf24',
    done2:  '#a78bfa',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var GRID_COLS = 4;
  var GRID_ROWS = 4;
  var CELL_SIZE = 220;
  var OX = (W - GRID_COLS * CELL_SIZE) / 2;
  var OY = (H - GRID_ROWS * CELL_SIZE) / 2 - 60;

  var phase = 'show';  // 'show', 'hide', 'input'
  var round = 0;
  var NEEDED = 8;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;

  var numbers = [];   // positions: [{x,y,num}] in grid
  var nextExpected = 1;
  var showTimer = 0;
  var SHOW_DURATION = 1.8;
  var tapped = [];    // which grid cells have been tapped correctly
  var wrongAnim = 0;
  var wrongCell = -1;

  function startRound() {
    round++;
    nextExpected = 1;
    tapped = [];
    wrongAnim = 0;
    wrongCell = -1;
    // Shuffle numbers 1..COLS*ROWS into grid
    var count = GRID_COLS * GRID_ROWS;
    var positions = [];
    for (var i = 0; i < count; i++) positions.push(i);
    // Shuffle
    for (var j = positions.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = positions[j]; positions[j] = positions[k]; positions[k] = tmp;
    }
    numbers = [];
    for (var n = 0; n < count; n++) {
      var pos = positions[n];
      var col = pos % GRID_COLS;
      var row = Math.floor(pos / GRID_COLS);
      numbers.push({ num: n + 1, col: col, row: row });
    }
    phase = 'show';
    showTimer = SHOW_DURATION;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'input') return;
    // Find which cell was tapped
    var col = Math.floor((tx - OX) / CELL_SIZE);
    var row = Math.floor((ty - OY) / CELL_SIZE);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

    // Find number at this cell
    var found = null;
    for (var i = 0; i < numbers.length; i++) {
      if (numbers[i].col === col && numbers[i].row === row) {
        found = numbers[i];
        break;
      }
    }
    if (!found) return;

    if (found.num === nextExpected) {
      tapped.push(found.num);
      nextExpected++;
      game.audio.play('se_tap', 0.4);
      var cx = OX + found.col * CELL_SIZE + CELL_SIZE / 2;
      var cy = OY + found.row * CELL_SIZE + CELL_SIZE / 2;
      for (var pi = 0; pi < 5; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: cx, y: cy, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 100, life: 0.5, col: C.correct });
      }
      if (nextExpected > GRID_COLS * GRID_ROWS) {
        // Round complete
        flashCol = C.correct;
        flashAnim = 0.5;
        game.audio.play('se_success', 0.7);
        if (round >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(round * 500 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          setTimeout(function() { if (!done) startRound(); }, 800);
          phase = 'wait';
        }
      }
    } else {
      misses++;
      wrongAnim = 0.5;
      wrongCell = found.num;
      game.audio.play('se_failure', 0.4);
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
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (wrongAnim > 0) wrongAnim -= dt * 3;

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        phase = 'input';
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid cells
    for (var ni = 0; ni < numbers.length; ni++) {
      var n = numbers[ni];
      var cx2 = OX + n.col * CELL_SIZE + CELL_SIZE / 2;
      var cy2 = OY + n.row * CELL_SIZE + CELL_SIZE / 2;
      var alreadyTapped = tapped.indexOf(n.num) >= 0;
      var isWrong = wrongAnim > 0 && wrongCell === n.num;

      game.draw.rect(OX + n.col * CELL_SIZE + 6, OY + n.row * CELL_SIZE + 6, CELL_SIZE - 12, CELL_SIZE - 12, C.card, 0.8);

      if (phase === 'show') {
        // Show all numbers
        var blink = showTimer < 0.4 ? Math.sin(showTimer * 30) * 0.5 + 0.5 : 1;
        game.draw.text(n.num + '', cx2, cy2 + 28, { size: 100, color: n.num === 1 ? C.next : C.num, bold: true });
      } else if (phase === 'input' || phase === 'wait') {
        if (alreadyTapped) {
          game.draw.rect(OX + n.col * CELL_SIZE + 6, OY + n.row * CELL_SIZE + 6, CELL_SIZE - 12, CELL_SIZE - 12, C.correct, 0.15);
          game.draw.text('✓', cx2, cy2 + 28, { size: 80, color: C.correct, bold: true });
        } else if (isWrong) {
          game.draw.rect(OX + n.col * CELL_SIZE + 6, OY + n.row * CELL_SIZE + 6, CELL_SIZE - 12, CELL_SIZE - 12, C.wrong, wrongAnim * 0.3);
          game.draw.text('✗', cx2, cy2 + 28, { size: 80, color: C.wrong, bold: true });
        } else {
          // Hidden — show "?"
          game.draw.text('?', cx2, cy2 + 28, { size: 80, color: C.ui, bold: true });
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Phase label
    if (phase === 'show') {
      game.draw.text('覚えて！', W / 2, OY - 80, { size: 52, color: C.numHi, bold: true });
    } else if (phase === 'input') {
      game.draw.text(nextExpected + ' をタップ！', W / 2, OY - 80, { size: 52, color: C.next, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 60 + mi * 120, H * 0.955, 22, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text('ラウンド ' + round + ' / ' + NEEDED, W / 2, 148, { size: 52, color: C.text, bold: true });
    var ratio2 = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio2, 72, ratio2 > 0.3 ? C.num : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    startRound();
  });
})(game);
