// J-GC4-0006-yarn-mill-escape.js
// ヤーンラッシュ — 転がってくる巨大な毛糸玉より先に、織機の枠の狭い隙間を指で誘導してすり抜け出口へ
// 操作: 画面のどこでも指を置いて左右に動かすと糸巻き小人がその位置へついてくる。迫る枠の隙間に合わせて通す
// 終わり: 出口までたどり着けばCLEAR。枠にぶつかると足が止まり玉が迫る。玉に追いつかれるか時間切れでGAME OVER
// @mechanic: drag_follow
// @theme: yarn_mill_escape
// 世界観: 夜の紡績工場でほどけて転がり出した巨大な毛糸玉から、糸巻き頭の小人が織機の枠の狭い隙間を次々すり抜けて出口の扉まで逃げ切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 走った距離・すり抜けた枠数・拾った糸巻きのスコア
// スタイル: 2000s BILLBOARD 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きはspriteのpx拡縮、接地影で位置を示す
  var STYLE = {
    bg: ['#2b1d3a', '#5b3b4f', '#b9855c'],
    main: ['#e9c46a', '#fdf6e3', '#3d2c2e'],
    accent: ['#e76f51', '#2a9d8f'],
  };

  var GAME_TITLE = 'YARN RUSH';
  var TIME_LIMIT = 22;
  var DIST = 9000;
  var HORIZON = H * 0.2;
  var RUN_Y = H * 0.6;
  var RUN_V = 560;
  var HALF_W = 40;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var RUNNER_A = [
    '..ssss..',
    '.swwwws.',
    '.sbwwbs.',
    '..ssss..',
    '.rrrrrr.',
    'r.rrrr.r',
    '..b..b..',
    '.b....b.',
  ];
  var RUNNER_B = [
    '..ssss..',
    '.swwwws.',
    '.sbwwbs.',
    '..ssss..',
    '.rrrrrr.',
    'r.rrrr.r',
    '...bb...',
    '...bb...',
  ];
  var RUNNER_PAL = { s: '#e9c46a', w: '#fdf6e3', b: '#3d2c2e', r: '#2a9d8f' };
  var SPOOL = ['kkkkk', '.ttt.', '.ttt.', '.ttt.', 'kkkkk'];
  var DOOR = ['kkkkkk', 'kddddk', 'kdlldk', 'kdlldk', 'kddddk', 'kddddk'];

  var walls, spools, dist, runner, tx, gap, ballRot, timeLeft, ready, freeze, stun, ended, endWait, won, score, passed, spoolN, lastMile, elapsedPlay;

  function makeCourse() {
    walls = [];
    spools = [];
    var i = 0;
    for (var at = 900; at < DIST - 400; at += 480 + Math.random() * 120) {
      var ops = [];
      var r = Math.random();
      if (i > 2 && r < 0.35) {
        var a = game.random(170, 420), b = game.random(660, 910);
        ops.push({ x: a, w: 230, vx: 0 }, { x: b, w: 230, vx: 0 });
      } else if (i > 6 && r < 0.65) {
        ops.push({ x: game.random(200, 880), w: 280, vx: (Math.random() < 0.5 ? -1 : 1) * game.random(150, 230) });
      } else {
        ops.push({ x: game.random(180, 900), w: 280, vx: 0 });
      }
      walls.push({ at: at, ops: ops, broken: false, done: false });
      if (Math.random() < 0.4) spools.push({ at: at + 240, x: game.random(160, 920), got: false });
      i++;
    }
  }

  function initGame() {
    makeCourse();
    dist = 0;
    runner = { x: W * 0.5, step: 0 };
    tx = W * 0.5;
    gap = 700;
    ballRot = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    freeze = null;
    stun = 0;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    passed = 0;
    spoolN = 0;
    lastMile = 0;
    elapsedPlay = 0;
  }

  function screenY(at) { return RUN_Y - (at - dist); }
  function depthScale(y) { return 0.45 + 0.55 * Math.max(0, Math.min(1.3, (y - HORIZON) / (RUN_Y - HORIZON))); }

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: STYLE.main[2], bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function endGame(ok) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
  }

  function stepWorld(dt, demo) {
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) { var d = freeze.done; freeze = null; d(); }
      return;
    }
    if (ended) return;
    elapsedPlay += dt;
    runner.x += (tx - runner.x) * Math.min(1, dt * 10);
    runner.x = Math.max(80, Math.min(W - 80, runner.x));
    var v = stun > 0 ? RUN_V * 0.2 : RUN_V;
    if (stun > 0) stun -= dt;
    var ballV = 470 + elapsedPlay * 5;
    var prev = dist;
    dist += v * dt;
    runner.step += v * dt;
    gap = Math.min(900, gap + (v - ballV) * dt);
    ballRot += ballV * dt * 0.004;
    for (var w = 0; w < walls.length; w++) {
      var wl = walls[w];
      for (var o = 0; o < wl.ops.length; o++) {
        var op = wl.ops[o];
        if (op.vx) {
          op.x += op.vx * dt;
          if (op.x < 170 || op.x > 910) { op.vx = -op.vx; op.x = Math.max(170, Math.min(910, op.x)); }
        }
      }
      if (!wl.done && prev < wl.at && dist >= wl.at) {
        wl.done = true;
        var through = false;
        for (var q = 0; q < wl.ops.length; q++) if (Math.abs(runner.x - wl.ops[q].x) <= wl.ops[q].w / 2 - HALF_W * 0.5) through = true;
        if (through) {
          passed++;
          score += 100;
          game.feedback.good(runner.x, RUN_Y - 120, { text: 'NICE', color: STYLE.accent[1], count: 8, volume: demo ? 0 : 0.35 });
        } else {
          wl.broken = true;
          stun = 0.55;
          if (!demo) game.audio.play('se_break', 0.5);
          var bx = runner.x;
          freeze = { t: 0.25, x: bx, y: RUN_Y - 40, done: function () {
            game.feedback.bad(bx, RUN_Y - 80, { text: 'MISS', shake: 8 });
          } };
          return;
        }
      }
    }
    for (var s = 0; s < spools.length; s++) {
      var sp = spools[s];
      if (!sp.got && Math.abs(sp.at - dist) < 40 && Math.abs(sp.x - runner.x) < 90) {
        sp.got = true;
        spoolN++;
        score += 150;
        gap = Math.min(900, gap + 90);
        game.fx.burst(sp.x, RUN_Y - 40, { color: STYLE.accent[0], count: 10, speed: 260 });
        if (!demo) game.audio.play('se_coin', 0.4);
      }
    }
    if (!demo) {
      var pct = Math.floor((dist / DIST) * 4);
      if (pct > lastMile && pct < 4) {
        lastMile = pct;
        game.fx.popup(pct * 25 + '%', W * 0.5, H * 0.3, { color: STYLE.main[0], size: 70 });
        game.audio.play('se_milestone', 0.5);
      }
      if (gap < 260 && Math.floor(elapsedPlay * 4) !== Math.floor((elapsedPlay - dt) * 4)) game.audio.tone('C2', 0.12, { wave: 'sawtooth', volume: 0.06 });
    }
    if (gap <= 0) {
      gap = 0;
      var cx = runner.x;
      freeze = { t: 0.5, x: cx, y: RUN_Y - 40, done: function () {
        game.feedback.bad(cx, RUN_Y - 80, { text: 'GAME OVER' });
        if (!demo) endGame(false); else demoCaught = true;
      } };
      return;
    }
    if (dist >= DIST && !demo) {
      dist = DIST;
      freeze = { t: 0.4, x: runner.x, y: RUN_Y - 60, done: function () {
        score += Math.round(timeLeft * 40) + Math.round(gap);
        game.feedback.good(W * 0.5, RUN_Y - 160, { text: 'CLEAR', color: STYLE.main[0], count: 36 });
        endGame(true);
      } };
    }
  }

  var demoCaught = false;

  // ── 描画 ────────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HORIZON, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    game.draw.gradient(HORIZON, H, [[0, '#6b4a3a'], [1, STYLE.bg[2]]]);
    // 遠景の工場の窓(月明かり)
    for (var i = 0; i < 6; i++) {
      game.draw.rect(60 + i * 170, HORIZON - 150, 90, 110, '#3f2f55');
      game.draw.rect(70 + i * 170, HORIZON - 140, 70, 90, '#9fb4d9', 0.35 + 0.1 * Math.sin(t * 1.5 + i));
    }
    // 床板の継ぎ目(奥ほど詰まる)
    for (var k = 0; k < 16; k++) {
      var z = ((k * 140 - dist) % 2240 + 2240) % 2240;
      var y = HORIZON + Math.pow(z / 2240, 1.7) * (H - HORIZON);
      game.draw.rect(0, y, W, 3 + 6 * (y - HORIZON) / (H - HORIZON), '#5a3d2e', 0.7);
    }
    // 左右の織機の柱
    game.draw.rect(0, HORIZON, 50, H - HORIZON, '#4a3226');
    game.draw.rect(W - 50, HORIZON, 50, H - HORIZON, '#4a3226');
    game.draw.rect(0, 0, W, H, '#e9c46a', 0.03 + 0.02 * Math.sin(t * 1.9));
  }

  function drawWalls() {
    for (var w = walls.length - 1; w >= 0; w--) {
      var wl = walls[w];
      var y = screenY(wl.at);
      if (y < HORIZON - 20 || y > H + 80) continue;
      var sc = depthScale(y);
      var th = 36 * sc;
      if (wl.broken) {
        for (var b = 0; b < 6; b++) game.draw.rect(100 + b * 160, y - th + Math.sin(b) * 20, 80 * sc, th * 0.6, '#7a5236', 0.7);
        continue;
      }
      var xs = [50];
      var ops = wl.ops.slice().sort(function (p, q) { return p.x - q.x; });
      for (var o = 0; o < ops.length; o++) xs.push(ops[o].x - ops[o].w / 2, ops[o].x + ops[o].w / 2);
      xs.push(W - 50);
      game.draw.rect(0, y + th * 0.4, W, th * 0.5, '#000000', 0.25);
      for (var s = 0; s < xs.length; s += 2) {
        var x0 = xs[s], x1 = xs[s + 1];
        if (x1 <= x0) continue;
        game.draw.rect(x0, y - th * 2.4, x1 - x0, th * 2.4, '#8a5a3b');
        game.draw.rect(x0, y - th * 2.4, x1 - x0, th * 0.5, '#b07a4f');
        // 張られた糸
        for (var ln = 0; ln < 4; ln++) game.draw.line(x0, y - th * (0.5 + ln * 0.45), x1, y - th * (0.5 + ln * 0.45), ['#e76f51', '#2a9d8f', '#e9c46a', '#fdf6e3'][ln], 3 * sc);
      }
      // 次に来る枠の隙間を点滅で予告
      if (y < RUN_Y && y > RUN_Y - 700 && Math.floor(game.time.elapsed * 6) % 2 === 0) {
        for (var g = 0; g < ops.length; g++) game.draw.rect(ops[g].x - ops[g].w / 2 + 10, y - 6, ops[g].w - 20, 8, '#fdf6e3', 0.6);
      }
    }
    for (var sI = 0; sI < spools.length; sI++) {
      var sp = spools[sI];
      if (sp.got) continue;
      var sy = screenY(sp.at);
      if (sy < HORIZON || sy > H) continue;
      var ss = depthScale(sy);
      game.draw.circle(sp.x, sy + 10, 26 * ss, '#000000', 0.25);
      game.draw.sprite(SPOOL, { k: '#8a5a3b', t: STYLE.accent[0] }, sp.x, sy - 30 * ss, 12 * ss, { anchor: 'center' });
    }
    var doorY = screenY(DIST);
    if (doorY > HORIZON - 40) game.draw.sprite(DOOR, { k: '#3d2c2e', d: '#8a5a3b', l: '#ffe9a8' }, W * 0.5, doorY - 90 * depthScale(doorY), 30 * depthScale(doorY), { anchor: 'center' });
  }

  function drawRunner() {
    var t = game.time.elapsed;
    var art = Math.floor(runner.step / 90) % 2 === 0 ? RUNNER_A : RUNNER_B;
    var bob = stun > 0 ? Math.sin(t * 40) * 6 : Math.abs(Math.sin(runner.step / 60)) * -14;
    game.draw.circle(runner.x, RUN_Y + 8, 46, '#000000', 0.3);
    game.draw.sprite(art, RUNNER_PAL, runner.x, RUN_Y - 60 + bob, 15, { anchor: 'center', alpha: stun > 0 && Math.floor(t * 16) % 2 ? 0.5 : 1 });
  }

  function drawBall() {
    var t = game.time.elapsed;
    var cy = RUN_Y + 150 + gap * 0.9;
    var R = 430;
    if (cy - R > H) return;
    game.draw.circle(W * 0.5, cy + 30, R + 20, '#000000', 0.25);
    game.draw.circle(W * 0.5, cy, R, '#c0392b');
    game.draw.circle(W * 0.5 - 90, cy - 120, R * 0.55, '#d9534f', 0.6);
    // 転がる毛糸の筋
    for (var i = 0; i < 9; i++) {
      var a = ballRot + i * 0.7;
      var off = Math.sin(a) * R * 0.85;
      game.draw.line(W * 0.5 - R * 0.8, cy + off * 0.6, W * 0.5 + R * 0.8, cy + off, '#8e2a20', 10);
    }
    if (gap < 260) {
      var p = 0.5 + 0.5 * Math.sin(t * 18);
      game.draw.rect(0, H - 60, W, 60, STYLE.accent[0], 0.4 * p);
    }
  }

  function drawFreeze() {
    if (!freeze) return;
    var a = 0.5 + 0.5 * Math.sin(freeze.t * 40);
    game.draw.circle(freeze.x, freeze.y, 90 + (0.5 - freeze.t) * 240, '#ffffff', 0.35 * a);
  }

  function drawHud() {
    var pr = Math.min(1, dist / DIST);
    var bw = W - 160;
    game.draw.rect(80, H * 0.04, bw, 26, '#000000', 0.45);
    game.draw.rect(80, H * 0.04, bw * pr, 26, STYLE.accent[1]);
    game.draw.sprite(RUNNER_A, RUNNER_PAL, 80 + bw * pr, H * 0.04 + 13, 5, { anchor: 'center' });
    game.draw.circle(80 + bw * Math.max(0, pr - gap / DIST), H * 0.04 + 13, 20, '#c0392b');
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, H * 0.068, bw * Math.max(0, timeLeft / TIME_LIMIT), 10, low ? STYLE.accent[0] : STYLE.main[0]);
    txt('SCORE ' + score, W * 0.25, H * 0.1, 36, STYLE.main[1]);
    txt(passed + ' / ' + walls.length, W * 0.75, H * 0.1, 36, STYLE.main[1]);
  }

  function drawOutcome() {
    game.draw.rect(0, H * 0.32, W, H * 0.25, STYLE.main[2], 0.75);
    txt(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.38, 96, won ? STYLE.main[0] : STYLE.accent[0]);
    txt('SCORE ' + score, W * 0.5, H * 0.45, 50, STYLE.main[1]);
    if (!won) txt('あと' + Math.max(1, Math.ceil((DIST - dist) / 60)) + 'm!', W * 0.5, H * 0.51, 48, STYLE.main[0]);
    else if (score > game.best) txt('NEW RECORD', W * 0.5, H * 0.51, 48, STYLE.main[0]);
    else txt('BEST ' + game.best, W * 0.5, H * 0.51, 44, STYLE.main[1]);
  }

  // ── ATTRACT ゴースト実演 ───────────────────────────────
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.82, cycle: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || !walls || demoCaught || dist > 3400) {
      if (!(demo.t <= dt)) demo.cycle++;
      demoCaught = false;
      initGame();
      ready = 0;
      gap = 520;
    }
    var next = null;
    for (var w = 0; w < walls.length; w++) if (walls[w].at > dist) { next = walls[w]; break; }
    if (!next) return;
    var best = next.ops[0];
    for (var o = 1; o < next.ops.length; o++) if (Math.abs(next.ops[o].x - runner.x) < Math.abs(best.x - runner.x)) best = next.ops[o];
    var aim = best.x;
    // 2つ目の枠は1周おきにわざと枠へ突っ込み、足止め→玉が迫る因果を見せる
    if (walls.indexOf(next) === 1 && demo.cycle % 2 === 0) aim = best.x > W * 0.5 ? best.x - best.w : best.x + best.w;
    if (next.at - dist < 700) tx = aim;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 8);
    demo.gy = H * 0.82;
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ended) return;
    tx = x;
    game.audio.play('se_tap', 0.2);
    game.fx.burst(x, Math.max(y, H * 0.75), { color: STYLE.main[1], count: 4, speed: 120 });
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || ended) return;
    tx = x;
    if (Math.random() < 0.1) game.fx.burst(runner.x, RUN_Y + 10, { color: '#d9b38c', count: 2, speed: 80 });
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepWorld(dt, true);
      drawBg();
      drawWalls();
      drawRunner();
      drawBall();
      drawFreeze();
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 13 });
      txt(GAME_TITLE, W * 0.5, H * 0.07, 96, STYLE.main[0]);
      txt('HI-SCORE ' + game.best, W * 0.5, H * 0.125, 40, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W * 0.5, H * 0.72, 50, STYLE.main[0]);
      else txt('INSERT COIN', W * 0.5, H * 0.72, 42, STYLE.main[1]);
      return;
    }
    if (state === S.RESULT) {
      drawBg();
      drawWalls();
      drawRunner();
      drawBall();
      drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W * 0.5, H * 0.72, 40, STYLE.main[1]);
      return;
    }
    if (ended) {
      endWait -= dt;
      drawBg();
      drawWalls();
      drawRunner();
      drawBall();
      drawHud();
      drawOutcome();
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { meters: Math.round(dist / 60), frames: passed, spools: spoolN };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
      return;
    }
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      if (!freeze) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          freeze = { t: 0.4, x: runner.x, y: RUN_Y - 60, done: function () {
            game.feedback.bad(runner.x, RUN_Y - 100, { text: 'TIME UP' });
            endGame(false);
          } };
        }
      }
      stepWorld(dt, false);
    }
    drawBg();
    drawWalls();
    drawRunner();
    drawBall();
    drawFreeze();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.4, 110, STYLE.main[0]);
  });

  game.onStart(function () {
    game.audio.melody(
      [['D5', 0.5], ['D5', 0.5], ['F5', 0.5], ['D5', 0.5], ['G5', 0.5], ['F5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 1.5]],
      { tempo: 176, wave: 'square', volume: 0.045, loop: true, bass: [['D3', 1], ['D3', 1], ['A2', 1], ['A2', 1], ['Bb2', 1], ['Bb2', 1], ['A2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
