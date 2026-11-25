// D-20172021-0096-fork-shortcut-dash.js
// フォークショートカットダッシュ — 分岐する路地を駆け抜け、通せんぼの無い側へスワイプして他走者を出し抜く
// 操作: 前方の分岐に障害物が見えた側と逆へスワイプして開いている車線へ移る
// 終わり: 他の3走者より前でゴールすれば成功。障害物に突っ込みすぎて最後尾になれば失敗
// @mechanic: swipe_direction
// @theme: alley_fork_courier_dash
// 世界観: 路地裏配達レースの俊足配達員が、次々現れる分岐で通行止めの無い車線を見極め、ライバル配達員を追い抜いてゴールを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく選べた分岐数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めの3色+白アクセント、太い輪郭
  var C = {
    bg: '#ff9a3d', bg2: '#ff5f6d', road: '#3a3a52', roadLine: '#ffe14d',
    runner: '#00c2ff', runnerDark: '#0077a8', rival: '#ff4d9e', rivalDark: '#a80063',
    block: '#2b2b3a', blockWarn: '#ffd400',
    good: '#3df08a', bad: '#ff4d5e', gold: '#ffe14d', white: '#ffffff', ink: '#241738',
  };

  var GAME_TITLE = 'FORK DASH';
  var LANE_X = [W * 0.32, W * 0.68];
  var RUNNER_Y = H * 0.78;
  var GATE_START_Y = H * 0.24;
  var TOTAL_GATES = 5;
  var GATE_TRAVEL = 1.35;     // s per gate approach
  var TELEGRAPH_LEAD = 0.6;   // s before arrival that block appears

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#1a0f28', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '..#.'],
  ];
  var RIVAL_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '..#.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.4);
    game.draw.rect(0, H * 0.1, W, H * 0.8, C.road);
    for (var i = 0; i < 2; i++) {
      game.draw.rect(LANE_X[i] - 4, H * 0.1, 8, H * 0.8, C.roadLine, 0.4);
    }
    game.draw.line(W * 0.5, H * 0.1, W * 0.5, H * 0.9, C.roadLine, 4);
  }

  var lane, blockLane, gateIdx, gateT, awaitingInput, gateResolved;
  var correctCount, wrongCount;
  var rivalProg; // array of 3 progress 0..1
  var playerProg;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function newGate() {
    blockLane = Math.random() < 0.5 ? 0 : 1;
    gateT = 0; gateResolved = false; awaitingInput = false;
  }

  function initGame() {
    lane = 0; gateIdx = 0; correctCount = 0; wrongCount = 0;
    playerProg = 0; rivalProg = [0, 0, 0]; milestoneShown = false;
    newGate();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function resolveGate(chosenLane) {
    if (gateResolved) return;
    gateResolved = true;
    var f = Math.floor(game.time.elapsed * 10) % RUNNER_F.length;
    if (chosenLane === blockLane) {
      wrongCount++;
      playerProg += 0.10;
      hitStop = 0.22; shake = 0.18;
      game.feedback.bad(LANE_X[chosenLane], RUNNER_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
    } else {
      correctCount++;
      playerProg += 0.22;
      game.feedback.good(LANE_X[chosenLane], RUNNER_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.4);
      if (correctCount === Math.ceil(TOTAL_GATES / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('GOOD!', W / 2, RUNNER_Y - 200, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.35);
      }
    }
    for (var r = 0; r < 3; r++) rivalProg[r] += (Math.random() < 0.55 ? 0.20 : 0.08);
  }

  game.onSwipe(function(dir) {
    if (state === S.PLAYING && ready <= 0 && !finished && awaitingInput) {
      var target = dir === 'left' ? 0 : dir === 'right' ? 1 : lane;
      lane = target;
      game.audio.play('se_tap', 0.15);
      resolveGate(target);
    }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function advanceGates(dt) {
    gateT += dt;
    awaitingInput = gateT >= GATE_TRAVEL - TELEGRAPH_LEAD && gateT < GATE_TRAVEL && !gateResolved;
    if (gateT >= GATE_TRAVEL) {
      if (!gateResolved) resolveGate(lane); // no input = counted as staying in current (likely blocked)
      gateIdx++;
      if (gateIdx >= TOTAL_GATES) {
        var rank = 1;
        for (var r = 0; r < 3; r++) if (rivalProg[r] > playerProg) rank++;
        ok = rank <= 2;
        finished = true; hitStop = 0.25;
        if (ok) {
          game.fx.burst(W / 2, RUNNER_Y, { color: C.gold, count: 22, speed: 400 });
          game.audio.play('se_success', 0.5);
        } else {
          game.audio.play('se_failure', 0.4);
        }
        finish();
      } else {
        newGate();
      }
    }
  }

  function drawScene(lLane, prog, rProg, gT, bLane, showBlockWarn) {
    for (var r = 0; r < 3; r++) {
      var ry = RUNNER_Y - (rProg[r] - prog) * H * 0.4;
      ry = Math.max(H * 0.16, Math.min(H * 0.9, ry));
      var rx = LANE_X[(r % 2)] + (r === 2 ? (LANE_X[1] - LANE_X[0]) * 0.5 : 0);
      var f = Math.floor(game.time.elapsed * 8 + r) % RIVAL_F.length;
      game.draw.sprite(RIVAL_F[f], { '#': C.rival }, rx, ry, 12, { anchor: 'center' });
    }
    var gy = GATE_START_Y + (gT / GATE_TRAVEL) * (RUNNER_Y - GATE_START_Y - 40);
    if (showBlockWarn) {
      var flash = Math.floor(game.time.elapsed * 8) % 2 === 0;
      game.draw.rect(LANE_X[bLane] - 60, gy - 40, 120, 80, flash ? C.blockWarn : C.block);
      game.draw.rect(LANE_X[bLane] - 60, gy - 40, 120, 12, C.blockWarn, 0.6);
    }
    var f2 = Math.floor(game.time.elapsed * 10) % RUNNER_F.length;
    game.draw.sprite(RUNNER_F[f2], { '#': C.runner }, LANE_X[lLane], RUNNER_Y, 16, { anchor: 'center' });
  }

  var demo = { t: 0, gx: LANE_X[0], gy: H * 0.94, press: false, lane: 0 };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.8;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; }
    else if (!finished) advanceGates(dt);
    var wantLane = blockLane === 0 ? 1 : 0;
    var tx = LANE_X[wantLane], ty = H * 0.94;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 5);
    demo.press = awaitingInput;
    if (awaitingInput && Math.abs(demo.gx - tx) < 8) {
      lane = wantLane;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (playerProg === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(lane, playerProg, rivalProg, gateT, blockLane, awaitingInput);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(lane, playerProg, rivalProg, gateT, blockLane, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(correctCount + ' / ' + TOTAL_GATES, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, TOTAL_GATES - correctCount) + '個!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(correctCount, { correct: correctCount, wrong: wrongCount, total: TOTAL_GATES });
        else game.end.failure({ correct: correctCount, wrong: wrongCount, total: TOTAL_GATES });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      advanceGates(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(lane, playerProg, rivalProg, gateT, blockLane, awaitingInput);

    txt(correctCount + ' / ' + TOTAL_GATES, W / 2, H * 0.06, 30, C.white);
    var pct = gateIdx / TOTAL_GATES;
    game.draw.rect(60, 150, W - 120, 16, '#00000055', 1);
    game.draw.rect(60, 150, (W - 120) * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.2], ['E5', 0.2], ['G5', 0.2], ['C6', 0.4]], { tempo: 168, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
