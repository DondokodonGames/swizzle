// D-20172021-0052-camp-silhouette-fetch.js
// キャンプ・シルエットフェッチ — 空き地に浮かぶ道具の輪郭を読み取り、山積みの荷物から同じ形を選んで運び込む
// 操作: 空き地に浮かぶ輪郭と同じ形の道具を下段の荷物置き場からドラッグして運び込む
// 終わり: 規定回数(5回)正しい形を運び込めば成功。誤った形を3回置くか時間切れで失敗
// @mechanic: gap_fit
// @theme: camp_silhouette_fetch
// 世界観: 山あいのキャンプ場を切り盛りする見習い管理人が、空き地に浮かぶ道具の輪郭を読み取り、山積みの荷物から同じ形を選んで次々と運び込み、寄せられる薪や布の素材を集める
// 残るもの: 正誤(CLEAR/GAME OVER) + 運び込めた個数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル基調、丸みのあるフォルム、柔らかい影
  var C = {
    bg: '#fff3e6', bg2: '#ffe1c2', ground: '#ffd9a8', groundLine: '#f5b978',
    plot: '#fffaf2', plotRing: '#ffb37a', plotGap: '#f2c99a',
    tray: '#fff8ef', trayRing: '#e8caa0',
    good: '#4fb87a', bad: '#ff5d6c', gold: '#ffb400', ink: '#5a3b22', white: '#ffffff',
  };

  var SHAPES = [
    { col: '#ff9b6a', frames: ['..#..', '.###.', '#####', '#.#.#'] },
    { col: '#5ac2c9', frames: ['.#.#.', '#####', '.###.', '#####'] },
    { col: '#8bc15a', frames: ['#...#', '#####', '.....', '#####'] },
    { col: '#c98bd6', frames: ['.###.', '#####', '#.#.#', '#####'] },
  ];

  var GAME_TITLE = 'CAMP FETCH';
  var NEEDED = 4;
  var MAX_MISS = 3;
  var TIME_LIMIT = 11;
  var PLOT_X = W * 0.5, PLOT_Y = H * 0.4, PLOT_R = 118;
  var TRAY_Y = H * 0.84, TRAY_R = 96;
  var TRAY_X = [W * 0.24, W * 0.5, W * 0.76];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function shuffle3(target) {
    var others = [];
    for (var i = 0; i < SHAPES.length; i++) if (i !== target) others.push(i);
    others.sort(function() { return Math.random() - 0.5; });
    var arr = [target, others[0], others[1]];
    arr.sort(function() { return Math.random() - 0.5; });
    return arr;
  }

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(0, H * 0.62, W, H * 0.4, C.ground);
    game.draw.rect(0, H * 0.62, W, 6, C.groundLine);
    for (var i = 0; i < 3; i++) {
      var fx = W * (0.15 + i * 0.35);
      var fy = H * 0.18 + Math.sin(game.time.elapsed * 1.1 + i) * 10;
      game.draw.circle(fx, fy, 18 + i * 4, '#ffffff', 0.55);
    }
  }

  function drawShape(id, x, y, scale, alpha) {
    var s = SHAPES[id];
    game.draw.sprite(s.frames, { '#': s.col }, x, y, scale, { anchor: 'center', alpha: alpha === undefined ? 1 : alpha });
  }

  function drawPlot(pulse) {
    game.draw.circle(PLOT_X, PLOT_Y, PLOT_R, C.plot, 0.9);
    game.draw.circle(PLOT_X, PLOT_Y, PLOT_R, C.plotRing, 0);
    game.draw.circle(PLOT_X, PLOT_Y, PLOT_R - 10, C.plotGap, 0.5 + 0.15 * pulse);
    drawShape(target, PLOT_X, PLOT_Y, 20, 0.42 + 0.15 * pulse);
  }

  function drawTray() {
    for (var i = 0; i < tray.length; i++) {
      var isDragged = dragging && dragIdx === i;
      game.draw.circle(TRAY_X[i], TRAY_Y, TRAY_R, C.tray, isDragged ? 0.35 : 0.95);
      game.draw.circle(TRAY_X[i], TRAY_Y, TRAY_R, C.trayRing, 0);
      if (!isDragged) drawShape(tray[i], TRAY_X[i], TRAY_Y, 16, 1);
    }
  }

  var target, tray, requestsDone, misses, timeLeft, halfCalled;
  var dragging, dragIdx, dragShapeId, dragX, dragY;
  var done, endWait, finished, ready, hitStop, shake;

  function newRound() {
    target = Math.floor(game.random(0, SHAPES.length));
    tray = shuffle3(target);
  }

  function initGame() {
    requestsDone = 0; misses = 0; timeLeft = TIME_LIMIT; halfCalled = false;
    dragging = false; dragIdx = -1; dragShapeId = -1; dragX = PLOT_X; dragY = PLOT_Y;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function trayHit(x, y) {
    for (var i = 0; i < tray.length; i++) {
      if (game.hit.circle(x, y, 1, TRAY_X[i], TRAY_Y, TRAY_R)) return i;
    }
    return -1;
  }

  function beginDrag(x, y) {
    if (ready > 0 || finished || done) return;
    var i = trayHit(x, y);
    if (i < 0) { game.audio.play('se_tap', 0.08); return; }
    dragging = true; dragIdx = i; dragShapeId = tray[i]; dragX = x; dragY = y;
    game.audio.play('se_tap', 0.15);
  }
  function moveDrag(x, y) { if (dragging) { dragX = x; dragY = y; } }
  function releaseDrag() {
    if (!dragging) return;
    dragging = false;
    var inPlot = game.hit.circle(dragX, dragY, 1, PLOT_X, PLOT_Y, PLOT_R);
    if (!inPlot) { game.audio.play('se_tap', 0.12); return; }
    if (dragShapeId === target) {
      requestsDone++;
      hitStop = 0.08;
      game.feedback.good(PLOT_X, PLOT_Y, { text: '+1', color: C.good });
      game.fx.burst(PLOT_X, PLOT_Y, { color: SHAPES[target].col, count: 16, speed: 320 });
      game.audio.play('se_coin', 0.35);
      if (requestsDone === Math.ceil(NEEDED / 2)) game.fx.popup(requestsDone + ' / ' + NEEDED, PLOT_X, PLOT_Y - 160, { color: C.gold, size: 36 });
      if (requestsDone >= NEEDED) { ok = true; finished = true; finish(); return; }
      newRound();
    } else {
      misses++;
      hitStop = 0.22; shake = 0.22;
      game.feedback.bad(PLOT_X, PLOT_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (misses >= MAX_MISS) { ok = false; finished = true; finish(); }
    }
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) beginDrag(x, y);
  });
  game.onMove(function(x, y) { if (state === S.PLAYING) moveDrag(x, y); });
  game.onRelease(function() { if (state === S.PLAYING) releaseDrag(); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: TRAY_X[1], gy: TRAY_Y, press: false, srcIdx: 1, shapeId: 0 };
  function resolveDemoSuccess() {
    requestsDone++;
    game.feedback.good(PLOT_X, PLOT_Y, { text: '+1', color: C.good });
    game.fx.burst(PLOT_X, PLOT_Y, { color: SHAPES[target].col, count: 16, speed: 320 });
    game.audio.play('se_coin', 0.25);
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      newRound(); requestsDone = 0;
      demo.srcIdx = tray.indexOf(target);
      demo.shapeId = target;
      demo.resolved = false;
    }
    if (cyc < 1.5) {
      var t2 = cyc / 1.5;
      demo.gx = TRAY_X[demo.srcIdx] + (PLOT_X - TRAY_X[demo.srcIdx]) * t2;
      demo.gy = TRAY_Y + (PLOT_Y - TRAY_Y) * t2;
      demo.press = t2 > 0.08;
      dragging = t2 > 0.08; dragIdx = demo.srcIdx; dragX = demo.gx; dragY = demo.gy; dragShapeId = demo.shapeId;
    } else if (!demo.resolved) {
      demo.resolved = true;
      dragging = false;
      resolveDemoSuccess();
    } else {
      demo.press = false;
      demo.gx = PLOT_X; demo.gy = PLOT_Y - 80;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (target === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTray();
      drawPlot(Math.sin(game.time.elapsed * 4));
      if (dragging) drawShape(dragShapeId, dragX, dragY, 18, 1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTray();
      drawPlot(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(requestsDone + ' / ' + NEEDED, W / 2, H * 0.13, 28, C.gold);
      if (!ok && requestsDone >= NEEDED - 1) txt('あと1個!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(requestsDone * 20, { requests: requestsDone, misses: misses });
        else game.end.failure({ requests: requestsDone, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!halfCalled && timeLeft <= TIME_LIMIT * 0.5) { halfCalled = true; game.fx.popup('あと' + (NEEDED - requestsDone) + '個!', PLOT_X, PLOT_Y - 160, { color: C.gold, size: 30 }); game.audio.play('se_milestone', 0.3); }
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.2; shake = 0.2;
        game.feedback.bad(PLOT_X, PLOT_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTray();
    drawPlot(finished ? 0 : Math.sin(game.time.elapsed * 4));
    if (dragging) drawShape(dragShapeId, dragX, dragY, 18, 1);

    txt(requestsDone + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    var barW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, barW, 16, '#e8caa0', 1);
    game.draw.rect(60, 150, barW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(W - 60 - m * 40, 210, 12, m < misses ? C.bad : '#e8caa0');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.4]], { tempo: 118, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
