// D-20222026-0008-lantern-tile-pairing.js
// ランタン・タイルペアリング — 夜市に並ぶ提灯タイルをめくり、同じ絵柄の対を見つけて揃える
// 操作: 裏向きの提灯タイルを2枚タップしてめくる。絵柄が同じなら消え、違えば裏に戻る
// 終わり: 制限時間内に全ペアを揃えれば成功。時間切れで失敗
// @mechanic: pair_match
// @theme: lantern_tile_pairing
// 世界観: 夜市の灯籠職人が、吊るされた提灯タイルの裏を次々にめくり、同じ紋様の対を探し当てて灯す
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えたペア数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 彩度そこそこの丸みパステル、太めの黒フチ線
  var STYLE = {
    bg: ['#2b1740', '#160b26'],
    main: ['#ff6b6b', '#4dd0e1', '#ffd166', '#9575cd', '#81c784', '#f06292'],
    accent: ['#fff3e0', '#1a0f28'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    back: '#4a2f6b', backEdge: '#2f1a49',
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#81c784', bad: '#e74c3c', gold: '#ffd166',
  };
  var COLORS = STYLE.main;

  var GAME_TITLE = 'LANTERN PAIRS';
  var TIME_LIMIT = 18;
  var COLS = 4, ROWS = 3;
  var CELL_W = 210, CELL_H = 240;
  var GRID_X = W / 2 - (COLS * CELL_W) / 2;
  var GRID_Y = H * 0.30;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LANTERN_FRAME = ['.###.', '#####', '#####', '#####', '..#..'];
  var BACK_FRAME = ['.....', '.###.', '.###.', '.###.', '.....'];
  var VENDOR_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  function cellPos(i) {
    var c = i % COLS, r = Math.floor(i / COLS);
    return { x: GRID_X + c * CELL_W + CELL_W / 2, y: GRID_Y + r * CELL_H + CELL_H / 2 };
  }

  var cellType, flipped, matched, selBuf, lockTimer, matchedCount, tries;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function initGame() {
    var total = COLS * ROWS;
    var pairs = total / 2;
    var pool = [];
    for (var i = 0; i < pairs; i++) { pool.push(i % COLORS.length); pool.push(i % COLORS.length); }
    for (var s = pool.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var t = pool[s]; pool[s] = pool[j]; pool[j] = t;
    }
    cellType = pool;
    flipped = new Array(total).fill(false);
    matched = new Array(total).fill(false);
    selBuf = []; lockTimer = 0; matchedCount = 0; tries = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(VENDOR_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.gold }, W * 0.86, H * 0.9 + bob, 12, { anchor: 'center' });
  }

  function drawGrid() {
    for (var i = 0; i < cellType.length; i++) {
      if (matched[i]) continue;
      var p = cellPos(i);
      game.draw.rect(p.x - CELL_W / 2 + 10, p.y - CELL_H / 2 + 10, CELL_W - 20, CELL_H - 20, C.backEdge);
      if (flipped[i]) {
        game.draw.rect(p.x - CELL_W / 2 + 16, p.y - CELL_H / 2 + 16, CELL_W - 32, CELL_H - 32, C.white);
        game.draw.sprite(LANTERN_FRAME, { '#': COLORS[cellType[i]] }, p.x, p.y, 24, { anchor: 'center' });
      } else {
        game.draw.rect(p.x - CELL_W / 2 + 16, p.y - CELL_H / 2 + 16, CELL_W - 32, CELL_H - 32, C.back);
        game.draw.sprite(BACK_FRAME, { '#': C.backEdge }, p.x, p.y, 24, { anchor: 'center' });
      }
    }
  }

  function cellAt(x, y) {
    if (x < GRID_X || x > GRID_X + COLS * CELL_W) return -1;
    if (y < GRID_Y || y > GRID_Y + ROWS * CELL_H) return -1;
    var c = Math.floor((x - GRID_X) / CELL_W);
    var r = Math.floor((y - GRID_Y) / CELL_H);
    return r * COLS + c;
  }

  function tryFlip(i) {
    if (i < 0 || matched[i] || flipped[i] || selBuf.length >= 2 || lockTimer > 0) return;
    flipped[i] = true;
    selBuf.push(i);
    game.audio.play('se_tap', 0.2);
    var p = cellPos(i);
    game.fx.burst(p.x, p.y, { color: C.gold, count: 6, speed: 150 });
    if (selBuf.length === 2) {
      tries++;
      lockTimer = 0.55;
    }
  }

  function resolvePair() {
    var a = selBuf[0], b = selBuf[1];
    var pa = cellPos(a), pb = cellPos(b);
    if (cellType[a] === cellType[b]) {
      matched[a] = true; matched[b] = true; matchedCount++;
      game.feedback.good(pb.x, pb.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_success', 0.35);
      if (!halfCalled && matchedCount >= Math.ceil(cellType.length / 4)) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, GRID_Y - 40, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (matchedCount >= cellType.length / 2) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(pb.x, pb.y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      flipped[a] = false; flipped[b] = false;
      game.feedback.bad(pb.x, pb.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
    }
    selBuf = [];
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) tryFlip(cellAt(x, y));
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, step: 0, pairIdx: 0 };
  function resetDemo() { initGame(); demo.step = 0; demo.pairIdx = 0; }
  function findPair(excludeMatched) {
    for (var v = 0; v < COLORS.length; v++) {
      var idxs = [];
      for (var i = 0; i < cellType.length; i++) if (cellType[i] === v && !matched[i]) idxs.push(i);
      if (idxs.length === 2) return idxs;
    }
    return null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var per = 4.4 / (cellType.length / 2);
    var pairSlot = Math.min(cellType.length / 2 - 1, Math.floor(cyc / per));
    var localT = (cyc - pairSlot * per) / per;
    var pair = findPair();
    if (!pair) { demo.press = false; return; }
    var pa = cellPos(pair[0]), pb = cellPos(pair[1]);
    if (localT < 0.35) {
      demo.gx = pa.x; demo.gy = pa.y; demo.press = true;
      if (!flipped[pair[0]]) { flipped[pair[0]] = true; game.audio.play('se_tap', 0.12); }
    } else if (localT < 0.55) {
      demo.press = false;
    } else if (localT < 0.85) {
      demo.gx = pb.x; demo.gy = pb.y; demo.press = true;
      if (!flipped[pair[1]]) {
        flipped[pair[1]] = true;
        game.audio.play('se_tap', 0.12);
      }
    } else {
      demo.press = false;
      if (!matched[pair[0]]) {
        matched[pair[0]] = true; matched[pair[1]] = true; matchedCount++;
        game.feedback.good(pb.x, pb.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_success', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cellType) initGame();
      bg();
      stepDemo(dt);
      drawGrid();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(matchedCount + ' / ' + (cellType.length / 2), W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (cellType.length / 2 - matchedCount) + '組!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (lockTimer > 0) {
      lockTimer -= dt;
      if (lockTimer <= 0) resolvePair();
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(matchedCount, { pairs: matchedCount, tries: tries });
        else game.end.failure({ pairs: matchedCount, tries: tries });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.4; shake = 0.25;
        game.feedback.bad(W * 0.5, GRID_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid();

    txt(matchedCount + ' / ' + (cellType.length / 2), W / 2, H * 0.06, 28, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 190, tbW, 14, '#00000055');
    game.draw.rect(60, 190, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.3], ['C5', 0.3], ['E5', 0.3], ['A5', 0.6]], { tempo: 120, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
