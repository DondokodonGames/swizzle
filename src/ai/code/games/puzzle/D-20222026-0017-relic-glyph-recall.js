// D-20222026-0017-relic-glyph-recall.js
// レリック・グリフリコール — 一瞬光った遺物の紋様を3つ記憶し、光った順にタップして回収する
// 操作: 石版が光る順番を覚え、光が消えたあと同じ順番で3枚タップする
// 終わり: 制限時間内に正しい順で3枚タップできれば成功。順番を間違える/時間切れで失敗
// @mechanic: memory_sequence
// @theme: relic_glyph_recall
// 世界観: 遺跡の記録官が、一瞬だけ光る遺物の紋様を記憶し、光が消えたあとも順番を違えず指し示して回収する
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解した順目数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: くっきりしたドット輪郭+滑らかなグラデ影
  var STYLE = {
    bg: ['#1a1030', '#0a0618'],
    main: ['#ffd166'],
    accent: ['#f4f0ff', '#120a24'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#5fe0a0', bad: '#ff4d5e', gold: STYLE.main[0],
    tile: '#2c2050', tileEdge: '#463a78',
  };

  var GAME_TITLE = 'GLYPH RECALL';
  var TIME_LIMIT = 10;
  var COLS = 4, ROWS = 4;
  var CELL_W = 210, CELL_H = 200;
  var GRID_X = W / 2 - (COLS * CELL_W) / 2;
  var GRID_Y = H * 0.32;
  var SEQ_N = 3;
  var FLASH_DUR = 0.55, FLASH_GAP = 0.12;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000088', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GLYPH = ['..#..', '.###.', '#####', '.###.', '..#..'];
  var SCRIBE_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  function cellPos(i) {
    var c = i % COLS, r = Math.floor(i / COLS);
    return { x: GRID_X + c * CELL_W + CELL_W / 2, y: GRID_Y + r * CELL_H + CELL_H / 2 };
  }

  var sequence, seqIdx, flashIdx, memorizeT, memorizeTotal, readyT, mistakes;
  var done, endWait, finished, hitStop, shake, timeLeft, halfCalled;

  function initGame() {
    var total = COLS * ROWS;
    var slots = [];
    for (var i = 0; i < total; i++) slots.push(i);
    for (var s = slots.length - 1; s > 0; s--) { var j = Math.floor(Math.random() * (s + 1)); var t = slots[s]; slots[s] = slots[j]; slots[j] = t; }
    sequence = slots.slice(0, SEQ_N);
    seqIdx = 0; flashIdx = -1; mistakes = 0;
    memorizeTotal = SEQ_N * (FLASH_DUR + FLASH_GAP) + 0.3;
    memorizeT = memorizeTotal;
    readyT = 0.8;
    done = false; endWait = 0; finished = false;
    hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(SCRIBE_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.gold }, W * 0.86, H * 0.9 + bob, 12, { anchor: 'center' });
  }

  function drawGrid(showFlash, acceptInput) {
    for (var i = 0; i < COLS * ROWS; i++) {
      var p = cellPos(i);
      var lit = showFlash && i === flashIdx;
      var solved = acceptInput && sequence.indexOf(i) >= 0 && sequence.indexOf(i) < seqIdx;
      var col = lit ? C.gold : (solved ? C.good : C.tile);
      game.draw.rect(p.x - CELL_W / 2 + 14, p.y - CELL_H / 2 + 14, CELL_W - 28, CELL_H - 28, col);
      game.draw.rect(p.x - CELL_W / 2 + 14, p.y - CELL_H / 2 + 14, CELL_W - 28, 6, C.tileEdge, 0.4);
      if (lit || solved) game.draw.sprite(GLYPH, { '#': C.white }, p.x, p.y, 16, { anchor: 'center' });
    }
  }

  function cellAt(x, y) {
    if (x < GRID_X || x > GRID_X + COLS * CELL_W) return -1;
    if (y < GRID_Y || y > GRID_Y + ROWS * CELL_H) return -1;
    var c = Math.floor((x - GRID_X) / CELL_W);
    var r = Math.floor((y - GRID_Y) / CELL_H);
    return r * COLS + c;
  }

  function tryTap(i) {
    if (i < 0) return;
    var p = cellPos(i);
    if (i === sequence[seqIdx]) {
      seqIdx++;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      if (!halfCalled && seqIdx >= 2) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, GRID_Y - 40, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (seqIdx >= SEQ_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(p.x, p.y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      mistakes++;
      seqIdx = 0;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && memorizeT <= 0 && readyT <= 0 && !finished) tryTap(cellAt(x, y));
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, idx: 0 };
  function resetDemo() { initGame(); demo.idx = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var totalCyc = memorizeT + readyT + 3.4;
    var cyc = demo.t % totalCyc;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cyc < memorizeT) {
      stepMemorize(cyc);
      demo.press = false;
      return;
    }
    if (cyc < memorizeT + readyT) { demo.press = false; return; }
    var actT = cyc - memorizeT - readyT;
    var per = 3.4 / SEQ_N;
    var slot = Math.min(SEQ_N - 1, Math.floor(actT / per));
    var localT = (actT - slot * per) / per;
    var idx = sequence[slot];
    var p = cellPos(idx);
    if (localT < 0.7) { demo.gx = p.x; demo.gy = p.y; demo.press = true; }
    else demo.press = false;
    if (localT > 0.6 && slot === demo.idx) {
      demo.idx = slot + 1;
      if (seqIdx === slot) {
        seqIdx++;
        game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.2);
      }
    }
  }
  function stepMemorize(cyc) {
    var per = FLASH_DUR + FLASH_GAP;
    var slot = Math.floor(cyc / per);
    var localT = cyc - slot * per;
    flashIdx = (slot < SEQ_N && localT < FLASH_DUR) ? sequence[slot] : -1;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sequence) initGame();
      bg();
      stepDemo(dt);
      drawGrid(true, true);
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid(false, true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(seqIdx + ' / ' + SEQ_N, W / 2, H * 0.12, 26, C.gold);
      if (!ok) txt('あと' + (SEQ_N - seqIdx) + '個!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (memorizeT > 0) {
      memorizeT -= dt;
      stepMemorize(memorizeTotal - Math.max(0, memorizeT));
    } else if (readyT > 0) {
      readyT -= dt;
      flashIdx = -1;
      if (readyT <= 0) game.audio.play('se_tap');
    } else if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(seqIdx, { correct: seqIdx, mistakes: mistakes });
        else game.end.failure({ correct: seqIdx, mistakes: mistakes });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.35; shake = 0.2;
        game.feedback.bad(W * 0.5, GRID_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid(memorizeT > 0, memorizeT <= 0 && readyT <= 0);

    txt(seqIdx + ' / ' + SEQ_N, W / 2, H * 0.06, 26, C.white);
    if (memorizeT <= 0 && readyT <= 0) {
      var tbW = W - 120;
      var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
      game.draw.rect(60, 190, tbW, 14, '#00000033');
      game.draw.rect(60, 190, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    }
    if (readyT > 0 && memorizeT <= 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 110, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
