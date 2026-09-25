// D-20222026-0013-yard-release-sequence.js
// ヤード・リリースシーケンス — 通路をふさぐ台車を、渡された色の順番どおりにスワイプで押し出す
// 操作: 次に出すべき色の台車を、右の出口シュートへ向けて指で払って押し出す
// 終わり: 制限時間内に全台車を正しい順番で押し出せば成功。時間切れで失敗
// @mechanic: push_out
// @theme: yard_release_sequence
// 世界観: 資材置き場の誘導員が、通路をふさぐ台車の列を渡された順番どおりに押し出し、搬出経路を確保する
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し出した台数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 低解像度感、4色パレット、粗いドット輪郭
  var STYLE = {
    bg: ['#3a3226', '#211c16'],
    main: ['#e08a3c', '#4f9dd6', '#7ec850', '#d64f6b'],
    accent: ['#f6ead8', '#171310'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#7ec850', bad: '#e05656', gold: '#e08a3c',
    lane: '#26201a', laneEdge: '#4a3f30',
  };
  var COLORS = STYLE.main;

  var GAME_TITLE = 'YARD RELEASE';
  var TIME_LIMIT = 18;
  var CART_N = 5;
  var PUSH_MIN = 130;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000aa', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CART_FRAME = ['######', '#....#', '#....#', '.#..#.'];
  var GUARD_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var LANE_X = W * 0.32, LANE_X2 = W * 0.86;
  var CART_Y = [];
  for (var ci = 0; ci < CART_N; ci++) CART_Y.push(H * (0.28 + 0.42 * ci / (CART_N - 1)));

  var order, cartColor, released, nextIdx, releasedCount;
  var pressIdx, pressX, pressY, cartX;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function initGame() {
    var pal = COLORS.slice(0, 4);
    order = [];
    for (var i = 0; i < CART_N; i++) order.push(pal[i % pal.length]);
    cartColor = order.slice();
    for (var s = cartColor.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var t = cartColor[s]; cartColor[s] = cartColor[j]; cartColor[j] = t;
    }
    released = new Array(CART_N).fill(false);
    cartX = [];
    for (var k = 0; k < CART_N; k++) cartX.push(LANE_X);
    nextIdx = 0; releasedCount = 0; pressIdx = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(GUARD_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.gold }, W * 0.12, H * 0.9 + bob, 12, { anchor: 'center' });
  }

  function nextTargetIdx() {
    if (nextIdx >= order.length) return -1;
    for (var i = 0; i < CART_N; i++) if (!released[i] && cartColor[i] === order[nextIdx]) return i;
    return -1;
  }

  function drawLane() {
    game.draw.rect(LANE_X - 100, H * 0.2, 200, H * 0.56, C.lane);
    var gateGlow = 0.4 + 0.3 * Math.sin(game.time.elapsed * 4);
    game.draw.rect(LANE_X2 - 60, H * 0.46, 120, 60, C.good, gateGlow);
    var target = nextTargetIdx();
    for (var i = 0; i < CART_N; i++) {
      if (released[i]) continue;
      var isNext = i === target;
      game.draw.sprite(CART_FRAME, { '#': cartColor[i] }, cartX[i], CART_Y[i], isNext ? 15 : 13, { anchor: 'center' });
      if (isNext) game.draw.circle(cartX[i], CART_Y[i], 92, C.white, 0.25 + 0.15 * Math.sin(game.time.elapsed * 6));
    }
  }

  function drawKey() {
    var chipW = 66, gap = 14;
    var totalW = order.length * chipW + (order.length - 1) * gap;
    var sx = W / 2 - totalW / 2;
    for (var i = 0; i < order.length; i++) {
      var x = sx + i * (chipW + gap) + chipW / 2;
      var y = H * 0.15;
      var isDone = i < nextIdx;
      game.draw.circle(x, y, chipW / 2, order[i], isDone ? 0.35 : 1);
      if (i === nextIdx) game.draw.circle(x, y, chipW / 2 + 8, C.white, 0.5 + 0.3 * Math.sin(game.time.elapsed * 6));
      if (isDone) game.draw.line(x - 18, y, x + 18, y, C.white, 6);
    }
  }

  function cartAt(x, y) {
    for (var i = 0; i < CART_N; i++) {
      if (released[i]) continue;
      if (Math.hypot(cartX[i] - x, CART_Y[i] - y) < 100) return i;
    }
    return -1;
  }

  function attemptRelease(i) {
    var p = { x: cartX[i], y: CART_Y[i] };
    if (i === nextTargetIdx()) {
      released[i] = true; nextIdx++; releasedCount++;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_break', 0.4);
      if (!halfCalled && releasedCount >= Math.ceil(CART_N / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.18, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (releasedCount >= CART_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(LANE_X2, p.y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      shake = 0.12;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var i = cartAt(x, y);
    if (i >= 0) { pressIdx = i; pressX = x; pressY = y; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || pressIdx < 0) return;
    cartX[pressIdx] = LANE_X + Math.max(0, x - pressX);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || pressIdx < 0) return;
    var dx = x - pressX;
    if (dx > PUSH_MIN) attemptRelease(pressIdx);
    else cartX[pressIdx] = LANE_X;
    pressIdx = -1;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, idx: -1 };
  function resetDemo() { initGame(); demo.idx = -1; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var per = 4.0 / CART_N;
    var slot = Math.min(CART_N - 1, Math.floor(cyc / per));
    var localT = (cyc - slot * per) / per;
    var target = nextTargetIdx();
    if (target < 0) { demo.press = false; return; }
    var ty = CART_Y[target];
    if (localT < 0.6) {
      var t2 = localT / 0.6;
      demo.gx = LANE_X + (LANE_X2 - LANE_X) * t2 * 0.55;
      demo.gy = ty;
      cartX[target] = demo.gx;
      demo.press = true;
    } else {
      demo.press = false;
      if (localT > 0.65 && slot !== demo.idx) {
        demo.idx = slot;
        released[target] = true; nextIdx++; releasedCount++;
        game.feedback.good(demo.gx, ty, { text: 'GOOD', color: C.good });
        game.audio.play('se_break', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!order) initGame();
      bg();
      stepDemo(dt);
      drawLane();
      drawKey();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.05, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.09, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLane();
      drawKey();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.86, 46, ok ? C.good : C.bad);
      txt(releasedCount + ' / ' + CART_N, W / 2, H * 0.9, 26, C.gold);
      if (!ok) txt('あと' + (CART_N - releasedCount) + '台!', W / 2, H * 0.94, 22, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(releasedCount, { released: releasedCount });
        else game.end.failure({ released: releasedCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.35; shake = 0.2;
        game.feedback.bad(LANE_X, H * 0.5, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLane();
    drawKey();

    txt(releasedCount + ' / ' + CART_N, W / 2, H * 0.86, 28, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, H * 0.9, tbW, 14, '#00000044');
    game.draw.rect(60, H * 0.9, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 128, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
