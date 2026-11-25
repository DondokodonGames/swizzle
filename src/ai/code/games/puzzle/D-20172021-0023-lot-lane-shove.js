// D-20172021-0023-lot-lane-shove.js
// ロットレーン・ショーブ — 一列にはまった愛車を出口まで押し進め、立ちふさがる車は連打で押しのける
// 操作: 愛車を指でドラッグして車線を前進させる。前の車にぶつかったら連打して押しのけ、開いた分だけまた前進する
// 終わり: 2台を押しのけて出口まで進めば成功。押しのけ切れず時間切れになると失敗
// @mechanic: push_out
// @theme: parking_lane_shove
// 世界観: 深夜の立体駐車場で出口をふさぐ車列にはまった運転手が、前の車を連打で押しのけながら自分の愛車を出口まで進める
// 残るもの: 正誤(CLEAR/GAME OVER) + 押しのけた台数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var C = {
    bg: '#2a2f3a', bg2: '#171b22', road: '#3a4150', lane: '#ffcf3f',
    car: '#ff4d5e', carDark: '#a3222e', blocker: '#4ad1ff', blockerDark: '#1c7fa8',
    exit: '#38f0a0',
    good: '#38f0a0', bad: '#ff4d5e', gold: '#ffcf3f', ink: '#ffffff',
  };

  var GAME_TITLE = 'LANE SHOVE';
  var TIME_LIMIT = 20;
  var NEEDED = 2;
  var PUSH_NEEDED = 6;
  var PUSH_TIMEOUT = 3.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0c0e12', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CAR_SPRITE = ['.####.', '######', '#.##.#'];

  var LANE_Y = H * 0.5, LANE_X0 = W * 0.16, LANE_X1 = W * 0.86;
  var BLOCK_FRAC = [0.42, 0.74];

  function laneX(frac) { return LANE_X0 + (LANE_X1 - LANE_X0) * frac; }

  var carFrac, phase, blockerIdx, blockerCleared, pushCount, pushTimer, sideOff;
  var cleared, done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(0, LANE_Y - 130, W, 260, C.road, 1);
    for (var d = 0; d < 6; d++) {
      var dx = LANE_X0 + ((game.time.elapsed * 60 + d * 160) % (LANE_X1 - LANE_X0 + 100));
      game.draw.rect(dx, LANE_Y - 6, 60, 12, C.lane, 0.6);
    }
  }

  function drawScene() {
    // exit gate
    game.draw.rect(laneX(1) - 10, LANE_Y - 140, 20, 280, C.exit, 0.8 + 0.2 * Math.sin(game.time.elapsed * 4));

    for (var b = 0; b < BLOCK_FRAC.length; b++) {
      if (blockerCleared[b]) continue;
      var bx = laneX(BLOCK_FRAC[b]);
      var off = (b === blockerIdx && phase === 'push') ? sideOff : 0;
      var wob = phase === 'push' && b === blockerIdx ? Math.sin(game.time.elapsed * 20) * pushCount * 1.5 : 0;
      game.draw.sprite(CAR_SPRITE, { '#': C.blocker }, bx + wob, LANE_Y + off, 22, { anchor: 'center' });
    }

    var cx = laneX(carFrac);
    game.draw.sprite(CAR_SPRITE, { '#': C.car }, cx, LANE_Y, 24, { anchor: 'center' });
  }

  function nextBoundary() {
    if (blockerIdx < BLOCK_FRAC.length) return BLOCK_FRAC[blockerIdx];
    return 1.0;
  }

  function initGame() {
    carFrac = 0; phase = 'drive'; blockerIdx = 0; blockerCleared = [false, false];
    pushCount = 0; pushTimer = 0; sideOff = 0; cleared = 0; halfCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT;
  }

  function startPush() {
    phase = 'push'; pushCount = 0; pushTimer = PUSH_TIMEOUT; sideOff = 0;
  }

  function driveTo(x) {
    if (finished || ready > 0 || phase !== 'drive') return;
    var frac = (x - LANE_X0) / (LANE_X1 - LANE_X0);
    var boundary = nextBoundary();
    carFrac = Math.max(carFrac, Math.min(boundary - 0.02, frac));
    carFrac = Math.max(0, Math.min(1, carFrac));
    if (carFrac >= boundary - 0.02) {
      if (blockerIdx < BLOCK_FRAC.length) {
        startPush();
      } else {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(laneX(1), LANE_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(laneX(1), LANE_Y, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
  }

  function pushTap(x, y) {
    if (finished || ready > 0 || phase !== 'push') return;
    pushCount++;
    sideOff = (sideOff === 0 ? 8 : 0);
    game.audio.play('se_tap', 0.15);
    game.fx.burst(x, y, { color: C.blocker, count: 6, speed: 220 });
    if (pushCount >= PUSH_NEEDED) {
      blockerCleared[blockerIdx] = true;
      cleared++;
      blockerIdx++;
      phase = 'drive';
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.audio.play('se_break', 0.35);
      if (cleared === Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', x, y - 140, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      if (phase === 'push') pushTap(x, y);
      else { game.audio.play('se_tap', 0.05); driveTo(x); }
    }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING && phase === 'drive') driveTo(x); });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || phase !== 'drive') return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.03);
    driveTo(x);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: laneX(0), gy: LANE_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var boundary = nextBoundary();
    var segDur = 1.0;
    var pushDur = 0.9;
    var localT = cyc;
    // simple scripted sequence: drive->push->drive->push->drive
    var steps = [
      { type: 'drive', to: BLOCK_FRAC[0], dur: segDur },
      { type: 'push', idx: 0, dur: pushDur },
      { type: 'drive', to: BLOCK_FRAC[1], dur: segDur },
      { type: 'push', idx: 1, dur: pushDur },
      { type: 'drive', to: 1.0, dur: segDur * 1.3 },
    ];
    var acc = 0;
    for (var i = 0; i < steps.length; i++) {
      var s = steps[i];
      if (localT < acc + s.dur) {
        var t2 = (localT - acc) / s.dur;
        if (s.type === 'drive') {
          var from = i === 0 ? 0 : steps[i - 1].to || (steps[i - 1].idx !== undefined ? BLOCK_FRAC[steps[i - 1].idx] : 0);
          carFrac = from + (s.to - from) * Math.min(1, t2);
          demo.gx = laneX(carFrac); demo.gy = LANE_Y; demo.press = true;
          phase = 'drive';
        } else {
          demo.gx = laneX(BLOCK_FRAC[s.idx]); demo.gy = LANE_Y; demo.press = Math.floor(t2 * 6) % 2 === 0;
          phase = 'push';
          if (t2 > 0.85 && !blockerCleared[s.idx]) {
            blockerCleared[s.idx] = true;
            blockerIdx = s.idx + 1;
            game.feedback.good(demo.gx, demo.gy, { text: 'GOOD', color: C.good });
            game.audio.play('se_good', 0.2);
          }
        }
        return;
      }
      acc += s.dur;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (carFrac === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(cleared + ' / ' + NEEDED, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + (NEEDED - cleared) + '台!', W / 2, H * 0.17, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: NEEDED });
        else game.end.failure({ cleared: cleared, total: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (phase === 'push') {
        pushTimer -= dt;
        if (pushTimer <= 0) {
          finished = true; ok = false; hitStop = 0.3; shake = 0.25;
          game.feedback.bad(laneX(BLOCK_FRAC[blockerIdx]), LANE_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
      }
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(laneX(carFrac), LANE_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(cleared + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#00000055', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);

    if (phase === 'push' && !finished) {
      var pbW = 500;
      game.draw.rect(W / 2 - pbW / 2, H * 0.82, pbW, 40, '#00000055', 1);
      game.draw.rect(W / 2 - pbW / 2, H * 0.82, pbW * (pushCount / PUSH_NEEDED), 40, C.good);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.2], ['E3', 0.2], ['G3', 0.2], ['B3', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
