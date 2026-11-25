// D-20222026-0019-spirit-stone-counter-call.js
// スピリットストーン・カウンターコール — 相手の石の属性を見極め、弱点となる属性ゾーンを瞬時に選んで打ち返す
// 操作: 中央に浮かぶ相手の精霊石の属性を見て、それに勝る属性のゾーンを即座にタップする
// 終わり: 制限時間内に規定回数を正しく打ち返せば成功。時間切れで失敗
// @mechanic: judge
// @theme: spirit_stone_counter_call
// 世界観: 精霊石の見習い使い手が、次々に浮かぶ相手の石の属性を見極め、弱点となる属性ゾーンへ瞬時に打ち返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち返した回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺背景+発光ネオンライン、グリッド地平線
  var STYLE = {
    bg: ['#170a2e', '#05010f'],
    main: ['#ff3d5e', '#3de07a', '#3dbfff'],
    accent: ['#ffffff', '#0a0518'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#3de07a', bad: '#ff3d5e', gold: '#ffde59',
    zone: '#241246',
  };
  // ELEM[0]=FIRE beats ELEM[1]=LEAF beats ELEM[2]=WATER beats ELEM[0]=FIRE
  var ELEM = STYLE.main;
  var ELEM_SHAPE = [
    ['..#..', '.###.', '#####', '#####', '.###.'],
    ['..#..', '.##..', '.###.', '..##.', '..#..'],
    ['..#..', '.###.', '#####', '.###.', '..#..'],
  ];
  function beats(i) { return (i + 1) % 3; } // element that beats ELEM[i]

  var GAME_TITLE = 'COUNTER CALL';
  var TIME_LIMIT = 13;
  var NEED_N = 5;
  var ZONE_Y = H * 0.78;
  var ZONE_X = [W * 0.22, W * 0.5, W * 0.78];
  var ZONE_R = 130;
  var ORB_Y = H * 0.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000088', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MAGE_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var curElem, resolved, cleared, mistakes, popAnim;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function initGame() {
    curElem = Math.floor(Math.random() * ELEM.length);
    cleared = 0; mistakes = 0; popAnim = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.05 + 0.05 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, ELEM[0], pulse * 0.12);
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(MAGE_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.gold }, W * 0.86, H * 0.9 + bob, 12, { anchor: 'center' });
  }

  function drawZones() {
    for (var i = 0; i < ZONE_X.length; i++) {
      game.draw.rect(ZONE_X[i] - ZONE_R, ZONE_Y - ZONE_R * 0.7, ZONE_R * 2, ZONE_R * 1.4, C.zone);
      game.draw.rect(ZONE_X[i] - ZONE_R, ZONE_Y - ZONE_R * 0.7, ZONE_R * 2, 10, ELEM[i]);
      game.draw.sprite(ELEM_SHAPE[i], { '#': ELEM[i] }, ZONE_X[i], ZONE_Y + 6, 15, { anchor: 'center' });
    }
  }

  function drawOrb() {
    var bob = Math.sin(game.time.elapsed * 4) * 10;
    var s = 1 + popAnim * 0.4;
    game.draw.circle(W / 2, ORB_Y + 100, 140, '#00000022');
    game.draw.sprite(ELEM_SHAPE[curElem], { '#': ELEM[curElem] }, W / 2, ORB_Y + bob, 26 * s, { anchor: 'center' });
  }

  function zoneIndexAt(x, y) {
    for (var i = 0; i < ZONE_X.length; i++) {
      if (Math.abs(x - ZONE_X[i]) < ZONE_R && Math.abs(y - ZONE_Y) < ZONE_R * 0.7) return i;
    }
    return -1;
  }

  function tryCounter(zi) {
    if (zi < 0) return;
    if (zi === beats(curElem)) {
      cleared++; popAnim = 1;
      game.feedback.good(ZONE_X[zi], ZONE_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_powerup', 0.4);
      if (!halfCalled && cleared >= Math.ceil(NEED_N / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, ORB_Y - 100, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (cleared >= NEED_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(ZONE_X[zi], ZONE_Y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        curElem = Math.floor(Math.random() * ELEM.length);
      }
    } else {
      mistakes++;
      timeLeft = Math.max(0.5, timeLeft - 1.2);
      game.feedback.bad(ZONE_X[zi], ZONE_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) tryCounter(zoneIndexAt(x, y));
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
    var cyc = demo.t % 4.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var per = 4.5 / NEED_N;
    var slot = Math.min(NEED_N - 1, Math.floor(cyc / per));
    var localT = (cyc - slot * per) / per;
    var zi = beats(curElem);
    var zx = ZONE_X[zi], zy = ZONE_Y;
    if (localT < 0.65) {
      var t2 = localT / 0.65;
      demo.gx = W / 2 + (zx - W / 2) * t2;
      demo.gy = ORB_Y + (zy - ORB_Y) * t2;
      demo.press = true;
    } else {
      demo.gx = zx; demo.gy = zy; demo.press = false;
      if (localT > 0.7 && slot === demo.idx) {
        demo.idx = slot + 1;
        cleared++; popAnim = 1;
        game.feedback.good(zx, zy, { text: 'GOOD', color: C.good });
        game.audio.play('se_powerup', 0.2);
        if (cleared < NEED_N) curElem = Math.floor(Math.random() * ELEM.length);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (popAnim > 0) popAnim -= dt * 3;

    if (state === S.ATTRACT) {
      if (curElem === undefined) initGame();
      bg();
      stepDemo(dt);
      drawZones();
      drawOrb();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZones();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + NEED_N, W / 2, H * 0.12, 28, C.gold);
      if (!ok) txt('あと' + (NEED_N - cleared) + '回!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, mistakes: mistakes });
        else game.end.failure({ cleared: cleared, mistakes: mistakes });
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
        game.feedback.bad(W * 0.5, ORB_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZones();
    drawOrb();

    txt(cleared + ' / ' + NEED_N, W / 2, H * 0.06, 26, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 190, tbW, 14, '#ffffff22');
    game.draw.rect(60, 190, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F#4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 150, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
