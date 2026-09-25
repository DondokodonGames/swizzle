// D-20222026-0045-bolt-release-order.js
// ボルトリリースオーダー — 詰まったボルトを、光った順番どおりに指で円を描いて緩める
// 操作: 光っているボルトの上で指を円運動させて緩め、順番どおりに全て緩めきる
// 終わり: 規定本数を正しい順で緩めれば成功。違う順番のボルトを回す/時間切れで失敗
// @mechanic: rotate_gesture
// @theme: bolt_release_order
// 世界観: 詰まった整備ハッチの前に立つ整備工が、指定順のボルトだけを円運動で緩めてハッチを解放する
// 残るもの: 正誤(CLEAR/GAME OVER) + 緩めた本数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 金属グラデ、ハイライト線、実写寄りの陰影
  var C = {
    bg: '#3a3a3e', bg2: '#1c1c1f', plate: '#55555c', plateEdge: '#7a7a82',
    bolt: '#8a8a92', boltDone: '#4a4a50', boltGlow: '#ffd23f',
    good: '#3fd67a', bad: '#ff4d5e', gold: '#ffd23f', ink: '#f2f2f4',
  };

  var GAME_TITLE = 'BOLT ORDER';
  var TIME_LIMIT = 12;
  var BOLT_R = 78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MECHANIC_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  var BOLTS = [
    { x: W * 0.28, y: H * 0.32 },
    { x: W * 0.72, y: H * 0.32 },
    { x: W * 0.5, y: H * 0.46 },
    { x: W * 0.28, y: H * 0.60 },
  ];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffd23f', pulse * 0.15);
    game.draw.sprite(MECHANIC_SPRITE, { '#': C.gold }, W * 0.85, H * 0.86, 10, { anchor: 'center' });
  }

  var order, doneIdx, cursorTarget, angleAccum, lastAng, hasLast;
  var timeLeft, hits, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function newOrder() {
    var arr = [];
    for (var i = 0; i < BOLTS.length; i++) arr.push(i);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function initGame() {
    order = newOrder();
    doneIdx = 0;
    cursorTarget = order[0];
    angleAccum = 0; hasLast = false; lastAng = 0;
    timeLeft = TIME_LIMIT; hits = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawPlate() {
    game.draw.rect(W * 0.5 - 320, H * 0.22, 640, 470, C.plate);
    game.draw.rect(W * 0.5 - 320, H * 0.22, 640, 10, C.plateEdge, 0.6);
    for (var i = 0; i < BOLTS.length; i++) {
      var b = BOLTS[i];
      var isDone = i < 0; // placeholder
    }
    for (var i = 0; i < BOLTS.length; i++) {
      var b = BOLTS[i];
      var solved = order.indexOf(i) < doneIdx;
      var isCurrent = i === cursorTarget && !solved;
      var col = solved ? C.boltDone : C.bolt;
      game.draw.circle(b.x, b.y, BOLT_R, col);
      game.draw.circle(b.x, b.y, BOLT_R * 0.4, C.plateEdge, 0.5);
      if (isCurrent) {
        var glow = 0.4 + 0.3 * Math.sin(game.time.elapsed * 7);
        game.draw.circle(b.x, b.y, BOLT_R + 14, C.boltGlow, glow);
      }
    }
  }

  function ang(x, y, cx, cy) { return Math.atan2(y - cy, x - cx); }

  function onGestureMove(x, y) {
    if (finished || ready > 0) return;
    var b = BOLTS[cursorTarget];
    var d = Math.hypot(x - b.x, y - b.y);
    if (d > BOLT_R + 40) return;
    var a = ang(x, y, b.x, b.y);
    if (hasLast) {
      var delta = a - lastAng;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      angleAccum += delta;
    }
    lastAng = a; hasLast = true;
    if (Math.abs(angleAccum) >= Math.PI * 1.8) {
      doneIdx++;
      hits++;
      game.feedback.good(b.x, b.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(BOLTS.length / 2)) game.fx.popup('HALFWAY!', b.x, b.y - 90, { color: C.gold, size: 32 });
      angleAccum = 0; hasLast = false;
      if (doneIdx >= BOLTS.length) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(b.x, b.y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      cursorTarget = order[doneIdx];
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      // wrong-bolt tap detection
      for (var i = 0; i < BOLTS.length; i++) {
        var b = BOLTS[i];
        if (order.indexOf(i) >= doneIdx && i !== cursorTarget && Math.hypot(x - b.x, y - b.y) < BOLT_R) {
          finished = true; ok = false; hitStop = 0.3; shake = 0.25;
          game.feedback.bad(x, y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
          return;
        }
      }
      game.audio.play('se_tap', 0.05);
    }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { hasLast = false; game.audio.play('se_tap', 0.08); onGestureMove(x, y); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) { if (Math.random() < 0.06) game.audio.play('se_tap', 0.02); onGestureMove(x, y); } });
  game.onRelease(function() { hasLast = false; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BOLTS[0].x, gy: BOLTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var per = 1.7;
    var cyc = demo.t % (per * BOLTS.length + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var idx = Math.min(BOLTS.length - 1, Math.floor(cyc / per));
    var local = cyc - idx * per;
    var b = BOLTS[order[idx]];
    var a0 = -Math.PI / 2;
    var turns = Math.min(1, local / (per * 0.75)) * Math.PI * 2.1;
    demo.gx = b.x + Math.cos(a0 + turns) * (BOLT_R * 0.7);
    demo.gy = b.y + Math.sin(a0 + turns) * (BOLT_R * 0.7);
    demo.press = local < per * 0.85;
    if (local >= per * 0.75 && doneIdx <= idx) {
      doneIdx = idx + 1; hits = doneIdx;
      game.feedback.good(b.x, b.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      cursorTarget = order[Math.min(BOLTS.length - 1, doneIdx)];
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (order === undefined) initGame();
      stepDemo(dt);
      bg();
      drawPlate();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPlate();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + BOLTS.length, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (BOLTS.length - hits) + '本!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: BOLTS.length });
        else game.end.failure({ hits: hits, need: BOLTS.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(BOLTS[cursorTarget].x, BOLTS[cursorTarget].y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPlate();

    txt(hits + ' / ' + BOLTS.length, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#55555c', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.5]], { tempo: 128, wave: 'sawtooth', volume: 0.04, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
