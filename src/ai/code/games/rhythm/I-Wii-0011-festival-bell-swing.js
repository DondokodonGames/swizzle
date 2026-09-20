// I-Wii-0011-festival-bell-swing.js
// フェスティバル・ベルスイング — 灯りの満ちる窓に合わせ、鐘綱を上へ振り鳴らす
// 操作: 揺れる灯りゲージが光った窓の中にある時だけ、画面を上方向へスワイプして鐘を鳴らす
// 終わり: 規定回数(5回)全て窓内で鳴らせれば成功。窓を外す/待ちすぎれば失敗
// @mechanic: timing_window
// @theme: night_market_bell_keeper
// 世界観: 夜市の灯り番のコウモリ。灯籠の明るさが揺れ動く中、光の窓に重なった瞬間だけ鐘綱を振り上げて鳴らす
// 残るもの: 正誤(CLEAR/GAME OVER) + 鳴らせた回数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形
  var C = {
    bg: '#ffe9d6', bg2: '#ffd3e8', lantern: '#ffb85c', lanternDark: '#e08a2e',
    bat: '#8a6cff', batDark: '#5a42c4', bell: '#ff6ea8', window: '#8effc0', windowDim: '#c8ffe0',
    bad: '#ff5577', good: '#4de89a', gold: '#ffd23d', white: '#ffffff', ink: '#3a1a2a',
  };

  var GAME_TITLE = 'BELL SWING';
  var TOTAL = 5;
  var CX = W * 0.5, GAUGE_Y0 = H * 0.62, GAUGE_Y1 = H * 0.28;
  var PERIOD = 1.5;
  var ROUND_TIMEOUT = 3.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var rung, done, endWait, finished;
  var ready, hitStop, shake, batLift;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BAT_SPRITE = ['#.##.#', '######', '.####.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.circle(W * 0.15, H * 0.14, 40, C.lantern, 0.7);
    game.draw.circle(W * 0.85, H * 0.14, 40, C.lantern, 0.7);
  }

  function newRound() {
    var half = Math.max(0.08, 0.16 - round * 0.015);
    var center = game.random(0.25, 0.75);
    return { t: 0, half: half, center: center, resolved: false };
  }

  var round, rnd;

  function markerPos(t) { return 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / PERIOD); }

  function initGame() {
    rung = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; batLift = 0;
    round = 0; rnd = newRound();
  }

  function resolveSwipe() {
    if (!rnd || rnd.resolved || ready > 0 || done || finished) return;
    var m = markerPos(rnd.t);
    var inWindow = Math.abs(m - rnd.center) <= rnd.half;
    rnd.resolved = true;
    var y = GAUGE_Y0 + (GAUGE_Y1 - GAUGE_Y0) * m;
    hitStop = inWindow ? 0.12 : 0.3;
    batLift = -40;
    if (inWindow) {
      rung++;
      game.feedback.good(CX, y, { text: 'RING', color: C.good });
      game.fx.burst(CX, y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (rung === Math.ceil(TOTAL / 2)) {
        game.fx.popup('HALFWAY!', CX, H * 0.2, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.5);
      }
    } else {
      game.feedback.bad(CX, y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    if (!inWindow) { ok = false; finished = true; finish(); return; }
    if (rung >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    rnd = newRound();
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    if (dir === 'up') { game.audio.play('se_tap', 0.06); resolveSwipe(); }
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

  function drawGauge(r) {
    game.draw.line(CX, GAUGE_Y0, CX, GAUGE_Y1, C.windowDim, 22);
    var wy0 = GAUGE_Y0 + (GAUGE_Y1 - GAUGE_Y0) * (r.center - r.half);
    var wy1 = GAUGE_Y0 + (GAUGE_Y1 - GAUGE_Y0) * (r.center + r.half);
    game.draw.line(CX, wy0, CX, wy1, C.window, 26);
    var m = markerPos(r.t);
    var my = GAUGE_Y0 + (GAUGE_Y1 - GAUGE_Y0) * m;
    game.draw.circle(CX, my, 22, C.bell);
    game.draw.circle(CX, my, 14, C.white);
  }

  function drawBat(lift) {
    game.draw.sprite(BAT_SPRITE, { '#': C.bat }, CX, H * 0.82 + lift, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.82, press: false, r: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.r) { demo.r = newRound(); demo.r.half = 0.14; demo.r.center = 0.5; round = 0; }
    demo.r.t += dt;
    rnd = demo.r;
    var m = markerPos(demo.r.t);
    var inWin = Math.abs(m - demo.r.center) <= demo.r.half;
    if (inWin && !demo.acted) {
      demo.acted = true;
      demo.press = true;
      demo.gy = GAUGE_Y0 + (GAUGE_Y1 - GAUGE_Y0) * m - 60;
      game.feedback.good(CX, demo.gy, { text: 'RING', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (!inWin) { demo.acted = false; demo.press = false; }
    if (demo.r.t > ROUND_TIMEOUT * 0.9) { demo.r = null; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGauge(rnd);
      drawBat(0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.bat);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.bat);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBat(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(rung + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.bat);
      if (!ok) txt('あと' + (TOTAL - rung) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(rung, { rung: rung, total: TOTAL });
        else game.end.failure({ rung: rung, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      rnd.t += dt;
      if (rnd.t >= ROUND_TIMEOUT && !rnd.resolved) {
        rnd.resolved = true;
        hitStop = 0.3; shake = 0.25;
        game.feedback.bad(CX, GAUGE_Y1, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (batLift !== 0) { batLift *= 0.85; if (Math.abs(batLift) < 1) batLift = 0; }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawGauge(rnd);
    drawBat(batLift);

    txt(rung + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.2);
    game.draw.rect(60, 150, (W - 120) * (rung / TOTAL), 16, C.bat);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.bat);
  });

  game.onStart(function() {
    game.audio.melody([['D5', 0.3], ['F5', 0.3], ['A5', 0.3], ['D6', 0.6]], { tempo: 130, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
