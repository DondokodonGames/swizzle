// 598-fog-of-war.js
// フォグオブウォー — 霧の中を移動して敵陣地を見つけて占領する
// 操作: タップで移動先指定、視野内の敵をタップで撃退
// 成功: 8陣地制圧  失敗: 5回奇襲される or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#040810',
    fog:      '#040810',
    fogEdge:  '#080f1a',
    revealed: '#0a1520',
    player:   '#44aaff',
    playerHi: '#88ccff',
    base:     '#ffaa22',
    baseHi:   '#ffcc66',
    enemy:    '#ff3333',
    enemyHi:  '#ff8888',
    captured: '#22c55e',
    text:     '#f1f5f9',
    ui:       '#0a1a2a',
    vision:   '#112030'
  };

  var GRID_COLS = 8;
  var GRID_ROWS = 10;
  var CELL_W = W / GRID_COLS;
  var CELL_H = (H * 0.75) / GRID_ROWS;
  var GRID_OY = H * 0.15;

  var playerCell = { r: GRID_ROWS - 1, c: Math.floor(GRID_COLS / 2) };
  var VISION_R = 2; // cells visible around player
  var bases = [];
  var enemies = [];
  var revealedCells = {};
  var captured = 0;
  var NEEDED = 8;
  var ambushes = 0;
  var MAX_AMBUSH = 5;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.captured;
  var playerMoveTimer = 0;
  var playerTarget = null;

  function cellKey(r, c) { return r + ',' + c; }
  function cellCenter(r, c) {
    return { x: c * CELL_W + CELL_W / 2, y: GRID_OY + r * CELL_H + CELL_H / 2 };
  }
  function inBounds(r, c) { return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS; }
  function dist(r1, c1, r2, c2) { return Math.abs(r1 - r2) + Math.abs(c1 - c2); }

  function isVisible(r, c) {
    return dist(playerCell.r, playerCell.c, r, c) <= VISION_R;
  }

  function updateReveal() {
    for (var dr = -VISION_R; dr <= VISION_R; dr++) {
      for (var dc = -VISION_R; dc <= VISION_R; dc++) {
        var nr = playerCell.r + dr, nc = playerCell.c + dc;
        if (inBounds(nr, nc) && dist(playerCell.r, playerCell.c, nr, nc) <= VISION_R) {
          revealedCells[cellKey(nr, nc)] = true;
        }
      }
    }
  }

  function init() {
    revealedCells = {};
    bases = [];
    enemies = [];

    // Place bases in upper grid area
    for (var bi = 0; bi < NEEDED + 2; bi++) {
      var r, c, attempts = 0;
      do {
        r = Math.floor(Math.random() * (GRID_ROWS * 0.6));
        c = Math.floor(Math.random() * GRID_COLS);
        attempts++;
      } while (attempts < 20 && bases.some(function(b) { return b.r === r && b.c === c; }));
      bases.push({ r: r, c: c, captured: false });
    }

    // Place enemies near bases
    for (var ei = 0; ei < 5; ei++) {
      var base = bases[Math.floor(Math.random() * bases.length)];
      var dr2 = Math.floor(Math.random() * 3) - 1;
      var dc2 = Math.floor(Math.random() * 3) - 1;
      var er = Math.max(0, Math.min(GRID_ROWS - 1, base.r + dr2));
      var ec = Math.max(0, Math.min(GRID_COLS - 1, base.c + dc2));
      enemies.push({ r: er, c: ec, moveTimer: 2 + Math.random() * 2 });
    }

    updateReveal();
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Convert tap to grid cell
    var col = Math.floor(tx / CELL_W);
    var row = Math.floor((ty - GRID_OY) / CELL_H);
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;

    // Check if tapping visible enemy
    if (isVisible(row, col)) {
      for (var ei = enemies.length - 1; ei >= 0; ei--) {
        if (enemies[ei].r === row && enemies[ei].c === col) {
          // Defeat enemy!
          var pos = cellCenter(row, col);
          enemies.splice(ei, 1);
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: pos.x, y: pos.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: C.enemyHi });
          }
          return;
        }
      }
    }

    // Move player toward tapped cell (adjacent only)
    var dr = row - playerCell.r, dc = col - playerCell.c;
    if (Math.abs(dr) + Math.abs(dc) === 1) {
      playerCell.r = row;
      playerCell.c = col;
      updateReveal();
      game.audio.play('se_tap', 0.15);

      // Check for ambush (enemy on same cell)
      for (var ei2 = 0; ei2 < enemies.length; ei2++) {
        if (enemies[ei2].r === playerCell.r && enemies[ei2].c === playerCell.c) {
          ambushes++;
          flashCol = C.enemy;
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.5);
          enemies.splice(ei2, 1);
          if (ambushes >= MAX_AMBUSH && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
          break;
        }
      }

      // Check base capture
      for (var bi = 0; bi < bases.length; bi++) {
        var b = bases[bi];
        if (!b.captured && b.r === playerCell.r && b.c === playerCell.c) {
          b.captured = true;
          captured++;
          flashCol = C.captured;
          flashAnim = 0.3;
          game.audio.play('se_success', 0.7);
          var pos2 = cellCenter(playerCell.r, playerCell.c);
          for (var pi2 = 0; pi2 < 8; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: pos2.x, y: pos2.y, vx: Math.cos(ang2) * 180, vy: Math.sin(ang2) * 180, life: 0.5, col: C.baseHi });
          }
          if (captured >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(captured * 500 + Math.ceil(timeLeft) * 100); }, 700);
          }
          break;
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

    // Enemy AI: move toward player in fog
    for (var ei = 0; ei < enemies.length; ei++) {
      var e = enemies[ei];
      e.moveTimer -= dt;
      if (e.moveTimer <= 0) {
        e.moveTimer = 1.5 + Math.random() * 1.5;
        // Move toward player
        var dr = playerCell.r - e.r, dc = playerCell.c - e.c;
        var moveR = 0, moveC = 0;
        if (Math.abs(dr) > Math.abs(dc)) moveR = dr > 0 ? 1 : -1;
        else moveC = dc > 0 ? 1 : -1;
        var nr = e.r + moveR, nc = e.c + moveC;
        if (inBounds(nr, nc)) { e.r = nr; e.c = nc; }

        // Check if reached player
        if (e.r === playerCell.r && e.c === playerCell.c) {
          ambushes++;
          flashCol = C.enemy;
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.5);
          enemies.splice(ei, 1);
          ei--;
          if (ambushes >= MAX_AMBUSH && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        var pos = cellCenter(r, c);
        var key = cellKey(r, c);
        var vis = isVisible(r, c);
        var revealed = revealedCells[key];

        if (vis) {
          game.draw.rect(c * CELL_W + 1, GRID_OY + r * CELL_H + 1, CELL_W - 2, CELL_H - 2, C.vision, 0.9);
        } else if (revealed) {
          game.draw.rect(c * CELL_W + 1, GRID_OY + r * CELL_H + 1, CELL_W - 2, CELL_H - 2, C.revealed, 0.9);
        } else {
          game.draw.rect(c * CELL_W + 1, GRID_OY + r * CELL_H + 1, CELL_W - 2, CELL_H - 2, C.fog, 0.95);
        }
      }
    }

    // Bases (only in revealed/visible areas)
    for (var bi = 0; bi < bases.length; bi++) {
      var b = bases[bi];
      if (!revealedCells[cellKey(b.r, b.c)]) continue;
      var bpos = cellCenter(b.r, b.c);
      if (b.captured) {
        game.draw.circle(bpos.x, bpos.y, 22, C.captured, 0.8);
        game.draw.text('★', bpos.x, bpos.y + 10, { size: 28, color: C.baseHi });
      } else {
        game.draw.circle(bpos.x, bpos.y, 22, C.base, 0.7);
        game.draw.text('!', bpos.x, bpos.y + 10, { size: 32, color: C.baseHi, bold: true });
      }
    }

    // Enemies (only visible)
    for (var ei2 = 0; ei2 < enemies.length; ei2++) {
      var e2 = enemies[ei2];
      if (!isVisible(e2.r, e2.c)) continue;
      var epos = cellCenter(e2.r, e2.c);
      game.draw.circle(epos.x, epos.y, 20, C.enemy, 0.9);
      game.draw.circle(epos.x - 6, epos.y - 6, 7, C.enemyHi, 0.5);
    }

    // Player
    var ppos = cellCenter(playerCell.r, playerCell.c);
    game.draw.circle(ppos.x + 4, ppos.y + 4, 24, '#000', 0.3);
    game.draw.circle(ppos.x, ppos.y, 24, C.player, 0.9);
    game.draw.circle(ppos.x - 8, ppos.y - 8, 8, C.playerHi, 0.5);

    // Vision radius indicator
    game.draw.circle(ppos.x, ppos.y, VISION_R * CELL_W * 1.1, C.player, 0.04);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Ambush dots
    for (var ai = 0; ai < MAX_AMBUSH; ai++) {
      game.draw.circle(W / 2 - (MAX_AMBUSH - 1) * 60 + ai * 120, H * 0.955, 22, ai < ambushes ? C.enemy : C.ui, 0.9);
    }

    game.draw.text(captured + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.player : C.enemy);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    init();
  });
})(game);
