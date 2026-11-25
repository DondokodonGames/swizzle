// D-20092012-0039-brick-wall-mender.js
// ブロック壁のつくろい — 落ちてくるブロックを回して欠けた壁の隙間に合わせ、横一列を埋めて消す
// 操作: タップでブロックを90度回転、スワイプ下で即落下。隙間の形に合わせて落とす
// 終わり: 横一列を規定回数埋めれば成功。積み上がって天井に届けば失敗
// @mechanic: gap_fit
// @theme: brick_wall_mender
// 世界観: 崩れかけた古い城壁を修復するちいさな石工ロボットが、落ちてくる石ブロックを回して欠けた隙間にぴったり合わせ、横一列を埋めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 埋めた列数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色高彩度、背景2〜3層で奥行き、暗色輪郭+ハイライト
  var C = {
    sky1: '#2a3f6b', sky2: '#0f1830', wallDark: '#3a2a20', wallLit: '#8a6a4a',
    ink: '#100a08', white: '#fff6e8', gold: '#ffcf4d',
    good: '#5dff8a', bad: '#ff5a5a', block: '#c98a4a', gap: '#150e0a',
  };

  var GAME_TITLE = 'WALL MENDER';
  var COLS = 5;
  var CELL = (W * 0.7) / COLS;
  var GRID_X0 = W * 0.15, GRID_Y0 = H * 0.30, ROWS = 6;
  var CEIL_ROW = 0;
  var TARGET_LINES = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  // shapes: 2セル(ドミノ)を回転(横/縦)で表現。隙間に合う向きを選ばせる
  var grid, curShape, curRot, curCol, curRow, dropVel, linesFilled, halfShown;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MASON = ['.####.', '#.##.#', '######', '.#..#.', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.55, C.sky2], [1, C.sky2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.55 + i * 10, W, 3, '#ffffff08');
  }

  function cellX(c) { return GRID_X0 + c * CELL + CELL / 2; }
  function cellY(r) { return GRID_Y0 + r * CELL + CELL / 2; }

  function drawWall() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = GRID_X0 + c * CELL, y = GRID_Y0 + r * CELL;
        if (grid[r][c]) {
          game.draw.rect(x + 3, y + 3, CELL - 6, CELL - 6, C.wallLit);
          game.draw.rect(x + 3, y + 3, CELL - 6, 5, '#ffffff30');
        } else {
          game.draw.rect(x + 3, y + 3, CELL - 6, CELL - 6, C.gap, 0.6);
        }
      }
    }
  }

  function shapeCells() {
    // curShape=0: ドミノ。curRot=0で横2マス、1で縦2マス
    if (curRot === 0) return [{ c: curCol, r: curRow }, { c: curCol + 1, r: curRow }];
    return [{ c: curCol, r: curRow }, { c: curCol, r: curRow + 1 }];
  }

  function fits(cells) {
    for (var i = 0; i < cells.length; i++) {
      var cc = cells[i];
      if (cc.c < 0 || cc.c >= COLS || cc.r < 0 || cc.r >= ROWS) return false;
      if (grid[cc.r][cc.c]) return false;
    }
    return true;
  }

  function newPiece() {
    curRot = Math.random() < 0.5 ? 0 : 1;
    curCol = Math.floor(game.random(0, curRot === 0 ? COLS - 1 : COLS));
    curRow = 0;
    dropVel = 1.1;
    // 出現位置が既に塞がっていれば少しずらす
    var tries = 0;
    while (!fits(shapeCells()) && tries < COLS) { curCol = (curCol + 1) % (curRot === 0 ? COLS - 1 : COLS); tries++; }
  }

  function findRestRow(col, rot) {
    var r = 0;
    for (var guard = 0; guard <= ROWS; guard++) {
      var cells = rot === 0 ? [{ c: col, r: r + 1 }, { c: col + 1, r: r + 1 }] : [{ c: col, r: r + 1 }, { c: col, r: r + 2 }];
      if (!fits(cells)) break;
      r++;
    }
    return r;
  }

  function lockPiece() {
    var cells = shapeCells();
    for (var i = 0; i < cells.length; i++) grid[cells[i].r][cells[i].c] = 1;
    // 埋まった行をチェック
    var full = -1;
    for (var r = ROWS - 1; r >= 0; r--) {
      var all = true;
      for (var c = 0; c < COLS; c++) if (!grid[r][c]) { all = false; break; }
      if (all) { full = r; break; }
    }
    if (full >= 0) {
      var py = cellY(full);
      game.feedback.good(cellX(2), py, { text: 'NICE', color: C.good, sound: 'se_break' });
      game.fx.burst(cellX(2), py, { color: C.gold, count: 18, speed: 320 });
      for (var rr = full; rr > 0; rr--) grid[rr] = grid[rr - 1].slice();
      grid[0] = new Array(COLS).fill(0);
      linesFilled++;
      if (!halfShown && linesFilled >= Math.ceil(TARGET_LINES / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', W * 0.5, H * 0.26, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.5);
      }
      if (linesFilled >= TARGET_LINES) { ok = true; finished = true; hitStop = 0.1; finish(); return; }
    } else {
      game.audio.play('se_tap', 0.3);
    }
    // 天井まで積み上がったか
    for (var c2 = 0; c2 < COLS; c2++) {
      if (grid[CEIL_ROW][c2] && !finished) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(cellX(c2), cellY(CEIL_ROW), { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
    }
    newPiece();
  }

  function initGame() {
    grid = [];
    for (var r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(0));
    // 底2行にランダムな欠けを作って「壁修復」らしさを出す
    for (var r2 = ROWS - 2; r2 < ROWS; r2++) {
      for (var c = 0; c < COLS; c++) grid[r2][c] = Math.random() < 0.6 ? 1 : 0;
    }
    linesFilled = 0; halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newPiece();
  }

  function rotatePiece() {
    var newRot = curRot === 0 ? 1 : 0;
    var maxCol = newRot === 0 ? COLS - 2 : COLS - 1;
    var col = Math.min(curCol, maxCol);
    var row = Math.floor(curRow + 0.5);
    var cells = newRot === 0 ? [{ c: col, r: row }, { c: col + 1, r: row }] : [{ c: col, r: row }, { c: col, r: row + 1 }];
    if (fits(cells)) { curRot = newRot; curCol = col; curRow = row; game.audio.play('se_tap', 0.3); }
    else { game.audio.play('se_tap', 0.15); }
  }

  function dropPiece() {
    var restRow = findRestRow(curCol, curRot);
    curRow = restRow;
    lockPiece();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    rotatePiece();
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    if (dir === 'down') dropPiece();
    else if (dir === 'left' || dir === 'right') {
      var row = Math.floor(curRow + 0.5);
      var d = dir === 'left' ? -1 : 1;
      var cells = curRot === 0
        ? [{ c: curCol + d, r: row }, { c: curCol + d + 1, r: row }]
        : [{ c: curCol + d, r: row }, { c: curCol + d, r: row + 1 }];
      if (fits(cells)) { curCol += d; curRow = row; game.audio.play('se_tap', 0.2); }
      else { game.audio.play('se_tap', 0.1); }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.6, press: false, phase: 0 };
  function stepDemo(dt) {
    if (grid === undefined) initGame();
    demo.t += dt;
    var cyc = demo.t % 1.4;
    if (cyc < dt || demo.t <= dt) {
      grid = [];
      for (var r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(0));
      for (var c = 0; c < COLS; c++) grid[ROWS - 1][c] = c === 2 ? 0 : 1;
      linesFilled = 0; halfShown = false;
      curRot = 1; curCol = 2; curRow = 0;
      demo.fired = false;
    }
    demo.gx = cellX(curCol); demo.gy = cellY(curRow);
    if (cyc > 0.5 && cyc < 0.75) { demo.press = true; }
    else if (cyc >= 0.75 && !demo.fired) {
      demo.fired = true; demo.press = false;
      curRow = findRestRow(curCol, curRot);
      var cells = shapeCells();
      for (var i = 0; i < cells.length; i++) grid[cells[i].r][cells[i].c] = 1;
    } else if (cyc < 0.5) { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawWall();
      game.draw.sprite(MASON, { '#': C.white, '.': null }, W * 0.5, H * 0.85, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawWall();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(linesFilled + ' / ' + TARGET_LINES, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, TARGET_LINES - linesFilled) + '列!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { lines: linesFilled, target: TARGET_LINES };
        if (ok) game.end.success(linesFilled, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      curRow += dropVel * dt / (CELL / 90);
      var testRow = Math.floor(curRow + 0.5);
      var cells = curRot === 0 ? [{ c: curCol, r: testRow }, { c: curCol + 1, r: testRow }] : [{ c: curCol, r: testRow }, { c: curCol, r: testRow + 1 }];
      if (!fits(cells) || testRow >= ROWS) {
        curRow = Math.max(0, testRow - 1);
        lockPiece();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawWall();
    if (!finished) {
      var cells2 = shapeCells();
      for (var i = 0; i < cells2.length; i++) {
        var x = GRID_X0 + cells2[i].c * CELL, y = GRID_Y0 + cells2[i].r * CELL;
        game.draw.rect(x + 3, y + 3, CELL - 6, CELL - 6, C.block);
        game.draw.rect(x + 3, y + 3, CELL - 6, 5, '#ffffff50');
      }
    }
    game.draw.sprite(MASON, { '#': C.white, '.': null }, W * 0.5, H * 0.85, 18, { anchor: 'center' });

    txt(linesFilled + ' / ' + TARGET_LINES, W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.4], ['C4', 0.4], ['D4', 0.4], ['G4', 0.8]], { tempo: 118, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
