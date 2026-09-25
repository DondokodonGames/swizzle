// D-20132016-0052-crate-target-merge.js
// クレートターゲット合体 — 隣り合う数字クレートをスワイプで合体させ、指定のジャストナンバーを作る
// 操作: クレートを押さえて隣のマスへスワイプする。同じ数字なら合体、空きマスなら移動
// 終わり: 制限時間内に目標の数字クレートを1つ作れば成功。時間切れなら失敗
// @mechanic: swipe_direction
// @theme: nightshift_warehouse_target_crate
// 世界観: 深夜倉庫の仕分け作業。数字クレートを合体させ、伝票に書かれたジャストナンバーぴったりの一箱を仕上げる管理ロボット
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した最大クレート値
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、粗いドット、輪郭線なし、タイル反復背景
  var C = {
    bg1: '#1c1408', bg2: '#120c04', tile: '#3a2c14', tileHi: '#5a4420',
    crate: '#c98a3a', crateHi: '#e8b060', crateDark: '#8a5a20',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4ecd8', ink: '#100a04',
    bot: '#6ac8e8',
  };

  var GAME_TITLE = 'TARGET CRATE';
  var GRID = 3;
  var CELL = 260, GAP = 18;
  var BOARD_Y = H * 0.42;
  var TARGET = 16;
  var TIME_LIMIT = 12;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var grid, timeLeft, pressCell, pressX, pressY, maxVal;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_SPRITE = ['.##.', '####', '.##.'];

  function boardOx() { return W * 0.5 - (GRID * CELL + (GRID - 1) * GAP) / 2; }
  function boardOy() { return BOARD_Y - (GRID * CELL + (GRID - 1) * GAP) / 2; }
  function cellX(c) { return boardOx() + c * (CELL + GAP) + CELL / 2; }
  function cellY(r) { return boardOy() + r * (CELL + GAP) + CELL / 2; }

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(elapsed * 1.3));
    for (var i = 0; i < 14; i++) {
      for (var j = 0; j < 5; j++) {
        if ((i + j) % 2 === 0) game.draw.rect(i * (W / 14), j * (H / 5), W / 14, H / 5, '#ffffff', 0.015);
      }
    }
  }

  function drawCrate(v, cx, cy, dim) {
    if (!v) {
      game.draw.rect(cx - CELL / 2, cy - CELL / 2, CELL, CELL, C.tile, dim ? 0.4 : 0.7);
      return;
    }
    var col = v >= TARGET ? C.gold : C.crate;
    game.draw.rect(cx - CELL / 2, cy - CELL / 2, CELL, CELL, col, dim ? 0.5 : 1);
    game.draw.rect(cx - CELL / 2, cy - CELL / 2, CELL, 18, C.crateHi, dim ? 0.5 : 1);
    game.draw.rect(cx - CELL / 2, cy + CELL / 2 - 18, CELL, 18, C.crateDark, dim ? 0.5 : 1);
    txt(String(v), cx, cy + 16, 56, C.ink);
  }

  function initGame() {
    grid = [];
    for (var r = 0; r < GRID; r++) { grid.push([0, 0, 0]); }
    var pool = [2, 2, 2, 4, 2, 2, 4];
    var cells = [];
    for (var rr = 0; rr < GRID; rr++) for (var cc = 0; cc < GRID; cc++) cells.push([rr, cc]);
    for (var i = cells.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); var t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    for (var k = 0; k < pool.length; k++) { var c = cells[k]; grid[c[0]][c[1]] = pool[k]; }
    timeLeft = TIME_LIMIT; maxVal = 4;
    pressCell = null; pressX = 0; pressY = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function cellAt(x, y) {
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var cx = cellX(c), cy = cellY(r);
      if (Math.abs(x - cx) < CELL / 2 && Math.abs(y - cy) < CELL / 2) return { r: r, c: c };
    }
    return null;
  }

  function tryMove(r, c, dr, dc) {
    var nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return false;
    var v = grid[r][c];
    if (!v) return false;
    if (grid[nr][nc] === 0) {
      grid[nr][nc] = v; grid[r][c] = 0;
      game.audio.play('se_tap', 0.2);
      return true;
    } else if (grid[nr][nc] === v) {
      var nv = v * 2;
      grid[nr][nc] = nv; grid[r][c] = 0;
      if (nv > maxVal) maxVal = nv;
      var cx = cellX(nc), cy = cellY(nr);
      if (nv === TARGET) {
        game.feedback.good(cx, cy, { text: 'CLEAR' });
        ok = true; finished = true; finish();
      } else {
        game.feedback.good(cx, cy, { text: '', count: 10, sound: 'se_milestone', volume: 0.3 });
        game.fx.popup(String(nv), cx, cy - 90, { color: C.gold, size: 34 });
      }
      return true;
    }
    game.feedback.bad(cellX(nc), cellY(nr), { text: '', count: 4, sound: 'se_bad', volume: 0.15 });
    return false;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    var cell = cellAt(x, y);
    if (cell && grid[cell.r][cell.c]) { pressCell = cell; pressX = x; pressY = y; game.audio.play('se_tap', 0.1); }
    else pressCell = null;
  });
  game.onRelease(function(x, y) {
    game.audio.play('se_tap', 0.03);
    if (state !== S.PLAYING || !pressCell || finished) { pressCell = null; return; }
    var dx = x - pressX, dy = y - pressY;
    if (Math.hypot(dx, dy) < 40) { pressCell = null; return; }
    var dr = 0, dc = 0;
    if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1; else dr = dy > 0 ? 1 : -1;
    tryMove(pressCell.r, pressCell.c, dr, dc);
    pressCell = null;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(W * 0.5, BOARD_Y, { text: 'TIME UP' });
      finish();
    }
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) {
      grid = [[2, 2, 0], [0, 0, 0], [0, 0, 0]];
    }
    if (cyc < 1.4) {
      var p = cyc / 1.4;
      demo.gx = cellX(0) + (cellX(1) - cellX(0)) * p;
      demo.gy = cellY(0);
      demo.press = true;
      if (cyc + dt >= 1.4) { grid[0][1] = 4; grid[0][0] = 0; }
    } else if (cyc < 1.8) {
      demo.press = false; demo.gx = cellX(1); demo.gy = cellY(0);
    } else {
      demo.press = false; demo.gx = cellX(1); demo.gy = cellY(0);
    }
  }

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (grid === undefined) initGame();
      stepDemo(dt);
      bg(el);
      for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) drawCrate(grid[r][c], cellX(c), cellY(r), false);
      var bob = Math.sin(el * 2) * 5;
      game.draw.sprite(BOT_SPRITE, { '#': C.bot }, W * 0.14, H * 0.85 + bob, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(el);
      for (var rr = 0; rr < GRID; rr++) for (var cc = 0; cc < GRID; cc++) drawCrate(grid[rr][cc], cellX(cc), cellY(rr), false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt('BEST ' + maxVal, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(maxVal, { maxVal: maxVal, target: TARGET }); else game.end.failure({ maxVal: maxVal, target: TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg(el);
    for (var j = 0; j < GRID; j++) for (var k = 0; k < GRID; k++) drawCrate(grid[j][k], cellX(k), cellY(j), pressCell && pressCell.r === j && pressCell.c === k);
    var bob2 = Math.sin(el * 2) * 5;
    game.draw.sprite(BOT_SPRITE, { '#': C.bot }, W * 0.14, H * 0.85 + bob2, 16, { anchor: 'center' });

    txt(maxVal + ' / ' + TARGET, W / 2, H * 0.06, 26, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.3]], { tempo: 160, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
