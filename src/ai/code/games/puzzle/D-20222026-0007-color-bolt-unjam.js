// D-20222026-0007-color-bolt-unjam.js
// カラーボルト・アンジャム — 詰まった配管のボルトを指定の色順に回して緩め、引き抜いて解消する
// 操作: 次に抜くべき色のボルトの上で指を円を描くように回し、規定量回したら自動で抜ける
// 終わり: 制限時間内に全ボルトを正しい順で抜けば成功。時間切れで失敗
// @mechanic: rotate_gesture
// @theme: bolt_line_unjam
// 世界観: 配管整備士が、詰まった配管のボルト列を渡された順番どおりに回して緩め、圧力が限界を超える前に引き抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜いたボルト数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 金属質グラデーション、ハイライト線、深い影
  var STYLE = {
    bg: ['#3a3f4a', '#1c1f26'],
    main: ['#c0392b', '#2980b9', '#d4a017', '#27ae60'],
    accent: ['#eceff1', '#0d0f13'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    pipe: '#565f6b', pipeDark: '#2a2f37',
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#27ae60', bad: '#e74c3c', gold: '#d4a017',
  };
  var COLORS = STYLE.main;

  var GAME_TITLE = 'BOLT UNJAM';
  var TIME_LIMIT = 13;
  var BOLT_N = 5;
  var TURN_NEEDED = Math.PI * 2 * 1.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOLT_FRAME = ['.###.', '#.#.#', '##.##', '#.#.#', '.###.'];
  var TECH_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var PIPE_Y = H * 0.46;
  var BOLT_X = [];
  for (var bi = 0; bi < BOLT_N; bi++) BOLT_X.push(W * (0.18 + 0.64 * bi / (BOLT_N - 1)));

  var order, boltColor, pulled, curTurn, nextIdx, activeIdx, lastAngle, accumAngle;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled, pulledCount;

  function initGame() {
    order = [];
    var palette = COLORS.slice();
    for (var i = 0; i < BOLT_N; i++) order.push(palette[i % palette.length]);
    // shuffle both position order & required-order separately for variety
    boltColor = order.slice();
    for (var s = boltColor.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var t = boltColor[s]; boltColor[s] = boltColor[j]; boltColor[j] = t;
    }
    pulled = new Array(BOLT_N).fill(false);
    nextIdx = 0; pulledCount = 0;
    activeIdx = -1; lastAngle = 0; accumAngle = 0; curTurn = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(TECH_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.gold }, W * 0.86, H * 0.9 + bob, 12, { anchor: 'center' });
  }

  function drawPipe() {
    game.draw.rect(80, PIPE_Y - 90, W - 160, 180, C.pipeDark);
    game.draw.rect(80, PIPE_Y - 90, W - 160, 18, C.pipe, 0.6);
    for (var i = 0; i < BOLT_N; i++) {
      if (pulled[i]) continue;
      var x = BOLT_X[i], y = PIPE_Y;
      var isNext = i === boltNextPosIndex();
      var ring = isNext ? C.gold : C.pipe;
      game.draw.circle(x, y, 74, ring, isNext ? (0.35 + 0.15 * Math.sin(game.time.elapsed * 6)) : 0.25);
      var scale = i === activeIdx ? 15 : 13;
      game.draw.sprite(BOLT_FRAME, { '#': boltColor[i] }, x, y, scale, { anchor: 'center' });
    }
  }

  function boltNextPosIndex() {
    // find bolt index whose color === order[nextIdx] and not yet pulled
    if (nextIdx >= order.length) return -1;
    for (var i = 0; i < BOLT_N; i++) {
      if (!pulled[i] && boltColor[i] === order[nextIdx]) return i;
    }
    return -1;
  }

  function drawKey() {
    var chipW = 66, gap = 14;
    var totalW = order.length * chipW + (order.length - 1) * gap;
    var sx = W / 2 - totalW / 2;
    for (var i = 0; i < order.length; i++) {
      var x = sx + i * (chipW + gap) + chipW / 2;
      var y = H * 0.155;
      var done_ = i < nextIdx;
      game.draw.circle(x, y, chipW / 2, order[i], done_ ? 0.35 : 1);
      if (i === nextIdx) game.draw.circle(x, y, chipW / 2 + 8, C.white, 0.5 + 0.3 * Math.sin(game.time.elapsed * 6));
      if (done_) game.draw.line(x - 18, y, x + 18, y, C.white, 6);
    }
  }

  function angleOf(x, y, cx, cy) { return Math.atan2(y - cy, x - cx); }

  function startTurn(i, x, y) {
    activeIdx = i; curTurn = 0; accumAngle = 0;
    lastAngle = angleOf(x, y, BOLT_X[i], PIPE_Y);
    game.audio.play('se_tap', 0.15);
  }

  function updateTurn(x, y) {
    if (activeIdx < 0) return;
    var a = angleOf(x, y, BOLT_X[activeIdx], PIPE_Y);
    var diff = a - lastAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    accumAngle += Math.abs(diff);
    lastAngle = a;
    if (accumAngle >= TURN_NEEDED) completeTurn();
  }

  function completeTurn() {
    var i = activeIdx;
    activeIdx = -1;
    if (i === boltNextPosIndex()) {
      pulled[i] = true; nextIdx++; pulledCount++;
      game.feedback.good(BOLT_X[i], PIPE_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_break', 0.4);
      if (!halfCalled && pulledCount >= Math.ceil(BOLT_N / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, PIPE_Y - 140, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (pulledCount >= BOLT_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(BOLT_X[i], PIPE_Y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      game.feedback.bad(BOLT_X[i], PIPE_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      shake = 0.15;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || activeIdx >= 0) return;
    for (var i = 0; i < BOLT_N; i++) {
      if (pulled[i]) continue;
      if (Math.hypot(BOLT_X[i] - x, PIPE_Y - y) < 90) { startTurn(i, x, y); return; }
    }
  });
  game.onMove(function(x, y) { if (state === S.PLAYING) updateTurn(x, y); });
  game.onRelease(function() {
    if (state !== S.PLAYING || activeIdx < 0) return;
    activeIdx = -1; accumAngle = 0;
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
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var per = 3.6 / BOLT_N;
    var idx = Math.min(BOLT_N - 1, Math.floor(cyc / per));
    var localT = (cyc - idx * per) / per;
    var targetIdx = boltNextPosIndex();
    if (targetIdx < 0) { demo.press = false; return; }
    var cx = BOLT_X[targetIdx], cy = PIPE_Y;
    if (localT < 0.75) {
      var ang = localT / 0.75 * Math.PI * 2 * 1.4 - Math.PI / 2;
      demo.gx = cx + Math.cos(ang) * 70;
      demo.gy = cy + Math.sin(ang) * 70;
      demo.press = true;
    } else {
      demo.gx = cx; demo.gy = cy; demo.press = false;
      if (localT > 0.8 && idx !== demo.idx) {
        demo.idx = idx;
        pulled[targetIdx] = true; nextIdx++; pulledCount++;
        game.feedback.good(cx, cy, { text: 'GOOD', color: C.good });
        game.audio.play('se_break', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!order) initGame();
      bg();
      stepDemo(dt);
      drawPipe();
      drawKey();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.06, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPipe();
      drawKey();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(pulledCount + ' / ' + BOLT_N, W / 2, H * 0.06, 22, C.gold);
      if (!ok) txt('あと' + (BOLT_N - pulledCount) + '本!', W / 2, H * 0.19, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(pulledCount, { pulled: pulledCount });
        else game.end.failure({ pulled: pulledCount });
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
        game.feedback.bad(W * 0.5, PIPE_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPipe();
    drawKey();

    txt(pulledCount + ' / ' + BOLT_N, W / 2, H * 0.06, 26, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 210, tbW, 14, '#00000055');
    game.draw.rect(60, 210, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 130, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
