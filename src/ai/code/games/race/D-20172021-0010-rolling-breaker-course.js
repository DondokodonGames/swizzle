// D-20172021-0010-rolling-breaker-course.js
// ローリング・ブレイカー・コース — 転がる球を3レーンで操り、砕ける障害物へ体当たりしながら坑道を駆け抜ける
// 操作: 前方に迫る障害物を見て、砕けるものへは体当たりするレーンを、避けるべき障害物は別レーンをタップして移す
// 終わり: 規定距離を走破すれば成功。危険な障害物に3回当たると失敗
// @mechanic: camera_run
// @theme: mining_rolling_breaker
// 世界観: 崩落しかけた坑道を転がり抜ける採掘ドローンが、砕ける鉱石には体当たりし、支柱だけは避けながら出口を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 砕いた鉱石数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺グラデ+疑似グロー、点滅が命
  var C = {
    bg1: '#0a0a2a', bg2: '#1a0a3a', lane: '#2a1a5a', laneLine: '#5a3aff',
    ore: '#ffd400', oreGlow: '#fff29a', pillar: '#ff2a6a', pillarGlow: '#ff9ac0',
    ball: '#3affea', ballDark: '#0a8a8a',
    good: '#39ffb0', bad: '#ff2a6a', gold: '#ffd400', ink: '#ffffff', white: '#ffffff',
  };

  var GAME_TITLE = 'BREAKER RUN';
  var LANES = [W * 0.24, W * 0.5, W * 0.76];
  var GATE_GAP = 1.55;
  var GATE_COUNT = 10;
  var MAX_HIT = 3;
  var SPEED_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#050515', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BALL_SPR = ['.##.', '####', '####', '.##.'];
  var ORE_SPR = ['.##.', '####', '.##.'];
  var PILLAR_SPR = ['####', '####', '####'];

  function bg(dist) {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.laneLine, pulse * 0.4);
    for (var i = 0; i < LANES.length + 1; i++) {
      var lx = W * 0.1 + i * (W * 0.8) / LANES.length;
      game.draw.line(lx, 0, lx, H, C.laneLine, 4);
    }
    var scroll = (dist * 240) % 120;
    for (var s = -1; s < 8; s++) {
      game.draw.rect(0, s * 120 - scroll, W, 4, C.laneLine, 0.25);
    }
  }

  var gates, dist, hits, broken, ballX, ballLane;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function buildGates() {
    var arr = [];
    for (var i = 0; i < GATE_COUNT; i++) {
      var oreLane = Math.floor(Math.random() * 3);
      var pillarLanes = [];
      for (var l = 0; l < 3; l++) if (l !== oreLane && Math.random() < 0.55) pillarLanes.push(l);
      arr.push({ z: i * GATE_GAP + 1.2, oreLane: oreLane, pillarLanes: pillarLanes, resolved: false });
    }
    return arr;
  }

  function initGame() {
    gates = buildGates();
    dist = 0; hits = 0; broken = 0; ballLane = 1; ballX = LANES[1];
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function laneY(z) { return H * 0.86 - (z - dist) * SPEED_Y; }

  function drawScene() {
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      var y = laneY(g.z);
      if (y < -80 || y > H * 1.05) continue;
      for (var l = 0; l < 3; l++) {
        if (l === g.oreLane && !g.resolved) {
          var glow = 0.5 + 0.3 * Math.sin(game.time.elapsed * 6);
          game.draw.circle(LANES[l], y, 46, C.oreGlow, glow * 0.4);
          game.draw.sprite(ORE_SPR, { '#': C.ore }, LANES[l], y, 20, { anchor: 'center' });
        } else if (g.pillarLanes.indexOf(l) >= 0) {
          game.draw.sprite(PILLAR_SPR, { '#': C.pillar }, LANES[l], y, 20, { anchor: 'center' });
        }
      }
    }
    ballX = LANES[ballLane];
    var by = H * 0.86;
    game.draw.sprite(BALL_SPR, { '#': C.ball }, ballX, by, 24, { anchor: 'center' });
    game.draw.circle(ballX, by + 40, 30, C.ballDark, 0.4);
  }

  function moveLane(newLane) {
    if (finished || ready > 0) return;
    ballLane = Math.max(0, Math.min(2, newLane));
    game.audio.play('se_tap', 0.1);
    game.fx.burst(LANES[ballLane], H * 0.86, { color: C.ball, count: 6, speed: 180 });
  }

  function resolveGate(g) {
    g.resolved = true;
    if (g.oreLane === ballLane) {
      broken++;
      game.feedback.good(LANES[ballLane], H * 0.7, { text: 'BREAK', color: C.good });
      game.fx.burst(LANES[ballLane], H * 0.7, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_break', 0.4);
      if (!halfCalled && broken >= Math.ceil(GATE_COUNT / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', LANES[ballLane], H * 0.5, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
    } else if (g.pillarLanes.indexOf(ballLane) >= 0) {
      hits++;
      hitStop = 0.25; shake = 0.2;
      game.feedback.bad(LANES[ballLane], H * 0.7, { text: 'HIT' });
      game.audio.play('se_bad', 0.35);
      if (hits >= MAX_HIT) {
        ok = false; finished = true; hitStop = 0.35; shake = 0.3;
        finish();
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      if (x < W * 0.34) moveLane(0);
      else if (x > W * 0.66) moveLane(2);
      else moveLane(1);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LANES[1], gy: H * 0.9, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var total = GATE_COUNT * GATE_GAP + 1.5;
    var cyc = demo.t % total;
    if (cyc < dt || demo.t <= dt) resetDemo();
    ready = 0;
    dist = cyc;
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (!g.resolved && g.z - dist < 0.15 && g.z - dist > -0.1) {
        ballLane = g.oreLane;
        demo.gx = LANES[ballLane]; demo.gy = H * 0.9; demo.press = true;
      }
      if (!g.resolved && g.z <= dist) resolveGate(g);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gates === undefined) initGame();
      bg(dist);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(dist);
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(broken + ' ORE', W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, GATE_COUNT - Math.floor(dist / GATE_GAP)) + 'm!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(broken, { broken: broken, hits: hits });
        else game.end.failure({ broken: broken, hits: hits });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      dist += dt;
      for (var i = 0; i < gates.length; i++) {
        var g = gates[i];
        if (!g.resolved && g.z <= dist) resolveGate(g);
      }
      if (!finished && dist >= gates[gates.length - 1].z + 0.3) {
        ok = true; finished = true; hitStop = 0.3;
        game.feedback.good(ballX, H * 0.5, { text: 'CLEAR', color: C.good });
        game.fx.burst(ballX, H * 0.5, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(dist);
    drawScene();

    txt(broken + ' / ' + GATE_COUNT, W / 2, H * 0.06, 30, C.white);
    var pct = Math.max(0, Math.min(1, dist / (gates ? gates[gates.length - 1].z + 0.3 : 1)));
    game.draw.rect(60, 150, W - 120, 16, '#ffffff', 0.2);
    game.draw.rect(60, 150, (W - 120) * pct, 16, C.gold);
    txt('HITS ' + hits + '/' + MAX_HIT, W / 2, H * 0.19, 20, hits > 0 ? C.bad : C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.15], ['E3', 0.15], ['G3', 0.15], ['B3', 0.3]], { tempo: 150, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
