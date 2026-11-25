// I-Switch2-0008-twin-pendulum-stop.js
// ツインペンデュラムストップ — 時計職人見習いが、左右の大時計の振り子を合図でぴたりと同時に止める
// 操作: 振り子が中央(最下点)に来る少し前から指を置いて押し続け、中央で離して止める
// 終わり: 2つの振り子を規定の精度で全て止められれば成功。早すぎ/遅すぎで離すと失敗
// @mechanic: hold_duration
// @theme: clockmaker_apprentice_pendulum
// 世界観: 古い時計塔の工房。師匠に代わり左右の大時計を任された見習いが、振り子を狙った瞬間にぴたり止める試験
// 残るもの: 正誤(CLEAR/GAME OVER) + 止められた振り子の数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: くすんだ金属質感、固めのハイライトとやや暗い陰影
  var C = {
    bg: '#1c1c22', bg2: '#28282e', brass: '#8a7a4a', brassDark: '#4a4028', brassLight: '#c8b878',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#eceaea', ink: '#0a0a0c',
  };

  var GAME_TITLE = 'PENDULUM STOP';
  var TOTAL = 2;
  var PX = W * 0.5, PY = H * 0.36;
  var SWING_DUR = 1.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var stopped, done, endWait, finished;
  var ready, hitStop, shake;
  var pend; // {t, holding, holdStart, resolved}

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CLOCKFACE = ['.##.', '#..#', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) game.draw.rect(0, i * (H / 5), W, 2, '#ffffff05');
  }

  function pendAngle(p) {
    // p: 0..1 across one swing; angle sweeps -1..1 via sine, center(0) at p=0.5
    return Math.sin((p - 0.5) * Math.PI);
  }

  function newPend() { return { t: 0, holding: false, holdStart: 0, resolved: false }; }

  function initGame() {
    stopped = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    pend = newPend();
  }

  function beginHold() {
    if (!pend || pend.resolved || ready > 0 || done || finished) return;
    pend.holding = true;
    pend.holdStart = pend.t;
    game.audio.play('se_tap', 0.05);
  }

  function endHold() {
    if (!pend || pend.resolved || !pend.holding || ready > 0 || done || finished) return;
    pend.holding = false;
    var p = (pend.t % SWING_DUR) / SWING_DUR;
    var dist = Math.abs(p - 0.5);
    var correct = dist < 0.06;
    pend.resolved = true;
    hitStop = correct ? 0.12 : 0.32;
    if (correct) {
      stopped++;
      game.feedback.good(PX, PY, { text: 'PERFECT', color: C.good });
      game.fx.burst(PX, PY, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      game.audio.play('se_powerup', 0.3);
      if (stopped === Math.ceil(TOTAL / 2) && TOTAL > 1) game.fx.popup('HALFWAY!', PX, PY - 260, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(PX, PY, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (stopped >= TOTAL) { ok = true; finished = true; finish(); return; }
    pend = newPend();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.05);
    beginHold();
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.tone('A4', 0.05, { wave: 'sine', volume: 0.03 });
    endHold();
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

  function drawScene(pd, showTarget) {
    game.draw.circle(PX, PY - 60, 40, C.brassDark);
    game.draw.circle(PX, PY - 60, 30, C.brassLight);
    game.draw.sprite(CLOCKFACE, { '#': C.brassDark }, PX, PY - 60, 8, { anchor: 'center' });
    if (!pd) return;
    var p = (pd.t % SWING_DUR) / SWING_DUR;
    var ang = pendAngle(p);
    var bx = PX + ang * 260;
    var by = PY + 300;
    // telegraph: 中心(p=0.5)の0.5-0.8s前相当(|p-0.5|<0.18)から目標ゾーンを点滅
    var near = Math.abs(p - 0.5) < 0.18;
    if (near) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(PX, PY + 300, 60, C.gold, 0.35);
    }
    game.draw.line(PX, PY - 60, bx, by, C.brassDark, 8);
    game.draw.circle(bx, by, 44, pd.holding ? C.gold : C.brass);
    game.draw.circle(bx, by, 44, C.brassLight, 0.25);
  }

  var demo = { t: 0, gx: PX, gy: H * 0.86, press: false, pd: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.pd) demo.pd = newPend();
    demo.pd.t += dt;
    pend = demo.pd;
    var p = (demo.pd.t % SWING_DUR) / SWING_DUR;
    if (p > 0.32 && !demo.holding && !demo.done) {
      demo.holding = true; demo.pd.holding = true; demo.press = true;
    }
    var bx = PX + pendAngle(p) * 260;
    demo.gx = bx; demo.gy = PY + 300;
    if (p > 0.5 && demo.holding && !demo.done) {
      demo.done = true; demo.holding = false; demo.pd.holding = false; demo.press = false;
      game.feedback.good(PX, PY + 300, { text: 'PERFECT', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p > 0.92) { demo.pd = null; demo.holding = false; demo.done = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(pend);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(stopped + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - stopped) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(stopped, { stopped: stopped, total: TOTAL });
        else game.end.failure({ stopped: stopped, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      pend.t += dt;
      if (pend.t / SWING_DUR >= 1 && !pend.resolved) {
        pend.resolved = true;
        hitStop = 0.32;
        game.feedback.bad(PX, PY, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene(pend);

    txt(stopped + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (stopped / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.5], ['G4', 0.5], ['B4', 1]], { tempo: 96, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
