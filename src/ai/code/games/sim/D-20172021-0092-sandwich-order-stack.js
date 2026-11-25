// D-20172021-0092-sandwich-order-stack.js
// サンドイッチ・オーダー・スタック — トレイの具材を注文カードの並び順どおりドラッグしてサンドイッチに積む
// 操作: 上部の注文カードの並び順を見て、下段トレイから該当する具材アイコンを指でつまみ上げ、サンドイッチの上にドラッグして重ねる
// 終わり: 規定個数の具材を正しい順番で積み終えれば成功。1個でも順番を間違えて積む/時間切れで失敗
// @mechanic: drag_sort
// @theme: deli_order_sandwich_stack
// 世界観: 開店直後の小さなデリの新人スタッフが、注文カードに並んだ具材の順番どおりにトレイから具材をつまみ、制限時間内にサンドイッチを組み上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく積めた具材数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度でクリーンなフラットUI、丸みの強いカード、太めのドロップシャドウ
  var C = {
    bg: '#fff3e0', bg2: '#ffe0b8', card: '#ffffff', cardEdge: '#ffcf8f',
    stack: '#e8c090', plate: '#ffffff',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ff9f1c', ink: '#3a2410', white: '#ffffff',
  };

  var GAME_TITLE = 'ORDER STACK';
  var SEQ_LEN = 4;
  var TIME_LIMIT = 18;
  var STACK_X = W * 0.5, STACK_BASE_Y = H * 0.56, STACK_STEP = 54;
  var TRAY_Y = H * 0.82;
  var ORDER_Y = H * 0.16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TYPES = [
    { name: 'lettuce', color: '#8fe36a', sprite: ['#####', '.###.', '#####'] },
    { name: 'tomato', color: '#ff5a4d', sprite: ['.###.', '#####', '.###.'] },
    { name: 'cheese', color: '#ffd23d', sprite: ['#....', '##...', '###..', '####.'] },
    { name: 'patty', color: '#8a5a2a', sprite: ['#####', '#####', '#####'] },
    { name: 'egg', color: '#fff4c0', sprite: ['.###.', '#####', '.###.'] },
  ];

  var CHEF_SPRITE = ['.###.', '#####', '.#.#.', '.#.#.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff9f1c', pulse * 0.2);
    game.draw.sprite(CHEF_SPRITE, { '#': C.ink }, W * 0.86, H * 0.16, 10, { anchor: 'center' });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var sequence, trayItems, stackCount, done, endWait, finished, ready, hitStop, shake, roundClock, halfCalled;
  var dragIdx;

  function layoutTray() {
    var n = trayItems.length;
    for (var i = 0; i < n; i++) {
      var x = W * 0.5 + (i - (n - 1) / 2) * 190;
      trayItems[i].hx = x; trayItems[i].hy = TRAY_Y;
      if (!trayItems[i].dragging) { trayItems[i].x = x; trayItems[i].y = TRAY_Y; }
    }
  }

  function initGame() {
    var idxs = shuffle([0, 1, 2, 3, 4]).slice(0, SEQ_LEN);
    sequence = idxs;
    trayItems = shuffle(idxs).map(function(ti) { return { type: ti, x: 0, y: 0, hx: 0, hy: 0, dragging: false, placed: false }; });
    layoutTray();
    stackCount = 0; dragIdx = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; roundClock = 0; halfCalled = false;
  }

  function drawOrderCard() {
    var cw = 150;
    var startX = W * 0.5 - (SEQ_LEN * cw) / 2 + cw / 2;
    for (var i = 0; i < SEQ_LEN; i++) {
      var x = startX + i * cw;
      var done_ = i < stackCount;
      game.draw.rect(x - 60, ORDER_Y - 60, 120, 120, C.card, 1);
      game.draw.rect(x - 60, ORDER_Y - 60, 120, 8, done_ ? C.good : C.cardEdge, 1);
      var t = TYPES[sequence[i]];
      game.draw.sprite(t.sprite, { '#': t.color }, x, ORDER_Y, 14, { anchor: 'center', alpha: done_ ? 0.35 : 1 });
    }
  }

  function drawStack() {
    game.draw.rect(STACK_X - 110, STACK_BASE_Y + 40, 220, 26, C.stack, 1);
    for (var i = 0; i < stackCount; i++) {
      var t = TYPES[sequence[i]];
      var y = STACK_BASE_Y - i * STACK_STEP;
      game.draw.rect(STACK_X - 95, y - 20, 190, 40, t.color, 1);
      game.draw.rect(STACK_X - 95, y - 20, 190, 6, '#ffffff', 0.3);
    }
  }

  function drawTray() {
    for (var i = 0; i < trayItems.length; i++) {
      var it = trayItems[i];
      if (it.placed) continue;
      var t = TYPES[it.type];
      game.draw.circle(it.x, it.y, 70, C.plate, 0.95);
      game.draw.circle(it.x, it.y, 70, C.cardEdge, 0.3);
      game.draw.sprite(t.sprite, { '#': t.color }, it.x, it.y, 16, { anchor: 'center' });
    }
  }

  function commitDrag(i) {
    var it = trayItems[i];
    it.dragging = false;
    var nearStack = it.y < STACK_BASE_Y + 60 && Math.abs(it.x - STACK_X) < 160;
    if (!nearStack) { it.x = it.hx; it.y = it.hy; return; }
    if (it.type === sequence[stackCount]) {
      it.placed = true;
      stackCount++;
      game.feedback.good(STACK_X, STACK_BASE_Y - stackCount * STACK_STEP, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (!halfCalled && stackCount >= Math.ceil(SEQ_LEN / 2)) { halfCalled = true; game.fx.popup('あと' + (SEQ_LEN - stackCount) + '!', STACK_X, ORDER_Y + 120, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
      if (stackCount >= SEQ_LEN) {
        ok = true; finished = true; hitStop = 0.2;
        game.fx.burst(STACK_X, STACK_BASE_Y - stackCount * STACK_STEP, { color: C.gold, count: 22, speed: 400 });
        finish();
      }
    } else {
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(it.x, it.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    for (var i = trayItems.length - 1; i >= 0; i--) {
      var it = trayItems[i];
      if (it.placed) continue;
      if (game.hit.circle(x, y, 1, it.x, it.y, 72)) { it.dragging = true; dragIdx = i; game.audio.play('se_tap', 0.15); return; }
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || dragIdx < 0) return;
    trayItems[dragIdx].x = x; trayItems[dragIdx].y = y;
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || dragIdx < 0) return;
    commitDrag(dragIdx);
    dragIdx = -1;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, idx: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) initGame();
    var segDur = 6.0 / SEQ_LEN;
    var step = Math.min(SEQ_LEN - 1, Math.floor(cyc / segDur));
    var within = (cyc - step * segDur) / segDur;
    if (demo.idx !== step) { demo.idx = step; }
    var needType = sequence[stackCount];
    var srcIdx = -1;
    for (var i = 0; i < trayItems.length; i++) if (!trayItems[i].placed && trayItems[i].type === needType) { srcIdx = i; break; }
    if (srcIdx < 0) { demo.press = false; return; }
    var it = trayItems[srcIdx];
    if (within < 0.7) {
      var u = within / 0.7;
      it.x = it.hx + (STACK_X - it.hx) * u;
      it.y = it.hy + (STACK_BASE_Y - it.hy) * u;
      demo.press = true;
    } else {
      if (it.x !== STACK_X) { it.x = STACK_X; it.y = STACK_BASE_Y; commitDrag(srcIdx); }
      demo.press = false;
    }
    demo.gx = it.x; demo.gy = it.y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (sequence === undefined) initGame();
      bg();
      stepDemo(dt);
      drawOrderCard();
      drawStack();
      drawTray();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.30, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawOrderCard();
      drawStack();
      drawTray();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(stackCount + ' / ' + SEQ_LEN, W / 2, H * 0.34, 26, C.gold);
      if (!ok) txt('あと' + (SEQ_LEN - stackCount) + '個!', W / 2, H * 0.38, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(stackCount, { stacked: stackCount, total: SEQ_LEN });
        else game.end.failure({ stacked: stackCount, total: SEQ_LEN });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(STACK_X, STACK_BASE_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawOrderCard();
    drawStack();
    drawTray();

    txt(stackCount + ' / ' + SEQ_LEN, W / 2, H * 0.34, 24, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, H * 0.72, W - 120, 14, '#e8c090', 0.6);
    game.draw.rect(60, H * 0.72, (W - 120) * barPct, 14, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.22], ['G4', 0.22], ['B4', 0.22], ['E5', 0.44]], { tempo: 128, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
