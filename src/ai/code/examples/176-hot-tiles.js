// 176-hot-tiles.js
// 熱板渡り — 次々と熱くなるタイルから素早く離れ、安全なタイルに乗り続ける緊張感
// 操作: タップで移動先のタイルを選ぶ
// 成功: 30秒生き延びる  失敗: 熱いタイルに乗ったまま

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#06040a',
    cool:   '#164e63',
    coolHi: '#0891b2',
    warm:   '#92400e',
    warmHi: '#d97706',
    hot:    '#7f1d1d',
    hotHi:  '#ef4444',
    player: '#a78bfa',
    playerHi:'#ddd6fe',
    danger: '#ef4444',
    safe:   '#22c55e',
    ui:     '#334155'
  };

  var COLS = 4;
  var ROWS = 6;
  var CELL_W = (W - 80) / COLS;
  var CELL_H = 200;
  var GRID_X = 40;
  var GRID_Y = H * 0.12;
  var PAD = 10;

  var tiles = [];
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      tiles.push({ row: r, col: c, heat: 0, heating: false, heatTimer: 0 });
    }
  }

  var playerRow = ROWS - 1;
  var playerCol = Math.floor(COLS / 2);
  var playerMoving = false;
  var playerTargetRow = playerRow, playerTargetCol = playerCol;

  var heatTimer = 0;
  var HEAT_INTERVAL = 1.6;
  var HEAT_TIME = 2.0; // how long until tile becomes dangerous
  var survived = 0;
  var NEEDED = 30;
  var timeLeft = NEEDED;
  var done = false;
  var feedback = 0;
  var shakeX = 0;

  function getTile(r, c) {
    return tiles[r * COLS + c];
  }

  function heatRandomTile() {
    var cool = tiles.filter(function(t) {
      return t.heat < 0.5 && !(t.row === playerRow && t.col === playerCol);
    });
    if (cool.length === 0) return;
    var t = cool[Math.floor(Math.random() * cool.length)];
    t.heating = true;
    t.heatTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - GRID_X) / CELL_W);
    var row = Math.floor((ty - GRID_Y) / CELL_H);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    // Must be adjacent
    var dr = Math.abs(row - playerRow), dc = Math.abs(col - playerCol);
    if (dr + dc !== 1) return; // not adjacent
    playerRow = row;
    playerCol = col;
    game.audio.play('se_tap', 0.3);
    // Check if moved to hot tile
    var t = getTile(row, col);
    if (t.heat > 0.85 && !done) {
      done = true;
      shakeX = 24;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 500);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      survived += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 60 + 500); }, 400);
        return;
      }
    }
    if (shakeX > 0) shakeX *= 0.7;

    // Heat tiles
    heatTimer -= dt;
    var progress = survived / NEEDED;
    if (heatTimer <= 0) {
      heatTimer = HEAT_INTERVAL * Math.max(0.5, 1 - progress * 0.4);
      heatRandomTile();
      if (progress > 0.4) heatRandomTile();
      if (progress > 0.7) heatRandomTile();
    }

    for (var ti = 0; ti < tiles.length; ti++) {
      var t = tiles[ti];
      if (t.heating) {
        t.heatTimer += dt;
        t.heat = Math.min(1, t.heatTimer / HEAT_TIME);
        if (t.heat >= 1) {
          t.heating = false;
          // Auto cool after a bit
          setTimeout((function(tile) {
            return function() {
              tile.heat = 0;
              tile.heating = false;
              tile.heatTimer = 0;
            };
          })(t), 2000 + Math.random() * 1000);
        }
      }
    }

    // Check current tile heat
    var curTile = getTile(playerRow, playerCol);
    if (curTile.heat > 0.85 && !done) {
      done = true;
      shakeX = 24;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 500);
    }

    var ox = (Math.random() - 0.5) * shakeX * 2;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Tiles
    for (var ti2 = 0; ti2 < tiles.length; ti2++) {
      var t2 = tiles[ti2];
      var cx = GRID_X + t2.col * CELL_W + PAD + ox;
      var cy = GRID_Y + t2.row * CELL_H + PAD;
      var cw = CELL_W - PAD * 2;
      var ch = CELL_H - PAD * 2;
      var isPlayer = t2.row === playerRow && t2.col === playerCol;

      var heat = t2.heat;
      var tileCol, tileHi;
      if (heat < 0.3) {
        tileCol = C.cool; tileHi = C.coolHi;
      } else if (heat < 0.7) {
        tileCol = C.warm; tileHi = C.warmHi;
      } else {
        tileCol = C.hot; tileHi = C.hotHi;
      }

      // Base tile
      game.draw.rect(cx, cy, cw, ch, tileCol, 0.9);
      game.draw.rect(cx, cy, cw, 10, tileHi, 0.5);

      // Heat indicator
      if (heat > 0.1) {
        var heatAlpha = heat * 0.5;
        game.draw.rect(cx, cy + ch - heat * ch, cw, heat * ch, tileHi, heatAlpha);
      }

      // Danger warning animation
      if (heat > 0.6) {
        var pulse = 0.3 + 0.4 * Math.abs(Math.sin(survived * 8 + ti2));
        game.draw.rect(cx, cy, cw, ch, C.hotHi, pulse * 0.3);
        game.draw.text('🔥', cx + cw / 2, cy + ch / 2 - 10, { size: 52, color: C.hotHi });
      } else if (heat > 0.3) {
        game.draw.text('⚠', cx + cw / 2, cy + ch / 2, { size: 48, color: C.warmHi });
      }

      // Adjacent highlight
      if (!isPlayer) {
        var dr = Math.abs(t2.row - playerRow), dc = Math.abs(t2.col - playerCol);
        if (dr + dc === 1 && heat < 0.85) {
          game.draw.rect(cx - 4, cy - 4, cw + 8, ch + 8, C.safe, 0.08);
        }
      }

      // Player
      if (isPlayer) {
        game.draw.circle(cx + cw / 2, cy + ch / 2 - 20, 50, C.playerHi, 0.2);
        game.draw.circle(cx + cw / 2, cy + ch / 2 - 20, 38, C.player, 0.95);
      }
    }

    game.draw.text('隣のマスをタップ', W / 2 + ox, H * 0.91, { size: 40, color: C.ui });

    // Survival time display
    var ratio = Math.max(0, timeLeft / NEEDED);
    game.draw.text(timeLeft.toFixed(1), W / 2, 148, { size: 64, color: '#f1f5f9', bold: true });

    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.coolHi : C.hotHi);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    setTimeout(function() { heatRandomTile(); heatRandomTile(); }, 500);
  });
})(game);
