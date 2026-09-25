// D-20222026-0018-fortune-lane-single-roll.js
// フォーチュンレーン・シングルロール — 回る矢羽根を狙い止めして出た数だけ進み、止まったマスの出来事を解決する
// 操作: 左右に往復する矢羽根が光る的の中に入った瞬間にタップして止める
// 終わり: 的の中で止められれば成功、外れる/時間切れで失敗。止めた数だけコマが進みマス目の演出が出る
// @mechanic: timing_one_shot
// @theme: fortune_lane_single_roll
// 世界観: すごろく盤の旅人コマが、回る矢羽根を狙い止めして出た数だけ進み、止まったマスの出来事を一つだけ解決する
// 残るもの: 正誤(CLEAR/GAME OVER) + 止めた位置の精度
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側は明暗2色だけ
  var STYLE = {
    bg: ['#fff3d6', '#ffdf9e'],
    main: ['#ff8c42', '#3a8a4a', '#4d8dff', '#e0703a', '#9b59b6', '#e6c229'],
    accent: ['#2b1a0a', '#ffffff'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    ink: STYLE.accent[0], white: STYLE.accent[1],
    good: '#3a8a4a', bad: '#e0554a', gold: '#ffcf3f',
    tile: '#ffe9bd', tileEdge: '#2b1a0a',
  };
  var SEG_COLORS = STYLE.main;

  var GAME_TITLE = 'FORTUNE LANE';
  var ROUND_TIME = 10;
  var DIAL_CX = W * 0.5, DIAL_CY = H * 0.42, DIAL_R = 330;
  var SEG_N = 6;
  var SWEET_W = 0.16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000066', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TRAVELER_FRAME = ['.##.', '####', '.##.', '#.#.'];
  var TILE_N = 6;

  var needleT, sweetStart, timeLeft, resolvedStep, tokenPos, tokenAnim, sweetCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    needleT = 0;
    sweetStart = 0.1 + Math.random() * 0.7;
    resolvedStep = 0; tokenPos = 0; tokenAnim = 0; sweetCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = ROUND_TIME;
  }

  function angleForT(t) { return -Math.PI * 0.9 + t * Math.PI * 1.8; }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(TRAVELER_FRAME, { '#': C.ink }, W * 0.86, H * 0.88 + bob, 12, { anchor: 'center' });
  }

  function drawDial() {
    game.draw.circle(DIAL_CX, DIAL_CY, DIAL_R, C.tile);
    for (var i = 0; i <= SEG_N; i++) {
      var a = angleForT(i / SEG_N);
      game.draw.line(DIAL_CX, DIAL_CY, DIAL_CX + Math.cos(a) * DIAL_R, DIAL_CY + Math.sin(a) * DIAL_R, C.tileEdge, 4);
    }
    var a1 = angleForT(sweetStart), a2 = angleForT(sweetStart + SWEET_W);
    var steps = 24;
    for (var s = 0; s < steps; s++) {
      var t0 = s / steps, t1 = (s + 1) / steps;
      var aa = a1 + (a2 - a1) * t0, ab = a1 + (a2 - a1) * t1;
      game.draw.line(DIAL_CX + Math.cos(aa) * DIAL_R * 0.94, DIAL_CY + Math.sin(aa) * DIAL_R * 0.94,
        DIAL_CX + Math.cos(ab) * DIAL_R * 0.94, DIAL_CY + Math.sin(ab) * DIAL_R * 0.94, C.gold, 26);
    }
    if (!finished) {
      var na = angleForT(needleT);
      game.draw.line(DIAL_CX, DIAL_CY, DIAL_CX + Math.cos(na) * DIAL_R * 0.9, DIAL_CY + Math.sin(na) * DIAL_R * 0.9, C.bad, 12);
      game.draw.circle(DIAL_CX + Math.cos(na) * DIAL_R * 0.9, DIAL_CY + Math.sin(na) * DIAL_R * 0.9, 20, C.bad);
    }
    game.draw.circle(DIAL_CX, DIAL_CY, 40, C.ink);
  }

  function drawBoard() {
    var by = H * 0.86, bw = W - 160, cellW = bw / TILE_N;
    for (var i = 0; i < TILE_N; i++) {
      var cx = 80 + cellW * i + cellW / 2;
      game.draw.rect(80 + cellW * i + 6, by - 40, cellW - 12, 80, i % 2 === 0 ? SEG_COLORS[i % SEG_COLORS.length] : C.tile, 0.85);
    }
    var animPos = tokenPos + tokenAnim;
    var tx = 80 + cellW * animPos + cellW / 2;
    game.draw.sprite(TRAVELER_FRAME, { '#': C.ink }, tx, by, 12, { anchor: 'center' });
  }

  function stopNeedle() {
    var inSweet = needleT >= sweetStart && needleT <= sweetStart + SWEET_W;
    var step = Math.min(TILE_N, Math.max(1, Math.round(needleT * TILE_N) + 1));
    resolvedStep = step;
    finished = true;
    if (inSweet) {
      ok = true; hitStop = 0.3;
      game.feedback.good(DIAL_CX, DIAL_CY, { text: 'GOOD', color: C.good });
      game.audio.play('se_success', 0.5);
    } else {
      ok = false; hitStop = 0.35; shake = 0.2;
      game.feedback.bad(DIAL_CX, DIAL_CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) { game.audio.play('se_tap', 0.2); stopNeedle(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    tokenAnim = 0;
    endWait = 1.6;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, tapped: false };
  function resetDemo() { initGame(); demo.tapped = false; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    needleT = (Math.sin(cyc * 2.2) + 1) / 2;
    var a = angleForT(needleT);
    demo.gx = DIAL_CX + Math.cos(a) * DIAL_R * 0.9;
    demo.gy = DIAL_CY + Math.sin(a) * DIAL_R * 0.9;
    if (!demo.tapped && cyc > 2.2 && needleT >= sweetStart && needleT <= sweetStart + SWEET_W) {
      demo.tapped = true; demo.press = true;
      stopNeedle();
      game.audio.play('se_tap', 0.1);
    }
    if (demo.tapped) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (!finished && tokenAnim > 0) {
      // no-op placeholder for future
    }
    if (finished && !done && hitStop <= 0 && tokenAnim < resolvedStep - tokenPos) {
      tokenAnim = Math.min(resolvedStep - tokenPos, tokenAnim + dt * 6);
      if (tokenAnim >= resolvedStep - tokenPos) {
        tokenPos = resolvedStep;
        if (ok) game.fx.burst((80 + (W - 160) / TILE_N * tokenPos), H * 0.86, { color: C.gold, count: 18, speed: 320 });
      }
    }

    if (state === S.ATTRACT) {
      if (needleT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDial();
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDial();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      if (!ok) txt('あと少し!', W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(resolvedStep, { step: resolvedStep });
        else game.end.failure({ step: resolvedStep });
      }
    } else if (finished) {
      if (hitStop > 0) hitStop -= dt;
      else if (tokenPos >= resolvedStep) finish();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      needleT += dt * 0.55;
      if (needleT > 1) needleT -= 1;
      if (!sweetCalled && needleT >= sweetStart && needleT <= sweetStart + SWEET_W) {
        sweetCalled = true;
        game.fx.popup('NICE', DIAL_CX, DIAL_CY - DIAL_R * 0.6, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        stopNeedle();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDial();
    drawBoard();

    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, H * 0.72, tbW, 14, '#00000033');
    game.draw.rect(60, H * 0.72, tbW * Math.max(0, timeLeft / ROUND_TIME), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['B4', 0.2], ['D5', 0.2], ['G5', 0.4]], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
