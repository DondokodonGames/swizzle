// 018-wire-trace.js
// ワイヤートレース — 震える手でケーブルをなぞる外科医の集中力
// 操作: スワイプで上下左右に進み、ワイヤーのルートに沿って進む
// 成功: 終点まで到達  失敗: ワイヤーから外れる or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080c10',
    track:   '#0f1a26',
    wire:    '#22d3ee',
    wireHi:  '#67e8f9',
    player:  '#fbbf24',
    playerGlow:'#fef3c7',
    success: '#22c55e',
    danger:  '#ef4444',
    ui:      '#475569'
  };

  // Grid-based path: a sequence of (col, row) steps
  // 0=right, 1=down, 2=left, 3=up
  var CELL = 220;
  var COLS = 4;
  var ROWS = 7;
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = 220;

  // Random path from top-left to bottom-right area
  function buildPath() {
    var path = [{ c: 0, r: 0 }];
    var c = 0, r = 0;
    var visited = {};
    visited['0,0'] = true;

    while (c < COLS - 1 || r < ROWS - 1) {
      var options = [];
      if (c < COLS - 1) options.push({ dc: 1, dr: 0 });
      if (r < ROWS - 1) options.push({ dc: 0, dr: 1 });
      if (c > 0 && path.length > 2) options.push({ dc: -1, dr: 0 });
      if (r > 0 && path.length > 2) options.push({ dc: 0, dr: -1 });

      // Filter to avoid revisit and dead ends
      var valid = options.filter(function(o) {
        var nc = c + o.dc, nr = r + o.dr;
        return nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !visited[nc + ',' + nr];
      });

      if (valid.length === 0) break;
      // Prefer moving toward goal
      valid.sort(function() { return Math.random() - 0.5; });
      var chosen = valid[0];
      c += chosen.dc;
      r += chosen.dr;
      visited[c + ',' + r] = true;
      path.push({ c: c, r: r });
    }
    return path;
  }

  var path = buildPath();
  var playerIdx = 0; // which node of path the player is on
  var done = false;
  var timeLeft = 20;
  var won = false;

  function nodePos(idx) {
    var node = path[idx];
    return {
      x: GRID_X + node.c * CELL + CELL / 2,
      y: GRID_Y + node.r * CELL + CELL / 2
    };
  }

  game.onSwipe(function(dir) {
    if (done) return;
    var dc = 0, dr = 0;
    if (dir === 'right') dc = 1;
    if (dir === 'left')  dc = -1;
    if (dir === 'down')  dr = 1;
    if (dir === 'up')    dr = -1;

    var cur = path[playerIdx];
    var nc = cur.c + dc, nr = cur.r + dr;

    // Check if this move follows the wire path
    if (playerIdx + 1 < path.length) {
      var next = path[playerIdx + 1];
      if (next.c === nc && next.r === nr) {
        playerIdx++;
        game.audio.play('se_tap', 0.5);
        if (playerIdx >= path.length - 1) {
          done = true;
          won = true;
          game.audio.play('se_success');
          setTimeout(function() {
            game.end.success(300 + Math.ceil(timeLeft) * 10);
          }, 500);
        }
        return;
      }
    }
    // Also allow going back on path
    if (playerIdx - 1 >= 0) {
      var prev = path[playerIdx - 1];
      if (prev.c === nc && prev.r === nr) {
        playerIdx--;
        game.audio.play('se_tap', 0.3);
        return;
      }
    }

    // Wrong direction = off wire
    done = true;
    game.audio.play('se_failure');
    setTimeout(function() { game.end.failure(); }, 500);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid dots
    for (var gc = 0; gc <= COLS; gc++) {
      for (var gr = 0; gr <= ROWS; gr++) {
        var gx = GRID_X + gc * CELL;
        var gy = GRID_Y + gr * CELL;
        game.draw.circle(gx, gy, 6, '#1a2a3a');
      }
    }

    // Wire path (thick lines between nodes)
    for (var i = 0; i < path.length - 1; i++) {
      var p1 = nodePos(i);
      var p2 = nodePos(i + 1);
      var traveled = i < playerIdx;
      var wireColor = traveled ? C.wireHi : C.wire;
      var wireAlpha = traveled ? 1.0 : 0.35;
      // thick wire
      game.draw.line(p1.x, p1.y, p2.x, p2.y, wireColor, traveled ? 14 : 10);
      if (traveled) {
        // glow
        game.draw.line(p1.x, p1.y, p2.x, p2.y, '#fff', 3);
      }
    }

    // Path nodes (endpoints)
    var startPos = nodePos(0);
    var endPos = nodePos(path.length - 1);
    game.draw.circle(startPos.x, startPos.y, 28, '#1e3a2a');
    game.draw.circle(startPos.x, startPos.y, 20, C.success);
    game.draw.text('S', startPos.x, startPos.y, { size: 36, color: '#fff', bold: true });

    var ep = won ? C.success : C.wire;
    game.draw.circle(endPos.x, endPos.y, 28, '#0f2040');
    game.draw.circle(endPos.x, endPos.y, 20, ep);
    game.draw.text('G', endPos.x, endPos.y, { size: 36, color: '#fff', bold: true });

    // Player
    var pp = nodePos(playerIdx);
    var glow = 0.3 + 0.15 * Math.sin(game.time.elapsed * 6);
    game.draw.circle(pp.x, pp.y, 44, C.playerGlow, glow);
    game.draw.circle(pp.x, pp.y, 32, C.player);
    game.draw.circle(pp.x, pp.y, 16, '#fff', 0.7);

    // Progress
    var pct = Math.floor(playerIdx / (path.length - 1) * 100);
    game.draw.rect(W * 0.1, GRID_Y + ROWS * CELL + 40, W * 0.8 * pct / 100, 24, C.wireHi);
    game.draw.rect(W * 0.1, GRID_Y + ROWS * CELL + 40, W * 0.8, 24, C.wire, 0.2);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#080c14');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#0e7490' : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('ワイヤーを たどれ！', W / 2, H - 200, { size: 52, color: C.ui });
    game.draw.text('光る線の通りに', W / 2, H - 140, { size: 38, color: '#334d5a' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
