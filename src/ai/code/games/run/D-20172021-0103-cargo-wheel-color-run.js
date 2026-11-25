// D-20172021-0103-cargo-wheel-color-run.js
// カーゴホイール・カラーラン — 荷台に積んだ色付きドラムを円を描いて回し、関所の指定色を真上に合わせて崩さず通過する
// 操作: 荷台中央のドラム円盤を指で円を描くように回し、関所が来る前に指定の色を真上のマーカーに合わせる
// 終わり: 積み荷を1個以上保ったまま最後の関所を抜ければ成功。積み荷が尽きれば失敗
// @mechanic: rotate_gesture
// @theme: cargo_wheel_color_run
// 世界観: 山道を行く荷馬車の御者が、荷台の色付きドラムを回して関所ごとの指定色を真上に揃え、積み荷を崩さず峠の関所を通り抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 保った積み荷の数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 遠近感のある地平線+彩度高めのドラム色、疑似奥行きの横帯
  var C = {
    bg: '#ffb347', bg2: '#6a3fa0', ground: '#3a2a5a', groundLine: '#5a3f8a',
    cart: '#8a5a2a', cartDark: '#5a3a18',
    good: '#3df08a', bad: '#ff4d5e', gold: '#ffe14d', white: '#fff6e6', ink: '#1a0f28',
  };
  var DRUM_COL = ['#ff4d5e', '#4da6ff', '#ffe14d', '#3df08a'];
  var DRIVER_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  var GAME_TITLE = 'CARGO WHEEL';
  var WHEEL_X = W * 0.5, WHEEL_Y = H * 0.5, WHEEL_R = 190;
  var GATES = 5;
  var TRAVEL = 2.1;
  var TELE_LEAD = 0.7;
  var MAX_HEIGHT = 4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#100818', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) {
      var y = H * 0.62 + i * 40;
      game.draw.rect(0, y, W, 4, C.groundLine, 0.3 - i * 0.03);
    }
    game.draw.rect(0, H * 0.66, W, H * 0.34, C.ground);
  }

  var wheelAngle, height, gateIdx, gateT, targetColor, resolved, telegraphOn;
  var dragging, lastAngle;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function newGate() {
    var t;
    do { t = Math.floor(Math.random() * DRUM_COL.length); } while (t === targetColor);
    targetColor = t;
    gateT = 0; resolved = false; telegraphOn = false;
  }

  function initGame() {
    wheelAngle = 0; height = MAX_HEIGHT; gateIdx = 0; targetColor = -1; milestoneShown = false;
    newGate();
    dragging = false; lastAngle = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function topColorIndex() {
    var seg = (2 * Math.PI) / DRUM_COL.length;
    var a = ((-Math.PI / 2 - wheelAngle) % (2 * Math.PI) + 2 * Math.PI * 4) % (2 * Math.PI);
    return Math.floor(a / seg) % DRUM_COL.length;
  }

  function resolveGate() {
    if (resolved) return;
    resolved = true;
    if (topColorIndex() === targetColor) {
      game.feedback.good(WHEEL_X, WHEEL_Y - WHEEL_R - 40, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (gateIdx === Math.floor(GATES / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('NICE', W / 2, H * 0.2, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      height--;
      hitStop = 0.3; shake = 0.25;
      game.feedback.bad(WHEEL_X, WHEEL_Y - WHEEL_R - 40, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
  }

  function advance(dt) {
    gateT += dt;
    if (!telegraphOn && gateT >= TRAVEL - TELE_LEAD) telegraphOn = true;
    if (gateT >= TRAVEL) {
      if (!resolved) resolveGate();
      gateIdx++;
      if (height <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
      if (gateIdx >= GATES) {
        ok = height >= 1; finished = true; hitStop = 0.25;
        if (ok) { game.fx.burst(WHEEL_X, WHEEL_Y, { color: C.gold, count: 22, speed: 400 }); game.audio.play('se_success', 0.5); }
        else game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
      newGate();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (Math.hypot(x - WHEEL_X, y - WHEEL_Y) < WHEEL_R + 60) {
      dragging = true;
      lastAngle = Math.atan2(y - WHEEL_Y, x - WHEEL_X);
      game.audio.play('se_tap', 0.06);
    }
  });
  game.onMove(function(x, y) {
    if (!dragging || state !== S.PLAYING) return;
    var a = Math.atan2(y - WHEEL_Y, x - WHEEL_X);
    var delta = a - lastAngle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    wheelAngle += delta;
    lastAngle = a;
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.04);
  });
  game.onRelease(function() { dragging = false; });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene(wAngle, h, tColor, showTel) {
    var seg = (2 * Math.PI) / DRUM_COL.length;
    for (var i = 0; i < DRUM_COL.length; i++) {
      var a0 = wAngle + i * seg;
      var steps = 10;
      for (var s = 0; s < steps; s++) {
        var t0 = a0 + (s / steps) * seg;
        var px = WHEEL_X + Math.cos(t0) * WHEEL_R * 0.6;
        var py = WHEEL_Y + Math.sin(t0) * WHEEL_R * 0.6;
        game.draw.circle(px, py, WHEEL_R * 0.42, DRUM_COL[i]);
      }
    }
    game.draw.circle(WHEEL_X, WHEEL_Y, WHEEL_R * 0.18, C.cartDark);
    var flash = Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(WHEEL_X - 14, WHEEL_Y - WHEEL_R - 46, 28, 28, showTel ? (flash ? C.gold : DRUM_COL[tColor]) : DRUM_COL[tColor]);
    game.draw.line(WHEEL_X, WHEEL_Y - WHEEL_R - 14, WHEEL_X, WHEEL_Y - WHEEL_R + 20, C.white, 6);
    for (var k = 0; k < MAX_HEIGHT; k++) {
      game.draw.rect(W * 0.1 + k * 56, H * 0.86, 44, 44, k < h ? C.cart : '#00000030');
    }
    var df = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(DRIVER_F[df], { '#': C.ink }, W * 0.86, H * 0.86, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: WHEEL_X + WHEEL_R * 0.6, gy: WHEEL_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 12;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; }
    else if (!finished && telegraphOn) {
      var cur = topColorIndex();
      if (cur !== targetColor) wheelAngle += dt * 2.6;
    }
    if (!finished) advance(dt);
    var ang = game.time.elapsed * 2.2;
    demo.gx = WHEEL_X + Math.cos(ang) * WHEEL_R * 0.6;
    demo.gy = WHEEL_Y + Math.sin(ang) * WHEEL_R * 0.6;
    demo.press = telegraphOn && !resolved;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (height === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(wheelAngle, height, targetColor, telegraphOn);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(wheelAngle, height, targetColor, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 46, ok ? C.good : C.bad);
      txt(height + ' / ' + MAX_HEIGHT, W / 2, H * 0.15, 28, C.gold);
      if (!ok) txt('あと1個!', W / 2, H * 0.19, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(height, { height: height, gates: gateIdx });
        else game.end.failure({ height: height, gates: gateIdx });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      advance(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(wheelAngle, height, targetColor, telegraphOn);

    txt(gateIdx + ' / ' + GATES, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000055', 1);
    game.draw.rect(60, 150, (W - 120) * (gateIdx / GATES), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.3], ['B4', 0.3], ['D5', 0.3], ['G5', 0.6]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
