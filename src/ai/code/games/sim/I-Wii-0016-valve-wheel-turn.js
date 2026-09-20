// I-Wii-0016-valve-wheel-turn.js
// バルブホイールターン — 潜水艇の圧力弁ハンドルを、指で円を描くように回して規定量まで開く
// 操作: ハンドルの縁を指で押さえたまま円を描くように動かすとホイールが回る。ゲージが目標帯に入ったら止める
// 終わり: 3系統のバルブを順に目標帯で止められれば成功。回しすぎ/止め忘れで振り切ると失敗
// @mechanic: rotate_gesture
// @theme: submarine_valve_room
// 世界観: 深海探査艇の機関室。整備士が浸水前に各系統の圧力弁を目標の開度までハンドルを回して調整する
// 残るもの: 正誤(CLEAR/GAME OVER) + 調整できた系統数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: クォータービュー、菱形グリッドの床、高さは影の距離で示す(等角、奥ほど小さくしない)
  var C = {
    bg: '#0a1830', bg2: '#122544', floor: '#1c3358', floorEdge: '#0e1f38',
    wheel: '#c8442f', wheelDark: '#7a2418', gauge: '#3a5a80', gaugeOk: '#3dd67a',
    good: '#3dd67a', bad: '#ff5040', gold: '#ffd24d', white: '#dfeaff', ink: '#020810',
  };

  var GAME_TITLE = 'VALVE TURN';
  var CX = W * 0.5, CY = H * 0.46, R = 190;
  var ROUNDS = 3;
  var TOL = 18; // 度

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, cleared, targetAng, curAng, holding, lastPointerAng, done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000040', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PIPE = ['####', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    // 菱形グリッドの床(等角)
    for (var i = -4; i < 8; i++) {
      game.draw.line(0, H * 0.72 + i * 40, W, H * 0.72 + i * 40 - 200, C.floorEdge, 2);
    }
    game.draw.sprite(PIPE, { '#': '#425a7a' }, CX - 260, CY, 16, { anchor: 'center' });
    game.draw.sprite(PIPE, { '#': '#425a7a' }, CX + 260, CY, 16, { anchor: 'center' });
  }

  function newTarget(r) {
    var opts = [140, -100, 200, -60, 260];
    return opts[r % opts.length];
  }

  function initGame() {
    round = 0; cleared = 0; done = false; endWait = 0; finished = false; holding = false;
    ready = 0.8; hitStop = 0; shake = 0;
    targetAng = newTarget(0); curAng = 0; lastPointerAng = 0;
  }

  function drawGaugeArc(ang, tol, color) {
    var steps = 24;
    for (var i = -steps; i <= steps; i++) {
      var a = ang + (i / steps) * tol;
      var rad = (a - 90) * Math.PI / 180;
      var x = CX + Math.cos(rad) * (R + 40);
      var y = CY + Math.sin(rad) * (R + 40) * 0.55;
      game.draw.circle(x, y, 5, color, 0.7);
    }
  }

  function drawWheel(ang, color) {
    game.draw.circle(CX, CY, R + 14, C.wheelDark);
    game.draw.circle(CX, CY, R, color);
    game.draw.circle(CX, CY, 30, C.wheelDark);
    for (var s = 0; s < 6; s++) {
      var a = ang + s * 60;
      var rad = a * Math.PI / 180;
      var x = CX + Math.cos(rad) * R * 0.85;
      var y = CY + Math.sin(rad) * R * 0.85 * 0.55;
      game.draw.line(CX, CY, x, y, C.wheelDark, 10);
    }
    var handleRad = ang * Math.PI / 180;
    var hx = CX + Math.cos(handleRad) * R * 0.9;
    var hy = CY + Math.sin(handleRad) * R * 0.9 * 0.55;
    game.draw.circle(hx, hy, 22, C.gold);
    return { x: hx, y: hy };
  }

  function angOf(x, y) {
    return Math.atan2((y - CY) / 0.55, x - CX) * 180 / Math.PI;
  }

  function evalHold() {
    if (done || ready > 0 || finished) return;
    var diff = Math.abs(((curAng - targetAng + 540) % 360) - 180);
    if (diff <= TOL) {
      cleared++;
      game.feedback.good(CX, CY, { text: 'SET', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_powerup', 0.4);
      if (cleared === 2) game.fx.popup('あと1系統!', CX, CY - 260, { color: C.gold, size: 34 });
      hitStop = 0.12;
      round++;
      if (round >= ROUNDS) { ok = true; finished = true; finish(); return; }
      targetAng = newTarget(round); curAng = 0; holding = false;
    } else {
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      hitStop = 0.3;
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    if (Math.hypot(x - CX, y - CY) > R + 60) return;
    holding = true; lastPointerAng = angOf(x, y);
    game.audio.play('se_tap', 0.06);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !holding || done || finished) return;
    var a = angOf(x, y);
    var delta = a - lastPointerAng;
    if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
    curAng += delta;
    lastPointerAng = a;
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || !holding) return;
    holding = false;
    evalHold();
  });

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

  var demo = { t: 0, gx: CX + R, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { curAng = 0; targetAng = 150; }
    if (cyc < 2.0) {
      var p = cyc / 2.0;
      curAng = 0 + targetAng * p;
      demo.press = true;
    } else {
      demo.press = false;
    }
    var rad = curAng * Math.PI / 180;
    demo.gx = CX + Math.cos(rad) * R * 0.9;
    demo.gy = CY + Math.sin(rad) * R * 0.9 * 0.55;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGaugeArc(targetAng, TOL, C.gaugeOk);
      drawWheel(curAng, C.wheel);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.90, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawWheel(curAng, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - cleared) + '系統!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: ROUNDS });
        else game.end.failure({ cleared: cleared, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGaugeArc(targetAng, TOL, C.gaugeOk);
    if (!finished) drawWheel(curAng, C.wheel);

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000030', 1);
    game.draw.rect(60, 150, (W - 120) * (cleared / ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A2', 0.5], ['C3', 0.5], ['E3', 0.5], ['A3', 1]], { tempo: 92, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
