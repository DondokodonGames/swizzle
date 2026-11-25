// GH-DS-0020-pixel-paint.js
// ピクセルペイント — 数字のヒントどおりにマスを塗って絵を出す。塗り間違いは3回まで
// 操作: マスをタップして塗る。行と列の数字はそのマスに塗るべき数
// 終わり: 絵を完成させれば成功。3回間違えれば失敗
// @mechanic: count_exact
// @theme: mono_grid
// 世界観: 白いドットだけの盤面。行と列の数字だけを頼りに、正しいマスを塗って絵を浮かび上がらせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 間違えた回数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 70s VECTOR: 黒地に発光する線画のみ。塗りを使わない(セルの塗りは例外的に許容し、発光色で表現)
  var C = {
    bg: '#05050a', line: '#39ff6a', dim: '#175a2c', bad: '#ff3a4a', gold: '#ffd400', white: '#e8ffe8', ink: '#02020a',
  };

  var GAME_TITLE = 'PIXEL PAINT';
  var GS = 5, MISS_LIMIT = 3;
  var PATTERNS = [
    // ハート
    [
      '.#.#.',
      '#####',
      '#####',
      '.###.',
      '..#..',
    ],
    // 星
    [
      '..#..',
      '..#..',
      '#####',
      '.###.',
      '#...#',
    ],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, misses = 0, filled = 0, target = 0;

  var grid, rowHint, colHint, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CELL = 130, GX0 = W * 0.5 - GS * CELL / 2, GY0 = H * 0.30;
  var CAM_SPRITE = ['.#.', '###', '.#.'];

  function grain() {
    for (var i = 0; i < 40; i++) { var gx = (i * 137 + 19) % W, gy = (i * 271 + 53) % H; game.draw.rect(gx, gy, 2, 2, '#ffffff', 0.02); }
  }

  function boardBg() {
    game.draw.gradient(0, H, [[0, '#0a0e12'], [0.5, C.bg], [1, '#020204']]);
    var breathe = 0.03 + 0.22 * (0.5 + 0.5 * Math.sin(game.time.elapsed * 1.2));
    var scanY = (game.time.elapsed * 460) % (H + 260) - 130;
    game.draw.rect(0, scanY, W, 240, C.line, 0.14);
    game.draw.rect(0, 0, W, H, C.line, breathe * 0.04);
    grain();
    game.draw.sprite(CAM_SPRITE, { '#': C.line }, W * 0.10, H * 0.10, 10, { anchor: 'center' });
    game.draw.sprite(CAM_SPRITE, { '#': C.line }, W * 0.90, H * 0.10, 10, { anchor: 'center' });
  }

  function initGame() {
    var pat = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    grid = []; rowHint = []; colHint = [];
    var colCount = [0, 0, 0, 0, 0];
    for (var r = 0; r < GS; r++) {
      var rc = 0; grid.push([]);
      for (var c = 0; c < GS; c++) {
        var on = pat[r][c] === '#';
        grid[r].push({ target: on, filled: false });
        if (on) { rc++; colCount[c]++; }
      }
      rowHint.push(rc);
    }
    colHint = colCount;
    target = 0; for (var r2 = 0; r2 < GS; r2++) for (var c2 = 0; c2 < GS; c2++) if (grid[r2][c2].target) target++;
    filled = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function cellXY(r, c) { return { x: GX0 + c * CELL + CELL / 2, y: GY0 + r * CELL + CELL / 2 }; }

  function drawGrid() {
    for (var r = 0; r < GS; r++) {
      for (var c = 0; c < GS; c++) {
        var p = cellXY(r, c), cell = grid[r][c];
        var x0 = p.x - CELL / 2 + 4, y0 = p.y - CELL / 2 + 4, sz = CELL - 8;
        game.draw.line(x0, y0, x0 + sz, y0, C.dim, 2);
        game.draw.line(x0, y0, x0, y0 + sz, C.dim, 2);
        game.draw.line(x0 + sz, y0, x0 + sz, y0 + sz, C.dim, 2);
        game.draw.line(x0, y0 + sz, x0 + sz, y0 + sz, C.dim, 2);
        if (cell.filled) game.draw.rect(x0 + 6, y0 + 6, sz - 12, sz - 12, C.line, 0.85);
      }
      txt(String(rowHint[r]), GX0 - 46, GY0 + r * CELL + CELL / 2 + 12, 38, C.gold);
    }
    for (var c3 = 0; c3 < GS; c3++) txt(String(colHint[c3]), GX0 + c3 * CELL + CELL / 2, GY0 - 40, 38, C.gold);
  }

  function tapCell(x, y) {
    if (done || ready > 0 || finished) return;
    for (var r = 0; r < GS; r++) {
      for (var c = 0; c < GS; c++) {
        var p = cellXY(r, c);
        if (Math.abs(x - p.x) < CELL / 2 - 6 && Math.abs(y - p.y) < CELL / 2 - 6) {
          var cell = grid[r][c];
          if (cell.filled) return;
          cell.filled = true;
          hitStop = 0.05;
          if (cell.target) {
            filled++;
            game.feedback.good(p.x, p.y, { text: null, color: C.line });
            game.audio.play('se_good', 0.25);
            if (filled >= target) { ok = true; finished = true; game.fx.burst(W / 2, GY0 + GS * CELL / 2, { color: C.line, count: 20, speed: 380 }); game.audio.play('se_success', 0.5); finish(); }
            else if (filled === Math.ceil(target / 2)) game.fx.popup(filled + ' / ' + target, W / 2, H * 0.16, { color: C.gold, size: 44 });
          } else {
            misses++;
            game.feedback.bad(p.x, p.y, { text: 'MISS' });
            shake = 0.1;
            game.audio.play('se_bad', 0.35);
            if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
          }
          return;
        }
      }
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    tapCell(x, y);
  });

  // ── ATTRACT ゴースト実演: 正しいマスだけを塗る ──
  var demo = { t: 0, gx: GX0, gy: GY0, press: false, idx: 0, order: [] };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.order.length === 0) {
      for (var r = 0; r < GS; r++) for (var c = 0; c < GS; c++) if (grid[r][c].target) demo.order.push([r, c]);
    }
    var cyc = demo.t % (demo.order.length * 0.35 + 1.0);
    var idx = Math.floor(cyc / 0.35);
    if (idx !== demo.idx && idx < demo.order.length) {
      demo.idx = idx;
      var rc = demo.order[idx];
      grid[rc[0]][rc[1]].filled = true;
      var p = cellXY(rc[0], rc[1]);
      game.feedback.good(p.x, p.y, { text: null, color: C.line });
    }
    if (cyc < 0.02) { for (var rr = 0; rr < GS; rr++) for (var cc = 0; cc < GS; cc++) grid[rr][cc].filled = false; demo.idx = -1; }
    var curIdx = Math.min(demo.order.length - 1, idx);
    if (curIdx >= 0 && demo.order[curIdx]) {
      var p2 = cellXY(demo.order[curIdx][0], demo.order[curIdx][1]);
      demo.gx += (p2.x - demo.gx) * Math.min(1, dt * 6); demo.gy += (p2.y - demo.gy) * Math.min(1, dt * 6);
    }
    demo.press = (cyc % 0.35) < 0.12;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (grid === undefined) initGame();
      boardBg();
      stepDemo(dt);
      drawGrid();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 56, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.14, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 46, C.gold);
        txt('TAP TO START', W / 2, H * 0.97, 34, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      boardBg();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 58, ok ? C.line : C.bad);
      txt('MISS ' + misses + ' / ' + MISS_LIMIT, W / 2, H * 0.15, 34, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 30, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ misses: misses });
        else game.end.failure({ misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    boardBg();
    drawGrid();

    txt('MISS ' + misses + ' / ' + MISS_LIMIT, W / 2, H * 0.06, 34, misses > 0 ? C.bad : C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.90, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
