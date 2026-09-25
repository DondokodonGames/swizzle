// D-20222026-0014-transit-color-dispatch.js
// トランジット・カラーディスパッチ — 停留所に並ぶ乗客を線で結び、同じ色の乗合車へ乗せて渋滞を解消する
// 操作: 停留所で待つ乗客に指を置き、同じ色の乗合車まで線を引いて結んで乗せる
// 終わり: 制限時間内に全乗客を正しい乗合車へ乗せれば成功。時間切れで失敗
// @mechanic: connect
// @theme: transit_color_dispatch
// 世界観: 停留所の誘導係が、列に並ぶ乗客一人ひとりを指で線を引いて同色の乗合車へ案内し、渋滞を解消する
// 残るもの: 正誤(CLEAR/GAME OVER) + 乗せた人数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度グラデ背景、太い白フチアイコン、視認性最優先
  var STYLE = {
    bg: ['#3fc1c9', '#1f8a92'],
    main: ['#ff5d5d', '#ffb400', '#7b5dff'],
    accent: ['#ffffff', '#12242a'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#2bd67b', bad: '#ff3b3b', gold: '#ffe066',
  };
  var COLORS = STYLE.main;

  var GAME_TITLE = 'COLOR DISPATCH';
  var TIME_LIMIT = 18;
  var PASSENGER_N = 6;
  var PICK_R = 84;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PASSENGER_FRAME = ['.##.', '####', '.##.', '#.#.'];
  var BUS_FRAME = ['######', '#....#', '#....#', '.#..#.'];

  var QUEUE = [];
  var cols = 2, rows = 3;
  for (var qi = 0; qi < PASSENGER_N; qi++) {
    var qc = qi % cols, qr = Math.floor(qi / cols);
    QUEUE.push({ x: W * 0.32 + qc * 220, y: H * 0.28 + qr * 190 });
  }
  var BUS_X = [W * 0.2, W * 0.5, W * 0.8];
  var BUS_Y = H * 0.78;

  function busPos(i) { return { x: BUS_X[i], y: BUS_Y }; }

  var passengers, boarded, dragIdx, dragX, dragY;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function initGame() {
    passengers = [];
    for (var i = 0; i < PASSENGER_N; i++) {
      passengers.push({ x: QUEUE[i].x, y: QUEUE[i].y, color: i % COLORS.length, boarded: false, anim: 0 });
    }
    for (var s = passengers.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var t = passengers[s].color; passengers[s].color = passengers[j].color; passengers[j].color = t;
    }
    boarded = 0; dragIdx = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
  }

  function drawBuses() {
    for (var i = 0; i < BUS_X.length; i++) {
      var b = busPos(i);
      game.draw.rect(b.x - 130, b.y - 110, 260, 220, C.white, 0.9);
      game.draw.rect(b.x - 130, b.y - 110, 260, 14, COLORS[i]);
      game.draw.sprite(BUS_FRAME, { '#': COLORS[i] }, b.x, b.y + 10, 12, { anchor: 'center' });
    }
  }

  function drawPassengers() {
    for (var i = 0; i < passengers.length; i++) {
      var p = passengers[i];
      if (p.boarded && p.anim <= 0) continue;
      var alpha = p.boarded ? Math.max(0, p.anim) : 1;
      var bob = p.boarded ? 0 : Math.sin(game.time.elapsed * 2 + i) * 4;
      game.draw.sprite(PASSENGER_FRAME, { '#': COLORS[p.color] }, p.x, p.y + bob, i === dragIdx ? 16 : 14, { anchor: 'center', alpha: alpha });
    }
  }

  function drawLine() {
    if (dragIdx < 0) return;
    var p = passengers[dragIdx];
    game.draw.line(p.x, p.y, dragX, dragY, C.white, 6);
    game.draw.circle(dragX, dragY, 14, COLORS[p.color]);
  }

  function passengerAt(x, y) {
    var best = -1, bestD = PICK_R;
    for (var i = 0; i < passengers.length; i++) {
      if (passengers[i].boarded) continue;
      var d = Math.hypot(passengers[i].x - x, passengers[i].y - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function busIndexAt(x, y) {
    for (var i = 0; i < BUS_X.length; i++) {
      var b = busPos(i);
      if (x > b.x - 130 && x < b.x + 130 && y > b.y - 110 && y < b.y + 110) return i;
    }
    return -1;
  }

  function tryConnect(idx, x, y) {
    var bi = busIndexAt(x, y);
    var p = passengers[idx];
    if (bi === p.color) {
      p.boarded = true; p.anim = 1; p.x = busPos(bi).x; p.y = busPos(bi).y;
      boarded++;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.4);
      if (!halfCalled && boarded >= Math.ceil(PASSENGER_N / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', p.x, p.y - 120, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      if (boarded >= PASSENGER_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(p.x, p.y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var i = passengerAt(x, y);
    if (i >= 0) { dragIdx = i; dragX = x; dragY = y; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    dragX = x; dragY = y;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    tryConnect(dragIdx, x, y);
    dragIdx = -1;
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
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var per = 4.4 / PASSENGER_N;
    var localIdx = Math.min(PASSENGER_N - 1, Math.floor(cyc / per));
    var localT = (cyc - localIdx * per) / per;
    if (localIdx > demo.idx) {
      var prev = passengers[demo.idx];
      if (prev && !prev.boarded) { prev.boarded = true; prev.x = busPos(prev.color).x; prev.y = busPos(prev.color).y; boarded++; }
      demo.idx = localIdx;
    }
    var p = passengers[demo.idx];
    if (p && !p.boarded) {
      var b = busPos(p.color);
      if (localT < 0.7) {
        var t2 = localT / 0.7;
        demo.gx = p.x + (b.x - p.x) * t2;
        demo.gy = p.y + (b.y - p.y) * t2;
        dragIdx = demo.idx; dragX = demo.gx; dragY = demo.gy;
        demo.press = true;
      } else {
        demo.gx = b.x; demo.gy = b.y; demo.press = false; dragIdx = -1;
        if (localT > 0.75 && !p.boarded) {
          p.boarded = true; p.x = b.x; p.y = b.y; boarded++;
          game.feedback.good(b.x, b.y, { text: 'GOOD', color: C.good });
          game.audio.play('se_coin', 0.2);
        }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!passengers) initGame();
      bg();
      stepDemo(dt);
      drawBuses();
      drawLine();
      drawPassengers();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBuses();
      drawPassengers();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(boarded + ' / ' + PASSENGER_N, W / 2, H * 0.12, 28, C.white);
      if (!ok) txt('あと' + (PASSENGER_N - boarded) + '人!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    for (var i = 0; i < passengers.length; i++) if (passengers[i].boarded && passengers[i].anim > 0) passengers[i].anim -= dt * 2;

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(boarded, { boarded: boarded });
        else game.end.failure({ boarded: boarded });
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
        game.feedback.bad(W * 0.5, H * 0.5, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBuses();
    drawLine();
    drawPassengers();

    txt(boarded + ' / ' + PASSENGER_N, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 190, tbW, 14, '#00000022');
    game.draw.rect(60, 190, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['B4', 0.2], ['D5', 0.2], ['G5', 0.4]], { tempo: 138, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
