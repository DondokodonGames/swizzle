// D-20132016-0011-harvest-eve-crop-quota.js
// 収穫祭前夜クロップ・クォータ — 隣り合う作物を選んで入れ替え、注文書どおりの黄金カボチャを集める
// 操作: 作物を1つタップして選び、隣の作物をもう一度タップして入れ替える。3つ揃えば収穫できる
// 終わり: 黄金カボチャをちょうど規定数(3個)収穫すれば成功。制限時間切れなら失敗
// @mechanic: count_exact
// @theme: harvest_eve_crop_quota
// 世界観: 収穫祭前夜の畑。隣り合う作物を選んで入れ替え、同じ作物を3つ揃えて収穫する見習い農夫。注文書に書かれた黄金カボチャをちょうどの数だけ集めれば出荷完了
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた黄金カボチャの数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡い暖色、丸みのある縁取り
  var C = {
    bg1: '#fdeede', bg2: '#f6dcc0', cell: '#fffaf2', cellDark: '#e8cfae',
    gem: ['#8fce6a', '#ff8a6a', '#7ab8ff', '#ffd400'],
    good: '#3fbf6a', bad: '#ff5a5a', gold: '#ffb02e', white: '#4a3220', ink: '#4a3220',
  };
  var TARGET_TYPE = 3; // 黄金カボチャ(色index 3)

  var GAME_TITLE = 'CROP QUOTA';
  var COLS = 4, ROWS = 5, CELL = 168;
  var GRID_W = COLS * CELL, GRID_H = ROWS * CELL;
  var GX0 = W / 2 - GRID_W / 2, GY0 = H * 0.2;
  var TARGET_COUNT = 3;
  var TIME_LIMIT = 22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var grid, collected, timeLeft, done, endWait, finished, milestoneShown, selected;
  var ready, hitStop, shake;

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
  var FARMER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(el * 1.3));
    game.draw.sprite(FARMER, { '#': C.gold }, W * 0.5 + Math.cos(el * 1.6) * 4, H * 0.88, 22, { anchor: 'center' });
  }

  function randColor() { return Math.floor(Math.random() * C.gem.length); }

  function makeGrid() {
    var g = [];
    for (var r = 0; r < ROWS; r++) {
      g[r] = [];
      for (var c = 0; c < COLS; c++) {
        var v, tries = 0;
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
    grid = makeGrid(); collected = 0; timeLeft = TIME_LIMIT; milestoneShown = false; selected = null;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function cellAt(x, y) {
    var c = Math.floor((x - GX0) / CELL), r = Math.floor((y - GY0) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    return { r: r, c: c };
  }
  function cellX(c) { return GX0 + c * CELL + CELL / 2; }
  function cellY(r) { return GY0 + r * CELL + CELL / 2; }
  function adjacent(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1; }

  function findMatches() {
    var matched = {};
    for (var r = 0; r < ROWS; r++) {
      var run = 1;
      for (var c = 1; c <= COLS; c++) {
        if (c < COLS && grid[r][c] === grid[r][c - 1]) run++;
        else { if (run >= 3) for (var k = c - run; k < c; k++) matched[r + ',' + k] = true; run = 1; }
      }
    }
    for (var c2 = 0; c2 < COLS; c2++) {
      var run2 = 1;
      for (var r2 = 1; r2 <= ROWS; r2++) {
        if (r2 < ROWS && grid[r2][c2] === grid[r2 - 1][c2]) run2++;
        else { if (run2 >= 3) for (var k2 = r2 - run2; k2 < r2; k2++) matched[k2 + ',' + c2] = true; run2 = 1; }
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
    var tmp = grid[a.r][a.c]; grid[a.r][a.c] = grid[b.r][b.c]; grid[b.r][b.c] = tmp;
    var matched = findMatches();
    var keys = Object.keys(matched);
    if (keys.length > 0) {
      var goldCount = 0;
      for (var i = 0; i < keys.length; i++) {
        var rc = keys[i].split(',');
        if (grid[+rc[0]][+rc[1]] === TARGET_TYPE) goldCount++;
      }
      hitStop = 0.08;
      game.feedback.good(cellX(b.c), cellY(b.r), { text: 'GOOD', color: C.good, size: 22 });
      game.audio.play('se_good', 0.35);
      collapseAndRefill(matched);
      if (goldCount > 0) {
        collected = Math.min(TARGET_COUNT, collected + goldCount);
        game.audio.play('se_coin', 0.4);
        if (!milestoneShown && collected >= Math.ceil(TARGET_COUNT / 2)) {
          milestoneShown = true;
          game.fx.popup('HALFWAY!', W / 2, H * 0.13, { color: C.gold, size: 36 });
          game.audio.play('se_milestone', 0.4);
        }
        if (collected >= TARGET_COUNT) { ok = true; finished = true; finish(); }
      }
    } else {
      tmp = grid[a.r][a.c]; grid[a.r][a.c] = grid[b.r][b.c]; grid[b.r][b.c] = tmp;
      game.fx.shake(4, 0.08);
      game.audio.play('se_bad', 0.15);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished || done) return;
    var cell = cellAt(x, y);
    if (!cell) return;
    if (!selected) { selected = cell; game.audio.play('se_tap', 0.12); return; }
    if (selected.r === cell.r && selected.c === cell.c) { selected = null; game.audio.play('se_tap', 0.06); return; }
    if (adjacent(selected, cell)) { trySwap(selected, cell); selected = null; }
    else { selected = cell; game.audio.play('se_tap', 0.1); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawGrid(curGrid, warnBorder, curSelected, bobT) {
    game.draw.rect(GX0 - 10, GY0 - 10, GRID_W + 20, GRID_H + 20, warnBorder ? C.bad : C.cellDark, warnBorder ? 0.6 : 0.5);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = GX0 + c * CELL, y = GY0 + r * CELL;
        game.draw.rect(x + 4, y + 4, CELL - 8, CELL - 8, C.cell);
        var t = curGrid[r][c];
        if (t === TARGET_TYPE) game.draw.circle(x + CELL / 2, y + CELL / 2, CELL * 0.4, C.gold, 0.25 + 0.15 * Math.sin(bobT * 4 + r + c));
        game.draw.sprite(GEM_SHAPES[t], { '#': C.gem[t] }, x + CELL / 2, y + CELL / 2, 26, { anchor: 'center' });
        if (curSelected && curSelected.r === r && curSelected.c === c) {
          game.draw.line(x + 8, y + 8, x + CELL - 8, y + 8, C.good, 6);
          game.draw.line(x + 8, y + CELL - 8, x + CELL - 8, y + CELL - 8, C.good, 6);
          game.draw.line(x + 8, y + 8, x + 8, y + CELL - 8, C.good, 6);
          game.draw.line(x + CELL - 8, y + 8, x + CELL - 8, y + CELL - 8, C.good, 6);
        }
      }
    }
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  var DEMO_CYC = 3.0;
  var demoGrid = null, demoSelected = null, demoMatch = 0;
  var DEMO_A = { r: 2, c: 1 }, DEMO_B = { r: 2, c: 2 };
  function buildDemoGrid() {
    var g = [];
    for (var r = 0; r < ROWS; r++) { g[r] = []; for (var c = 0; c < COLS; c++) g[r][c] = (r + c) % C.gem.length; }
    g[1][1] = TARGET_TYPE; g[3][1] = TARGET_TYPE; g[2][2] = TARGET_TYPE;
    return g;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { demoGrid = buildDemoGrid(); demoSelected = null; demoMatch = 0; }
    var ax = cellX(DEMO_A.c), ay = cellY(DEMO_A.r);
    var bx = cellX(DEMO_B.c), by = cellY(DEMO_B.r);
    if (cyc < 0.5) { demo.gx = ax; demo.gy = ay; demo.press = false; demoSelected = null; }
    else if (cyc < 0.75) { demo.press = true; demoSelected = DEMO_A; }
    else if (cyc < 1.3) {
      var p = (cyc - 0.75) / 0.55;
      demo.gx = ax + (bx - ax) * p; demo.gy = ay + (by - ay) * p; demo.press = false;
    } else if (cyc < 1.55) {
      demo.press = true;
      if (demoMatch === 0) {
        var tmp = demoGrid[DEMO_A.r][DEMO_A.c];
        demoGrid[DEMO_A.r][DEMO_A.c] = demoGrid[DEMO_B.r][DEMO_B.c];
        demoGrid[DEMO_B.r][DEMO_B.c] = tmp;
        demoMatch = 1; demoSelected = null;
        game.feedback.good(bx, by, { text: 'GOOD', color: C.good, size: 22 });
        game.audio.play('se_good', 0.3);
        game.audio.play('se_coin', 0.3);
      }
    } else { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGrid(demoGrid || buildDemoGrid(), false, demoSelected, game.time.elapsed);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid(grid, false, null, game.time.elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(collected + ' / ' + TARGET_COUNT, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET_COUNT - collected) + '個!', W / 2, H * 0.17, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(collected, { collected: collected, total: TARGET_COUNT });
        else game.end.failure({ collected: collected, total: TARGET_COUNT });
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
    drawGrid(grid, timeLeft < 3 && timeLeft > 0, selected, game.time.elapsed);

    txt(collected + ' / ' + TARGET_COUNT, W / 2, H * 0.06, 28, C.ink);
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
