// GH-PS2-0130-guard-down.js
// ガードダウン — 相手のガードが下がる、その瞬間だけ拳が通る
// 操作: タップで打つ
// 終わり: どちらかが倒れるか15秒。勝敗と、当てた/食らった/空振りの回数が残る
// @mechanic: timing_window
// @theme: neon_ring
// 世界観: 深夜のリング。相手は肩を落としてからガードを下げる。肩だけ落として下げない「見せ」もある
// 残るもの: 勝敗(CLEAR / GAME OVER)+ 当てた回数・食らった回数・空振り。ガードが上がっている時に打つと弾かれて返しを食らう
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 80s NEON: 濃紺グラデ + 発光4色。点滅が命
  var C = {
    bg1: '#050716', bg2: '#0c1238', bg3: '#1a0f3a',
    cyan: '#19f5ff', pink: '#ff2fa8', yellow: '#ffe93b', green: '#5bff7a',
    ink: '#02030a', white: '#ffffff', bad: '#ff2f5e',
  };

  var GAME_TITLE = 'GUARD DOWN';
  var MAX_TIME = 15;
  var HP_MAX = 5;
  var OX = W / 2, OY = H * 0.44;   // 相手の中心(上1/3が空かないよう少し上)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var myHp, opHp, hits, taken, whiffs, totalTime, done;
  var ready, hitStop, shake, feedback, feedbackOk;
  // 相手の状態機械: guard(構え) → dip(肩が落ちる=予兆) → open(ガードが下がる=窓) → guard
  // フェイント: dip の後に open に行かず guard に戻り、その間に打つと返しを食らう
  var op;

  function glow(x, y, r, color) {
    game.draw.circle(x, y, r * 2.2, color, 0.08);
    game.draw.circle(x, y, r * 1.5, color, 0.16);
    game.draw.circle(x, y, r, color, 1);
  }
  function neonLine(x1, y1, x2, y2, color, w) {
    game.draw.line(x1, y1, x2, y2, color + '2e', w * 3);   // 8桁hex: 色 + 透明度(疑似グロー)
    game.draw.line(x1, y1, x2, y2, color, w);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.12); }

  function ringBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg2], [0.8, C.bg3], [1, C.bg1]]);
    // ロープ(3段の発光線)
    for (var i = 0; i < 3; i++) neonLine(0, H * 0.66 + i * 70, W, H * 0.66 + i * 70, i === 1 ? C.pink : C.cyan, 6);
    // 床のグリッド(奥に収束)
    for (var g = 0; g < 7; g++) {
      var t = g / 6;
      var y = H * 0.72 + (H * 0.28) * t * t;
      game.draw.rect(0, y, W, 2, C.pink, 0.25 + 0.4 * t);
    }
    for (var v = -4; v <= 4; v++) {
      var x0 = W / 2 + v * 60, x1 = W / 2 + v * 320;
      game.draw.line(x0, H * 0.72, x1, H, C.pink + '59', 2);
    }
  }

  function initGame() {
    myHp = HP_MAX; opHp = HP_MAX; hits = 0; taken = 0; whiffs = 0; totalTime = 0; done = false;
    ready = 0.8; hitStop = 0; shake = 0; feedback = 0; feedbackOk = false;
    op = { phase: 'guard', t: 0.9, feint: false, sway: 0, punch: 0 };
  }

  function nextPhase() {
    if (op.phase === 'guard') {
      op.phase = 'dip'; op.t = 0.28;
      op.feint = totalTime > 3 && Math.random() < 0.35;   // 序盤はフェイント無し
    } else if (op.phase === 'dip') {
      if (op.feint) { op.phase = 'guard'; op.t = 0.7 + Math.random() * 0.6; }
      else { op.phase = 'open'; op.t = Math.max(0.22, 0.42 - totalTime * 0.012); }
    } else {
      op.phase = 'guard'; op.t = 0.6 + Math.random() * 0.8;
    }
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = hits * 100 + myHp * 60 - whiffs * 20;
    if (finalScore < 0) finalScore = 0;
    game.audio.stopBgm();
    if (success) game.audio.play('se_success');
    else { game.audio.play('se_failure'); shake = 0.5; game.fx.flash(C.bad, 0.3); }
    hitStop = 0.6;
    state = S.RESULT;
    setTimeout(function() {
      if (success) game.end.success(finalScore, { hits: hits, taken: taken, whiffs: whiffs, hp: myHp });
      else game.end.failure({ hits: hits, taken: taken, whiffs: whiffs, hp: myHp });
    }, 1600);
  }

  function counter() {
    // 返しの拳。食らって体力が減る
    taken++; myHp--;
    op.punch = 0.3;
    hitStop = 0.14; shake = 0.35;
    game.feedback.bad(W / 2, H * 0.62, { text: 'MISS' });
    game.fx.flash(C.bad, 0.18);
    if (myHp <= 0) finish(false);
  }

  function punch() {
    if (op.phase === 'open') {
      hits++; opHp--;
      var perfect = op.t > (0.42 - totalTime * 0.012) * 0.7;
      hitStop = 0.12;
      game.feedback.good(OX, OY - 120, { text: perfect ? 'PERFECT' : 'NICE', color: perfect ? C.yellow : C.green });
      game.fx.burst(OX, OY - 120, { color: C.yellow, count: 14, speed: 420 });
      op.phase = 'guard'; op.t = 0.8 + Math.random() * 0.5;
      if (opHp <= 0) finish(true);
    } else {
      // ガードが上がっている: 弾かれて返しを食らう
      whiffs++;
      game.audio.play('se_bad', 0.5);
      counter();
    }
  }

  function drawOpponent() {
    var dipY = op.phase === 'dip' ? 40 : 0;
    var open = op.phase === 'open';
    var sway = Math.sin(game.time.elapsed * 3) * 14;
    var x = OX + sway, y = OY + dipY;
    // 体(発光の輪郭)
    neonLine(x - 170, y + 60, x - 120, y + 360, C.cyan, 8);
    neonLine(x + 170, y + 60, x + 120, y + 360, C.cyan, 8);
    neonLine(x - 170, y + 60, x + 170, y + 60, C.cyan, 8);   // 肩
    // 頭
    glow(x, y - 110, 110, open ? C.yellow : C.cyan);
    game.draw.circle(x, y - 110, 92, C.bg1, 1);
    game.draw.circle(x - 34, y - 130, 12, open ? C.yellow : C.cyan);
    game.draw.circle(x + 34, y - 130, 12, open ? C.yellow : C.cyan);
    // ガード(2本の拳)。open のときは下がって顔が空く
    var gy = open ? y + 110 : y - 120;
    var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
    glow(x - 120, gy, 58, open ? C.pink : (op.phase === 'dip' && blink ? C.pink : C.cyan));
    glow(x + 120, gy, 58, open ? C.pink : (op.phase === 'dip' && blink ? C.pink : C.cyan));
    // 返しの拳が飛んでくる
    if (op.punch > 0) glow(W / 2, H * 0.70 + (0.3 - op.punch) * 900, 90, C.bad);
    // 予兆: 肩が落ちている間、肩の線が点滅
    if (op.phase === 'dip' && blink) neonLine(x - 170, y + 60, x + 170, y + 60, C.pink, 10);
  }

  function drawHp() {
    for (var i = 0; i < HP_MAX; i++) {
      game.draw.rect(70 + i * 46, 150, 36, 30, i < myHp ? C.green : C.ink, i < myHp ? 1 : 0.5);
      game.draw.rect(W - 106 - i * 46, 150, 36, 30, i < opHp ? C.pink : C.ink, i < opHp ? 1 : 0.5);
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    punch();
  });

  // ── ATTRACT ゴースト実演: ガードが上がっている時に打つと返しを食らい、下がった瞬間に打つと通る ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.78, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < 1.2) { op.phase = 'guard'; }
    else if (cyc < 1.5) { op.phase = 'dip'; }
    else if (cyc < 2.0) { op.phase = 'open'; }
    else { op.phase = 'guard'; }
    demo.press = (cyc > 0.6 && cyc < 0.8) || (cyc > 1.6 && cyc < 1.8);
    if (cyc > 0.6 && cyc < 0.63) { op.punch = 0.3; game.feedback.bad(W / 2, H * 0.62, { text: 'MISS' }); }
    if (cyc > 1.6 && cyc < 1.63) { game.feedback.good(OX, OY - 120, { text: 'NICE', color: C.green }); game.fx.burst(OX, OY - 120, { color: C.yellow, count: 10, speed: 320 }); }
    if (op.punch > 0) op.punch -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (op === undefined) initGame();
      ringBg();
      stepDemo(dt);
      drawOpponent();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 84, C.pink);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.15, 40, C.cyan);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 58, C.yellow);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 40, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      ringBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      drawOpponent();
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24, 92, resultSuccess ? C.yellow : C.bad);
      // 残るもの: 当てた(緑) / 食らった(赤) / 空振り(桃) を数で
      var y0 = H * 0.76;
      for (var a = 0; a < hits; a++) glow(120 + a * 70, y0, 20, C.green);
      txt(String(hits), W - 110, y0 + 18, 56, C.green, 'right');
      for (var b = 0; b < taken; b++) glow(120 + b * 70, y0 + 90, 20, C.bad);
      txt(String(taken), W - 110, y0 + 108, 56, C.bad, 'right');
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.32, 54, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.37, 42, C.cyan);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.86, 54, C.yellow);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 44, C.white);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else {
        totalTime += dt;
        if (totalTime >= MAX_TIME) { finish(opHp < myHp || (opHp === myHp && hits > taken)); return; }
        op.t -= dt;
        if (op.t <= 0) nextPhase();
        if (op.punch > 0) op.punch -= dt;
      }
      if (shake > 0) shake -= dt;
    }

    ringBg();
    drawOpponent();

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * frac, 24, frac < 0.25 ? C.bad : C.cyan);
    txt('SCORE ' + String(Math.max(0, hits * 100 + myHp * 60 - whiffs * 20)).padStart(6, '0'), W / 2, 102, 46, C.white);
    drawHp();

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 96, C.yellow);
    if (!done && opHp === 1 && Math.floor(game.time.elapsed * 4) % 2 === 0) txt('あと1発', W / 2, H * 0.30, 50, C.yellow);

    scanlines();
  });

  game.onStart(function() {
    // 80s NEON: シンセの短いループ
    game.audio.melody(
      [['A4', 0.25], ['A4', 0.25], ['C5', 0.5], ['A4', 0.25], ['G4', 0.25], ['E4', 0.5], ['R', 0.5], ['D5', 0.5]],
      { tempo: 132, wave: 'square', volume: 0.08, loop: true,
        bass: [['A2', 0.5], ['A2', 0.5], ['F2', 0.5], ['G2', 0.5]], bassWave: 'triangle', bassVolume: 0.09 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
