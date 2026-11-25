// J-N6424-0009-neon-loop-dash.js
// ネオン・ループダッシュ — 発光する六角回廊を疾走する配送艇が、迫る障害ゲートをレーン移動でかわし1周を走り切る
// 操作: 左右スワイプで3レーンを移動し、迫る障害ゲートを避け続ける。無傷でゴールライトに到達する
// 終わり: 衝突0回のままゴール距離に到達すれば成功。ゲートに1回でも衝突すると失格
// @mechanic: camera_run
// @theme: neon_loop_courier
// 世界観: 夜間配送を担う小型飛行艇のパイロットが、発光する六角回廊の1周コースを自動巡航しながら迫る障害ゲートをレーン移動でかわし切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 走破率
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺グラデ + 疑似グロー、点滅が命
  var C = {
    bg: '#0a0a2a', bg2: '#050514', rail: '#2a2a6a', railGlow: '#6a6aff',
    ship: '#4de3ff', shipDark: '#1590c0', gate: '#ff3d7a', gateWarn: '#ffdd33',
    gold: '#ffd24a', good: '#4dffb0', bad: '#ff3d7a', ink: '#eaf0ff', white: '#ffffff',
  };

  var GAME_TITLE = 'LOOP DASH';
  var MAX_TIME = 19;
  var LANES = [W * 0.32, W * 0.5, W * 0.68];
  var SHIP_Y = H * 0.74;
  var SPAWN_Y = H * 0.24;
  var WARN_LEAD = 0.65;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#020210', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SHIP = ['..##..', '.####.', '######', '.#..#.'];
  var GATEF = ['######', '#....#', '#....#', '######'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.05 + 0.04 * Math.sin(game.time.elapsed * 1.6);
    game.draw.rect(0, 0, W, H, C.railGlow, pulse * 0.3);
    for (var i = 0; i < LANES.length - 1; i++) {
      var lx = (LANES[i] + LANES[i + 1]) / 2;
      game.draw.line(lx, H * 0.16, lx, H * 0.88, C.rail, 6);
    }
    game.draw.line(30, H * 0.16, 30, H * 0.88, C.railGlow, 5);
    game.draw.line(W - 30, H * 0.16, W - 30, H * 0.88, C.railGlow, 5);
  }

  var lane, gates, progress, hits, spawnGap, goldGap, checkpoint, speedMul;
  var done, endWait, finished, ready, hitStop, shake, lastNearMiss;

  function initGame() {
    lane = 1; gates = []; progress = 0; hits = 0;
    spawnGap = 1.5; goldGap = 3.6; checkpoint = 0; speedMul = 1;
    done = false; endWait = 0; finished = false; lastNearMiss = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnGate(gold) {
    var openLane = Math.floor(game.random(0, 3));
    gates.push({ lane: openLane, y: SPAWN_Y, warned: false, passed: false, gold: !!gold });
  }

  function moveLane(dir) {
    if (dir === 'left' && lane > 0) lane--;
    else if (dir === 'right' && lane < 2) lane++;
    else { game.feedback.bad(LANES[lane], SHIP_Y, { text: 'MISS' }); game.audio.play('se_tap', 0.15); return; }
    game.audio.play('se_tap', 0.2);
    game.fx.popup('', LANES[lane], SHIP_Y - 60, { color: C.ship, size: 1 });
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.01);
    moveLane(dir);
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

  function crash(g) {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(LANES[g.lane], SHIP_Y, { text: 'MISS' });
    game.fx.flash(C.bad, 0.2);
    game.audio.play('se_bad', 0.45);
    finish();
  }

  function stepRun(dt) {
    speedMul = 1 + progress / MAX_TIME * 0.55;
    progress += dt;
    spawnGap -= dt; goldGap -= dt;
    if (spawnGap <= 0) { spawnGate(false); spawnGap = Math.max(0.85, 1.55 - progress * 0.02); }
    if (goldGap <= 0) { spawnGate(true); goldGap = 3.6; }
    if (!finished && Math.floor(progress) > checkpoint && progress < MAX_TIME) {
      checkpoint = Math.floor(progress);
      if (checkpoint === Math.round(MAX_TIME / 2)) {
        game.fx.popup('NICE', W / 2, H * 0.3, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
    }
    for (var i = gates.length - 1; i >= 0; i--) {
      var g = gates[i];
      g.y += (H * 0.62) * speedMul * dt;
      if (!g.warned && g.y > SHIP_Y - (H * 0.62) * speedMul * WARN_LEAD) g.warned = true;
      if (!g.passed && g.y >= SHIP_Y - 40 && g.y <= SHIP_Y + 40) {
        g.passed = true;
        if (g.lane === lane) {
          if (g.gold) {
            game.feedback.good(LANES[g.lane], SHIP_Y, { text: 'NICE', color: C.gold });
            game.audio.play('se_powerup', 0.3);
            game.fx.burst(LANES[g.lane], SHIP_Y, { color: C.gold, count: 14, speed: 280 });
          } else {
            crash(g);
          }
        } else if (game.time.elapsed - lastNearMiss > 1.5) {
          lastNearMiss = game.time.elapsed;
        }
      }
      if (g.y > H * 0.95) gates.splice(i, 1);
    }
    if (!finished && progress >= MAX_TIME) {
      ok = true; finished = true; hitStop = 0.25;
      game.feedback.good(LANES[lane], SHIP_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(LANES[lane], SHIP_Y, { color: C.gold, count: 22, speed: 420 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  function drawScene() {
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      var col = g.gold ? C.gold : (g.warned ? C.gateWarn : C.gate);
      for (var L = 0; L < 3; L++) {
        if (L === g.lane) continue;
        game.draw.rect(LANES[L] - 66, g.y - 44, 132, 88, col, g.warned && !g.gold ? 0.85 : 0.55);
      }
      if (g.warned && !g.passed) {
        var a = 0.4 + 0.4 * Math.sin(game.time.elapsed * 16);
        game.draw.circle(LANES[g.lane], SHIP_Y, 80, C.gateWarn, a * 0.35);
      }
    }
    game.draw.sprite(SHIP, { '#': C.ship }, LANES[lane], SHIP_Y, 16, { anchor: 'center' });
  }

  var demo = { t: 0, gx: LANES[1], gy: SHIP_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) initGame();
    stepRun(dt);
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (!g.passed && g.warned && g.lane === lane) {
        var target = lane === 1 ? (game.random(0, 1) < 0.5 ? 0 : 2) : 1;
        moveLane(target > lane ? 'right' : 'left');
      }
    }
    demo.gx = LANES[lane]; demo.gy = SHIP_Y - 90; demo.press = ready <= 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!gates) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      var pct = Math.min(100, Math.round((progress / MAX_TIME) * 100));
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, 100 - pct) + '%!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pctF = Math.min(100, Math.round((progress / MAX_TIME) * 100));
        if (ok) game.end.success(pctF, { progressPct: pctF });
        else game.end.failure({ progressPct: pctF });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRun(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();
    var pctNow = Math.min(100, Math.round((progress / MAX_TIME) * 100));
    txt(pctNow + ' / ' + 100, W / 2, H * 0.06, 28, C.ink);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.rail, 1);
    game.draw.rect(60, 150, barW * Math.min(1, progress / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.3]], { tempo: 160, wave: 'sawtooth', volume: 0.045, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
