// J-N641-0010-pedal-cart-sprint.js
// ペダルカート・スプリント — 左右のペダルを交互に踏み込んでコースをどれだけ進めるかを競う
// 操作: 画面左右のペダルを交互にタップして加速し、進んだ距離を伸ばす
// 終わり: 制限時間内に目標距離へ到達すれば成功。届かなければ失敗
// @mechanic: alternate_tap
// @theme: pedal_cart_sprint
// 世界観: 空き地の手作りペダルカート整備士見習いが、左右ペダルを交互に踏み込みコースをどこまで走れるかに挑む
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ距離
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色高彩度、2〜3層背景で奥行き
  var C = {
    sky: '#7ec8f0', sky2: '#bfe8ff', road: '#5a5a5a', roadLine: '#f0e060',
    grass: '#4aa050', grassDark: '#357a38', cart: '#e04030', cartDark: '#a02818',
    good: '#3ad06a', bad: '#ff4d5e', gold: '#ffd400', ink: '#1a2a3a', white: '#ffffff',
  };

  var GAME_TITLE = 'PEDAL SPRINT';
  var TIME_LIMIT = 10;
  var TARGET_DIST = 100;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#0a1a2a', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CART_A = ['..##..', '.####.', '##..##', '.#..#.'];
  var CART_B = ['..##..', '.####.', '##..##', '#....#'];

  var speed, dist, lastPedal, timeLeft, roadScroll, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.4);
    game.draw.gradient(0, H * 0.45, [[0, C.sky], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H * 0.45, '#ffffff', pulse * 0.3);
    game.draw.rect(0, H * 0.45, W, H * 0.55, C.grass);
    for (var i = -1; i < 5; i++) {
      var ty = H * 0.45 + ((i * 220 - roadScroll) % 1100 + 1100) % 1100;
      game.draw.rect(W * 0.05, ty, W * 0.12, 40, C.grassDark, 0.5);
      game.draw.rect(W * 0.83, ty, W * 0.12, 40, C.grassDark, 0.5);
    }
    game.draw.rect(W * 0.18, H * 0.45, W * 0.64, H * 0.55, C.road);
    for (var j = -1; j < 8; j++) {
      var ly = H * 0.45 + ((j * 140 - roadScroll * 2) % 1200 + 1200) % 1200;
      game.draw.rect(W * 0.49, ly, 16, 60, C.roadLine);
    }
  }

  function drawCart(frameA) {
    var bob = Math.sin(game.time.elapsed * 10) * 4;
    game.draw.sprite(frameA ? CART_A : CART_B, { '#': C.cart }, W / 2, H * 0.78 + bob, 22, { anchor: 'center' });
  }

  function initGame() {
    speed = 0; dist = 0; lastPedal = 0; timeLeft = TIME_LIMIT; roadScroll = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function pedal(side) {
    if (finished || ready > 0) return;
    if (side === lastPedal) {
      game.feedback.bad(side < 0 ? W * 0.2 : W * 0.8, H * 0.8, { text: 'MISS', size: 22 });
      game.audio.play('se_tap', 0.08);
      return;
    }
    lastPedal = side;
    speed = Math.min(320, speed + 55);
    game.feedback.good(side < 0 ? W * 0.2 : W * 0.8, H * 0.8, { text: 'GOOD', color: C.good, size: 22 });
    game.audio.play('se_jump', 0.15);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) pedal(x < W / 2 ? -1 : 1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.2, gy: H * 0.86, press: false };
  var demoLast = 0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { speed = 0; dist = 0; demoLast = 0; roadScroll = 0; }
    var beat = Math.floor(cyc / 0.35);
    var side = beat % 2 === 0 ? -1 : 1;
    if (side !== demoLast && cyc < 2.6) {
      demoLast = side;
      speed = Math.min(320, speed + 55);
      demo.press = true;
    } else demo.press = false;
    speed *= Math.pow(0.5, dt);
    dist += speed * dt * 0.1;
    roadScroll += speed * dt;
    demo.gx = side < 0 ? W * 0.2 : W * 0.8;
    demo.gy = H * 0.86;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (speed === undefined) initGame();
      stepDemo(dt);
      bg();
      drawCart(Math.sin(demo.t * 8) > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.floor(game.best) + 'm' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCart(true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(Math.floor(dist) + 'm' + ' / ' + TARGET_DIST + 'm', W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET_DIST - Math.floor(dist)) + 'm!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.floor(dist), { distance: Math.floor(dist) });
        else game.end.failure({ distance: Math.floor(dist) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      speed *= Math.pow(0.5, dt);
      dist += speed * dt * 0.1;
      roadScroll += speed * dt;
      timeLeft -= dt;
      if (!halfCalled && dist >= TARGET_DIST * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', W / 2, H * 0.35, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (dist >= TARGET_DIST) {
        ok = true; finished = true; hitStop = 0.25;
        game.feedback.good(W / 2, H * 0.78, { text: 'CLEAR', color: C.good });
        game.fx.burst(W / 2, H * 0.78, { color: C.gold, count: 20, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      } else if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.78, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawCart(Math.sin(game.time.elapsed * 8) > 0);

    txt(Math.floor(dist) + 'm' + ' / ' + TARGET_DIST + 'm', W / 2, H * 0.06, 28, C.ink);
    var barW = W - 120;
    var pct = Math.min(1, dist / TARGET_DIST);
    game.draw.rect(60, 150, barW, 16, '#2a3a2a', 1);
    game.draw.rect(60, 150, barW * pct, 16, C.gold);
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    if (lowTime) txt('あと' + Math.max(0, TARGET_DIST - Math.floor(dist)) + 'm!', W / 2, H * 0.22, 22, C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['A4', 0.2], ['B4', 0.2], ['D5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
