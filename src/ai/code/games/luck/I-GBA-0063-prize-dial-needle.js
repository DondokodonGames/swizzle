// I-GBA-0063-prize-dial-needle.js
// 賞品ダイヤル — ぐるぐる回る針を、光った当たり数字にぴったり重なった瞬間タップして止める
// 操作: 針が当たりの数字の真上に来た瞬間にタップする
// 終わり: ぴったり止められれば成功。数字を外せば失敗
// @mechanic: timing_one_shot
// @theme: prize_dial_needle
// 世界観: 縁日の景品ダイヤル抽選機。ぐるぐる回る針を、光る当たり数字の真上でタップして止め景品を当てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 止めた瞬間の針とのズレ角
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺グラデ+疑似グロー、点滅が命
  var C = {
    bg: '#0a0026', bg2: '#160042', dial: '#1c0a3a', dialEdge: '#3a1a6a',
    needle: '#00e5ff', needleGlow: '#0a3a44', target: '#ff2e88', targetGlow: '#5a0a30',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'PRIZE DIAL';
  var CX = W * 0.5, CY = H * 0.48, R = 320;
  var TARGET_ANG = -Math.PI / 2; // 12時の位置を当たりゾーンにする
  var WINDOW_DEG = 16; // 許容角度(片側)
  var SPIN_SPEED = 2.4; // rad/s

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var ang, spun, diffDeg, done, endWait, finished, milestoneShown;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOOTH_SPRITE = ['######', '#....#', '######'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.sprite(BOOTH_SPRITE, { '#': C.targetGlow }, W * 0.5, H * 0.1, 30, { anchor: 'center' });
  }

  function normDeg(rad) {
    var d = (rad * 180 / Math.PI) % 360;
    if (d < 0) d += 360;
    return d;
  }

  function angDiffDeg(a, b) {
    var d = normDeg(a) - normDeg(b);
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }

  function drawDial(a, inWindow) {
    game.draw.circle(CX, CY, R + 24, C.dialEdge);
    game.draw.circle(CX, CY, R, C.dial);
    for (var i = 0; i < 12; i++) {
      var ma = (i / 12) * Math.PI * 2 - Math.PI / 2;
      game.draw.circle(CX + Math.cos(ma) * (R - 40), CY + Math.sin(ma) * (R - 40), 6, C.needleGlow);
    }
    // 当たりゾーン(点滅する的)
    var blink = Math.floor(game.time.elapsed * 5) % 2 === 0;
    game.draw.circle(CX + Math.cos(TARGET_ANG) * (R - 40), CY + Math.sin(TARGET_ANG) * (R - 40), blink ? 26 : 20, C.target);
    game.draw.circle(CX + Math.cos(TARGET_ANG) * (R - 40), CY + Math.sin(TARGET_ANG) * (R - 40), 40, C.targetGlow, 0.4);
    // 針
    game.draw.line(CX, CY, CX + Math.cos(a) * R, CY + Math.sin(a) * R, inWindow ? C.gold : C.needle, 10);
    game.draw.circle(CX, CY, 26, C.needleGlow);
    game.draw.circle(CX, CY, 14, C.needle);
  }

  function initGame() {
    ang = Math.random() * Math.PI * 2; spun = 0; diffDeg = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function stop() {
    if (finished || done || ready > 0) return;
    finished = true;
    diffDeg = angDiffDeg(ang, TARGET_ANG);
    var inWindow = Math.abs(diffDeg) <= WINDOW_DEG;
    var tipX = CX + Math.cos(ang) * R, tipY = CY + Math.sin(ang) * R;
    if (inWindow) {
      ok = true; hitStop = 0.25;
      game.feedback.good(tipX, tipY, { text: 'PERFECT', color: C.good });
      game.fx.burst(tipX, tipY, { color: C.gold, count: 24, speed: 420 });
      game.audio.play('se_success', 0.5);
    } else {
      ok = false; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(tipX, tipY, { text: 'MISS' });
      game.audio.play('se_failure', 0.4);
    }
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.15); stop(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { ang = TARGET_ANG - 2.6; spun = 0; }
    if (cyc < 2.6) {
      ang += dt * SPIN_SPEED;
      demo.press = false;
    } else if (!demo._done) {
      demo.press = true;
      demo._done = true;
      diffDeg = angDiffDeg(ang, TARGET_ANG);
    }
    if (cyc < dt) demo._done = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ang === undefined) initGame();
      bg();
      stepDemo(dt);
      var iw = Math.abs(angDiffDeg(ang, TARGET_ANG)) <= WINDOW_DEG;
      drawDial(ang, iw);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDial(ang, ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.abs(Math.round(diffDeg)) + '°', W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var d = Math.abs(Math.round(diffDeg));
        if (ok) game.end.success(d, { diff: d }); else game.end.failure({ diff: d });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ang += dt * SPIN_SPEED;
      spun += dt;
      if (!milestoneShown && spun > 1.6) {
        milestoneShown = true;
        game.fx.popup('狙え!', CX, CY - R - 40, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var inWin = !finished && Math.abs(angDiffDeg(ang, TARGET_ANG)) <= WINDOW_DEG;
    drawDial(ang, inWin);

    txt(Math.abs(Math.round(angDiffDeg(ang, TARGET_ANG))) + '°' + ' / ' + WINDOW_DEG + '°', W / 2, H * 0.06, 30, inWin ? C.gold : C.white);
    game.draw.rect(60, 150, W - 120, 16, C.dialEdge, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, 1 - Math.abs(angDiffDeg(ang, TARGET_ANG)) / 180), 16, inWin ? C.gold : C.needle);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.9, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.2], ['E5', 0.2], ['G5', 0.2], ['C6', 0.4]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
