// D-20132016-0009-festival-gem-stall-swap.js
// 縁日ジェムスタール・スワップ — 飾り棚の宝石を隣同士でそっと入れ替え、同じ色を3つ揃えて割る
// 操作: 宝石を押してから隣の方向へフリックし、隣同士を入れ替える。3つ揃えば消える
// 終わり: 規定回数(5回)揃えれば成功。制限時間切れなら失敗
// @mechanic: drag_sort
// @theme: festival_gem_stall_swap
// 世界観: 縁日の飾り棚の裏で働く宝石職人見習い。隣り合う宝石を丁寧に入れ替えて同じ色を3つ揃え、景品箱を満たしていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えた回数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: フラットな面塗り、影なし、明るい単色パレット
  var C = {
    bg1: '#fff3d6', bg2: '#ffe1a8', cell: '#ffffff', cellDark: '#f0d9a8',
    gem: ['#ff5a5a', '#4d9aff', '#4dd97a', '#ffcf3d'],
    good: '#2ecc71', bad: '#ff4d5e', gold: '#ff9f1c', white: '#3a2a10', ink: '#3a2a10',
  };

  var GAME_TITLE = 'GEM STALL';
  var COLS = 4, ROWS = 5, CELL = 168;
  var GRID_W = COLS * CELL, GRID_H = ROWS * CELL;
  var GX0 = W / 2 - GRID_W / 2, GY0 = H * 0.2;
  var MATCH_TARGET = 5;
  var TIME_LIMIT = 20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var grid, matchCount, timeLeft, done, endWait, finished, milestoneShown;
  var ready, hitStop, shake;
  var pressCell, pressPos, popFx;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GEM_SHAPES = [
    ['.#.', '###', '.#.'],
    ['##.', '.##', '##.'],
    ['.##', '##.', '.##'],
    ['###', '#.#', '###'],
  ];
  var SMITH = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(el * 1.3));
    game.draw.sprite(SMITH, { '#': C.gold }, W * 0.5 + Math.cos(el * 1.6) * 4, H * 0.88, 22, { anchor: 'center' });
  }

  function randColor() { return Math.floor(Math.random() * C.gem.length); }

  function makeGrid() {
    var g = [];
    for (var r = 0; r < ROWS; r++) {
      g[r] = [];
      for (var c = 0; c < COLS; c++) {
        var v;
        var tries = 0;
        do {
          v = randColor(); tries++;
          var badRow = c >= 2 && g[r][c - 1] === v && g[r][c - 2] === v;
          var badCol = r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v;
          if (!badRow && !badCol) break;
        } while (tries < 8);
        g[r][c] = v;
      }
    }
    return g;
  }

  function initGame() {
    grid = makeGrid(); matchCount = 0; timeLeft = TIME_LIMIT; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    pressCell = null; pressPos = null; popFx = [];
  }

  function cellAt(x, y) {
    var c = Math.floor((x - GX0) / CELL), r = Math.floor((y - GY0) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    return { r: r, c: c };
  }
  function cellX(c) { return GX0 + c * CELL + CELL / 2; }
  function cellY(r) { return GY0 + r * CELL + CELL / 2; }

  function findMatches() {
    var matched = {};
    for (var r = 0; r < ROWS; r++) {
      var run = 1;
      for (var c = 1; c <= COLS; c++) {
        if (c < COLS && grid[r][c] === grid[r][c - 1]) run++;
        else {
          if (run >= 3) for (var k = c - run; k < c; k++) matched[r + ',' + k] = true;
          run = 1;
        }
      }
    }
    for (var c2 = 0; c2 < COLS; c2++) {
      var run2 = 1;
      for (var r2 = 1; r2 <= ROWS; r2++) {
        if (r2 < ROWS && grid[r2][c2] === grid[r2 - 1][c2]) run2++;
        else {
          if (run2 >= 3) for (var k2 = r2 - run2; k2 < r2; k2++) matched[k2 + ',' + c2] = true;
          run2 = 1;
        }
      }
    }
    return matched;
  }

  function collapseAndRefill(matched) {
    for (var c = 0; c < COLS; c++) {
      var remain = [];
      for (var r = ROWS - 1; r >= 0; r--) if (!matched[r + ',' + c]) remain.push(grid[r][c]);
      for (var r2 = ROWS - 1; r2 >= 0; r2--) {
        var idx = ROWS - 1 - r2;
        grid[r2][c] = idx < remain.length ? remain[idx] : randColor();
      }
    }
  }

  function trySwap(a, b) {
    if (!a || !b) return;
    var dr = Math.abs(a.r - b.r), dc = Math.abs(a.c - b.c);
    if (dr + dc !== 1) return;
    var tmp = grid[a.r][a.c]; grid[a.r][a.c] = grid[b.r][b.c]; grid[b.r][b.c] = tmp;
    var matched = findMatches();
    var n = Object.keys(matched).length;
    if (n > 0) {
      matchCount++;
      hitStop = 0.08;
      game.feedback.good(cellX(b.c), cellY(b.r), { text: 'GOOD', color: C.good, size: 22 });
      game.audio.play('se_good', 0.35);
      popFx.push({ x: cellX(b.c), y: cellY(b.r), t: 0.25 });
      collapseAndRefill(matched);
      if (!milestoneShown && matchCount === Math.ceil(MATCH_TARGET / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.13, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (matchCount >= MATCH_TARGET) { ok = true; finished = true; finish(); }
    } else {
      tmp = grid[a.r][a.c]; grid[a.r][a.c] = grid[b.r][b.c]; grid[b.r][b.c] = tmp;
      game.fx.shake(4, 0.08);
      game.audio.play('se_bad', 0.15);
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    pressCell = cellAt(x, y); pressPos = { x: x, y: y };
    if (pressCell) game.audio.play('se_tap', 0.1);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressCell || ready > 0 || finished) { pressCell = null; return; }
    var dx = x - pressPos.x, dy = y - pressPos.y;
    if (Math.hypot(dx, dy) < 40) { game.audio.play('se_tap', 0.05); pressCell = null; return; }
    var dir = Math.abs(dx) > Math.abs(dy) ? { r: 0, c: dx > 0 ? 1 : -1 } : { r: dy > 0 ? 1 : -1, c: 0 };
    var target = { r: pressCell.r + dir.r, c: pressCell.c + dir.c };
    if (target.r >= 0 && target.r < ROWS && target.c >= 0 && target.c < COLS) trySwap(pressCell, target);
    else game.audio.play('se_bad', 0.1);
    pressCell = null;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawGrid(curGrid, warnBorder) {
    game.draw.rect(GX0 - 10, GY0 - 10, GRID_W + 20, GRID_H + 20, warnBorder ? C.bad : C.cellDark, warnBorder ? 0.6 : 0.5);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = GX0 + c * CELL, y = GY0 + r * CELL;
        game.draw.rect(x + 4, y + 4, CELL - 8, CELL - 8, C.cell);
        var t = curGrid[r][c];
        game.draw.sprite(GEM_SHAPES[t], { '#': C.gem[t] }, x + CELL / 2, y + CELL / 2, 26, { anchor: 'center' });
      }
    }
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  var DEMO_CYC = 2.6;
  var demoGrid = null, demoMatch = 0;
  var DEMO_SWAP_A = { r: 2, c: 1 }, DEMO_SWAP_B = { r: 2, c: 2 };
  function buildDemoGrid() {
    var g = [];
    for (var r = 0; r < ROWS; r++) { g[r] = []; for (var c = 0; c < COLS; c++) g[r][c] = (r + c) % C.gem.length; }
    g[1][1] = 0; g[3][1] = 0; g[2][2] = 0; // 入れ替えると縦3つ揃う配置
    return g;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { demoGrid = buildDemoGrid(); }
    var ax = cellX(DEMO_SWAP_A.c), ay = cellY(DEMO_SWAP_A.r);
    var bx = cellX(DEMO_SWAP_B.c), by = cellY(DEMO_SWAP_B.r);
    if (cyc < 0.5) { demo.gx = ax; demo.gy = ay; demo.press = false; }
    else if (cyc < 1.1) {
      var p = (cyc - 0.5) / 0.6;
      demo.gx = ax + (bx - ax) * p; demo.gy = ay + (by - ay) * p; demo.press = true;
      if (p > 0.9 && demoMatch === 0) {
        var tmp = demoGrid[DEMO_SWAP_A.r][DEMO_SWAP_A.c];
        demoGrid[DEMO_SWAP_A.r][DEMO_SWAP_A.c] = demoGrid[DEMO_SWAP_B.r][DEMO_SWAP_B.c];
        demoGrid[DEMO_SWAP_B.r][DEMO_SWAP_B.c] = tmp;
        demoMatch = 1;
        game.feedback.good(bx, by, { text: 'GOOD', color: C.good, size: 22 });
        game.audio.play('se_good', 0.3);
      }
    } else { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGrid(demoGrid || buildDemoGrid(), false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid(grid, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(matchCount + ' / ' + MATCH_TARGET, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, MATCH_TARGET - matchCount) + '個!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(matchCount, { matches: matchCount, total: MATCH_TARGET });
        else game.end.failure({ matches: matchCount, total: MATCH_TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(W / 2, GY0 + GRID_H / 2, { text: 'TIME UP' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid(grid, timeLeft < 3 && timeLeft > 0);

    txt(matchCount + ' / ' + MATCH_TARGET, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 140, W - 120, 16, C.cellDark, 0.6);
    game.draw.rect(60, 140, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
