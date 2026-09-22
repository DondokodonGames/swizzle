// K-X-0018-pulse-track-sprint.js
// 鼓動トンネル疾走 — 流れる曲の拍に合わせて生成されるゲートを、空いたレーンへ指を寄せて駆け抜ける
// 操作: 3本のレーンのうち、迫るゲートで塞がれていないレーンへ指を押さえたまま寄せて走らせ続ける
// 終わり: 10個のゲートを塞がれず抜ければ成功。2回塞がれたレーンに突っ込めば失敗
// @mechanic: dodge
// @theme: pulse_tunnel_sprint
// 世界観: 曲の鼓動そのものが壁を生み出す光のトンネル。拍ごとに生成されるゲートの空きレーンだけを縫って駆け抜けるランナー
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けたゲート数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で
  var C = {
    bg: '#0a1428', bg2: '#04081a', tunnel: '#122040', tunnelEdge: '#1e3a68',
    gateTop: '#3ad0ff', gateLeft: '#1a8ac0', gateRight: '#0e5a88',
    runner: '#ffd23f', runnerDark: '#a87c10',
    good: '#3dffa0', bad: '#ff3d5a', gold: '#ffd400', white: '#eef6ff', ink: '#040a14',
  };

  var GAME_TITLE = 'PULSE TUNNEL';
  var TEMPO = 132;
  var INTERVAL = (60 / TEMPO) * 4;
  var LANE_X = [W * 0.28, W * 0.5, W * 0.72];
  var RY = H * 0.72, TOP_Y = H * 0.20;
  var FALL_T = 1.05;
  var TOTAL = 10;
  var LIVES = 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_SPR = ['..##..', '.####.', '######', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(LANE_X[0] - 130, TOP_Y - 40, LANE_X[2] - LANE_X[0] + 260, RY - TOP_Y + 140, C.tunnel, 0.5);
    for (var i = 0; i < 3; i++) game.draw.line(LANE_X[i] - 90, TOP_Y - 40, LANE_X[i] - 90, RY + 90, C.tunnelEdge, 3);
    game.draw.line(LANE_X[2] + 90, TOP_Y - 40, LANE_X[2] + 90, RY + 90, C.tunnelEdge, 3);
    game.draw.line(LANE_X[0] - 130, RY + 60, LANE_X[2] + 130, RY + 60, C.tunnelEdge, 6);
  }

  var runnerLane, runnerX, gates, cleared, misses, spawnT, done, endWait, finished, ready, hitStop, shake, nextMilestone;

  function drawVoxel(cx, cy, w, h, topC, sideC) {
    game.draw.rect(cx - w / 2, cy, w, h, sideC);
    game.draw.rect(cx - w / 2, cy - 14, w, 20, topC);
  }

  function newGate() {
    var blockCount = cleared >= 5 && Math.random() < 0.4 ? 2 : 1;
    var lanes = [0, 1, 2];
    var blocked = [];
    for (var i = 0; i < blockCount; i++) {
      var idx = Math.floor(Math.random() * lanes.length);
      blocked.push(lanes[idx]); lanes.splice(idx, 1);
    }
    return { blocked: blocked, r: 0, resolved: false, telegraphed: false };
  }

  function initGame() {
    runnerLane = 1; runnerX = LANE_X[1]; gates = []; cleared = 0; misses = 0; spawnT = 0.7;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; nextMilestone = 5;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function laneOf(x) {
    var best = 0, bd = 1e9;
    for (var i = 0; i < 3; i++) { var d = Math.abs(x - LANE_X[i]); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { runnerLane = laneOf(x); game.audio.play('se_tap', 0.06); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) runnerLane = laneOf(x); });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function stepPhysics(dt) {
    runnerX += (LANE_X[runnerLane] - runnerX) * Math.min(1, dt * 9);
    spawnT -= dt;
    if (spawnT <= 0 && gates.length < 3) { gates.push(newGate()); spawnT = INTERVAL; }
    for (var i = gates.length - 1; i >= 0; i--) {
      var g = gates[i];
      g.r += dt / FALL_T;
      if (!g.telegraphed && g.r > 0.4) { g.telegraphed = true; game.audio.play('se_tap', 0.08); }
      if (!g.resolved && g.r >= 1) {
        g.resolved = true;
        if (g.blocked.indexOf(runnerLane) !== -1) {
          misses++;
          hitStop = 0.26; shake = 0.24;
          game.feedback.bad(runnerX, RY, { text: 'HIT' });
          game.audio.play('se_bad', 0.4);
          if (misses >= LIVES) { ok = false; finished = true; finish(); return; }
        } else {
          cleared++;
          hitStop = 0.04;
          game.feedback.good(runnerX, RY, { text: '', color: C.good, count: 6 });
          game.audio.play('se_good', 0.22);
          if (cleared >= nextMilestone && nextMilestone < TOTAL) {
            game.fx.popup(cleared + ' / ' + TOTAL, LANE_X[1], RY - 300, { color: C.gold, size: 34 });
            game.audio.play('se_milestone', 0.35);
            nextMilestone += 5;
          }
          if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
        }
      }
      if (g.r > 1.3) gates.splice(i, 1);
    }
  }

  function gateY(r) { return TOP_Y + (RY - TOP_Y) * r; }

  function drawGates() {
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      var y = gateY(Math.min(1, g.r));
      var soon = g.telegraphed && g.r < 1;
      var blink = soon && Math.floor(game.time.elapsed * 12) % 2 === 0;
      for (var l = 0; l < 3; l++) {
        if (g.blocked.indexOf(l) === -1) continue;
        drawVoxel(LANE_X[l], y - 45, 130, 90, blink ? C.bad : C.gateTop, blink ? '#8a1830' : C.gateLeft);
      }
    }
  }

  function drawRunner() {
    game.draw.circle(runnerX, RY + 50, 55, '#00000025');
    game.draw.sprite(RUNNER_SPR, { '#': (finished && !ok) ? C.bad : C.runner }, runnerX, RY, 18, { anchor: 'center' });
  }

  var demo = { t: 0, gx: LANE_X[1], gy: RY + 160, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) {
      runnerLane = 1; runnerX = LANE_X[1]; gates = []; cleared = 0; misses = 0; spawnT = 0.6;
    }
    demo.press = true;
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (!g.resolved && g.r > 0.35 && g.blocked.indexOf(runnerLane) !== -1) {
        var open = [0, 1, 2].filter(function(l) { return g.blocked.indexOf(l) === -1; });
        runnerLane = open[0];
      }
    }
    demo.gx = LANE_X[runnerLane];
    stepPhysics(dt);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gates === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGates();
      drawRunner();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGates();
      drawRunner();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '個!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL, misses: misses });
        else game.end.failure({ cleared: cleared, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPhysics(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawGates();
    drawRunner();

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    for (var m = 0; m < LIVES; m++) game.draw.circle(W - 50 - m * 32, 190, 9, m < misses ? C.bad : '#ffffff30');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.3]], { tempo: TEMPO, wave: 'square', volume: 0.06, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
