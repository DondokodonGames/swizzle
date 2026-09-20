// I-DS-0006-lucky-drum-spin.js
// ラッキードラムスピン — 抽選ドラムの上で指を円を描くように回し、勢いよく回し続けてカプセルを弾き出す
// 操作: ドラムの上で指を円を描くように動かし続けて回転させる。速く回すほどゲージが早く溜まる
// 終わり: 制限時間内にゲージを満タンにできれば成功。時間切れなら失敗
// @mechanic: rotate_gesture
// @theme: prize_booth_lottery_drum
// 世界観: 縁日の景品ブース。挑戦者が抽選ドラムを指で勢いよく回し続け、満タンになった瞬間に当たりカプセルが飛び出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達したゲージ%
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るいパステル背景、太い白縁取り文字、光の柱・星
  var C = {
    bg: '#fff0d8', bg2: '#ffd9a0', drum: '#ff5a7a', drumDark: '#c8324e',
    slot: '#ffe680', good: '#22c46a', bad: '#ff3355', gold: '#ffb400',
    white: '#ffffff', ink: '#3a1420', fever: '#ffe600',
  };

  var GAME_TITLE = 'LUCKY DRUM';
  var DUR = 12;
  var PIVOT_X = W * 0.5, PIVOT_Y = H * 0.50, DRUM_R = 220;
  var FAST_THRESH = 7.5; // rad/s
  var FILL_RATE = 0.55, FEVER_MULT = 1.9;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var meter, dragId, lastA, speedAvg, fever, timeLeft, milestoneShown, spinAng;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    for (var ox = -3; ox <= 3; ox += 3) {
      for (var oy = -3; oy <= 3; oy += 3) {
        if (ox || oy) game.draw.text(str, x + ox, y + oy, { size: sz, color: C.white, bold: true, align: align || 'center' });
      }
    }
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ATTENDANT = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      game.draw.line(PIVOT_X, PIVOT_Y, PIVOT_X + Math.cos(a) * W, PIVOT_Y + Math.sin(a) * W, C.gold, 0.08);
    }
    game.draw.sprite(ATTENDANT, { '#': C.ink }, W * 0.5, H * 0.88, 14, { anchor: 'center' });
  }

  function drawDrum(ang, fv) {
    game.draw.circle(PIVOT_X, PIVOT_Y, DRUM_R + 26, fv ? C.fever : C.drumDark);
    game.draw.circle(PIVOT_X, PIVOT_Y, DRUM_R, C.drum);
    for (var i = 0; i < 6; i++) {
      var a = ang + (i / 6) * Math.PI * 2;
      game.draw.circle(PIVOT_X + Math.cos(a) * (DRUM_R - 40), PIVOT_Y + Math.sin(a) * (DRUM_R - 40), 20, C.slot);
    }
    game.draw.circle(PIVOT_X, PIVOT_Y, 36, C.white);
  }

  function initGame() {
    meter = 0; dragId = null; lastA = 0; speedAvg = 0; fever = false; spinAng = 0;
    timeLeft = DUR; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function normAngle(d) { while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var d = Math.hypot(x - PIVOT_X, y - PIVOT_Y);
    if (d > DRUM_R + 60 || dragId !== null) return;
    dragId = id; lastA = Math.atan2(y - PIVOT_Y, x - PIVOT_X);
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || id !== dragId || finished) return;
    var a = Math.atan2(y - PIVOT_Y, x - PIVOT_X);
    var delta = normAngle(a - lastA);
    lastA = a;
    spinAng += delta;
    var speed = Math.abs(delta) / Math.max(1 / 240, game.time.delta || 1 / 60);
    speedAvg += (speed - speedAvg) * 0.25;
    var wasFever = fever;
    fever = speedAvg > FAST_THRESH;
    if (fever && !wasFever) {
      game.fx.popup('NICE', PIVOT_X, PIVOT_Y - DRUM_R - 40, { color: C.fever, size: 34 });
      game.audio.play('se_powerup', 0.3);
    }
    var rate = FILL_RATE * (fever ? FEVER_MULT : 1);
    meter = Math.min(1, meter + Math.abs(delta) / (Math.PI * 2) * rate);
  });
  game.onRelease(function(x, y, id) { if (id === dragId) { dragId = null; speedAvg = 0; fever = false; } });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (meter === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDrum(spinAng, demo.fever);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.drumDark);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.drumDark);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDrum(spinAng, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(Math.round(meter * 100) + '%', W / 2, H * 0.13, 30, C.gold);
      if (!ok && meter > 0.8) txt('あと少し!', W / 2, H * 0.17, 24, C.drumDark);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.drumDark);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(meter * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!milestoneShown && meter >= 0.5) {
        milestoneShown = true;
        game.fx.popup('50%', PIVOT_X, PIVOT_Y - DRUM_R - 60, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (dragId === null) meter = Math.max(0, meter - 0.05 * dt);
      if (meter >= 1) {
        ok = true; finished = true; hitStop = 0.15;
        game.feedback.good(PIVOT_X, PIVOT_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(PIVOT_X, PIVOT_Y, { color: C.gold, count: 22, speed: 420 });
        finish();
      } else if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(PIVOT_X, PIVOT_Y, { text: 'MISS' });
        shake = 0.25;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDrum(spinAng, fever);

    txt(Math.round(meter * 100) + '%', W / 2, H * 0.06, 30, C.drumDark);
    game.draw.rect(60, 150, W - 120, 16, C.white, 0.6);
    game.draw.rect(60, 150, (W - 120) * meter, 16, fever ? C.fever : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  var demo = { t: 0, gx: PIVOT_X + DRUM_R * 0.8, gy: PIVOT_Y, press: false, fever: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { meter = 0; spinAng = 0; milestoneShown = false; }
    if (cyc < 3.2) {
      var speedNow = 3 + Math.min(6, cyc * 2.2);
      spinAng += dt * speedNow;
      demo.press = true;
      demo.fever = speedNow > FAST_THRESH;
      meter = Math.min(1, meter + (dt * speedNow) / (Math.PI * 2) * FILL_RATE * (demo.fever ? FEVER_MULT : 1));
    } else {
      demo.press = false;
      demo.fever = false;
    }
    demo.gx = PIVOT_X + Math.cos(spinAng) * DRUM_R * 0.8;
    demo.gy = PIVOT_Y + Math.sin(spinAng) * DRUM_R * 0.8;
    if (!milestoneShown && meter >= 0.5) { milestoneShown = true; game.fx.popup('50%', PIVOT_X, PIVOT_Y - DRUM_R - 60, { color: C.gold, size: 38 }); }
  }

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 132, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
