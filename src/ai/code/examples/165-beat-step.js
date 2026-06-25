// 165-beat-step.js
// ビートステップ — 音楽のビートが光るタイミングで踏むリズム感ゲーム
// 操作: 光ったパネルをタップ
// 成功: 30回ジャストタイミング  失敗: 8回ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060414',
    panel:  '#1a1040',
    panelHi:'#2d1a6e',
    active: '#7c3aed',
    activeHi:'#a78bfa',
    perfect:'#fef08a',
    hit:    '#22c55e',
    hitHi:  '#86efac',
    wrong:  '#ef4444',
    ui:     '#334155'
  };

  var COLS = 4;
  var ROWS = 4;
  var CELL_W = (W - 120) / COLS;
  var CELL_H = 200;
  var GRID_X = 60;
  var GRID_Y = H * 0.3;
  var CELL_PAD = 12;

  var BPM = 110;
  var BEAT = 60 / BPM;
  var beatTimer = 0;
  var beatCount = 0;
  var beatFlash = 0;

  // Each cell has a "schedule" - lights on beat X, off on beat X+1
  var cells = [];
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      cells.push({
        x: GRID_X + c * CELL_W,
        y: GRID_Y + r * CELL_H,
        lit: false,
        hitTimer: 0,
        missTimer: 0,
        litBeat: -1
      });
    }
  }

  var score = 0;
  var needed = 30;
  var misses = 0;
  var maxMisses = 8;
  var timeLeft = 40;
  var done = false;
  var particles = [];

  function activateRandomCell() {
    var unlit = cells.filter(function(c) { return !c.lit && c.hitTimer <= 0 && c.missTimer <= 0; });
    if (unlit.length === 0) return;
    var count = Math.min(Math.floor(1 + score / 8), 3);
    for (var i = 0; i < count && i < unlit.length; i++) {
      var cell = unlit[Math.floor(Math.random() * unlit.length)];
      unlit.splice(unlit.indexOf(cell), 1);
      cell.lit = true;
      cell.litBeat = beatCount;
    }
  }

  function deactivateOldCells() {
    for (var ci = 0; ci < cells.length; ci++) {
      var c = cells[ci];
      if (c.lit && beatCount > c.litBeat + 2) {
        c.lit = false;
        misses++;
        c.missTimer = 0.35;
        game.audio.play('se_failure', 0.3);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitAny = false;
    for (var ci = 0; ci < cells.length; ci++) {
      var c = cells[ci];
      if (!c.lit) continue;
      if (tx >= c.x && tx <= c.x + CELL_W - CELL_PAD &&
          ty >= c.y && ty <= c.y + CELL_H - CELL_PAD) {
        c.lit = false;
        c.hitTimer = 0.4;
        score++;
        hitAny = true;
        // Perfect timing bonus
        var beatPhase = beatTimer / BEAT;
        var isPerfect = beatPhase < 0.2 || beatPhase > 0.8;
        game.audio.play('se_success', isPerfect ? 1.0 : 0.6);
        for (var pi = 0; pi < (isPerfect ? 12 : 6); pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: c.x + CELL_W / 2, y: c.y + CELL_H / 2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200 - 80, life: 0.5, perfect: isPerfect });
        }
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 30 + Math.ceil(timeLeft) * 25); }, 400);
        }
        break;
      }
    }
    if (!hitAny) {
      misses++;
      game.audio.play('se_failure', 0.4);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    beatTimer += dt;
    if (beatTimer >= BEAT) {
      beatTimer -= BEAT;
      beatCount++;
      beatFlash = 0.18;
      deactivateOldCells();
      if (beatCount % 2 === 0) activateRandomCell();
    }
    if (beatFlash > 0) beatFlash -= dt;

    for (var ci = 0; ci < cells.length; ci++) {
      if (cells[ci].hitTimer > 0) cells[ci].hitTimer -= dt;
      if (cells[ci].missTimer > 0) cells[ci].missTimer -= dt;
    }
    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 400 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Beat pulse
    if (beatFlash > 0) {
      game.draw.circle(W / 2, H / 2, 600, C.activeHi, beatFlash * 0.08);
    }

    // Grid cells
    for (var ci2 = 0; ci2 < cells.length; ci2++) {
      var cell = cells[ci2];
      var cx = cell.x + CELL_PAD / 2;
      var cy = cell.y + CELL_PAD / 2;
      var cw = CELL_W - CELL_PAD;
      var ch = CELL_H - CELL_PAD;

      if (cell.hitTimer > 0) {
        game.draw.rect(cx, cy, cw, ch, C.hit, cell.hitTimer * 1.2);
        game.draw.text('✓', cx + cw / 2, cy + ch / 2, { size: 80, color: C.hitHi, bold: true });
      } else if (cell.missTimer > 0) {
        game.draw.rect(cx, cy, cw, ch, C.wrong, cell.missTimer * 1.5);
      } else if (cell.lit) {
        var beatPhase2 = beatTimer / BEAT;
        var pulse = 0.6 + 0.4 * Math.abs(Math.sin(beatPhase2 * Math.PI));
        game.draw.rect(cx - 4, cy - 4, cw + 8, ch + 8, C.activeHi, 0.2);
        game.draw.rect(cx, cy, cw, ch, C.active, pulse * 0.9);
        game.draw.rect(cx, cy, cw, 12, C.activeHi, 0.6);
      } else {
        game.draw.rect(cx, cy, cw, ch, C.panel, 0.7);
        game.draw.rect(cx, cy, cw, 8, C.panelHi, 0.4);
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, part.perfect ? C.perfect : C.hit, part.life);
    }

    // Beat dots
    for (var bi = 0; bi < 4; bi++) {
      var pulse2 = beatCount % 4 === bi ? 1.0 : 0.3;
      game.draw.circle(W / 2 + (bi - 1.5) * 64, H * 0.91, 18, C.activeHi, pulse2);
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 + (mi - 3.5) * 40, 218, 14, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.active : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.4); });
})(game);
