// D-20132016-0010-flooding-cistern-jelly-match.js
// 浸水貯水路ジェリーマッチ — 光るクラゲ提灯を線でつないで入れ替え、3つ揃えて水位を押し下げる
// 操作: クラゲ提灯を押したまま隣の提灯まで指を引いてつなぎ、離して入れ替える。3つ揃えば水位が下がる
// 終わり: 規定回数(4回)揃える前に水位が主役の頭に届けば失敗。届く前に4回揃えれば成功
// @mechanic: connect
// @theme: flooding_cistern_jelly_match
// 世界観: 浸水が進む地下貯水路。天井から吊るされた発光クラゲ提灯を線でつないで入れ替え、同じ色を3つ揃えて割ると水位が下がる。水位が頭に届く前に規定回数揃えろ
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えた回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色ライン
  var C = {
    bg1: '#0a0020', bg2: '#03000c', cell: '#150a30', cellDark: '#0a0420',
    gem: ['#ff2ea0', '#00e5ff', '#39ff6a', '#ffe600'],
    water: '#0a5aff', waterDanger: '#ff2e55',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#02000a',
  };

  var GAME_TITLE = 'CISTERN MATCH';
  var COLS = 4, ROWS = 5, CELL = 168;
  var GRID_W = COLS * CELL, GRID_H = ROWS * CELL;
  var GX0 = W / 2 - GRID_W / 2, GY0 = H * 0.18;
  var MATCH_TARGET = 4;
  var MAX_TIME = 25;
  var WATER_START = H * 0.95, WATER_DANGER = H * 0.34;
  var RISE_RANGE = WATER_START - WATER_DANGER;
  var RISE_SPEED = RISE_RANGE / 20;
  var PUSH_BACK = RISE_RANGE * 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var grid, matchCount, waterY, done, endWait, finished, playElapsed, milestoneShown;
  var ready, hitStop, shake;
  var pressCell, pressPos, dragPos;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GEM_SHAPES = [
    ['.#.', '###', '.#.'],
    ['##.', '.##', '##.'],
    ['.##', '##.', '.##'],
    ['###', '#.#', '###'],
  ];
  var HERO = ['.##.', '####', '.##.', '#.#.'];

  function bg(curWaterY) {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(el * 1.3));
    var danger = curWaterY - WATER_DANGER < RISE_SPEED * 0.7;
    var wcol = danger && Math.floor(el * 8) % 2 === 0 ? C.waterDanger : C.water;
    game.draw.rect(0, curWaterY, W, H - curWaterY, wcol, 0.4);
    game.draw.line(0, curWaterY, W, curWaterY, wcol, 6);
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
    grid = makeGrid(); matchCount = 0; waterY = WATER_START; milestoneShown = false;
    done = false; endWait = 0; finished = false; playElapsed = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    pressCell = null; pressPos = null; dragPos = null;
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
      waterY = Math.min(WATER_START, waterY + PUSH_BACK);
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
    pressCell = cellAt(x, y); pressPos = { x: x, y: y }; dragPos = { x: x, y: y };
    if (pressCell) game.audio.play('se_tap', 0.1);
  });
  game.onMove(function(x, y) {
    if (!pressCell) return;
    dragPos = { x: x, y: y };
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
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

  function drawGrid(curGrid) {
    game.draw.rect(GX0 - 10, GY0 - 10, GRID_W + 20, GRID_H + 20, C.cellDark, 0.6);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = GX0 + c * CELL, y = GY0 + r * CELL;
        game.draw.rect(x + 4, y + 4, CELL - 8, CELL - 8, C.cell);
        var t = curGrid[r][c];
        game.draw.sprite(GEM_SHAPES[t], { '#': C.gem[t] }, x + CELL / 2, y + CELL / 2, 26, { anchor: 'center' });
      }
    }
  }

  function drawHero(bobT) {
    game.draw.sprite(HERO, { '#': C.white }, W * 0.5 + Math.cos(bobT * 1.7) * 4, H * 0.14 + Math.sin(bobT * 2.4) * 4, 20, { anchor: 'center' });
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  var DEMO_CYC = 2.8;
  var demoGrid = null, demoMatch = 0;
  var DEMO_SWAP_A = { r: 2, c: 1 }, DEMO_SWAP_B = { r: 2, c: 2 };
  function buildDemoGrid() {
    var g = [];
    for (var r = 0; r < ROWS; r++) { g[r] = []; for (var c = 0; c < COLS; c++) g[r][c] = (r + c) % C.gem.length; }
    g[1][1] = 1; g[3][1] = 1; g[2][2] = 1;
    return g;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { demoGrid = buildDemoGrid(); demoMatch = 0; }
    var ax = cellX(DEMO_SWAP_A.c), ay = cellY(DEMO_SWAP_A.r);
    var bx = cellX(DEMO_SWAP_B.c), by = cellY(DEMO_SWAP_B.r);
    if (cyc < 0.5) { demo.gx = ax; demo.gy = ay; demo.press = false; }
    else if (cyc < 1.2) {
      var p = (cyc - 0.5) / 0.7;
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
      bg(WATER_START * 0.7);
      stepDemo(dt);
      drawHero(game.time.elapsed);
      drawGrid(demoGrid || buildDemoGrid());
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(waterY);
      drawHero(game.time.elapsed);
      drawGrid(grid);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(matchCount + ' / ' + MATCH_TARGET, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, MATCH_TARGET - matchCount) + '個!', W / 2, H * 0.17, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.white);
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
      playElapsed += dt;
      waterY -= RISE_SPEED * dt;
      if (waterY <= WATER_DANGER || playElapsed > MAX_TIME) {
        ok = false; finished = true; hitStop = 0.35;
        game.feedback.bad(W / 2, WATER_DANGER, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.45);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(waterY);
    drawHero(game.time.elapsed);
    drawGrid(grid);
    if (pressCell && dragPos) {
      game.draw.line(cellX(pressCell.c), cellY(pressCell.r), dragPos.x, dragPos.y, C.gold, 8);
      game.draw.circle(dragPos.x, dragPos.y, 14, C.gold, 0.7);
    }

    txt(matchCount + ' / ' + MATCH_TARGET, W / 2, H * 0.06, 28, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
