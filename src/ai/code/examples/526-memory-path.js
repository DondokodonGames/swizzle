// 526-memory-path.js
// メモリパス — 一瞬光ったパスを記憶して同じ順序でセルをタップ
// 操作: 表示されたパスを記憶してタップで再現
// 成功: 10ラウンドクリア  失敗: 4ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030d14',
    panel:   '#050f18',
    cellOff: '#071824',
    cellOn:  '#0ea5e9',
    cellOnHi:'#7dd3fc',
    path:    '#f59e0b',
    pathHi:  '#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151',
    visited: '#0c4a6e'
  };

  var GRID = 5;
  var CELL = 180;
  var OX = (W - GRID * CELL) / 2;
  var OY = H * 0.25;

  var path = [];
  var pathLen = 3;
  var phase = 'showing'; // 'showing' | 'recall'
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_EACH = 0.5;
  var playerPath = [];
  var rounds = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 4;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var delayTimer = 0;
  var tappedCells = {};

  function genPath() {
    path = [];
    var used = {};
    var x = Math.floor(Math.random() * GRID);
    var y = Math.floor(Math.random() * GRID);
    path.push({ x: x, y: y });
    used[x + ',' + y] = true;

    for (var i = 1; i < pathLen; i++) {
      var dirs = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
      ].filter(function(d) {
        var nx = x + d.dx, ny = y + d.dy;
        return nx >= 0 && nx < GRID && ny >= 0 && ny < GRID && !used[nx + ',' + ny];
      });
      if (dirs.length === 0) break;
      var d = dirs[Math.floor(Math.random() * dirs.length)];
      x += d.dx; y += d.dy;
      path.push({ x: x, y: y });
      used[x + ',' + y] = true;
    }

    showIdx = 0;
    showTimer = SHOW_EACH;
    phase = 'showing';
    playerPath = [];
    tappedCells = {};
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'recall') return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var key = col + ',' + row;
    if (tappedCells[key]) return;

    tappedCells[key] = true;
    playerPath.push({ x: col, y: row });
    game.audio.play('se_tap', 0.3);

    var expected = path[playerPath.length - 1];
    if (!expected || expected.x !== col || expected.y !== row) {
      // Wrong
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      } else {
        delayTimer = 0.8;
        playerPath = [];
        tappedCells = {};
      }
      return;
    }

    // Correct tap
    var cx = OX + col * CELL + CELL / 2;
    var cy = OY + row * CELL + CELL / 2;
    for (var pi = 0; pi < 5; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: cx, y: cy, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.4, col: C.path });
    }

    if (playerPath.length >= path.length) {
      // Round complete!
      rounds++;
      flashCol = C.correct;
      flashAnim = 0.5;
      game.audio.play('se_success', 0.8);
      if (rounds >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(rounds * 600 + Math.ceil(timeLeft) * 100); }, 700);
      } else {
        if (rounds % 3 === 0 && pathLen < 10) pathLen++;
        delayTimer = 0.8;
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
      if (delayTimer <= 0 && !done) genPath();
    }

    if (phase === 'showing') {
      showTimer -= dt;
      if (showTimer <= 0) {
        showIdx++;
        if (showIdx >= path.length) {
          phase = 'recall';
        } else {
          showTimer = SHOW_EACH;
          game.audio.play('se_tap', 0.2);
        }
      }
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
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var cx2 = OX + c * CELL + 8;
        var cy2 = OY + r * CELL + 8;
        var key2 = c + ',' + r;
        var isPathCell = false;
        var isCurrentShow = false;
        var isPlayerTapped = !!tappedCells[key2];
        var pathIdx = -1;

        for (var pi2 = 0; pi2 < path.length; pi2++) {
          if (path[pi2].x === c && path[pi2].y === r) { pathIdx = pi2; break; }
        }

        if (phase === 'showing') {
          isCurrentShow = (showIdx < path.length && path[showIdx].x === c && path[showIdx].y === r);
          isPathCell = pathIdx >= 0 && pathIdx <= showIdx;
        }

        var bgCol = isPathCell ? C.visited : (isPlayerTapped ? (pathIdx >= 0 ? C.visited : '#2a0808') : C.cellOff);
        game.draw.rect(cx2, cy2, CELL - 16, CELL - 16, bgCol, 0.9);

        if (isCurrentShow) {
          game.draw.rect(cx2, cy2, CELL - 16, CELL - 16, C.path, 0.9);
          game.draw.rect(cx2, cy2, CELL - 16, 10, C.pathHi, 0.4);
          game.draw.circle(cx2 + (CELL - 16) / 2, cy2 + (CELL - 16) / 2, (CELL - 16) * 0.4, C.path, 0.2);
        } else if (isPlayerTapped && pathIdx >= 0) {
          game.draw.rect(cx2, cy2, CELL - 16, CELL - 16, C.correct, 0.4);
        }

        // Show step number during showing
        if (phase === 'showing' && pathIdx >= 0 && pathIdx <= showIdx) {
          game.draw.text((pathIdx + 1) + '', cx2 + (CELL - 16) / 2, cy2 + (CELL - 16) / 2 + 16, { size: 40, color: '#fff', bold: true });
        }

        // Show expected during recall with subtle hint
        if (phase === 'recall' && playerPath.length < path.length) {
          var nextExp = path[playerPath.length];
          if (nextExp && nextExp.x === c && nextExp.y === r) {
            game.draw.circle(cx2 + (CELL - 16) / 2, cy2 + (CELL - 16) / 2, 14, C.cellOn, 0.6 + Math.sin(elapsed * 5) * 0.3);
          }
        }
      }
    }

    // Path connecting lines during show
    if (phase === 'showing' && showIdx > 0) {
      for (var li = 0; li < showIdx && li < path.length - 1; li++) {
        var p1 = path[li], p2 = path[li + 1];
        var lx1 = OX + p1.x * CELL + CELL / 2, ly1 = OY + p1.y * CELL + CELL / 2;
        var lx2 = OX + p2.x * CELL + CELL / 2, ly2 = OY + p2.y * CELL + CELL / 2;
        game.draw.line(lx1, ly1, lx2, ly2, C.path, 8);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    var phaseText = phase === 'showing' ? ('記憶中 ' + (showIdx + 1) + '/' + path.length) : ('タップ！ ' + (path.length - playerPath.length) + '個残り');
    game.draw.text(phaseText, W / 2, OY + GRID * CELL + 60, { size: 44, color: C.text });

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 60 + mi * 120, H * 0.955, 22, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(rounds + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.cellOn : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    genPath();
  });
})(game);
