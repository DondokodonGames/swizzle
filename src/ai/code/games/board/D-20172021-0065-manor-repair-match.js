// D-20172021-0065-manor-repair-match.js
// マナー・リペア・マッチ — 床に散らばった同じ資材タイルを見比べてタップし、ペアを揃えて破損箇所を直す
// 操作: 盤面のタイルを2枚タップ。同じ資材柄なら揃って修復され消える、違えば元に戻る
// 終わり: 規定ペア数を揃えれば成功。ミスを4回重ねるか時間切れで失敗
// @mechanic: pair_match
// @theme: manor_repair_matching
// 世界観: 廃屋敷の修復士が、床に散らばった資材タイルを一目で見比べ、同じ柄のペアだけをつないで破損箇所を直し、日没までに規定数を仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えたペア数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め金属質、粒状ノイズ、擬似奥行き
  var STYLE = { bg: ['#2a2420', '#141210'], main: ['#8a7a5a', '#4a4038'], accent: ['#d4af37', '#ff4d5e'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], tile: '#5a4f42', tileSel: '#7a6a4a', tileEdge: '#241f1a',
    t0: '#c98a4b', t1: '#8fa8b8', t2: '#d4af37', t3: '#6a9a6a',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#d4af37', ink: '#f0e6d2', white: '#ffffff',
  };
  var TYPES = [C.t0, C.t1, C.t2, C.t3];

  var GAME_TITLE = 'MANOR MATCH';
  var COLS = 4, ROWS = 4;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.44, CELL = 200;
  var COFF = (COLS - 1) / 2, ROFF = (ROWS - 1) / 2;
  var TARGET = 5;
  var MAX_MISS = 4;
  var TIME_LIMIT = 14;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BEAM = ['#####', '.....', '#####'];
  var BRICK = ['##.##', '#####', '##.##'];
  var GLASS = ['.###.', '#####', '.###.'];
  var ROOF = ['..#..', '.###.', '#####'];
  var FRAMES = [BEAM, BRICK, GLASS, ROOF];
  var RESTORER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 30; i++) {
      var nx = (i * 197) % W, ny = (i * 613 + Math.floor(game.time.elapsed * 4)) % H;
      game.draw.rect(nx, ny, 2, 2, '#000000', 0.15);
    }
    game.draw.sprite(RESTORER, { '#': C.gold }, W * 0.86, H * 0.87, 10, { anchor: 'center' });
  }

  function idxRC(i) { return { c: i % COLS, r: Math.floor(i / COLS) }; }
  function cellPos(i) {
    var rc = idxRC(i);
    return { x: BOARD_X + (rc.c - COFF) * CELL, y: BOARD_Y + (rc.r - ROFF) * CELL };
  }
  function cellFromXY(x, y) {
    var c = Math.round((x - BOARD_X) / CELL + COFF);
    var r = Math.round((y - BOARD_Y) / CELL + ROFF);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
    return r * COLS + c;
  }

  function genBoard() {
    var pool = [];
    var pairsNeeded = (COLS * ROWS) / 2;
    for (var i = 0; i < pairsNeeded; i++) {
      var type = i % TYPES.length;
      pool.push(type); pool.push(type);
    }
    for (var k = pool.length - 1; k > 0; k--) {
      var j = Math.floor(game.random(0, k + 1));
      var tmp = pool[k]; pool[k] = pool[j]; pool[j] = tmp;
    }
    return pool;
  }

  var grid, cleared, sel, pairs, misses, timeLeft, done, endWait, finished, ready, hitStop, shake, flashA, flashB, flashT, flashOk;

  function initGame() {
    grid = genBoard();
    cleared = new Array(grid.length).fill(false);
    sel = -1; pairs = 0; misses = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    flashA = -1; flashB = -1; flashT = 0; flashOk = false;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawBoard() {
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      if (cleared[i]) {
        game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, C.tileEdge, 0.5);
        continue;
      }
      var isSel = i === sel;
      var isFlash = (i === flashA || i === flashB) && flashT > 0;
      var col = isFlash ? (flashOk ? C.good : C.bad) : (isSel ? C.tileSel : C.tile);
      game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, col);
      game.draw.sprite(FRAMES[grid[i]], { '#': TYPES[grid[i]] }, p.x, p.y, 22, { anchor: 'center' });
    }
  }

  function resolvePair(a, b) {
    flashA = a; flashB = b; flashT = 0.3;
    var pa = cellPos(a), pb = cellPos(b);
    if (grid[a] === grid[b]) {
      flashOk = true;
      cleared[a] = true; cleared[b] = true;
      pairs++;
      game.feedback.good(pb.x, pb.y, { text: 'GOOD', color: C.good });
      game.fx.burst(pb.x, pb.y, { color: C.gold, count: 18, speed: 360 });
      game.audio.play(pairs % 2 === 0 ? 'se_milestone' : 'se_good', 0.35);
      if (pairs === Math.ceil(TARGET / 2)) game.fx.popup('NICE', pb.x, pb.y - 150, { color: C.gold, size: 34 });
      if (pairs >= TARGET) {
        ok = true; finished = true; hitStop = 0.3;
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      flashOk = false;
      misses++;
      game.feedback.bad(pb.x, pb.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (misses >= MAX_MISS) { ok = false; finished = true; hitStop = 0.3; shake = 0.25; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && hitStop <= 0 && !finished) {
      var i = cellFromXY(x, y);
      if (i < 0 || cleared[i]) return;
      game.audio.play('se_tap', 0.12);
      if (sel < 0) { sel = i; return; }
      if (sel === i) { sel = -1; return; }
      var a = sel; sel = -1;
      resolvePair(a, i);
    }
  });

  var demo = { t: 0, gx: BOARD_X, gy: BOARD_Y, press: false, a: 0, b: 1 };
  function findMatchPair() {
    for (var i = 0; i < grid.length; i++) {
      if (cleared[i]) continue;
      for (var j = i + 1; j < grid.length; j++) {
        if (cleared[j]) continue;
        if (grid[i] === grid[j]) return { a: i, b: j };
      }
    }
    return { a: 0, b: 1 };
  }
  function resetDemo() {
    initGame();
    var m = findMatchPair();
    demo.a = m.a; demo.b = m.b;
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
      sel = demo.a;
    } else if (cyc < 2.1) {
      var t2 = (cyc - 1.15) / 0.95;
      demo.gx = pa.x + (pb.x - pa.x) * t2;
      demo.gy = pa.y + (pb.y - pa.y) * t2;
      demo.press = false;
    } else if (cyc < 2.25) {
      demo.press = true;
      if (sel === demo.a) { sel = -1; resolvePair(demo.a, demo.b); }
    } else {
      demo.gx = pb.x; demo.gy = pb.y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (flashT > 0) flashT -= dt;

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
      txt(pairs + ' / ' + TARGET, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET - pairs) + '組!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(pairs, { pairs: pairs, target: TARGET, misses: misses });
        else game.end.failure({ pairs: pairs, target: TARGET, misses: misses });
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

    txt(pairs + ' / ' + TARGET, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.tileEdge, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(80 + m * 36, 190, 11, m < misses ? C.bad : C.tileEdge);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 108, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
