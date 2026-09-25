// D-20172021-0013-collapsing-relay-dash.js
// コラプシング・リレー・ダッシュ — 崩れる関門レーンを縦に避けながら、巨大な振り子の一撃も見切って先頭でゴールする
// 操作: 指を押したまま上下にドラッグしてランナーの高さを操作し、迫る関門の隙間と振り子の軌道を避け続ける
// 終わり: 制限時間まで走り抜ければ成功。関門や振り子に触れると転倒して失敗
// @mechanic: dodge
// @theme: collapsing_relay_dash
// 世界観: 廃線トンネルを舞台にしたリレー走者が、崩落する関門の隙間を縫い、吊り下げられた巨大な振り子をかわしながら独走でゴールを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた関門数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 少色+地平グラデ、横1pxストリップを奥ほど圧縮
  var C = {
    sky1: '#2a1428', sky2: '#5a2a3a', floor1: '#8a4a3a', floor2: '#3a1a1a',
    gate: '#7a5a4a', gateEdge: '#e0c090', pendulum: '#ff3a3a', pendulumGlow: '#ffb0a0', chain: '#c0b090',
    runner: '#39c9ff', runnerDark: '#1a6a9a', rival: '#ffffff',
    good: '#39d67a', bad: '#ff4d5e', gold: '#ffd400', ink: '#fff2e8', white: '#ffffff',
  };

  var GAME_TITLE = 'RELAY DASH';
  var CX = W * 0.24;
  var LANES = [H * 0.30, H * 0.50, H * 0.70];
  var GAP_H = 220;
  var GATE_GAP_T = 1.7;
  var GATE_COUNT = 9;
  var TRAVEL = 1.6;
  var ROUND_LIMIT = 18;
  var PEND_PERIOD = 4.6;
  var PEND_WARN = 0.6;
  var PEND_ACTIVE = 1.3;
  var PEND_R = 78;
  var CHAR_R = 34;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#100810', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUN_FRAMES = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg(rc) {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H * 0.55, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.gradient(H * 0.55, H, [[0, C.floor1], [1, C.floor2]]);
    for (var i = 0; i < 10; i++) {
      var fx = W - ((i * 130 + rc * 260) % (W + 130));
      game.draw.line(fx, H * 0.55, fx * 0.3 + W * 0.35, H, C.floor2, 3);
    }
    // rival ghost silhouette (visual only, no real state)
    var rivalX = W * 0.7 + Math.sin(rc * 1.6) * 40;
    game.draw.circle(rivalX, H * 0.22, 20, C.rival, 0.35);
    txt('RIVAL', rivalX, H * 0.16, 16, C.rival, 'center');
  }

  var gates, charY, dragging, roundClock, cleared, pendActiveT, pendState, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function buildGates() {
    var arr = [];
    for (var i = 0; i < GATE_COUNT; i++) {
      arr.push({ spawnAt: i * GATE_GAP_T + 1.0, laneY: LANES[Math.floor(Math.random() * 3)], passed: false });
    }
    return arr;
  }

  function initGame() {
    gates = buildGates();
    charY = LANES[1]; dragging = false; roundClock = 0; cleared = 0; halfCalled = false;
    pendActiveT = 0; pendState = 'idle';
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function pendulumY(localT) {
    var p = Math.min(1, localT / PEND_ACTIVE);
    return H * 0.26 + (1 - Math.cos(p * Math.PI)) * 0.5 * (H * 0.5);
  }

  function gateX(g) {
    var t = (roundClock - g.spawnAt) / TRAVEL;
    return W * 1.08 - t * (W * 1.08 - CX);
  }

  function drawScene() {
    var runFrame = Math.floor(game.time.elapsed * 10) % 2;
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (roundClock < g.spawnAt || g.passed) continue;
      var gx = gateX(g);
      if (gx < -60 || gx > W + 60) continue;
      game.draw.rect(gx - 22, 0, 44, g.laneY - GAP_H / 2, C.gate);
      game.draw.rect(gx - 22, g.laneY + GAP_H / 2, 44, H - (g.laneY + GAP_H / 2), C.gate);
      game.draw.rect(gx - 22, g.laneY - GAP_H / 2 - 6, 44, 6, C.gateEdge);
      game.draw.rect(gx - 22, g.laneY + GAP_H / 2, 44, 6, C.gateEdge);
    }
    // pendulum
    var pendModT = roundClock % PEND_PERIOD;
    if (pendModT >= PEND_PERIOD - PEND_WARN && pendModT < PEND_PERIOD) {
      var warnA = 0.4 + 0.4 * Math.sin(game.time.elapsed * 12);
      game.draw.rect(CX - 90, 0, 180, H, C.pendulum, warnA * 0.25);
      txt('!', CX, H * 0.12, 40, C.pendulum);
    } else if (pendModT < PEND_ACTIVE) {
      var py = pendulumY(pendModT);
      game.draw.line(CX, 0, CX, py, C.chain, 10);
      game.draw.circle(CX, py, PEND_R, C.pendulumGlow, 0.35);
      game.draw.circle(CX, py, PEND_R * 0.7, C.pendulum);
    }
    game.draw.sprite(RUN_FRAMES[runFrame], { '#': C.runner }, CX, charY, 26, { anchor: 'center' });
  }

  function fail(x, y, label) {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(x, y, { text: label || 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    dragging = true;
    game.audio.play('se_tap', 0.06);
    charY = Math.max(H * 0.18, Math.min(H * 0.84, y));
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || !dragging) return;
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.02);
    charY = Math.max(H * 0.18, Math.min(H * 0.84, y));
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && !finished) game.audio.play('se_tap', 0.03);
    dragging = false;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.5, press: true };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var total = ROUND_LIMIT + 1;
    var cyc = demo.t % total;
    if (cyc < dt || demo.t <= dt) resetDemo();
    ready = 0;
    roundClock = cyc;
    var targetY = charY;
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (g.passed || roundClock < g.spawnAt) continue;
      var t = (roundClock - g.spawnAt) / TRAVEL;
      if (t > -0.35 && t < 1) targetY = g.laneY;
      if (t >= 1) g.passed = true;
    }
    var pendModT = roundClock % PEND_PERIOD;
    if (pendModT >= PEND_PERIOD - PEND_WARN) targetY = H * 0.5;
    charY += (targetY - charY) * Math.min(1, dt * 6);
    demo.gx = CX; demo.gy = charY; demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gates === undefined) initGame();
      bg(roundClock);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(roundClock);
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + GATE_COUNT, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, Math.round(ROUND_LIMIT - roundClock)) + '秒!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: GATE_COUNT });
        else game.end.failure({ cleared: cleared, total: GATE_COUNT });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      for (var i = 0; i < gates.length; i++) {
        var g = gates[i];
        if (g.passed || roundClock < g.spawnAt) continue;
        var gx = gateX(g);
        if (gx <= CX && gx > CX - 60) {
          g.passed = true;
          if (Math.abs(charY - g.laneY) > GAP_H / 2 - CHAR_R) { fail(CX, charY, 'MISS'); break; }
          cleared++;
          game.feedback.good(CX, charY, { text: 'PASS', color: C.good });
          game.audio.play('se_good', 0.25);
          if (!halfCalled && cleared === Math.ceil(GATE_COUNT / 2)) {
            halfCalled = true;
            game.fx.popup('NICE', CX, charY - 90, { color: C.gold, size: 32 });
            game.audio.play('se_milestone', 0.3);
          }
        }
      }
      if (!finished) {
        var pendModT = roundClock % PEND_PERIOD;
        if (pendModT < PEND_ACTIVE) {
          var py = pendulumY(pendModT);
          if (Math.hypot(CX - CX, charY - py) < PEND_R + CHAR_R) { fail(CX, charY, 'HIT'); }
        }
      }
      if (!finished && roundClock >= ROUND_LIMIT) {
        ok = true; finished = true; hitStop = 0.3;
        game.feedback.good(CX, charY, { text: 'CLEAR', color: C.good });
        game.fx.burst(CX, charY, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(roundClock);
    drawScene();

    txt(cleared + ' / ' + GATE_COUNT, W / 2, H * 0.06, 30, C.ink);
    var pct = Math.max(0, 1 - roundClock / ROUND_LIMIT);
    var lowTime = pct < 0.2 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, W - 120, 16, '#ffffff', 0.2);
    game.draw.rect(60, 150, (W - 120) * pct, 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.15], ['G3', 0.15], ['B3', 0.15], ['E4', 0.3]], { tempo: 138, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
