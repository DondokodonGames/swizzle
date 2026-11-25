// D-20222026-0012-single-bay-exit-drag.js
// シングルベイ・エグジット — 出口をふさぐ1台の車を、両脇の駐車列にぶつけずドラッグで出口へ導く
// 操作: 詰まった車から指を離さず、通路の幅からはみ出さないよう出口ゲートまでなぞって進める
// 終わり: 出口ゲートまで導けば成功。通路の壁(駐車列)に触れる/時間切れで失敗
// @mechanic: guide_path
// @theme: single_bay_exit_drag
// 世界観: 立体駐車場の誘導員が、通路をふさいで動けなくなった1台の車を、両脇の駐車列に触れないよう出口ゲートまで手引きする
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ距離割合
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 低彩度4色、ブロック単位の矩形のみで構成
  var STYLE = {
    bg: ['#274b3f', '#152a22'],
    main: ['#e8c547', '#5aa6d6', '#c65b5b'],
    accent: ['#f4ead0', '#101a15'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    lane: '#1e352c', laneEdge: '#3a5c4c',
    white: STYLE.accent[0], ink: STYLE.accent[1],
    good: '#5fd97f', bad: '#e05656', gold: STYLE.main[0], car: STYLE.main[1], parked: STYLE.main[2],
  };

  var GAME_TITLE = 'BAY EXIT';
  var TIME_LIMIT = 19;
  var LANE_HALF = 84;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000088', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CAR_FRAME = ['.####.', '######', '.#..#.'];
  var PARKED_FRAME = ['.####.', '######'];
  var GUARD_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var NODES = [
    { x: W * 0.24, y: H * 0.24 },
    { x: W * 0.24, y: H * 0.42 },
    { x: W * 0.72, y: H * 0.42 },
    { x: W * 0.72, y: H * 0.6 },
    { x: W * 0.30, y: H * 0.6 },
    { x: W * 0.30, y: H * 0.76 },
  ];
  var SEG_LEN = [], LANE_TOTAL = 0;
  for (var i = 1; i < NODES.length; i++) {
    var dd = Math.hypot(NODES[i].x - NODES[i - 1].x, NODES[i].y - NODES[i - 1].y);
    SEG_LEN.push(dd); LANE_TOTAL += dd;
  }

  var PARKED_SPOTS = [
    { x: W * 0.24 - 160, y: H * 0.24 }, { x: W * 0.24 + 160, y: H * 0.24 },
    { x: W * 0.72 - 160, y: H * 0.42 }, { x: W * 0.72 + 160, y: H * 0.6 },
    { x: W * 0.30 + 160, y: H * 0.76 },
  ];

  var carX, carY, laneProgress, checkpointHit;
  var done, endWait, finished, ready, hitStop, shake, timeLeft;

  function txt2(s) { return s; }

  function projectToLane(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var k = 1; k < NODES.length; k++) {
      var ax = NODES[k - 1].x, ay = NODES[k - 1].y, bx = NODES[k].x, by = NODES[k].y;
      var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
      var len2 = vx * vx + vy * vy;
      var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
      var cx = ax + vx * t, cy = ay + vy * t;
      var dist = Math.hypot(px - cx, py - cy);
      if (dist < best) { best = dist; bestLen = acc + t * SEG_LEN[k - 1]; }
      acc += SEG_LEN[k - 1];
    }
    return { dist: best, len: bestLen };
  }

  function initGame() {
    carX = NODES[0].x; carY = NODES[0].y; laneProgress = 0; checkpointHit = 1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
  }

  function drawLane(prog) {
    for (var k = 1; k < NODES.length; k++) game.draw.line(NODES[k - 1].x, NODES[k - 1].y, NODES[k].x, NODES[k].y, C.lane, LANE_HALF * 2);
    for (var m = 0; m < PARKED_SPOTS.length; m++) {
      var ps = PARKED_SPOTS[m];
      game.draw.rect(ps.x - 46, ps.y - 60, 92, 120, C.parked);
      game.draw.sprite(PARKED_FRAME, { '#': C.ink }, ps.x, ps.y, 12, { anchor: 'center' });
    }
    var acc = 0;
    for (var j = 1; j < NODES.length; j++) {
      var segStart = acc, segEnd = acc + SEG_LEN[j - 1];
      if (prog > segStart) {
        var t = Math.min(1, (prog - segStart) / SEG_LEN[j - 1]);
        var ex = NODES[j - 1].x + (NODES[j].x - NODES[j - 1].x) * t;
        var ey = NODES[j - 1].y + (NODES[j].y - NODES[j - 1].y) * t;
        game.draw.line(NODES[j - 1].x, NODES[j - 1].y, ex, ey, C.gold, 14);
      }
      acc = segEnd;
    }
    var exit = NODES[NODES.length - 1];
    var gateGlow = 0.4 + 0.3 * Math.sin(game.time.elapsed * 4);
    game.draw.rect(exit.x - 70, exit.y - 18, 140, 36, C.good, gateGlow);
  }

  function onDrag(x, y) {
    if (finished || ready > 0) return;
    var r = projectToLane(x, y);
    if (r.dist > LANE_HALF) {
      finished = true; ok = false; hitStop = 0.35; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (r.len > laneProgress) {
      var newCp = Math.min(NODES.length, 1 + Math.floor((r.len / LANE_TOTAL) * (NODES.length - 1) + 0.02));
      if (newCp > checkpointHit) {
        checkpointHit = newCp;
        game.feedback.good(x, y, { text: 'GOOD', color: C.good });
        game.audio.play('se_milestone', 0.3);
        if (checkpointHit === Math.ceil(NODES.length / 2)) game.fx.popup('NICE', x, y - 80, { color: C.gold, size: 32 });
      }
      laneProgress = r.len;
    }
    carX = x; carY = y;
    if (laneProgress >= LANE_TOTAL - 16) {
      finished = true; ok = true; hitStop = 0.3;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 22, speed: 420 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: NODES[0].x, gy: NODES[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) { laneProgress = 0; checkpointHit = 1; }
    var target = Math.min(LANE_TOTAL, (cyc / 3.2) * LANE_TOTAL);
    var acc = 0, px = NODES[0].x, py = NODES[0].y;
    for (var k = 1; k < NODES.length; k++) {
      if (target <= acc + SEG_LEN[k - 1]) {
        var t = SEG_LEN[k - 1] > 0 ? (target - acc) / SEG_LEN[k - 1] : 0;
        px = NODES[k - 1].x + (NODES[k].x - NODES[k - 1].x) * t;
        py = NODES[k - 1].y + (NODES[k].y - NODES[k - 1].y) * t;
        break;
      }
      acc += SEG_LEN[k - 1];
    }
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.2;
    if (target > laneProgress) laneProgress = target;
    checkpointHit = Math.min(NODES.length, 1 + Math.floor((laneProgress / LANE_TOTAL) * (NODES.length - 1) + 0.02));
    carX = px; carY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (laneProgress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawLane(laneProgress);
      game.draw.sprite(CAR_FRAME, { '#': C.car }, carX, carY, 14, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 42, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.14, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLane(laneProgress);
      game.draw.sprite(CAR_FRAME, { '#': C.car }, carX, carY, 14, { anchor: 'center' });
      var pct = Math.round((laneProgress / LANE_TOTAL) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 48, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.19, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round((laneProgress / LANE_TOTAL) * 100);
        if (ok) game.end.success(pct2, { progress: pct2 });
        else game.end.failure({ progress: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.35; shake = 0.2;
        game.feedback.bad(carX, carY, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLane(laneProgress);
    if (!finished) game.draw.sprite(CAR_FRAME, { '#': C.car }, carX, carY, 14, { anchor: 'center' });

    txt(checkpointHit + ' / ' + NODES.length, W / 2, H * 0.06, 28, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#00000044');
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 118, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
