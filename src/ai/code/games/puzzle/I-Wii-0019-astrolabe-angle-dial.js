// I-Wii-0019-astrolabe-angle-dial.js
// アストロラーベ・アングル — 岬の灯台守が古い天測儀のリングを回し、示された星の角度に合わせる
// 操作: 中心のリングを指で円を描くようにドラッグして回し、外周に光る目標角度に合わせて止める
// 終わり: 4回すべての角度を合わせられれば成功。ラウンドの制限時間切れが2回で失敗
// @mechanic: rotate_gesture
// @theme: lighthouse_star_dial
// 世界観: 岬の灯台守が、夜ごと古い真鍮の天測儀リングを回し、示された星の角度に合わせて船の進路を導く
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせられたラウンド数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 真鍮/木目を思わせる質感。暖色の金属と深い木の影
  var C = {
    bg: '#241a10', bg2: '#140d08', brass: '#c8933a', brassDark: '#7a5620',
    ring: '#e8c878', ringDim: '#5a4426', target: '#ffd400', targetDim: '#7a5f18',
    good: '#5eff8a', bad: '#ff4d4d', white: '#f4e8cf', ink: '#160e06',
  };

  var GAME_TITLE = 'STAR DIAL';
  var CX = W * 0.5, CY = H * 0.46;
  var R_OUTER = 300, R_INNER = 220;
  var ROUNDS_NEEDED = 4;
  var MAX_MISS = 2;
  var ROUND_TIME = 3.4;
  var TOL_START = 16, TOL_END = 9;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KEEPER = ['.##.', '####', '.##.', '##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      var sx = (i * 197) % W, sy = (i * 331) % (H * 0.4) + 40;
      game.draw.circle(sx, sy, 3, '#ffffff33');
    }
    game.draw.sprite(KEEPER, { '#': C.brass }, W * 0.5, H * 0.86, 10, { anchor: 'center' });
  }

  var round, dialAngle, targetAngle, tol, lockT, roundT, misses, done, endWait, finished;
  var ready, hitStop, shake;
  var dragging, dragStartTouch, dragStartDial;

  function pickTarget(prev) {
    var a;
    do { a = Math.floor(game.random(0, 12)) * 30; } while (a === prev);
    return a;
  }

  function norm(a) { a = a % 360; if (a < 0) a += 360; return a; }
  function angDiff(a, b) { var d = norm(a - b); if (d > 180) d = 360 - d; return d; }

  function newRound() {
    targetAngle = pickTarget(targetAngle);
    dialAngle = norm(targetAngle + 90 + game.random(-60, 60));
    tol = TOL_START - (TOL_START - TOL_END) * (round / (ROUNDS_NEEDED - 1));
    lockT = 0; roundT = ROUND_TIME;
  }

  function initGame() {
    round = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    dragging = false; targetAngle = undefined;
    newRound();
  }

  function touchAngle(x, y) { return Math.atan2(y - CY, x - CX) * 180 / Math.PI; }

  function beginDrag(x, y) {
    if (state !== S.PLAYING || ready > 0 || hitStop > 0 || finished) return;
    dragging = true;
    dragStartTouch = touchAngle(x, y);
    dragStartDial = dialAngle;
    game.audio.play('se_tap', 0.15);
  }
  function moveDrag(x, y) {
    if (!dragging || state !== S.PLAYING || finished) return;
    var cur = touchAngle(x, y);
    var delta = cur - dragStartTouch;
    dialAngle = norm(dragStartDial + delta);
  }
  function endDrag() { dragging = false; }

  function roundSuccess() {
    round++;
    game.feedback.good(CX, CY - R_OUTER * 0.2, { text: 'GOOD', color: C.good });
    game.fx.burst(CX, CY, { color: C.target, count: 16, speed: 340 });
    game.audio.play('se_good', 0.4);
    if (round === Math.ceil(ROUNDS_NEEDED / 2)) game.fx.popup('HALFWAY!', CX, CY - 380, { color: C.gold || C.target, size: 38 });
    if (round >= ROUNDS_NEEDED) { ok = true; finished = true; hitStop = 0.2; finish(); return; }
    newRound();
  }

  function roundFail() {
    misses++;
    hitStop = 0.35;
    game.feedback.bad(CX, CY, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    if (misses >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    newRound();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { game.audio.play('se_tap', 0.12); beginDrag(x, y); });
  game.onMove(function(x, y) { if (dragging && Math.random() < 0.06) game.audio.play('se_tap', 0.02); moveDrag(x, y); });
  game.onRelease(function(x, y) { if (dragging) game.audio.tone(320, 0.05, { wave: 'sine', volume: 0.05 }); endDrag(); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawRing() {
    game.draw.circle(CX, CY, R_OUTER, C.brassDark);
    game.draw.circle(CX, CY, R_OUTER - 14, C.bg2);
    // target marker (fixed to outer ring)
    var tRad = targetAngle * Math.PI / 180;
    var blink = !hitStop && Math.floor(game.time.elapsed * 6) % 2 === 0;
    var nearAngle = angDiff(dialAngle, targetAngle) <= tol;
    var tColor = nearAngle ? C.good : (blink ? C.target : C.targetDim);
    var tx1 = CX + Math.cos(tRad) * (R_OUTER - 40), ty1 = CY + Math.sin(tRad) * (R_OUTER - 40);
    var tx2 = CX + Math.cos(tRad) * (R_OUTER + 6), ty2 = CY + Math.sin(tRad) * (R_OUTER + 6);
    game.draw.line(tx1, ty1, tx2, ty2, tColor, 14);
    // tolerance arc hint (small ticks)
    game.draw.circle(CX, CY, R_INNER, C.ring, 0.9);
    game.draw.circle(CX, CY, R_INNER - 60, C.brassDark);
    // dial needle
    var dRad = dialAngle * Math.PI / 180;
    var nx = CX + Math.cos(dRad) * (R_INNER - 30), ny = CY + Math.sin(dRad) * (R_INNER - 30);
    game.draw.line(CX, CY, nx, ny, nearAngle ? C.good : C.brass, 12);
    game.draw.circle(nx, ny, 22, nearAngle ? C.good : C.ring);
    game.draw.circle(CX, CY, 20, C.brassDark);
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  var demoAngle = 30, demoTarget = 210, demoRound = 0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { demoAngle = 30; demoTarget = 210; }
    var p = Math.min(1, cyc / 2.6);
    demoAngle = 30 + (demoTarget - 30) * p;
    if (targetAngle === undefined) targetAngle = demoTarget;
    targetAngle = demoTarget; dialAngle = demoAngle;
    var dRad = demoAngle * Math.PI / 180;
    demo.gx = CX + Math.cos(dRad) * (R_INNER - 30);
    demo.gy = CY + Math.sin(dRad) * (R_INNER - 30);
    demo.press = p < 0.95;
    if (p >= 0.98) {
      game.feedback.good(CX, CY - 80, { text: 'GOOD', color: C.good, sound: false });
      game.audio.play('se_good', 0.15);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawRing();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.target);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.target);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawRing();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(round + ' / ' + ROUNDS_NEEDED, W / 2, H * 0.13, 30, C.target);
      if (!ok) txt('あと' + (ROUNDS_NEEDED - round) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { rounds: round, misses: misses });
        else game.end.failure({ rounds: round, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT -= dt;
      lockT = angDiff(dialAngle, targetAngle) <= tol ? lockT + dt : 0;
      if (lockT >= 0.35) { roundSuccess(); }
      else if (roundT <= 0) { roundFail(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawRing();

    txt(round + ' / ' + ROUNDS_NEEDED, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (round / ROUNDS_NEEDED), 16, C.target);
    if (!finished && !ready && roundT < 0.7 && roundT > 0) {
      var b2 = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (b2) game.draw.circle(CX, CY, R_OUTER + 20, C.bad, 0.25);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.target);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.6], ['C4', 0.6], ['E4', 0.6], ['A4', 1.2]], { tempo: 92, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
