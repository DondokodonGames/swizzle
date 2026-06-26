// 362-tile-race.js
// タイルレース — 次々と落ちるタイルを渡って向こう岸へ
// 操作: タップで前の列へジャンプ
// 成功: 向こう岸に20回到達  失敗: 落ちる4回 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a1a',
    water:  '#1d4ed8',
    waterHi:'#60a5fa',
    safe:   '#22c55e',
    safeHi: '#86efac',
    danger: '#ef4444',
    falling:'#f59e0b',
    fallingHi:'#fde68a',
    player: '#a78bfa',
    playerHi:'#e9d5ff',
    goal:   '#fbbf24',
    goalHi: '#fef3c7',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var COLS = 4;
  var ROWS = 6;
  var TILE_W = (W - 80) / COLS;
  var TILE_H = 120;
  var OX = 40;
  var OY = 300;

  var tiles = []; // [row][col] = {type:'safe'|'falling'|'gone', timer:float}
  var playerRow = ROWS - 1; // bottom row = farthest from goal (row 0 = goal)
  var playerCol = 1;
  var reached = 0;
  var NEEDED = 20;
  var falls = 0;
  var MAX_FALLS = 4;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var jumping = false;
  var resultAnim = 0;
  var resultText = '';
  var waterRipples = [];

  function setupTiles() {
    tiles = [];
    for (var r = 0; r < ROWS; r++) {
      tiles.push([]);
      for (var c = 0; c < COLS; c++) {
        // Goal row is always safe
        var type = (r === 0) ? 'safe' : (Math.random() < 0.75 ? 'safe' : 'falling');
        tiles[r].push({
          type: type,
          timer: type === 'falling' ? 1.2 + Math.random() * 1.0 : 0
        });
      }
    }
  }

  function getTileCenter(r, c) {
    return {
      x: OX + c * TILE_W + TILE_W / 2,
      y: OY + r * TILE_H + TILE_H / 2
    };
  }

  function jumpTo(toRow, toCol) {
    if (jumping || done) return;
    if (toRow < 0 || toRow >= ROWS || toCol < 0 || toCol >= COLS) return;
    if (tiles[toRow][toCol].type === 'gone') return;

    jumping = true;
    var fromRow = playerRow, fromCol = playerCol;

    setTimeout(function() {
      jumping = false;
      playerRow = toRow;
      playerCol = toCol;

      var tile = tiles[playerRow][playerCol];

      if (tile.type === 'falling' && tile.timer < 0.3) {
        // Too slow, tile collapsed
        falls++;
        game.audio.play('se_failure', 0.5);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          var tc = getTileCenter(playerRow, playerCol);
          particles.push({ x: tc.x, y: tc.y, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life:0.6, col: C.waterHi });
        }
        waterRipples.push({ x: getTileCenter(playerRow, playerCol).x, y: getTileCenter(playerRow, playerCol).y, r: 10, life: 0.8 });
        if (falls >= MAX_FALLS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
        playerRow = ROWS - 1;
        playerCol = Math.floor(Math.random() * COLS);
        setupTiles();
        return;
      }

      // Start tile falling when stepped on
      if (tile.type === 'safe') tile.type = 'falling';
      if (tile.type !== 'gone') tile.timer = Math.min(tile.timer, 0.8);

      // Reached goal row!
      if (playerRow === 0) {
        reached++;
        resultText = '渡れた！';
        resultAnim = 0.7;
        game.audio.play('se_success', 0.6);
        for (var pi2 = 0; pi2 < 10; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          var gc = getTileCenter(0, playerCol);
          particles.push({ x: gc.x, y: gc.y, vx: Math.cos(ang2)*200, vy: Math.sin(ang2)*200, life:0.6, col: C.goalHi });
        }
        if (reached >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(reached * 300 + Math.ceil(timeLeft) * 80); }, 600);
          return;
        }
        setTimeout(function() {
          if (!done) {
            playerRow = ROWS - 1;
            playerCol = Math.floor(Math.random() * COLS);
            setupTiles();
          }
        }, 800);
      }
    }, 220);

    game.audio.play('se_tap', 0.3);
  }

  game.onTap(function(tx, ty) {
    if (done || jumping) return;
    var c = Math.floor((tx - OX) / TILE_W);
    var r = Math.floor((ty - OY) / TILE_H);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    // Can jump to adjacent or same column, one row up
    if (r === playerRow - 1) {
      jumpTo(r, c);
    }
  });

  game.onSwipe(function(dir) {
    if (done || jumping) return;
    if (dir === 'up') jumpTo(playerRow - 1, playerCol);
    if (dir === 'left' && playerCol > 0) jumpTo(playerRow, playerCol - 1);
    if (dir === 'right' && playerCol < COLS - 1) jumpTo(playerRow, playerCol + 1);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2;

    // Update tile timers
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var t = tiles[r][c];
        if (t.type === 'falling') {
          t.timer -= dt;
          if (t.timer <= 0) {
            t.type = 'gone';
            var tc = getTileCenter(r, c);
            waterRipples.push({ x: tc.x, y: tc.y, r: 10, life: 0.8 });
            // Was player on it?
            if (r === playerRow && c === playerCol && !jumping) {
              falls++;
              game.audio.play('se_failure', 0.5);
              for (var pi = 0; pi < 8; pi++) {
                var ang = Math.random() * Math.PI * 2;
                particles.push({ x: tc.x, y: tc.y, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life:0.6, col: C.waterHi });
              }
              if (falls >= MAX_FALLS && !done) {
                done = true;
                setTimeout(function() { game.end.failure(); }, 400);
                return;
              }
              playerRow = ROWS - 1;
              playerCol = Math.floor(Math.random() * COLS);
              setupTiles();
            }
          }
        }
      }
    }

    for (var wr = waterRipples.length - 1; wr >= 0; wr--) {
      waterRipples[wr].r += 80 * dt;
      waterRipples[wr].life -= dt;
      if (waterRipples[wr].life <= 0) waterRipples.splice(wr, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Water background
    game.draw.rect(OX, OY, COLS * TILE_W, ROWS * TILE_H, C.water, 0.3);

    // Water ripples
    for (var wr2 = 0; wr2 < waterRipples.length; wr2++) {
      var wri = waterRipples[wr2];
      game.draw.circle(wri.x, wri.y, wri.r, C.waterHi, wri.life * 0.4);
    }

    // Tiles
    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        var t2 = tiles[r2][c2];
        var tc2 = getTileCenter(r2, c2);
        if (t2.type === 'gone') continue;

        var tx2 = OX + c2 * TILE_W + 4;
        var ty2 = OY + r2 * TILE_H + 4;
        var tw = TILE_W - 8, th = TILE_H - 8;

        if (r2 === 0) {
          // Goal
          game.draw.rect(tx2, ty2, tw, th, C.goal, 0.8);
          game.draw.rect(tx2, ty2, tw, th, C.goalHi, 0.1 + Math.sin(elapsed * 3) * 0.1);
          game.draw.text('GOAL', tc2.x, tc2.y + 14, { size: 32, color: C.bg, bold: true });
        } else if (t2.type === 'safe') {
          game.draw.rect(tx2, ty2, tw, th, C.safe, 0.7);
          game.draw.rect(tx2, ty2, tw, th, C.safeHi, 0.1);
        } else if (t2.type === 'falling') {
          var warn = 1 - t2.timer / 1.2;
          var fc = warn > 0.7 ? C.danger : C.falling;
          game.draw.rect(tx2, ty2, tw, th, fc, 0.7 - warn * 0.3);
          // Cracks
          if (warn > 0.4) {
            game.draw.line(tc2.x - 20, tc2.y - 20, tc2.x + 20, tc2.y + 20, C.danger, 3);
            game.draw.line(tc2.x - 20, tc2.y + 20, tc2.x + 10, tc2.y - 10, C.danger, 2);
          }
        }
      }
    }

    // Player
    var pc = getTileCenter(playerRow, playerCol);
    if (!jumping) {
      game.draw.circle(pc.x, pc.y - 30, 30, C.player, 0.95);
      game.draw.circle(pc.x, pc.y - 52, 20, C.playerHi, 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 56, color: C.goalHi, bold: true });
    }

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 28 + fi * 56, H * 0.92, 16, fi < falls ? C.danger : '#0a0a1a');
    }

    game.draw.text(reached + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.safe : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    setupTiles();
    playerRow = ROWS - 1;
    playerCol = Math.floor(COLS / 2);
  });
})(game);
