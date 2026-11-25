// D-20172021-0085-hue-gate-runner.js
// ヒューゲート・ランナー — 3レーンに分岐するゲートが迫る中、自分の色と同じレーンへ素早くスワイプして走り抜ける
// 操作: 迫ってくるゲートの3色配置を見て、自分の色と同じレーンへ左右スワイプでレーン移動する
// 終わり: 規定数のゲートを正しい色のレーンで通過すれば成功。誤ったレーンで通過/timeoutが1回でもあれば失敗
// @mechanic: swipe_direction
// @theme: color_tagged_courier_run
// 世界観: 色タグ付き配送ランナーが、次々に現れる三色ゲートの中から自分のタグ色と同じレーンだけを選んで駆け抜け、荷札の色を汚さず配送ラインを走り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過したゲート数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めの原色、太い白縁取り、丸いポップな形
  var C = {
    bg: '#1c3a6e', bg2: '#0f2450', road: '#274a86', roadEdge: '#ffffff',
    laneA: '#ff3d6e', laneB: '#ffd23d', laneC: '#3dd6ff',
    runner: '#ffffff', runnerTag: '#ff3d6e',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffd23d', ink: '#0a1730', white: '#ffffff',
  };
  var LANE_COLORS = [C.laneA, C.laneB, C.laneC];

  var GAME_TITLE = 'HUE GATE RUN';
  var TOTAL = 6;
  var GATE_PERIOD = 1.55;
  var LEAD = 1.1; // ゲートが上から出てから判定ラインに届くまでの秒数
  var LANE_X = [W * 0.28, W * 0.5, W * 0.72];
  var RUNNER_Y = H * 0.74;
  var GATE_TOP_Y = H * 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_SPRITE = ['.#.', '###', '.#.', '#.#'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffd23d', pulse * 0.4);
    game.draw.rect(LANE_X[0] - 130, GATE_TOP_Y - 40, 3 * 130 * 2, H * 0.62, C.road, 0.6);
    for (var i = -2; i < 8; i++) {
      var yy = ((game.time.elapsed * 260 + i * 140) % (H * 0.7)) + GATE_TOP_Y - 40;
      game.draw.line(LANE_X[0] - 195, yy, LANE_X[0] - 195, yy + 40, C.roadEdge, 6, 0.3);
      game.draw.line(LANE_X[2] + 195, yy, LANE_X[2] + 195, yy + 40, C.roadEdge, 6, 0.3);
    }
  }

  var laneIdx, laneTargetIdx, laneAnimX, tagColorIdx;
  var gates; // {y, colors[3], resolved}
  var spawnClock, passed, done, endWait, finished, ready, hitStop, shake, nextSpawn;

  function shuffledColors(correctIdx) {
    var order = [0, 1, 2];
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
    return order;
  }

  function spawnGate() {
    var correctLane = Math.floor(game.random(0, 3));
    var colorOrder = shuffledColors(correctLane);
    var colors = [0, 0, 0];
    // 自分のタグ色を必ずどこか1レーンに置く。残りはタグ色以外からランダム。
    var slots = [0, 1, 2];
    var tagSlot = slots[Math.floor(game.random(0, 3))];
    for (var i = 0; i < 3; i++) {
      if (i === tagSlot) colors[i] = tagColorIdx;
      else {
        var c;
        do { c = Math.floor(game.random(0, 3)); } while (c === tagColorIdx);
        colors[i] = c;
      }
    }
    gates.push({ y: GATE_TOP_Y, colors: colors, resolved: false, correctSlot: tagSlot });
  }

  function initGame() {
    laneIdx = 1; laneTargetIdx = 1; laneAnimX = LANE_X[1];
    tagColorIdx = 0; // 常にlaneA色(赤)をタグ色とする
    gates = []; spawnClock = 0; nextSpawn = 0.4; passed = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function moveLane(dir) {
    if (dir === 'left') laneTargetIdx = Math.max(0, laneTargetIdx - 1);
    else if (dir === 'right') laneTargetIdx = Math.min(2, laneTargetIdx + 1);
    game.audio.play('se_tap', 0.15);
  }

  function drawGates() {
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      var barH = 46;
      for (var l = 0; l < 3; l++) {
        game.draw.rect(LANE_X[l] - 95, g.y - barH / 2, 190, barH, LANE_COLORS[g.colors[l]], l === g.correctSlot ? 0.95 : 0.55);
      }
      game.draw.rect(LANE_X[0] - 95, g.y - barH / 2, 3 * 190, 6, C.white, 0.4);
    }
  }

  function drawRunner() {
    var bob = Math.sin(game.time.elapsed * 9) * 6;
    game.draw.circle(laneAnimX, RUNNER_Y + 34, 40, LANE_COLORS[tagColorIdx], 0.9);
    game.draw.sprite(RUNNER_SPRITE, { '#': C.runner }, laneAnimX, RUNNER_Y + bob, 22, { anchor: 'center' });
  }

  function checkGatePass(g) {
    if (g.colors[laneIdx] === tagColorIdx) {
      passed++;
      game.feedback.good(laneAnimX, RUNNER_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (passed === Math.ceil(TOTAL / 2)) game.fx.popup('あと' + (TOTAL - passed) + '!', W * 0.5, H * 0.32, { color: C.gold, size: 34 });
      if (passed >= TOTAL) {
        ok = true; finished = true; hitStop = 0.25;
        game.fx.burst(laneAnimX, RUNNER_Y, { color: C.gold, count: 22, speed: 400 });
        finish();
      }
    } else {
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(laneAnimX, RUNNER_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (dir === 'left' || dir === 'right') moveLane(dir);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function tickGates(dt) {
    var speed = (H * 0.52 - GATE_TOP_Y) / LEAD;
    for (var i = gates.length - 1; i >= 0; i--) {
      var g = gates[i];
      g.y += speed * dt;
      if (!g.resolved && g.y >= RUNNER_Y) {
        g.resolved = true;
        checkGatePass(g);
        gates.splice(i, 1);
        break;
      } else if (g.y > H + 100) {
        gates.splice(i, 1);
      }
    }
    spawnClock += dt;
    if (spawnClock >= nextSpawn && !finished) {
      spawnClock = 0; nextSpawn = GATE_PERIOD;
      spawnGate();
    }
  }

  var demo = { t: 0, gx: LANE_X[1], gy: RUNNER_Y - 260, press: false };
  function resetDemo() {
    initGame();
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    tickGatesDemo(dt);
    laneAnimX += (LANE_X[laneIdx] - laneAnimX) * Math.min(1, dt * 8);
    demo.gx = laneAnimX; demo.gy = RUNNER_Y - 90;
    demo.press = false;
  }
  function tickGatesDemo(dt) {
    var speed = (H * 0.52 - GATE_TOP_Y) / LEAD;
    for (var i = gates.length - 1; i >= 0; i--) {
      var g = gates[i];
      g.y += speed * dt;
      if (!g.resolved && g.y >= RUNNER_Y - 220 && g.y < RUNNER_Y - 200) {
        // 先読みしてレーン移動を予告(demo hand)
        laneTargetIdx = g.correctSlot;
        demo.press = true;
      }
      if (!g.resolved && g.y >= RUNNER_Y) {
        g.resolved = true;
        laneIdx = laneTargetIdx;
        if (g.colors[laneIdx] === tagColorIdx) {
          passed++;
          game.feedback.good(laneAnimX, RUNNER_Y, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.2);
        }
        gates.splice(i, 1);
        break;
      } else if (g.y > H + 100) {
        gates.splice(i, 1);
      }
    }
    spawnClock += dt;
    if (spawnClock >= nextSpawn) { spawnClock = 0; nextSpawn = GATE_PERIOD; spawnGate(); }
  }

  game.onUpdate(function(dt) {
    laneAnimX += (LANE_X[laneTargetIdx] - laneAnimX) * Math.min(1, dt * 10);
    if (state !== S.ATTRACT) laneIdx = laneTargetIdx;

    if (state === S.ATTRACT) {
      if (gates === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGates();
      drawRunner();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGates();
      drawRunner();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + 'ゲート!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { gates: passed, total: TOTAL });
        else game.end.failure({ gates: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickGates(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGates();
    drawRunner();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#0a1730', 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.18], ['E5', 0.18], ['G5', 0.18], ['C6', 0.36]], { tempo: 168, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
