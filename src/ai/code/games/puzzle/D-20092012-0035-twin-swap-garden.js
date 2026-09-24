// D-20092012-0035-twin-swap-garden.js
// ツインスワップガーデン — 隣り合う宝玉を1回だけ入れ替えて、同じ色を3つ並べる
// 操作: 宝玉を1つタップして選び、隣の宝玉をタップして入れ替える(線でつなぐ)
// 終わり: 正しい組を入れ替えて3つ揃えば成功。間違った組を入れ替えるか時間切れなら失敗
// @mechanic: connect
// @theme: garden_gem_bed
// 世界観: 石庭の宝玉花壇。9個の玉が並ぶ花壇で、隣り合う2個だけをつなぎ替えられる庭師が、正しい一組を見極めて同色を3つ並べる
// 残るもの: 正誤(CLEAR/GAME OVER) + 残り時間
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 白縁の丸い形、画面を上下に分ける
  var C = {
    bg: '#fef3f7', bg2: '#f3e0ec', panel: '#ffffff',
    pink: '#ff9ec4', mint: '#8de3c0', lilac: '#b39ce8',
    ink: '#5a4a66', gold: '#ffd166', bad: '#ff6b6b', good: '#4dd88a',
  };
  var STYLE = { bg: [C.bg, C.bg2], main: [C.pink, C.mint], accent: [C.lilac, C.gold] };

  var GAME_TITLE = 'TWIN SWAP';
  var TIME_LIMIT = 15;
  var GRID = 3, CELL = 210;
  var ORIGIN_X = W * 0.5 - CELL * 1.0, ORIGIN_Y = H * 0.34;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var COLORS = { R: C.pink, G: C.mint, B: C.lilac };
  // 正解の入れ替え: (0,2)<->(1,2) で row0 が全て R になる
  var BASE = [
    ['R', 'R', 'G'],
    ['G', 'B', 'R'],
    ['B', 'G', 'B'],
  ];
  var SOLUTION = { ar: 0, ac: 2, br: 1, bc: 2 };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GARDENER = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.circle(W * 0.5, H * 0.9, 420, C.panel, 0.5);
  }

  function cellPos(r, c) { return { x: ORIGIN_X + c * CELL, y: ORIGIN_Y + r * CELL }; }

  var board, sel, matched, matchedCells, done, endWait, finished, timeLeft, wrongSwap;
  var ready, hitStop, shake;

  function initGame() {
    board = [BASE[0].slice(), BASE[1].slice(), BASE[2].slice()];
    sel = null; matched = false; matchedCells = []; wrongSwap = null;
    done = false; endWait = 0; finished = false; timeLeft = TIME_LIMIT;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function findMatchLine(b) {
    for (var r = 0; r < GRID; r++) {
      if (b[r][0] && b[r][0] === b[r][1] && b[r][1] === b[r][2]) {
        return [[r, 0], [r, 1], [r, 2]];
      }
    }
    for (var c = 0; c < GRID; c++) {
      if (b[0][c] && b[0][c] === b[1][c] && b[1][c] === b[2][c]) {
        return [[0, c], [1, c], [2, c]];
      }
    }
    return null;
  }

  function attemptSwap(ar, ac, br, bc) {
    var tmp = board[ar][ac]; board[ar][ac] = board[br][bc]; board[br][bc] = tmp;
    var line = findMatchLine(board);
    if (line) {
      matched = true; matchedCells = line; ok = true; finished = true; hitStop = 0.15;
      var p0 = cellPos(line[0][0], line[0][1]);
      game.feedback.good(p0.x, p0.y, { text: 'MATCH', color: C.good });
      game.fx.burst(p0.x, p0.y, { color: C.gold, count: 18, speed: 360 });
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      wrongSwap = { ar: ar, ac: ac, br: br, bc: bc };
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      var p1 = cellPos(ar, ac);
      game.feedback.bad(p1.x, p1.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function onCellTap(r, c) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    if (sel === null) {
      sel = { r: r, c: c };
      game.audio.play('se_tap', 0.2);
      return;
    }
    var dr = Math.abs(sel.r - r), dc = Math.abs(sel.c - c);
    var adjacent = (dr + dc) === 1;
    if (!adjacent) {
      sel = { r: r, c: c };
      game.audio.play('se_tap', 0.2);
      return;
    }
    var ar = sel.r, ac = sel.c;
    sel = null;
    attemptSwap(ar, ac, r, c);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var p = cellPos(r, c);
        if (Math.abs(x - p.x) < CELL * 0.45 && Math.abs(y - p.y) < CELL * 0.45) {
          onCellTap(r, c);
          return;
        }
      }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function isMatchedCell(r, c) {
    for (var i = 0; i < matchedCells.length; i++) if (matchedCells[i][0] === r && matchedCells[i][1] === c) return true;
    return false;
  }

  function drawBoard() {
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var p = cellPos(r, c);
        var col = COLORS[board[r][c]] || C.panel;
        var highlight = matched && isMatchedCell(r, c);
        var isSel = sel && sel.r === r && sel.c === c;
        game.draw.circle(p.x, p.y, CELL * 0.42, C.panel);
        game.draw.circle(p.x, p.y, CELL * 0.36, col, highlight ? (0.7 + Math.sin(game.time.elapsed * 10) * 0.3) : 1);
        if (isSel) game.draw.circle(p.x, p.y, CELL * 0.46, C.gold, 0.6 + Math.sin(game.time.elapsed * 6) * 0.2);
      }
    }
    if (wrongSwap && finished) {
      var pa = cellPos(wrongSwap.ar, wrongSwap.ac), pb = cellPos(wrongSwap.br, wrongSwap.bc);
      game.draw.line(pa.x, pa.y, pb.x, pb.y, C.bad, 6);
    }
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { board = [BASE[0].slice(), BASE[1].slice(), BASE[2].slice()]; matched = false; matchedCells = []; sel = null; }
    var pa = cellPos(SOLUTION.ar, SOLUTION.ac), pb = cellPos(SOLUTION.br, SOLUTION.bc);
    if (cyc < 1.0) {
      demo.gx = pa.x; demo.gy = pa.y; demo.press = cyc > 0.5;
      if (cyc > 0.5 && !sel) sel = { r: SOLUTION.ar, c: SOLUTION.ac };
    } else if (cyc < 2.0) {
      var p = (cyc - 1.0) / 1.0;
      demo.gx = pa.x + (pb.x - pa.x) * p; demo.gy = pa.y + (pb.y - pa.y) * p;
      demo.press = true;
    } else if (cyc < 2.05) {
      if (!matched) {
        var tmp = board[SOLUTION.ar][SOLUTION.ac]; board[SOLUTION.ar][SOLUTION.ac] = board[SOLUTION.br][SOLUTION.bc]; board[SOLUTION.br][SOLUTION.bc] = tmp;
        var line = findMatchLine(board);
        if (line) { matched = true; matchedCells = line; game.feedback.good(pb.x, pb.y, { text: 'MATCH', color: C.good }); game.audio.play('se_good', 0.25); }
        sel = null;
      }
      demo.press = false;
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (board === undefined) initGame();
      bg();
      stepDemo(dt);
      game.draw.sprite(GARDENER, { '#': C.lilac }, W * 0.5 + Math.cos(game.time.elapsed * 2) * 6, H * 0.15 + Math.sin(game.time.elapsed * 3) * 6, 12, { anchor: 'center' });
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.07, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.105, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 36, C.pink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.07, 46, ok ? C.good : C.bad);
      txt(ok ? '1 / 1' : '0 / 1', W / 2, H * 0.11, 28, C.ink);
      if (!ok) txt('あと1手!', W / 2, H * 0.15, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(1, { solved: true, timeLeft: Math.round(timeLeft * 10) / 10 });
        else game.end.failure({ solved: false });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 6 && timeLeft + dt > 6) game.fx.popup('あと6秒!', W * 0.5, H * 0.28, { color: C.bad, size: 32 });
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.25; shake = 0.2;
        game.feedback.bad(W * 0.5, H * 0.5, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    game.draw.sprite(GARDENER, { '#': C.lilac }, W * 0.5, H * 0.15, 12, { anchor: 'center' });
    drawBoard();

    var pct = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(W * 0.5 - 300, H * 0.19, 600, 20, C.panel, 0.8);
    game.draw.rect(W * 0.5 - 300, H * 0.19, 600 * pct, 20, pct < 0.35 ? C.bad : C.mint);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.pink);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.4], ['E5', 0.4], ['G5', 0.8]], { tempo: 110, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
