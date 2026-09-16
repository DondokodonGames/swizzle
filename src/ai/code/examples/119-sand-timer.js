// 119-sand-timer.js
// 砂時計 — 尽きる寸前の一本を見極めて返す。早すぎても遅すぎても通らない
// 操作: 砂が落ちきる直前の砂時計をタップして返す
// 成功: 6回 返す  失敗: 3本 落としきる or 8秒
// @mechanic: timing_one_shot
// @theme: snow
// 世界観: 雪山の山小屋。三つの砂時計が尽きる前に返し続けないと、外の雪が扉を埋める
// variation: 物量型(見る砂時計が3本→4本に増える)
// spice: 二重課題(中盤に吹雪が来て、残量が読みにくくなる)
// 注: needed_action は「維持(1)」だが、割当の物量型(複数を見る)と一発勝負は両立しない。
//     物量型を採る判断で NEEDED=6 とした。#017 も timing_one_shot だが、あちらは単一の
//     カウンタを読む遊び。こちらは「どれが先に尽きるか」の優先順位が入る
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s 16bit: 多色・高彩度。背景3層(空/稜線/小屋の床)で奥行き
  var C = {
    sky: '#2b4f8c', ridge: '#dff0ff', wood: '#6b4526', wood2: '#8a5c33',
    sand: '#ffd98a', glass: '#bfe9ff', frame: '#c8952f', ink: '#241a12',
    good: '#4be07a', bad: '#ff4d5e', white: '#ffffff',
  };

  var GAME_TITLE = 'SAND FLIP';
  var MAX_TIME = 8;
  var NEEDED = 6;
  var MISS_LIMIT = 3;
  var WINDOW = 0.20;        // 「尽きる寸前」とみなす残量(精度の窓)
  var ROW_Y = H * 0.60;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var timers, flips, misses, score, combo, totalTime, done, blizzard, blizzTimer;
  var ready, hitStop, feedback, feedbackOk, shake;

  // 山小屋の主(2フレーム)
  var KEEP_A = [
    '..KKKK..',
    '.KWWWWK.',
    'KWIWWIWK',
    'KWWWWWWK',
    'KWWIIWWK',
    '.KWWWWK.',
    '..KKKK..',
    '.K.KK.K.',
  ];
  var KEEP_B = [
    '..KKKK..',
    '.KWWWWK.',
    'KWIWWIWK',
    'KWWWWWWK',
    'KWWWWWWK',
    '.KWWWWK.',
    '..KKKK..',
    'K..KK..K',
  ];
  var KEEP_COL = { K: C.wood, W: '#ffe6c8', I: C.ink };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.14); }

  function lodgeBg() {
    game.draw.gradient(0, H, [[0, '#0d1c3a'], [0.35, C.sky], [0.52, '#7fb0e8'], [1, '#3a2515']]);
    // 遠景: 稜線2枚
    for (var r = 0; r < 4; r++) game.draw.circle(r * 330 - 60, H * 0.40, 260, '#8fb6e0', 0.85);
    for (var r2 = 0; r2 < 5; r2++) game.draw.circle(r2 * 280 - 40, H * 0.44, 230, C.ridge, 0.95);
    // 小屋の内側: 板壁と棚
    game.draw.rect(0, H * 0.46, W, H * 0.54, C.wood);
    for (var p = 0; p < 9; p++) game.draw.line(0, H * 0.46 + p * 110, W, H * 0.46 + p * 110, C.wood2, 5);
    game.draw.rect(W * 0.04, ROW_Y + 170, W * 0.92, 30, C.wood2);
  }

  function makeTimer(i, n) {
    var span = W * 0.80 / n;
    return {
      x: W * 0.10 + span * (i + 0.5),
      remain: 0.55 + Math.random() * 0.45,
      rate: 0.16 + Math.random() * 0.10,
      dead: false,
      pop: 0,
    };
  }

  function layout(n) {
    var next = [];
    for (var i = 0; i < n; i++) {
      var t = makeTimer(i, n);
      if (timers && timers[i]) { t.remain = timers[i].remain; t.rate = timers[i].rate; t.dead = timers[i].dead; }
      next.push(t);
    }
    timers = next;
  }

  function initGame() {
    timers = null; layout(3);
    flips = 0; misses = 0; score = 0; combo = 0; totalTime = 0; done = false;
    blizzard = 0; blizzTimer = 3.2; ready = 0.8; hitStop = 0;
    feedback = 0; feedbackOk = false; shake = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) { game.audio.play('se_success'); }
    else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.bad, 0.26);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function flip(t) {
    if (t.remain <= WINDOW) {
      flips++;
      combo++;
      var gain = 100 + Math.min(200, (combo - 1) * 40);
      score += gain;
      t.remain = 1; t.rate = 0.18 + Math.random() * 0.12 + flips * 0.012;
      t.pop = 0.25;
      feedback = 0.3; feedbackOk = true;
      game.feedback.good(t.x, ROW_Y, { text: '+' + gain, color: C.good });
      game.audio.play('se_success', 0.5);
      game.fx.burst(t.x, ROW_Y, { color: C.sand, count: 10, speed: 300 });
      if (flips === 3) {
        // 物量型: 見る本数が増える
        layout(4);
        game.fx.popup(flips + ' / ' + NEEDED, W / 2, H * 0.30, { color: C.frame, size: 64 });
        game.audio.play('se_milestone', 0.6);
      }
      if (flips >= NEEDED) finish(true);
    } else {
      // 早すぎる: 砂を捨てることになる
      combo = 0;
      t.remain = Math.min(1, t.remain + 0.15);
      feedback = 0.32; feedbackOk = false;
      hitStop = 0.22; shake = 0.2;
      game.audio.play('se_failure', 0.4);
      game.feedback.bad(t.x, ROW_Y, { text: 'MISS' });
    }
  }

  function drawTimer(t) {
    var s = 1 + t.pop * 1.4;
    var hw = 76 * s, hh = 128 * s;
    var near = t.remain <= WINDOW;
    // telegraph: 尽きる寸前だけ枠が光り、砂が赤みを帯びる
    if (near) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.circle(t.x, ROW_Y, hw * 2.1, C.frame, blink ? 0.4 : 0.2);
    }
    game.draw.rect(t.x - hw, ROW_Y - hh, hw * 2, 16, C.frame);
    game.draw.rect(t.x - hw, ROW_Y + hh - 16, hw * 2, 16, C.frame);
    game.draw.rect(t.x - hw + 8, ROW_Y - hh + 16, hw * 2 - 16, hh * 2 - 32, C.glass, 0.35);
    // 上の砂(残量) / 下の砂(落ちた分)
    var upH = (hh - 24) * t.remain;
    game.draw.rect(t.x - hw + 16, ROW_Y - 8 - upH, hw * 2 - 32, upH, near ? '#ff9a5a' : C.sand);
    var dnH = (hh - 24) * (1 - t.remain);
    game.draw.rect(t.x - hw + 16, ROW_Y + hh - 20 - dnH, hw * 2 - 32, dnH, C.sand, 0.85);
    // 落ちる筋
    if (!t.dead && t.remain > 0) game.draw.line(t.x, ROW_Y - 6, t.x, ROW_Y + 40, C.sand, 5);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    for (var i = 0; i < timers.length; i++) {
      var t = timers[i];
      if (t.dead) continue;
      if (Math.abs(x - t.x) < 110 && Math.abs(y - ROW_Y) < 170) { flip(t); return; }
    }
    game.audio.play('se_tap', 0.25);
  });

  // ── ATTRACT ゴースト実演: 尽きる寸前の1本へ手が落ちる ──
  var demo = { t: 0, r: [0.8, 0.45, 0.2], gx: W / 2, gy: H * 0.72, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    for (var i = 0; i < 3; i++) {
      demo.r[i] -= dt * (0.18 + i * 0.05);
      if (demo.r[i] <= 0) demo.r[i] = 1;
    }
    var pick = 0, low = 9;
    for (var k = 0; k < 3; k++) if (demo.r[k] < low) { low = demo.r[k]; pick = k; }
    var px = W * 0.10 + (W * 0.80 / 3) * (pick + 0.5);
    demo.gx += (px - demo.gx) * Math.min(1, dt * 5);
    demo.gy += ((ROW_Y + 150) - demo.gy) * Math.min(1, dt * 4);
    var was = demo.press;
    demo.press = low <= WINDOW;
    if (demo.press && !was) {
      game.feedback.good(px, ROW_Y, { text: '+100', color: C.good });
      demo.r[pick] = 1;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      lodgeBg();
      stepDemo(dt);
      for (var i0 = 0; i0 < 3; i0++) {
        drawTimer({ x: W * 0.10 + (W * 0.80 / 3) * (i0 + 0.5), remain: demo.r[i0], pop: 0, dead: false });
      }
      var wob0 = Math.floor(game.time.elapsed * 5) % 2 === 0;
      game.draw.sprite(wob0 ? KEEP_A : KEEP_B, KEEP_COL, W * 0.86, ROW_Y - 210, 14, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.12, 74, C.sand);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.17, 40, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 58, C.frame);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 38, C.ridge);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      lodgeBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      for (var i1 = 0; i1 < timers.length; i1++) drawTimer(timers[i1]);
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.74, 92, resultSuccess ? C.good : C.bad);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.82, 56, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.88, 42, C.sand);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.94, 52, C.frame);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.94, 44, C.white);
      }
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
        if (totalTime >= MAX_TIME) { finish(flips >= NEEDED); return; }
        // 二重課題: 中盤に吹雪。残量が読みにくくなる
        blizzTimer -= dt;
        if (blizzTimer <= 0 && blizzard <= 0) { blizzard = 1.6; blizzTimer = 3.4; game.audio.play('se_tap', 0.3); }
        if (blizzard > 0) blizzard -= dt;
        for (var i = 0; i < timers.length; i++) {
          var t = timers[i];
          if (t.dead) continue;
          t.remain -= t.rate * dt;
          if (t.pop > 0) t.pop -= dt;
          if (t.remain <= 0) {
            t.remain = 0; t.dead = true;
            misses++; combo = 0;
            feedback = 0.4; feedbackOk = false;
            hitStop = 0.3; shake = 0.35;
            game.audio.play('se_failure', 0.6);
            game.feedback.bad(t.x, ROW_Y, { text: 'MISS' });
            if (misses >= MISS_LIMIT) { finish(false); return; }
            // 落ちきった砂時計は補充される(遊びが止まらないように)
            t.dead = false; t.remain = 1; t.rate = 0.18 + Math.random() * 0.10;
          }
        }
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
    }

    // draw
    lodgeBg();
    for (var k = 0; k < timers.length; k++) drawTimer(timers[k]);
    var wob = Math.floor(game.time.elapsed * 5) % 2 === 0;
    game.draw.sprite(wob ? KEEP_A : KEEP_B, KEEP_COL, W * 0.88, ROW_Y - 230, 13, { anchor: 'center' });

    // 吹雪(二重課題): 白い粒が流れ、残量が読みにくくなる
    if (blizzard > 0) {
      var a = Math.min(0.45, blizzard * 0.35);
      for (var s2 = 0; s2 < 40; s2++) {
        var sx = (s2 * 97 + game.time.elapsed * 700) % W;
        var sy2 = (s2 * 151 + game.time.elapsed * 420) % H;
        game.draw.rect(sx, sy2, 7, 7, C.white, 0.8);
      }
      game.draw.rect(0, 0, W, H, C.white, a);
    }

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * frac, 24, frac < 0.25 ? C.bad : C.good);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 100, 46, C.white);
    txt(flips + ' / ' + NEEDED, W * 0.16, 158, 44, C.sand);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.rect(W * 0.80 + m * 52, 142, 38, 30, m < (MISS_LIMIT - misses) ? C.sand : C.ink);
    }
    if (combo >= 3) txt('x' + combo, W / 2, 162, 46, C.frame);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 92, C.frame);
    if (feedback > 0 && !feedbackOk && NEEDED - flips <= 3) txt('あと' + (NEEDED - flips) + '回', W / 2, H * 0.24, 50, C.frame);

    scanlines();
  });

  game.onStart(function() {
    // 90s 16bit: 雪山の張り詰めた短いループ
    game.audio.melody(
      [['B4', 0.25], ['A4', 0.25], ['F#4', 0.5], ['A4', 0.25], ['B4', 0.25], ['D5', 0.5],
       ['C#5', 0.25], ['B4', 0.25], ['A4', 0.5], ['F#4', 0.5]],
      { tempo: 168, wave: 'square', volume: 0.09, loop: true,
        bass: [['B2', 0.5], ['B2', 0.5], ['G2', 0.5], ['A2', 0.5]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
