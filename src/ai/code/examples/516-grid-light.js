// 516-grid-light.js
// グリッドライト — 点灯パターンを記憶して消えた後に同じセルをタップ
// 操作: 点灯したセルを記憶してからタップで再現
// 成功: 12ラウンドクリア  失敗: 5ミス or 80秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000508',
    panel:   '#020e12',
    cellOff: '#04161c',
    cellOn:  '#06b6d4',
    cellOnHi:'#a5f3fc',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var GRID = 4;
  var CELL = 220;
  var OX = (W - GRID * CELL) / 2;
  var OY = H * 0.28;

  var sequence = [];
  var seqLen = 3;
  var phase = 'showing'; // 'showing' | 'recall'
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_EACH = 0.6;
  var playerSeq = [];
  var rounds = 0;
  var NEEDED = 12;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 80;
  var elapsed = 0;
  var particles = [];
  var litCells = {}; // cells currently lit (for recall)
  var correctCells = {};
  var flashAnim = 0;
  var flashCol = C.correct;
  var delayTimer = 0;

  function genSequence() {
    sequence = [];
    var used = {};
    for (var i = 0; i < seqLen; i++) {
      var cell, attempts = 0;
      do {
        cell = Math.floor(Math.random() * GRID * GRID);
        attempts++;
      } while (used[cell] && attempts < 30);
      used[cell] = true;
      sequence.push(cell);
    }
    showIdx = 0;
    showTimer = SHOW_EACH;
    phase = 'showing';
    litCells = {};
    correctCells = {};
    playerSeq = [];
    for (var si = 0; si < sequence.length; si++) correctCells[sequence[si]] = true;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'recall') return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var cell = row * GRID + col;
    if (litCells[cell]) return; // already tapped

    litCells[cell] = true;
    playerSeq.push(cell);
    game.audio.play('se_tap', 0.3);

    if (correctCells[cell]) {
      // Correct cell
      for (var pi = 0; pi < 5; pi++) {
        var ang = Math.random() * Math.PI * 2;
        var cx = OX + col * CELL + CELL / 2;
        var cy = OY + row * CELL + CELL / 2;
        particles.push({ x: cx, y: cy, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 100, life: 0.35, col: C.cellOnHi });
      }
    } else {
      // Wrong cell
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }

    // Check if all correct cells found
    var correctFound = 0;
    for (var ci in litCells) {
      if (correctCells[ci]) correctFound++;
    }
    if (correctFound >= sequence.length) {
      rounds++;
      flashCol = C.correct;
      flashAnim = 0.5;
      game.audio.play('se_success', 0.8);
      if (rounds >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(rounds * 500 + Math.ceil(timeLeft) * 100); }, 700);
      } else {
        if (rounds % 3 === 0 && seqLen < 8) seqLen++;
        delayTimer = 0.7;
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

    if (delayTimer > 0) {
      delayTimer -= dt;
      if (delayTimer <= 0 && !done) genSequence();
    }

    if (phase === 'showing') {
      showTimer -= dt;
      if (showTimer <= 0) {
        showIdx++;
        if (showIdx >= sequence.length) {
          // Brief pause then switch to recall
          phase = 'recall';
        } else {
          showTimer = SHOW_EACH;
          game.audio.play('se_tap', 0.25);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(OX - 12, OY - 12, GRID * CELL + 24, GRID * CELL + 24, C.panel, 0.9);

    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var cell = r * GRID + c;
        var cx = OX + c * CELL;
        var cy = OY + r * CELL;
        var isLit = false;

        if (phase === 'showing') {
          isLit = (sequence[showIdx] === cell);
        } else {
          isLit = !!litCells[cell];
        }

        game.draw.rect(cx + 6, cy + 6, CELL - 12, CELL - 12, isLit ? C.cellOn : C.cellOff, 0.9);
        if (isLit) {
          game.draw.rect(cx + 6, cy + 6, CELL - 12, CELL - 12, C.cellOnHi, 0.15);
          game.draw.rect(cx + 6, cy + 6, CELL - 12, 10, C.cellOnHi, 0.4);
          // Glow
          game.draw.circle(cx + CELL / 2, cy + CELL / 2, CELL * 0.4, C.cellOn, 0.15);
        }

        // Show correct cells during recall as subtle hint
        if (phase === 'recall' && correctCells[cell] && !litCells[cell]) {
          game.draw.rect(cx + 6, cy + 6, CELL - 12, CELL - 12, C.cellOn, 0.04);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Phase label
    var phaseText = phase === 'showing' ? ('記憶中... ' + (showIdx + 1) + '/' + sequence.length) : ('タップ！ ' + seqLen + '個');
    game.draw.text(phaseText, W / 2, OY + GRID * CELL + 60, { size: 48, color: C.text });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 56 + mi * 112, H * 0.955, 20, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(rounds + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 80);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.cellOn : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    genSequence();
  });
})(game);
