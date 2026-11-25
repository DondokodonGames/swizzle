// D-20222026-0006-hex-tile-relief-sort.js
// ヘックスカーゴ・リリーフ — 色別に散らばったヘックスカーゴを正しい搬出口へドラッグで仕分ける
// 操作: 山積みのヘックスブロックを指でつかみ、同じ色の搬出口までドラッグして離す
// 終わり: 制限時間内に全ブロックを正しい搬出口へ収めれば成功。時間切れで失敗
// @mechanic: drag_sort
// @theme: hex_cargo_sort
// 世界観: 六角形コンテナ倉庫の搬入係が、届いたばかりのカーゴブロックを色別の搬出口へ手早く運び分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 仕分け済み数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めの原色、太い白フチ、ポップなドロップシャドウ
  var STYLE = {
    bg: ['#ffcf3f', '#ff9f1c'],
    main: ['#ff5d5d', '#3fa9ff', '#3fd67e'],
    accent: ['#ffffff', '#26264a'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    red: STYLE.main[0], blue: STYLE.main[1], green: STYLE.main[2],
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#3fd67e', bad: '#ff3b3b', gold: '#ffe066',
  };
  var COLORS = [C.red, C.blue, C.green];

  var GAME_TITLE = 'HEX CARGO';
  var TIME_LIMIT = 16;
  var BLOCK_N = 7;
  var BLOCK_R = 78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HEX_FRAME = ['..##..', '.####.', '######', '######', '.####.', '..##..'];
  var WORKER_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var PEN = { x: W * 0.5, y: H * 0.42, w: W * 0.78, h: H * 0.32 };
  var BIN_Y = H * 0.76;
  var BIN_W = 260, BIN_H = 220;
  var BIN_X = [W * 0.22, W * 0.5, W * 0.78];

  function binAt(i) { return { x: BIN_X[i], y: BIN_Y }; }

  var blocks, sortedCount, mistakes, dragIdx, dragOffX, dragOffY;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function slotPos(i) {
    var cols = 4;
    var col = i % cols, row = Math.floor(i / cols);
    var sx = PEN.x - PEN.w / 2 + 130 + col * (PEN.w - 260) / (cols - 1);
    var sy = PEN.y - PEN.h / 2 + 90 + row * 190;
    return { x: sx, y: sy };
  }

  function initGame() {
    blocks = [];
    for (var i = 0; i < BLOCK_N; i++) {
      var p = slotPos(i);
      var ci = i % COLORS.length;
      blocks.push({ x: p.x, y: p.y, hx: p.x, hy: p.y, color: ci, sorted: false, anim: 0, vx: 0, vy: 0 });
    }
    // shuffle colors so it's not sequential
    for (var s = blocks.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var tc = blocks[s].color; blocks[s].color = blocks[j].color; blocks[j].color = tc;
    }
    sortedCount = 0; mistakes = 0; dragIdx = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, C.white, pulse * 0.4);
    var bob = Math.sin(game.time.elapsed * 2.2) * 6;
    game.draw.sprite(WORKER_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.ink }, W * 0.86, H * 0.9 + bob, 12, { anchor: 'center' });
  }

  function drawBins() {
    for (var i = 0; i < BIN_X.length; i++) {
      var b = binAt(i);
      game.draw.rect(b.x - BIN_W / 2, b.y - BIN_H / 2, BIN_W, BIN_H, C.white, 0.9);
      game.draw.rect(b.x - BIN_W / 2, b.y - BIN_H / 2, BIN_W, 14, COLORS[i], 1);
      game.draw.sprite(HEX_FRAME, { '#': COLORS[i] }, b.x, b.y + 20, 12, { anchor: 'center' });
    }
  }

  function drawBlocks() {
    for (var i = 0; i < blocks.length; i++) {
      var bl = blocks[i];
      if (bl.sorted && bl.anim <= 0) continue;
      var alpha = bl.sorted ? Math.max(0, bl.anim) : 1;
      var scale = i === dragIdx ? 15 : 13;
      game.draw.sprite(HEX_FRAME, { '#': COLORS[bl.color] }, bl.x, bl.y, scale, { anchor: 'center', alpha: alpha });
      game.draw.sprite(HEX_FRAME, { '#': C.white }, bl.x, bl.y, scale, { anchor: 'center', alpha: alpha * 0.0 });
    }
  }

  function findBlockAt(x, y) {
    var best = -1, bestD = BLOCK_R;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].sorted) continue;
      var d = Math.hypot(blocks[i].x - x, blocks[i].y - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function binIndexAt(x, y) {
    for (var i = 0; i < BIN_X.length; i++) {
      var b = binAt(i);
      if (x > b.x - BIN_W / 2 && x < b.x + BIN_W / 2 && y > b.y - BIN_H / 2 && y < b.y + BIN_H / 2) return i;
    }
    return -1;
  }

  function tryDrop(idx, x, y) {
    var bin = binIndexAt(x, y);
    var bl = blocks[idx];
    if (bin === bl.color) {
      bl.sorted = true; bl.anim = 1; bl.x = binAt(bin).x; bl.y = binAt(bin).y;
      sortedCount++;
      game.feedback.good(bl.x, bl.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      if (!halfCalled && sortedCount >= Math.ceil(BLOCK_N / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', bl.x, bl.y - 120, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      if (sortedCount >= BLOCK_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(bl.x, bl.y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      mistakes++;
      bl.x = bl.hx; bl.y = bl.hy;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var i = findBlockAt(x, y);
    if (i >= 0) { dragIdx = i; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    blocks[dragIdx].x = x; blocks[dragIdx].y = y;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    tryDrop(dragIdx, x, y);
    dragIdx = -1;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, idx: 0, phase: 0 };
  function resetDemo() { initGame(); demo.idx = 0; demo.phase = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var per = 4.2 / BLOCK_N;
    var localIdx = Math.min(BLOCK_N - 1, Math.floor(cyc / per));
    var localT = (cyc - localIdx * per) / per;
    if (localIdx > demo.idx) {
      // finalize previous
      var prev = blocks[demo.idx];
      if (prev && !prev.sorted) { prev.sorted = true; prev.x = binAt(prev.color).x; prev.y = binAt(prev.color).y; sortedCount++; }
      demo.idx = localIdx;
    }
    var bl = blocks[demo.idx];
    if (bl && !bl.sorted) {
      var b = binAt(bl.color);
      if (localT < 0.7) {
        var t2 = localT / 0.7;
        demo.gx = bl.hx + (b.x - bl.hx) * t2;
        demo.gy = bl.hy + (b.y - bl.hy) * t2;
        bl.x = demo.gx; bl.y = demo.gy;
        demo.press = true;
      } else {
        demo.gx = b.x; demo.gy = b.y; demo.press = false;
        if (localT > 0.75 && !bl.sorted) {
          bl.sorted = true; bl.x = b.x; bl.y = b.y; sortedCount++;
          game.feedback.good(b.x, b.y, { text: 'GOOD', color: C.good });
          game.audio.play('se_coin', 0.2);
        }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!blocks) initGame();
      bg();
      stepDemo(dt);
      drawBins();
      drawBlocks();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBins();
      drawBlocks();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(sortedCount + ' / ' + BLOCK_N, W / 2, H * 0.13, 30, C.ink);
      if (!ok) txt('あと' + (BLOCK_N - sortedCount) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    for (var i = 0; i < blocks.length; i++) if (blocks[i].sorted && blocks[i].anim > 0) blocks[i].anim -= dt * 2;

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(sortedCount, { sorted: sortedCount, mistakes: mistakes });
        else game.end.failure({ sorted: sortedCount, mistakes: mistakes });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 1 && timeLeft + dt > 1) game.fx.popup('あと1個!', W * 0.5, H * 0.3, { color: C.bad, size: 30 });
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.4; shake = 0.25;
        game.feedback.bad(W * 0.5, H * 0.5, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBins();
    drawBlocks();
    if (dragIdx < 0) {
      // nothing
    }

    txt(sortedCount + ' / ' + BLOCK_N, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.white, 0.6);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.2], ['E5', 0.2], ['G5', 0.2], ['C6', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
