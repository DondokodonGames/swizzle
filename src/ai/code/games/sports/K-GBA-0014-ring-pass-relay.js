// K-GBA-0014-ring-pass-relay.js
// リングパス・リレー — 高く放り上げたリングが落ちてきて手元に戻る瞬間に合わせてタップし、次へ送る
// 操作: 放り上げたリングが山なりに落ちてきて手の高さに戻る瞬間だけタップする
// 終わり: 規定回数(5回)全て正しいタイミングで送れれば成功。早すぎ/遅すぎ/無反応で失敗
// @mechanic: drop_timing
// @theme: streetside_ring_juggler
// 世界観: 大道芸の一座。放り上げたリングが山なりに戻ってくる一瞬を捉え、次の演目へ送り継ぐ曲芸師
// 残るもの: 正誤(CLEAR/GAME OVER) + 送り継いだ回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色のライン、太いネオン管のような縁取り
  var C = {
    bg: '#0a0018', bg2: '#1a0030', stage: '#2a0a44', stageDark: '#150522',
    ring: '#00e5ff', ringGlow: '#0a3a44', hand: '#ff2e88',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'RING PASS';
  var TOTAL = 5;
  var CX = W * 0.5;
  var HAND_Y = H * 0.66;
  var PEAK = H * 0.34;
  var FLIGHTS = [1.05, 0.95, 0.88, 0.82, 0.76];
  var WINDOW = 0.14;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var JUGGLER = ['..##..', '.####.', '..##..', '#.##.#', '#.##.#'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.line(W * (0.1 + i * 0.16), H * 0.06, CX, H * 0.6, C.stageDark, 5);
    game.draw.rect(0, H * 0.82, W, H * 0.18, C.stage, 0.4);
  }

  var passed, round, t, T, warned, done, endWait, finished;
  var ready, hitStop, shake, flashState;

  function newFlight(r) {
    T = FLIGHTS[Math.min(r, FLIGHTS.length - 1)];
    t = 0; warned = false; flashState = 0;
  }

  function initGame() {
    passed = 0; round = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newFlight(0);
  }

  function ringY(tt) {
    var p = Math.max(0, Math.min(1, tt / T));
    return HAND_Y - 4 * PEAK * p * (1 - p);
  }

  function attempt() {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0) return;
    game.audio.play('se_tap', 0.12);
    if (Math.abs(t - T) <= WINDOW) {
      passed++; hitStop = 0.1; flashState = 1;
      game.feedback.good(CX, HAND_Y, { text: 'PASS', color: C.good });
      game.fx.burst(CX, HAND_Y, { color: C.gold, count: 16, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (passed === Math.ceil(TOTAL / 2)) game.fx.popup(passed + ' / ' + TOTAL, CX, HAND_Y - 200, { color: C.gold, size: 40 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; newFlight(round);
    } else {
      flashState = -1; hitStop = 0.35;
      game.feedback.bad(CX, ringY(t), { text: t < T ? '早い!' : '遅い!' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    attempt();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepGame(dt) {
    if (finished) return;
    t += dt;
    if (!warned && t >= T - 0.6 && t < T) warned = true;
    if (t > T + WINDOW) {
      flashState = -1; hitStop = 0.3;
      game.feedback.bad(CX, HAND_Y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function drawScene(ry, jitter) {
    game.draw.sprite(JUGGLER, { '#': C.hand }, CX + jitter, HAND_Y + 70, 26, { anchor: 'center' });
    var warnZone = warned && Math.floor(game.time.elapsed * 12) % 2 === 0;
    if (warnZone) game.draw.circle(CX, HAND_Y, 90, C.gold, 0.25);
    if (flashState !== 0) game.draw.circle(CX, ry, 90, flashState > 0 ? C.good : C.bad, 0.3);
    game.draw.circle(CX, ry, 44, C.ringGlow, 0.6);
    game.draw.circle(CX, ry, 30, C.ring);
    game.draw.circle(CX, ry, 16, C.bg);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, dt2: 0, dT: 1.0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.0;
    if (cyc < dt || demo.t <= dt) { demo.dt2 = 0; demo.dT = 1.0; }
    demo.dt2 += dt;
    if (demo.dt2 < demo.dT - 0.2) { demo.gx = CX; demo.gy = HAND_Y + 70; demo.press = false; }
    else if (demo.dt2 < demo.dT) { demo.press = false; }
    if (demo.dt2 >= demo.dT - 0.08 && demo.dt2 <= demo.dT + 0.08) { demo.press = true; demo.gx = CX; demo.gy = HAND_Y; }
    if (demo.dt2 > demo.dT + 0.1) demo.press = false;
    t = demo.dt2; T = demo.dT; warned = demo.dt2 >= demo.dT - 0.6;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (t === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene(ringY(Math.min(t, T)), 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + TOTAL : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(HAND_Y, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 50, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.16, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '回!', W / 2, H * 0.21, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { passed: passed, total: TOTAL });
        else game.end.failure({ passed: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      stepGame(dt);
    }
    if (shake > 0) shake -= dt;
    if (flashState !== 0) flashState *= 0.9;

    bg();
    drawScene(ringY(Math.min(t, T)), 0);

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['E5', 1]], { tempo: 120, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
