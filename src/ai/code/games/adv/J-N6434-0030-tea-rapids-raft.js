// J-N6434-0030-tea-rapids-raft.js
// 茶の里の急流筏 — 指で筏を左右に導き、白く光る速い流れの筋に乗り続けて岩と岸を避け、船着き場へ急ぐ
// 操作: 画面を押したまま左右になぞると筏がその位置へ寄る。光る流れの筋の上は速い(社内メモ。画面には出さない)
// 終わり: 140m先の船着き場に制限時間内に着けば成功。岩か岸にぶつかる/時間切れで失敗
// @mechanic: guide_path
// @theme: tea_village_rapids_raft
// 世界観: 山の茶の里で船頭をする柴犬が、新茶の樽を積んだ竹の筏で急流を下り、速い流れの筋を指でたどりながら岩をかわして、朝市が開く前に麓の船着き場へ届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 到着タイム・流れの筋に乗っていた割合
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var STYLE = {
    bg: ['#2fd06b', '#1a9e4e', '#1ec8ff'],
    main: ['#0a7bff', '#e9fbff', '#ffb020'],
    accent: ['#ffe600', '#ff2d55'],
  };
  var C = {
    grass: STYLE.bg[0], grassDark: STYLE.bg[1], water: STYLE.bg[2], deep: STYLE.main[0],
    foam: STYLE.main[1], wood: STYLE.main[2], yellow: STYLE.accent[0], red: STYLE.accent[1],
    edge: '#0b1b3a', white: '#ffffff', rock: '#7d8597', rockDark: '#4a5060', tea: '#3f8f3a',
  };

  var GAME_TITLE = 'RAPID RAFT';
  var TIME_LIMIT = 18;
  var GOAL = 140;              // m
  var PX = 40;
  var RAFT_Y = H * 0.62;
  var RAFT_R = 40;
  var SLOW = 5, FAST = 11;
  var LANE_HALF = 85;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト ──────────────────────────────────────
  var DOG = [
    ['.o....o.', 'oo....oo', 'oooooooo', 'owkoowko', 'oowwwwoo', '.ooknoo.', '..rrrr..', '.rrrrrr.'],
    ['.o....o.', 'oo....oo', 'oooooooo', 'okwookwo', 'oowwwwoo', '.oonkoo.', '..rrrr..', '.rrrrrr.'],
  ];
  var DOG_PAL = { o: '#ffb020', w: '#ffffff', k: '#0b1b3a', n: '#ff2d55', r: '#0a7bff' };
  var BARREL = ['.bbbb.', 'bttttb', 'bbbbbb', 'bttttb', '.bbbb.'];
  var BARREL_PAL = { b: '#a0522d', t: '#3f8f3a' };
  var TEA_BUSH = ['.gggg.', 'gglggg', 'gggglg', '.gggg.'];
  var CHEVRON = ['w...w', '.w.w.', '..w..'];
  var PIER = ['yyyyyyyyyyyy', 'y.y.y.y.y.y.', 'yyyyyyyyyyyy'];

  // ── 川の形(距離 d[m] の関数) ─────────────────────────
  function riverX(d) { return W / 2 + 170 * Math.sin(d * 0.045) + 55 * Math.sin(d * 0.11 + 1); }
  function riverHalf(d) { return Math.max(240, 360 - d * 0.8); }
  function laneX(d) { return riverX(d) + (riverHalf(d) - 130) * 0.7 * Math.sin(d * 0.07 + 2); }

  // ── 状態 ─────────────────────────────────────────
  var dist, speed, rx, tx, touching, rocks, timeLeft, runT, inLane, laneT, laneAcc, streak, streakMarks;
  var ready, phase, stopT, doneT, ok, endReason, focus, halfShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 5, y + 5, { size: sz, color: C.edge, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame(demoMode) {
    dist = 0; speed = SLOW; rx = laneX(0); tx = rx; touching = false;
    timeLeft = TIME_LIMIT; runT = 0; inLane = false; laneT = 0; laneAcc = 0; streak = 0; streakMarks = 0;
    ready = demoMode ? 0 : 0.8; phase = demoMode ? 'run' : 'ready';
    stopT = 0; doneT = 0; ok = false; endReason = ''; focus = null; halfShown = false;
    rocks = [];
    var d = 18;
    while (d < GOAL - 10) {
      var inPath = Math.random() < 0.5;
      var x = inPath ? laneX(d) + (Math.random() * 2 - 1) * 30 : riverX(d) + (Math.random() * 2 - 1) * (riverHalf(d) - 80);
      rocks.push({ d: d, x: x, r: 44 + Math.random() * 12 });
      d += 8 + Math.random() * 5;
    }
  }

  // 指でなぞる(プレイヤーもデモAIも同じ関数で目標位置を渡す)
  function steer(x) { tx = Math.max(60, Math.min(W - 60, x)); }

  function crash(what, live) {
    phase = 'stop'; stopT = 0.6; ok = false; endReason = what === 'bank' ? 'bank' : 'rock'; focus = what;
    if (live) {
      game.audio.stopBgm();
      game.audio.play('se_break', 0.5);
      game.feedback.bad(rx, RAFT_Y - 140, { text: 'MISS', color: C.red, shake: 16 });
    } else game.fx.burst(rx, RAFT_Y, { color: C.red, count: 14, speed: 260 });
  }

  function stepWorld(dt, live) {
    if (phase !== 'run') return;
    runT += dt;
    if (live) timeLeft = Math.max(0, TIME_LIMIT - runT);
    rx += (tx - rx) * Math.min(1, dt * 9);
    // 流れの筋の上は速い
    var lx = laneX(dist);
    var wasIn = inLane;
    inLane = Math.abs(rx - lx) < LANE_HALF;
    speed += ((inLane ? FAST : SLOW) - speed) * Math.min(1, dt * 1.8);
    dist += speed * dt;
    laneAcc += inLane ? dt : 0;
    if (inLane) {
      laneT += dt;
      if (laneT >= 1.5) {
        laneT = 0; streak++;
        if (live) game.feedback.good(rx + 90, RAFT_Y - 120, { text: 'x' + streak, color: C.yellow, size: 50, count: 6, sound: 'se_coin', volume: 0.3 });
      }
    } else {
      if (wasIn && live) game.audio.tone('E4', 0.08, { wave: 'triangle', volume: 0.07, slide: -120 });
      laneT = 0; streak = 0;
    }
    if (!wasIn && inLane && live) game.audio.tone('C6', 0.06, { wave: 'sine', volume: 0.06, slide: 300 });

    // 岸・岩との衝突
    if (Math.abs(rx - riverX(dist)) > riverHalf(dist) - RAFT_R) { crash('bank', live); return; }
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      var ry = RAFT_Y - (r.d - dist) * PX;
      if (game.hit.circle(rx, RAFT_Y, RAFT_R, r.x, ry, r.r - 6)) { crash(r, live); return; }
    }

    if (live && !halfShown && dist >= GOAL / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup('70m', W / 2, H * 0.30, { color: C.yellow, size: 70 });
    }
    if (dist >= GOAL) {
      dist = GOAL; phase = 'stop'; stopT = 0.6; ok = true; endReason = 'clear';
      if (live) {
        game.audio.stopBgm();
        game.feedback.good(rx, RAFT_Y - 200, { text: 'CLEAR', color: C.yellow, size: 96, count: 30 });
        game.audio.play('se_success', 0.55);
      }
      return;
    }
    if (live && timeLeft <= 0) {
      phase = 'stop'; stopT = 0.6; ok = false; endReason = 'time'; focus = null;
      game.audio.stopBgm();
      game.feedback.bad(rx, RAFT_Y - 160, { text: 'TIME UP', color: C.red, shake: 8 });
      game.audio.play('se_failure', 0.5);
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawRiver() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.grass], [1, C.grassDark]]);
    game.draw.rect(0, 0, W, H, C.yellow, 0.03 + 0.03 * Math.sin(t * 1.5));
    var step = 16;
    for (var y = 0; y < H; y += step) {
      var d = dist + (RAFT_Y - y) / PX;
      var cx = riverX(d), hw = riverHalf(d), lx = laneX(d);
      // 岸の太い縁取り → 水面 → 流れの筋(横ストリップで塗る)
      game.draw.rect(cx - hw - 14, y, hw * 2 + 28, step, C.edge);
      game.draw.rect(cx - hw, y, hw * 2, step, C.water);
      game.draw.rect(lx - LANE_HALF, y, LANE_HALF * 2, step, C.foam, 0.32 + 0.08 * Math.sin(t * 4 - d * 0.5));
      game.draw.rect(lx - LANE_HALF, y, 8, step, C.white, 0.8);
      game.draw.rect(lx + LANE_HALF - 8, y, 8, step, C.white, 0.8);
      // 岸辺の茶畑(一定間隔)
      var row = Math.floor(d / 6);
      if (Math.abs(d - row * 6) < step / PX) {
        game.draw.sprite(TEA_BUSH, { g: C.tea, l: C.grass }, cx - hw - 90, y, 12, { anchor: 'center' });
        game.draw.sprite(TEA_BUSH, { g: C.tea, l: C.grass }, cx + hw + 90, y, 12, { anchor: 'center' });
      }
    }
    // 流れの筋の上を流れる矢印
    var ph = (dist * 1.0) % 4;
    for (var k = 0; k < 8; k++) {
      var dd = Math.floor(dist / 4) * 4 + k * 4 - ph + 4;
      var yy = RAFT_Y - (dd - dist) * PX;
      if (yy < 240 || yy > H) continue;
      game.draw.sprite(CHEVRON, { w: C.foam }, laneX(dd), yy, 12, { anchor: 'center', alpha: 0.7, flipY: true });
    }
    // 船着き場(ゴール)
    var gy = RAFT_Y - (GOAL - dist) * PX;
    if (gy > -60 && gy < H) {
      var gcx = riverX(GOAL), ghw = riverHalf(GOAL);
      game.draw.rect(gcx - ghw - 20, gy - 40, ghw * 2 + 40, 36, C.edge);
      game.draw.sprite(PIER, { y: C.yellow }, gcx, gy - 22, 14, { anchor: 'center' });
    }
  }

  function drawRocks() {
    var t = game.time.elapsed;
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      var y = RAFT_Y - (r.d - dist) * PX;
      if (y < 200 || y > H + 60) continue;
      var hl = focus === r;
      // 岩の手前の白波(予告)
      game.draw.circle(r.x, y + 10, r.r + 22 + Math.sin(t * 8 + i) * 5, C.foam, 0.6);
      if (hl) game.draw.circle(r.x, y, r.r + 60, C.white, 0.4 + 0.3 * Math.sin(t * 30));
      game.draw.circle(r.x, y, r.r + 6, C.edge);
      game.draw.circle(r.x, y, r.r, C.rock);
      game.draw.circle(r.x + r.r * 0.3, y + r.r * 0.3, r.r * 0.55, C.rockDark);
      game.draw.circle(r.x - r.r * 0.35, y - r.r * 0.35, r.r * 0.25, C.foam, 0.7);
    }
  }

  function drawRaft() {
    var t = game.time.elapsed;
    var bob = Math.sin(t * 5) * 5, sway = Math.cos(t * 3.2) * 4;
    var x = rx + sway, y = RAFT_Y + bob;
    if (focus === 'bank') game.draw.circle(x, y, 130, C.white, 0.4 + 0.3 * Math.sin(t * 30));
    if (inLane && phase === 'run') game.draw.circle(x, y + 40, 80, C.foam, 0.4);
    // 竹の筏(太縁)
    game.draw.rect(x - 78, y - 50, 156, 110, C.edge);
    for (var i = 0; i < 5; i++) game.draw.rect(x - 70 + i * 28, y - 42, 24, 94, i % 2 ? C.wood : '#ffc95a');
    game.draw.sprite(BARREL, BARREL_PAL, x + 40, y + 10, 8, { anchor: 'center' });
    var f = Math.floor(t * 4) % 2;
    var joy = phase === 'stop' && ok ? Math.abs(Math.sin(t * 12)) * 30 : 0;
    game.draw.sprite(DOG[f], DOG_PAL, x - 20, y - 20 - joy, 10, { anchor: 'center' });
    // 水しぶき
    if (phase === 'run' && Math.random() < speed / 30) game.fx.burst(x + (Math.random() - 0.5) * 140, y + 60, { color: C.foam, count: 1, speed: 80 });
  }

  function drawPad() {
    // 親指ゾーン: 左右になぞるスライダー(筏の位置を示すつまみ)
    var t = game.time.elapsed;
    var by = H * 0.86;
    game.draw.rect(60, by - 50, W - 120, 100, C.edge, 0.85);
    game.draw.rect(70, by - 40, W - 140, 80, C.deep, 0.6);
    var lxs = laneX(dist);
    game.draw.rect(lxs - LANE_HALF, by - 40, LANE_HALF * 2, 80, C.foam, 0.35);
    game.draw.circle(rx, by, 52 + (touching ? 6 : 0), C.edge);
    game.draw.circle(rx, by, 44, touching ? C.yellow : C.wood);
    game.draw.circle(rx, by, 16 + 4 * Math.sin(t * 6), C.white, 0.8);
  }

  function drawHud() {
    txt(Math.floor(dist) + ' / ' + GOAL + 'm', W / 2, 70, 54, C.white);
    game.draw.rect(76, 118, W - 152, 26, C.edge);
    game.draw.rect(82, 124, (W - 164) * Math.min(1, dist / GOAL), 14, C.yellow);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(76, 160, W - 152, 20, C.edge);
    game.draw.rect(82, 164, (W - 164) * (timeLeft / TIME_LIMIT), 12, low ? C.red : C.foam);
    if (streak > 0) txt('x' + streak, W - 120, 220, 46, C.yellow);
  }

  function drawScene() {
    drawRiver();
    drawRocks();
    drawRaft();
    drawPad();
  }

  function laneRatio() { return runT > 0 ? laneAcc / runT : 0; }

  function drawResult() {
    game.draw.rect(0, H * 0.30, W, H * 0.18, C.edge, 0.85);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.34, 110, C.yellow);
      txt(runT.toFixed(2) + '秒  ' + Math.round(laneRatio() * 100) + '%', W / 2, H * 0.41, 46, C.white);
    } else {
      txt(endReason === 'time' ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.34, 96, C.red);
      txt('あと' + Math.max(1, Math.ceil(GOAL - dist)) + 'm!', W / 2, H * 0.41, 46, C.yellow);
    }
    txt('BEST ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.46, 36, C.white);
    if (ok && calcScore() > game.best) txt('NEW RECORD', W / 2, H * 0.27, 56, C.yellow);
  }

  function calcScore() { return Math.round(timeLeft * 80) + Math.round(laneRatio() * 500); }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin');
      state = S.PLAYING; initGame(false); startMusic();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(true); demo.t = 0; startMusic(); return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    touching = true; steer(x);
    game.audio.play('se_tap', 0.12);
    game.fx.burst(x, y, { color: C.foam, count: 4, speed: 100 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !touching) return;
    steer(x);
    if (Math.random() < 0.08) game.fx.burst(x, y, { color: C.foam, count: 2, speed: 60 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    touching = false;
    game.fx.burst(x, y, { color: C.deep, count: 2, speed: 50 });
  });

  // ── ATTRACT デモ: AIが同じ steer で流れの筋をたどり、岩を避ける。偶数周の後半で1回岩に当たる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, hold: 0, reckless: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.hold = 0; demo.reckless = Math.floor(demo.t / 8) % 2 === 1; }
    if (phase === 'run') {
      var aim = laneX(dist + 4);
      if (!(demo.reckless && cyc > 3.5)) {
        for (var i = 0; i < rocks.length; i++) {
          var r = rocks[i];
          var ahead = r.d - dist;
          if (ahead > -1.5 && ahead < 7 && Math.abs(r.x - aim) < r.r + RAFT_R + 30) {
            var side = r.x > riverX(r.d) ? -1 : 1;
            aim = r.x + side * (r.r + RAFT_R + 50);
            break;
          }
        }
      }
      var cx = riverX(dist + 2), hw = riverHalf(dist + 2) - RAFT_R - 30;
      aim = Math.max(cx - hw, Math.min(cx + hw, aim));
      steer(aim); touching = true;
      demo.gx = tx; demo.gy = H * 0.86;
    } else {
      demo.hold += dt; touching = false;
      if (demo.hold > 1.0) { initGame(true); demo.hold = 0; demo.reckless = false; }
    }
    stepWorld(dt, false);
  }

  function startMusic() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1],
      ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 1],
    ], { tempo: 160, wave: 'square', volume: 0.05, loop: true, bass: true });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: touching, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 90, C.yellow);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.105, 36, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'run'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { phase = 'done'; doneT = 1.4; }
    } else if (phase === 'done') {
      doneT -= dt;
      if (doneT <= 0) {
        state = S.RESULT;
        var stats = { distance: Math.floor(dist), lane: Math.round(laneRatio() * 100), time: Math.round(runT * 100) / 100 };
        if (ok) game.end.success(calcScore(), stats);
        else game.end.failure(stats);
      }
    }
    stepWorld(dt, true);

    drawScene();
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 110, C.yellow);
    if (phase === 'done') drawResult();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
    startMusic();
  });
})(game);
