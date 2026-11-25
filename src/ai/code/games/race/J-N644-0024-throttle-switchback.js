// J-N644-0024-throttle-switchback.js
// スロットル・スイッチバック — 見習い整備士が試験コースの操縦かごでアクセルを握り、カーブ前に手を離して駆け抜ける
// 操作: 画面を押し続けてアクセル、警告線が光ったら指を離して速度を落としカーブを抜ける
// 終わり: コースアウトせず終点まで走り切れば成功。警告を無視して高速のままカーブに突入すると失敗
// @mechanic: camera_run
// @theme: test_track_throttle
// 世界観: 見習い整備士が新型かごの試験コースに乗り込み、直線でアクセルを握り込みカーブの警告灯で手を離して、コースアウトせず終点の検査門まで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 走破距離
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 疑似俯瞰の路面ストライプ、地平線グラデ、遠近で幅が縮む帯
  var C = {
    sky: '#274a8f', sky2: '#7fb8ff', road: '#3a3a44', roadEdge: '#e8e8e8',
    stripe: '#ffe14d', cart: '#ff5c3a', cartDark: '#a53318',
    good: '#3ad67b', bad: '#ff4d5e', gold: '#ffe14d', white: '#ffffff', ink: '#1a1a22',
  };

  var GAME_TITLE = 'TEST TRACK';
  var COURSE_LEN = 2200;
  var TIME_LIMIT = 20;
  var MAX_SPEED = 420, ACCEL = 340, DRAG = 0.55;
  var CURVE_LIMIT = 210;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CART_SPRITE = ['.####.', '######', '.#..#.'];

  var CURVES = [520, 980, 1440, 1880];

  function bg() {
    game.draw.gradient(0, H * 0.42, [[0, C.sky], [1, C.sky2]]);
    game.draw.rect(0, H * 0.40, W, H * 0.60, C.road);
    var t = game.time.elapsed;
    for (var i = 0; i < 6; i++) {
      var yy = H * 0.42 + (((t * 260 + i * 130) % 900));
      var wpct = (yy - H * 0.42) / (H * 0.6);
      var half = 30 + wpct * (W * 0.42);
      game.draw.rect(W / 2 - half - 14, yy, 12, 40, C.roadEdge, 0.8);
      game.draw.rect(W / 2 + half + 2, yy, 12, 40, C.roadEdge, 0.8);
    }
  }

  var dist, speed, pressing, warnedIdx, finished, done, endWait, ready, hitStop, shake, halfCalled, roundTime;

  function initGame() {
    dist = 0; speed = 0; pressing = false; warnedIdx = -1; roundTime = 0;
    finished = false; done = false; endWait = 0; ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function nextCurve() {
    for (var i = 0; i < CURVES.length; i++) if (CURVES[i] > dist) return CURVES[i];
    return -1;
  }

  function drawScene() {
    bg();
    var nc = nextCurve();
    if (nc > 0) {
      var d = nc - dist;
      var warn = d < 260;
      var flashOn = warn && Math.floor(game.time.elapsed * 9) % 2 === 0;
      game.draw.rect(0, H * 0.34, W, 14, flashOn ? C.bad : C.stripe, warn ? 0.9 : 0.25);
    }
    var bounce = Math.sin(game.time.elapsed * 18) * (pressing ? 5 : 2);
    game.draw.sprite(CART_SPRITE, { '#': C.cart }, W * 0.5, H * 0.80 + bounce, 30, { anchor: 'center' });
  }

  function crash(x, y) {
    finished = true; ok = false; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) { pressing = true; game.audio.play('se_tap', 0.05); }
  });
  game.onRelease(function() {
    if (state === S.PLAYING) { pressing = false; game.audio.play('se_tap', 0.03); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepRound(dt) {
    if (pressing) speed = Math.min(MAX_SPEED, speed + ACCEL * dt);
    else speed = Math.max(0, speed - (MAX_SPEED - MAX_SPEED * DRAG) * dt);
    dist += speed * dt;

    for (var i = 0; i < CURVES.length; i++) {
      if (i === warnedIdx) continue;
      var d = CURVES[i] - dist;
      if (d < 260 && d > 0) { warnedIdx = i; game.audio.play('se_tap', 0.08); }
      if (d < 8 && d > -40) {
        if (speed > CURVE_LIMIT) { crash(W * 0.5, H * 0.78); return; }
        warnedIdx = i;
        game.feedback.good(W * 0.5, H * 0.5, { text: 'GOOD', color: C.good });
        game.audio.play('se_milestone', 0.3);
        if (i === 1) game.fx.popup('NICE', W * 0.5, H * 0.4, { color: C.gold, size: 32 });
      }
    }
    if (!halfCalled && dist >= COURSE_LEN * 0.5) { halfCalled = true; }
    if (dist >= COURSE_LEN) {
      finished = true; ok = true;
      game.feedback.good(W * 0.5, H * 0.5, { text: 'CLEAR', color: C.good });
      game.fx.burst(W * 0.5, H * 0.7, { color: C.gold, count: 20, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      roundTime += dt;
      if (roundTime >= TIME_LIMIT) crash(W * 0.5, H * 0.78);
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function resetDemo() { initGame(); demo.t2 = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    demo.gy = H * 0.86;
    if (cyc < 3.4) {
      var nc = nextCurve();
      var press = nc < 0 || (nc - dist) > 150;
      pressing = press;
      demo.press = press;
      stepRoundDemo(dt);
    } else {
      pressing = false; demo.press = false;
    }
  }
  function stepRoundDemo(dt) {
    if (pressing) speed = Math.min(MAX_SPEED, speed + ACCEL * dt);
    else speed = Math.max(0, speed - (MAX_SPEED - MAX_SPEED * DRAG) * dt);
    dist += speed * dt;
    if (dist >= COURSE_LEN) dist = 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(Math.round((dist / COURSE_LEN) * 100) + '%', W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.round((COURSE_LEN - dist) / 100)) + 'm!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(dist), { dist: Math.round(dist) });
        else game.end.failure({ dist: Math.round(dist) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); roundTime = 0; }
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    drawScene();
    var pct = Math.min(1, dist / COURSE_LEN);
    txt(Math.round(dist / 100) + ' / ' + (COURSE_LEN / 100), W * 0.5, H * 0.07, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#5a5a66', 1);
    game.draw.rect(60, 150, (W - 120) * pct, 16, C.gold);
    game.draw.rect(60, 190, W - 120, 12, '#5a5a66', 1);
    game.draw.rect(60, 190, (W - 120) * (speed / MAX_SPEED), 12, speed > CURVE_LIMIT ? C.bad : C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 150, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
