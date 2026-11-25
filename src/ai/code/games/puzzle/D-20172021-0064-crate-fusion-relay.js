// D-20172021-0064-crate-fusion-relay.js
// クレートフュージョン・リレー — 隣り合う同格の資材クレートを線でつないで上位クレートに融合させる
// 操作: クレートを1つタップして選び、隣接する同じ等級のクレートをタップして線でつなぎ融合させる
// 終わり: 規定数の上位クレートを作れば成功。ミスを3回重ねるか時間切れで失敗
// @mechanic: connect
// @theme: caravan_crate_fusion
// 世界観: 出発間際の開拓キャラバンの資材係が、荷台に積まれた同格の資材クレートをつなぎ合わせて上位の建材へ融合させ、隊列が動く前に規定数を仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 融合させた上位クレート数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るいパステル背景 + 原色 + 太い白縁取り
  var STYLE = { bg: ['#fff3d6', '#ffd9a0'], main: ['#ff8c42', '#3dd6c8'], accent: ['#ffd400', '#ff4d5e'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], slot: '#ffffff', slotEdge: '#ff8c42',
    t1: '#8a5a2a', t2: '#3dd6c8', ring: '#ffd400', sel: '#ff4d5e',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffd400', ink: '#3a2a10', white: '#ffffff',
  };

  var GAME_TITLE = 'CRATE FUSION';
  var COLS = 4, ROWS = 3;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.44, CELL = 230;
  var COFF = (COLS - 1) / 2, ROFF = (ROWS - 1) / 2;
  var TARGET = 5;
  var MAX_MISS = 3;
  var TIME_LIMIT = 17;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CRATE1 = ['#####', '#...#', '#...#', '#####'];
  var CRATE2 = ['#####', '#.#.#', '#####', '#.#.#', '#####'];
  var FOREMAN = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, '#ffd400', pulse * 0.3);
    game.draw.sprite(FOREMAN, { '#': C.t1 }, W * 0.86, H * 0.87, 10, { anchor: 'center' });
  }

  function idxRC(i) { return { c: i % COLS, r: Math.floor(i / COLS) }; }
  function cellPos(i) {
    var rc = idxRC(i);
    return { x: BOARD_X + (rc.c - COFF) * CELL, y: BOARD_Y + (rc.r - ROFF) * CELL };
  }
  function hasValidPair() {
    for (var i = 0; i < grid.length; i++) {
      if (grid[i] !== 1) continue;
      var ns = [i - 1, i + 1, i - COLS, i + COLS];
      for (var k = 0; k < ns.length; k++) {
        var n = ns[k];
        if (n >= 0 && n < grid.length && adjacent(i, n) && grid[n] === 1) return true;
      }
    }
    return false;
  }
  function adjacent(i, j) {
    var a = idxRC(i), b = idxRC(j);
    var dx = Math.abs(a.c - b.c), dy = Math.abs(a.r - b.r);
    return (dx + dy) === 1;
  }

  var grid, sel, produced, misses, timeLeft, done, endWait, finished, ready, hitStop, shake, lineFx;

  function newTier1() { return 1; }

  function initGame() {
    grid = [];
    for (var i = 0; i < COLS * ROWS; i++) grid.push(newTier1());
    sel = -1; produced = 0; misses = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; lineFx = null;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function cellFromXY(x, y) {
    var c = Math.round((x - BOARD_X) / CELL + COFF);
    var r = Math.round((y - BOARD_Y) / CELL + ROFF);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
    return r * COLS + c;
  }

  function drawBoard() {
    game.draw.rect(BOARD_X - COLS * CELL / 2 - 20, BOARD_Y - ROWS * CELL / 2 - 20, COLS * CELL + 40, ROWS * CELL + 40, C.slotEdge, 0.25);
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      var isSel = i === sel;
      game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, isSel ? C.ring : C.slot);
      if (grid[i] === 1) {
        game.draw.sprite(CRATE1, { '#': C.t1 }, p.x, p.y, 22, { anchor: 'center' });
      } else if (grid[i] === 2) {
        var bob = Math.sin(game.time.elapsed * 3 + i) * 4;
        game.draw.sprite(CRATE2, { '#': C.t2 }, p.x, p.y + bob, 22, { anchor: 'center' });
      }
    }
    if (lineFx && lineFx.t > 0) {
      game.draw.line(lineFx.x1, lineFx.y1, lineFx.x2, lineFx.y2, lineFx.ok ? C.good : C.bad, 10);
    }
  }

  function tryMerge(a, b) {
    var p2 = cellPos(b);
    var p1 = cellPos(a);
    lineFx = { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, t: 0.3, ok: false };
    if (!adjacent(a, b) || grid[a] !== grid[b] || grid[a] !== 1) {
      misses++;
      game.feedback.bad(p2.x, p2.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (misses >= MAX_MISS) { ok = false; finished = true; hitStop = 0.3; shake = 0.25; finish(); }
      return;
    }
    lineFx.ok = true;
    grid[a] = newTier1();
    grid[b] = 2;
    produced++;
    game.feedback.good(p2.x, p2.y, { text: 'GOOD', color: C.good });
    game.fx.burst(p2.x, p2.y, { color: C.gold, count: 18, speed: 360 });
    game.audio.play(produced % 2 === 0 ? 'se_milestone' : 'se_good', 0.35);
    if (produced === Math.ceil(TARGET / 2)) game.fx.popup('NICE', p2.x, p2.y - 150, { color: C.gold, size: 34 });
    if (produced >= TARGET) {
      ok = true; finished = true; hitStop = 0.3;
      game.audio.play('se_success', 0.5);
      finish();
    } else if (!hasValidPair()) {
      for (var q = 0; q < grid.length; q++) { if (grid[q] === 2) { grid[q] = 1; break; } }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && hitStop <= 0 && !finished) {
      var i = cellFromXY(x, y);
      if (i < 0) return;
      game.audio.play('se_tap', 0.12);
      if (sel < 0) { sel = i; return; }
      if (sel === i) { sel = -1; return; }
      var a = sel; sel = -1;
      tryMerge(a, i);
    }
  });

  var demo = { t: 0, gx: BOARD_X, gy: BOARD_Y, press: false, phase: 0, a: 0, b: 1 };
  function resetDemo() {
    initGame();
    demo.a = 0; demo.b = 1;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var pa = cellPos(demo.a), pb = cellPos(demo.b);
    if (cyc < 1.0) {
      var t1 = cyc / 1.0;
      demo.gx = W * 0.5 + (pa.x - W * 0.5) * t1;
      demo.gy = H * 0.95 + (pa.y - H * 0.95) * t1;
      demo.press = false;
    } else if (cyc < 1.15) {
      demo.press = true;
      if (sel !== demo.a) sel = demo.a;
    } else if (cyc < 2.1) {
      var t2 = (cyc - 1.15) / 0.95;
      demo.gx = pa.x + (pb.x - pa.x) * t2;
      demo.gy = pa.y + (pb.y - pa.y) * t2;
      demo.press = false;
    } else if (cyc < 2.25) {
      demo.press = true;
      if (sel === demo.a) { sel = -1; tryMerge(demo.a, demo.b); }
    } else {
      demo.gx = pb.x; demo.gy = pb.y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (lineFx && lineFx.t > 0) lineFx.t -= dt;

    if (state === S.ATTRACT) {
      if (!grid) resetDemo();
      stepDemo(dt);
      bg();
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(produced + ' / ' + TARGET, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET - produced) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(produced, { produced: produced, target: TARGET, misses: misses });
        else game.end.failure({ produced: produced, target: TARGET, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(BOARD_X, BOARD_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();

    txt(produced + ' / ' + TARGET, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#ffffff', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(80 + m * 40, 190, 12, m < misses ? C.bad : '#ffffff');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F#4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 136, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
