// D-20222026-0015-twin-pier-color-cast.js
// ツインピア・カラーキャスト — 二つの桟橋を同時に受け持ち、両手で左右の渡し船へ同色の乗客を送り込む
// 操作: 画面左側は左手、右側は右手で担当。現れた乗客と同じ色のゲートをそれぞれ即座にタップする
// 終わり: 制限時間内に両桟橋の規定人数を送り出せば成功。時間切れで失敗
// @mechanic: coop_2zone
// @theme: twin_pier_color_cast
// 世界観: 二つの桟橋を同時に受け持つ港湾係員が、両手でそれぞれの乗客の色を見極め、正しい渡し船ゲートへ送り込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 送り出した人数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: くすんだ中間色、擬似的な質感ハイライト線
  var STYLE = {
    bg: ['#2c3e50', '#1a2530'],
    main: ['#e17055', '#0984e3', '#6ab04c', '#f6b93b'],
    accent: ['#f5f6fa', '#111820'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#2bd67b', bad: '#ff3b3b', gold: '#f6b93b',
    divider: '#4a5a68',
  };
  var LEFT_COLORS = [STYLE.main[0], STYLE.main[1]];
  var RIGHT_COLORS = [STYLE.main[2], STYLE.main[3]];

  var GAME_TITLE = 'TWIN PIER';
  var TIME_LIMIT = 20;
  var NEED_EACH = 5;
  var ITEM_TIMEOUT = 2.3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000088', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PASSENGER_FRAME = ['.##.', '####', '.##.', '#.#.'];
  var GATE_FRAME = ['#####', '#...#', '#...#'];

  var LEFT_GATE_Y = [H * 0.58, H * 0.7];
  var RIGHT_GATE_Y = [H * 0.58, H * 0.7];
  var LEFT_X = W * 0.25, RIGHT_X = W * 0.75;
  var GATE_R = 90;

  var zoneL, zoneR, doneCountL, doneCountR;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function spawn(colors) {
    return { color: Math.floor(Math.random() * colors.length), t: 0 };
  }

  function initGame() {
    zoneL = spawn(LEFT_COLORS); zoneR = spawn(RIGHT_COLORS);
    doneCountL = 0; doneCountR = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
    game.draw.line(W / 2, H * 0.24, W / 2, H * 0.82, C.divider, 6);
  }

  function drawZone(cx, colors, gy, passenger, count, label) {
    for (var i = 0; i < colors.length; i++) {
      var isNext = i === passenger.color;
      game.draw.circle(cx, gy[i], GATE_R, isNext ? C.white : '#00000030', isNext ? 0.3 + 0.15 * Math.sin(game.time.elapsed * 6) : 1);
      game.draw.sprite(GATE_FRAME, { '#': colors[i] }, cx, gy[i], 14, { anchor: 'center' });
    }
    var bob = Math.sin(game.time.elapsed * 4) * 8;
    game.draw.sprite(PASSENGER_FRAME, { '#': colors[passenger.color] }, cx, H * 0.4 + bob, 20, { anchor: 'center' });
  }

  function gateIndexAt(x, y, cx, gy) {
    for (var i = 0; i < gy.length; i++) if (Math.hypot(cx - x, gy[i] - y) < GATE_R) return i;
    return -1;
  }

  function handleTap(x, y) {
    if (x < W / 2) {
      var gi = gateIndexAt(x, y, LEFT_X, LEFT_GATE_Y);
      if (gi < 0) return;
      if (gi === zoneL.color) {
        doneCountL++;
        game.feedback.good(x, y, { text: 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.35);
        checkMilestone();
        zoneL = doneCountL >= NEED_EACH ? null : spawn(LEFT_COLORS);
      } else {
        game.feedback.bad(x, y, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
      }
    } else {
      var gi2 = gateIndexAt(x, y, RIGHT_X, RIGHT_GATE_Y);
      if (gi2 < 0) return;
      if (gi2 === zoneR.color) {
        doneCountR++;
        game.feedback.good(x, y, { text: 'GOOD', color: C.good });
        game.audio.play('se_coin', 0.35);
        checkMilestone();
        zoneR = doneCountR >= NEED_EACH ? null : spawn(RIGHT_COLORS);
      } else {
        game.feedback.bad(x, y, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
      }
    }
    checkWin();
  }

  function checkMilestone() {
    var total = doneCountL + doneCountR;
    if (!halfCalled && total >= NEED_EACH) {
      halfCalled = true;
      game.fx.popup('NICE', W / 2, H * 0.2, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
  }

  function checkWin() {
    if (doneCountL >= NEED_EACH && doneCountR >= NEED_EACH && !finished) {
      finished = true; ok = true; hitStop = 0.3;
      game.fx.burst(W / 2, H * 0.5, { color: C.gold, count: 26, speed: 440 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demoL.t = 0; demoR.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) handleTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demoL = { t: 0, gx: LEFT_X, gy: H * 0.4, press: false, cIdx: 0 };
  var demoR = { t: 0, gx: RIGHT_X, gy: H * 0.4, press: false, cIdx: 0 };
  function stepDemo(dt) {
    demoL.t += dt; demoR.t += dt;
    var cycL = demoL.t % 2.6;
    if (cycL < dt || demoL.t <= dt) { zoneL = spawn(LEFT_COLORS); doneCountL = 0; }
    var cycR = (demoR.t + 1.3) % 2.6;
    if (cycR < dt) { zoneR = spawn(RIGHT_COLORS); doneCountR = 0; }
    var tgtL = LEFT_GATE_Y[zoneL.color];
    var tgtR = RIGHT_GATE_Y[zoneR.color];
    if (cycL < 1.6) {
      var t1 = cycL / 1.6;
      demoL.gx = LEFT_X; demoL.gy = H * 0.4 + (tgtL - H * 0.4) * t1;
      demoL.press = t1 > 0.85;
    } else demoL.press = false;
    if (cycR < 1.6) {
      var t2 = cycR / 1.6;
      demoR.gx = RIGHT_X; demoR.gy = H * 0.4 + (tgtR - H * 0.4) * t2;
      demoR.press = t2 > 0.85;
    } else demoR.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!zoneL) initGame();
      bg();
      stepDemo(dt);
      drawZone(LEFT_X, LEFT_COLORS, LEFT_GATE_Y, zoneL, doneCountL);
      drawZone(RIGHT_X, RIGHT_COLORS, RIGHT_GATE_Y, zoneR, doneCountR);
      game.draw.hand(demoL.gx, demoL.gy, { press: demoL.press, scale: 13 });
      game.draw.hand(demoR.gx, demoR.gy, { press: demoR.press, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      if (zoneL) drawZone(LEFT_X, LEFT_COLORS, LEFT_GATE_Y, zoneL, doneCountL);
      if (zoneR) drawZone(RIGHT_X, RIGHT_COLORS, RIGHT_GATE_Y, zoneR, doneCountR);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt((doneCountL + doneCountR) + ' / ' + (NEED_EACH * 2), W / 2, H * 0.12, 26, C.gold);
      if (!ok) txt('あと' + (NEED_EACH * 2 - doneCountL - doneCountR) + '人!', W / 2, H * 0.17, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (!finished) {
      if (zoneL) { zoneL.t += dt; if (zoneL.t > ITEM_TIMEOUT) { zoneL = spawn(LEFT_COLORS); timeLeft = Math.max(0.5, timeLeft - 0.6); } }
      if (zoneR) { zoneR.t += dt; if (zoneR.t > ITEM_TIMEOUT) { zoneR = spawn(RIGHT_COLORS); timeLeft = Math.max(0.5, timeLeft - 0.6); } }
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var total = doneCountL + doneCountR;
        if (ok) game.end.success(total, { left: doneCountL, right: doneCountR });
        else game.end.failure({ left: doneCountL, right: doneCountR });
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
    if (zoneL) drawZone(LEFT_X, LEFT_COLORS, LEFT_GATE_Y, zoneL, doneCountL);
    if (zoneR) drawZone(RIGHT_X, RIGHT_COLORS, RIGHT_GATE_Y, zoneR, doneCountR);

    txt(doneCountL + '/' + NEED_EACH, LEFT_X, H * 0.9, 26, C.white);
    txt(doneCountR + '/' + NEED_EACH, RIGHT_X, H * 0.9, 26, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 190, tbW, 14, '#00000033');
    game.draw.rect(60, 190, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
