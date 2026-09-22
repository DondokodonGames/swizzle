// K-DS-0027-clock-peekaboo.js
// クロックピーカブー — 針が印を指した瞬間だけ顔を出す
// 操作: 円を回る針が頭上の印を指した瞬間にタップして顔を出す。ずれると引っ込んだまま
// 終わり: 規定回数(6回)全てタイミングよく顔を出せれば成功。1回でも外せば失敗
// @mechanic: timing_one_shot
// @theme: clock_peekaboo
// 世界観: 独自デザインの時計塔にひそむ小さな生き物。文字盤を回る針が窓の印を指した瞬間だけ、顔を出して挨拶する
// 残るもの: 正誤(CLEAR/GAME OVER) + 顔を出せた回数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル配色、丸みのある形、柔らかい影
  var C = {
    bg: '#ffe6ef', bg2: '#ffd0e0', face: '#fff6fa', faceEdge: '#f0a8c4',
    needle: '#ff86a8', mark: '#7ad0c8', markDim: '#3a7a72', good: '#5adf8a', bad: '#ff5a6a',
    gold: '#ffb020', white: '#ffffff', ink: '#4a2038', crea: '#a86ad0',
  };

  var GAME_TITLE = 'PEEK-A-CLOCK';
  var TOTAL = 6;
  var CX = W * 0.5, CY = H * 0.42, R = 260;
  var MARK_ANGLE = -Math.PI / 2; // 上向き固定の印

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var peeked, done, endWait, finished;
  var ready, hitStop, shake, round, ang, spd, peekFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CREATURE_HIDE = ['....', '.##.', '....'];
  var CREATURE_PEEK = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.circle(CX, CY, R + 40, C.faceEdge, 0.4);
    game.draw.circle(CX, CY, R, C.face);
  }

  function newSpeed() {
    var n = Math.min(round, TOTAL - 1);
    return Math.min(4.2, 2.0 + n * 0.35);
  }

  function initGame() {
    peeked = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; peekFlash = 0;
    ang = MARK_ANGLE - Math.PI * 1.5; spd = newSpeed();
  }

  function angDiff() {
    var d = ((ang - MARK_ANGLE) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    return Math.abs(d);
  }

  function resolvePeek() {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.05);
    var d = angDiff();
    if (d < 0.28) {
      peeked++; hitStop = 0.08; peekFlash = 0.2;
      game.feedback.good(CX, CY - R - 30, { text: 'PEEK!', color: C.good });
      game.fx.burst(CX, CY - R, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (peeked === Math.ceil(TOTAL / 2)) game.fx.popup('GREAT TIMING!', CX, CY - R - 90, { color: C.gold, size: 34 });
      if (peeked >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      ang = MARK_ANGLE - Math.PI * 1.5;
      spd = newSpeed();
    } else {
      game.feedback.bad(CX, CY - R - 30, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolvePeek();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function fail() {
    hitStop = 0.3;
    game.feedback.bad(CX, CY - R - 30, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function drawScene(showPeek, needleAng) {
    var nx = CX + Math.cos(needleAng) * R, ny = CY + Math.sin(needleAng) * R;
    var mx = CX + Math.cos(MARK_ANGLE) * R, my = CY + Math.sin(MARK_ANGLE) * R;
    var d = ((needleAng - MARK_ANGLE) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    if (Math.abs(d) < 0.5) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(mx, my, 60, C.gold, 0.3);
    }
    game.draw.circle(mx, my, 22, C.mark);
    game.draw.sprite(showPeek ? CREATURE_PEEK : CREATURE_HIDE, { '#': C.crea }, mx, my - 50, 16, { anchor: 'center' });
    game.draw.line(CX, CY, nx, ny, C.needle, 10);
    game.draw.circle(CX, CY, 20, C.needle);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false, a: 0, sp: 2.4 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { demo.a = MARK_ANGLE - Math.PI * 1.5; round = 0; demo.peeked2 = false; }
    demo.a += demo.sp * dt;
    ang = demo.a;
    var d = angDiff();
    if (d < 0.28 && !demo.peeked2) {
      demo.peeked2 = true;
      demo.press = true; peekFlash = 0.2;
      game.feedback.good(CX, CY - R - 30, { text: 'PEEK!', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (d > 0.6 && demo.peeked2) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (peekFlash > 0) peekFlash -= dt;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(peekFlash > 0, ang);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.crea);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.crea);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(false, MARK_ANGLE);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(peeked + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.crea);
      if (!ok) txt('あと' + (TOTAL - peeked) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(peeked, { peeked: peeked, total: TOTAL });
        else game.end.failure({ peeked: peeked, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ang += spd * dt;
      if (ang - (MARK_ANGLE - Math.PI * 1.5) > Math.PI * 2 + 0.5) fail();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(peekFlash > 0, ang);

    txt(peeked + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.faceEdge, 0.5);
    game.draw.rect(60, 150, (W - 120) * (peeked / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.75, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['E5', 1]], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
