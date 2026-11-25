// D-20092012-0005-candy-gear-relay.js
// キャンディギアリレー — 3つの歯車バルブを指で回して目標帯に合わせ、飴を仕掛けの樋づたいに口元まで送る
// 操作: 中央の歯車の縁を押さえたまま円を描くように回す。ゲージが目標帯に入ったら指を離して止める
// 終わり: 3つの歯車を順に目標帯で止められれば飴が口へ届き成功。ズレて止めると飴が詰まり失敗
// @mechanic: rotate_gesture
// @theme: candy_gear_relay
// 世界観: 甘味工房の奥に住む生き物。天井の飴を送る歯車仕掛けを、係の手が順番に回して口元の樋まで運ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + 通せた歯車の数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: つや消し金属+光沢ハイライト、影で立体感、暖色の木目パネル
  var STYLE = {
    bg: ['#4a3626', '#2a1c12'],
    main: ['#c8a24a', '#8a6a2a', '#e8d8a0'],
    accent: ['#ff9fc7', '#3dd67a'],
  };
  var C = {
    bgTop: STYLE.bg[0], bgBot: STYLE.bg[1],
    gear: STYLE.main[1], gearLight: STYLE.main[0], chute: STYLE.main[2],
    candy: STYLE.accent[0], good: STYLE.accent[1],
    bad: '#ff5040', gold: '#ffd24d', white: '#f0e6cf', ink: '#160e08',
  };

  var GAME_TITLE = 'CANDY GEAR RELAY';
  var CX = W * 0.5, CY = H * 0.44, R = 175;
  var ROUNDS = 3;
  var TOL = 18;
  var MOUTH = { x: W * 0.5, y: H * 0.86 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, cleared, targetAng, curAng, holding, lastPointerAng, done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CREATURE_F = [
    ['.####.', '#.##.#', '######'],
    ['.####.', '#.##.#', '#.##.#'],
  ];
  var CANDY_SPR = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bgTop], [1, C.bgBot]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 3, '#00000020');
    game.draw.rect(CX - 30, CY + R, 60, MOUTH.y - (CY + R), C.chute, 0.55);
  }

  function newTarget(r) {
    var opts = [140, -100, 200];
    return opts[r % opts.length];
  }

  function initGame() {
    round = 0; cleared = 0; done = false; endWait = 0; finished = false; holding = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    targetAng = newTarget(0); curAng = 0; lastPointerAng = 0;
  }

  function drawGaugeArc(ang, tol, color) {
    var steps = 24;
    for (var i = -steps; i <= steps; i++) {
      var a = ang + (i / steps) * tol;
      var rad = (a - 90) * Math.PI / 180;
      var x = CX + Math.cos(rad) * (R + 36);
      var y = CY + Math.sin(rad) * (R + 36);
      game.draw.circle(x, y, 5, color, 0.7);
    }
  }

  function drawGear(ang, color) {
    game.draw.circle(CX, CY, R + 16, C.gearLight);
    game.draw.circle(CX, CY, R, color);
    for (var s = 0; s < 8; s++) {
      var a = ang + s * 45;
      var rad = a * Math.PI / 180;
      var x = CX + Math.cos(rad) * (R + 26);
      var y = CY + Math.sin(rad) * (R + 26);
      game.draw.rect(x - 14, y - 14, 28, 28, C.gearLight);
    }
    game.draw.circle(CX, CY, 32, C.gearLight);
    var handleRad = ang * Math.PI / 180;
    var hx = CX + Math.cos(handleRad) * R * 0.9;
    var hy = CY + Math.sin(handleRad) * R * 0.9;
    game.draw.line(CX, CY, hx, hy, C.gearLight, 10);
    game.draw.circle(hx, hy, 22, C.gold);
    return { x: hx, y: hy };
  }

  function angOf(x, y) { return Math.atan2(y - CY, x - CX) * 180 / Math.PI; }

  function evalHold() {
    if (done || ready > 0 || finished) return;
    var diff = Math.abs(((curAng - targetAng + 540) % 360) - 180);
    if (diff <= TOL) {
      cleared++;
      game.feedback.good(CX, CY, { text: 'OPEN', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_powerup', 0.4);
      hitStop = 0.12;
      if (cleared === 2 && !milestoneShown) { milestoneShown = true; game.fx.popup('あと1段!', CX, CY - 240, { color: C.gold, size: 34 }); }
      round++;
      if (round >= ROUNDS) { ok = true; finished = true; finish(); return; }
      targetAng = newTarget(round); curAng = 0; holding = false;
    } else {
      game.feedback.bad(CX, CY, { text: 'JAM' });
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
    if (cyc < dt || demo.t <= dt) { curAng = 0; targetAng = 150; round = 0; cleared = 0; }
    if (cyc < 2.0) {
      var p = cyc / 2.0;
      curAng = targetAng * p;
      demo.press = true;
    } else {
      demo.press = false;
    }
    var rad = curAng * Math.PI / 180;
    demo.gx = CX + Math.cos(rad) * R * 0.9;
    demo.gy = CY + Math.sin(rad) * R * 0.9;
  }

  function candyDropY() {
    var t = Math.min(1, cleared / ROUNDS);
    return CY + R + t * (MOUTH.y - (CY + R) - 60);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGaugeArc(targetAng, TOL, C.good);
      drawGear(curAng, C.gear);
      var cf = Math.floor(game.time.elapsed * 6) % 2;
      game.draw.sprite(CANDY_SPR, { '#': C.candy }, CX, candyDropY(), 8, { anchor: 'center' });
      game.draw.sprite(CREATURE_F[cf], { '#': C.candy }, MOUTH.x, MOUTH.y, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGear(curAng, ok ? C.good : C.bad);
      var cf2 = Math.floor(game.time.elapsed * 6) % 2;
      game.draw.sprite(CANDY_SPR, { '#': C.candy }, CX, candyDropY(), 8, { anchor: 'center' });
      game.draw.sprite(CREATURE_F[cf2], { '#': C.candy }, MOUTH.x, MOUTH.y, 16, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - cleared) + '段!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
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
    drawGaugeArc(targetAng, TOL, C.good);
    if (!finished) drawGear(curAng, C.gear);
    var cf3 = Math.floor(game.time.elapsed * 6) % 2;
    game.draw.sprite(CANDY_SPR, { '#': C.candy }, CX, candyDropY(), 8, { anchor: 'center' });
    game.draw.sprite(CREATURE_F[cf3], { '#': C.candy }, MOUTH.x, MOUTH.y, 16, { anchor: 'center' });

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000040', 1);
    game.draw.rect(60, 150, (W - 120) * (cleared / ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.4], ['A3', 0.4], ['C4', 0.4], ['F4', 0.8]], { tempo: 96, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
