// D-20222026-0010-stockroom-shelf-call.js
// ストックルーム・シェルフコール — 運ばれてきた商品を見て正しい棚ゾーンへ瞬時に振り分ける
// 操作: 台に乗った商品を見て、下段3つの棚ゾーンのうち正しい形の棚をタップする
// 終わり: 制限時間内に運ばれてくる商品を全て正しい棚へ振り分ければ成功。時間切れで失敗
// @mechanic: judge
// @theme: stockroom_shelf_call
// 世界観: 倉庫の新人仕分け係が、次々に運ばれてくる商品を一目で見極め、正しい棚ゾーンへ即座に振り分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 振り分けた数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 明るいフラット単色、太めの丸角、影は使わない
  var STYLE = {
    bg: ['#eef3fb', '#dfe9fb'],
    main: ['#ff6b6b', '#4caf7d', '#4d8dff'],
    accent: ['#152238', '#ffffff'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    ink: STYLE.accent[0], white: STYLE.accent[1],
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ff9f1c',
    zone: '#c7d3ea',
  };
  var CATS = STYLE.main;
  var CAT_SHAPE = [
    ['#####', '#...#', '#...#', '#...#', '#####'],
    ['..#..', '.###.', '#####', '.###.', '..#..'],
    ['.###.', '#####', '#.#.#', '#####', '.###.'],
  ];

  var GAME_TITLE = 'SHELF CALL';
  var TIME_LIMIT = 13;
  var ITEM_N = 6;
  var ZONE_Y = H * 0.78;
  var ZONE_X = [W * 0.22, W * 0.5, W * 0.78];
  var ZONE_R = 130;
  var ITEM_Y = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CLERK_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var queue, qIdx, cleared, mistakes;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;
  var popAnim;

  function initGame() {
    queue = [];
    for (var i = 0; i < ITEM_N; i++) queue.push(Math.floor(Math.random() * CATS.length));
    qIdx = 0; cleared = 0; mistakes = 0; popAnim = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, C.gold, pulse * 0.3);
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(CLERK_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.ink }, W * 0.86, H * 0.9 + bob, 12, { anchor: 'center' });
  }

  function drawZones() {
    for (var i = 0; i < ZONE_X.length; i++) {
      game.draw.rect(ZONE_X[i] - ZONE_R, ZONE_Y - ZONE_R * 0.7, ZONE_R * 2, ZONE_R * 1.4, C.zone);
      game.draw.rect(ZONE_X[i] - ZONE_R, ZONE_Y - ZONE_R * 0.7, ZONE_R * 2, 12, CATS[i]);
      game.draw.sprite(CAT_SHAPE[i], { '#': CATS[i] }, ZONE_X[i], ZONE_Y + 6, 16, { anchor: 'center' });
    }
  }

  function drawItem() {
    if (qIdx >= queue.length) return;
    var cat = queue[qIdx];
    var bob = Math.sin(game.time.elapsed * 4) * 8;
    var s = 1 + popAnim * 0.4;
    game.draw.circle(W / 2, ITEM_Y + 90, 130, '#00000018');
    game.draw.sprite(CAT_SHAPE[cat], { '#': CATS[cat] }, W / 2, ITEM_Y + bob, 24 * s, { anchor: 'center' });
  }

  function zoneIndexAt(x, y) {
    for (var i = 0; i < ZONE_X.length; i++) {
      if (Math.abs(x - ZONE_X[i]) < ZONE_R && Math.abs(y - ZONE_Y) < ZONE_R * 0.7) return i;
    }
    return -1;
  }

  function tryCall(zi) {
    if (zi < 0 || qIdx >= queue.length) return;
    var cat = queue[qIdx];
    if (zi === cat) {
      qIdx++; cleared++; popAnim = 1;
      game.feedback.good(ZONE_X[zi], ZONE_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      if (!halfCalled && cleared >= Math.ceil(ITEM_N / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, ITEM_Y - 100, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (cleared >= ITEM_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(ZONE_X[zi], ZONE_Y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
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
    if (state === S.PLAYING && ready <= 0 && !finished) tryCall(zoneIndexAt(x, y));
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
    var per = 4.5 / ITEM_N;
    var slot = Math.min(ITEM_N - 1, Math.floor(cyc / per));
    var localT = (cyc - slot * per) / per;
    if (qIdx >= queue.length) { demo.press = false; return; }
    var cat = queue[qIdx];
    var zx = ZONE_X[cat], zy = ZONE_Y;
    if (localT < 0.65) {
      var t2 = localT / 0.65;
      demo.gx = W / 2 + (zx - W / 2) * t2;
      demo.gy = ITEM_Y + (zy - ITEM_Y) * t2;
      demo.press = true;
    } else {
      demo.gx = zx; demo.gy = zy; demo.press = false;
      if (localT > 0.7 && slot === demo.idx) {
        demo.idx = slot + 1;
        qIdx++; cleared++; popAnim = 1;
        game.feedback.good(zx, zy, { text: 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (popAnim > 0) popAnim -= dt * 3;

    if (state === S.ATTRACT) {
      if (!queue) initGame();
      bg();
      stepDemo(dt);
      drawZones();
      drawItem();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZones();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ITEM_N, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ITEM_N - cleared) + '個!', W / 2, H * 0.18, 24, C.ink);
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
        timeLeft = 0; finished = true; ok = false; hitStop = 0.4; shake = 0.25;
        game.feedback.bad(W * 0.5, ITEM_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZones();
    drawItem();

    txt(cleared + ' / ' + ITEM_N, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 190, tbW, 14, '#00000022');
    game.draw.rect(60, 190, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 145, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
