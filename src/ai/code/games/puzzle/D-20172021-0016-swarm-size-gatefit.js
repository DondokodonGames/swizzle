// D-20172021-0016-swarm-size-gatefit.js
// スウォーム・サイズ・ゲートフィット — 3つ並ぶゲートから群れの大きさに合う穴だけを選んでくぐらせ、終点で数を競う
// 操作: 迫るゲート列の3つの穴から、今の群れの大きさでちょうど通り抜けられる穴をタップして選ぶ
// 終わり: 終点で敵の数を上回れば成功。狭すぎる穴を選んでつかえると失敗
// @mechanic: gap_fit
// @theme: swarm_size_gate_select
// 世界観: 増殖しながら進む群体の先導者が、通過するたびに広さの違うゲートの穴を見極め、今の大きさに合う穴だけを選んで敵の数を上回るまでくぐり抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 最終的な群れの数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なし・丸角・余白、ベタ塗り数色
  var C = {
    bg1: '#eef3fb', bg2: '#dfe9fb', gate: '#3d7dff', gateSmall: '#c7d3ea',
    swarm: '#ff9f1c', swarmDark: '#c87400', enemy: '#ff4d5e',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffb020', ink: '#152238', white: '#ffffff',
  };

  var GAME_TITLE = 'GATE FIT';
  var GATE_COUNT = 7;
  var GATE_GAP = 2.0;
  var TRAVEL = 1.6;
  var LANE_X = [W * 0.24, W * 0.5, W * 0.76];
  var SWARM_Y = H * 0.78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a1424', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SWARM_SPR = ['.##.', '####', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#3d7dff', pulse * 0.4);
  }

  var gates, swarmX, count, enemyNum, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function buildGates() {
    var arr = [];
    for (var i = 0; i < GATE_COUNT; i++) {
      var caps = [];
      for (var l = 0; l < 3; l++) caps.push(2 + Math.floor(Math.random() * 6));
      arr.push({ spawnAt: i * GATE_GAP + 1.0, caps: caps, resolved: false });
    }
    return arr;
  }

  function initGame() {
    gates = buildGates();
    swarmX = LANE_X[1]; count = 3; roundClock = 0; halfCalled = false;
    enemyNum = 8 + Math.floor(Math.random() * 3);
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function gateY(g) {
    var t = (roundClock - g.spawnAt) / TRAVEL;
    return H * 0.18 + t * (SWARM_Y - H * 0.18);
  }

  function laneOf(x) {
    var best = 0, bd = 1e9;
    for (var i = 0; i < 3; i++) { var d = Math.abs(LANE_X[i] - x); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  function drawSwarm() {
    var n = Math.min(14, count);
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2;
      var r = 14 + (i % 3) * 12;
      var bx = swarmX + Math.cos(ang + game.time.elapsed) * r;
      var by = SWARM_Y + Math.sin(ang + game.time.elapsed) * r * 0.6;
      game.draw.sprite(SWARM_SPR, { '#': C.swarm }, bx, by, 11, { anchor: 'center' });
    }
    txt(String(count), swarmX, SWARM_Y - 60, 32, C.swarmDark);
  }

  function drawScene() {
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (roundClock < g.spawnAt || g.resolved) continue;
      var gy = gateY(g);
      if (gy < H * 0.1 || gy > H * 0.86) continue;
      for (var l = 0; l < 3; l++) {
        var w = 40 + g.caps[l] * 16;
        var fits = g.caps[l] >= count;
        game.draw.rect(LANE_X[l] - w / 2, gy - 16, w, 32, fits ? C.gate : C.gateSmall);
        txt(String(g.caps[l]), LANE_X[l], gy + 10, 22, C.ink);
      }
    }
    drawSwarm();
    txt(String(enemyNum), W * 0.90, H * 0.16, 28, C.enemy);
    game.draw.circle(W * 0.90, H * 0.10, 24, C.enemy, 0.8);
  }

  function pickLane(lane, x, y) {
    var ap = null;
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (g.resolved || roundClock < g.spawnAt) continue;
      var t = (roundClock - g.spawnAt) / TRAVEL;
      if (t > -0.35 && t < 1.05) { ap = g; break; }
    }
    if (!ap) { game.audio.play('se_tap', 0.1); return; }
    swarmX = LANE_X[lane];
    ap.resolved = true;
    if (ap.caps[lane] >= count) {
      count += 1;
      game.feedback.good(swarmX, SWARM_Y - 40, { text: 'FIT', color: C.good });
      game.audio.play('se_good', 0.3);
      if (!halfCalled && count >= Math.ceil(enemyNum * 0.5)) {
        halfCalled = true;
        game.fx.popup('NICE', swarmX, SWARM_Y - 100, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      game.feedback.bad(swarmX, SWARM_Y - 40, { text: 'STUCK' });
      game.audio.play('se_bad', 0.35);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) pickLane(laneOf(x), x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LANE_X[1], gy: SWARM_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var total = GATE_COUNT * GATE_GAP + 1.6;
    var cyc = demo.t % total;
    if (cyc < dt || demo.t <= dt) resetDemo();
    ready = 0;
    roundClock = cyc;
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (g.resolved || roundClock < g.spawnAt) continue;
      var t = (roundClock - g.spawnAt) / TRAVEL;
      if (t > 0.55 && t < 0.72) {
        var bestLane = 0;
        for (var l = 1; l < 3; l++) if (g.caps[l] >= count && (g.caps[bestLane] < count || g.caps[l] < g.caps[bestLane])) bestLane = l;
        if (g.caps[bestLane] < count) {
          for (var l2 = 0; l2 < 3; l2++) if (g.caps[l2] > g.caps[bestLane]) bestLane = l2;
        }
        demo.gx = LANE_X[bestLane]; demo.gy = H * 0.9; demo.press = true;
        pickLane(bestLane, LANE_X[bestLane], SWARM_Y - 40);
      }
    }
    if (roundClock >= total - 0.6 && !finished) { finished = true; ok = count >= enemyNum; finish(); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gates === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(count + ' vs ' + enemyNum, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + Math.max(1, enemyNum - count) + '!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(count, { count: count, enemy: enemyNum });
        else game.end.failure({ count: count, enemy: enemyNum });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      var lastArrive = gates[gates.length - 1].spawnAt + TRAVEL;
      for (var i = 0; i < gates.length; i++) {
        var g = gates[i];
        if (!g.resolved && roundClock > g.spawnAt + TRAVEL + 0.15) g.resolved = true;
      }
      if (roundClock >= lastArrive + 0.4) {
        finished = true; hitStop = 0.25;
        ok = count >= enemyNum;
        if (ok) {
          game.feedback.good(swarmX, SWARM_Y, { text: 'CLEAR', color: C.good });
          game.fx.burst(swarmX, SWARM_Y, { color: C.gold, count: 22, speed: 400 });
          game.audio.play('se_success', 0.5);
        } else {
          game.feedback.bad(swarmX, SWARM_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          shake = 0.25;
        }
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(count + ' / ' + enemyNum, W / 2, H * 0.06, 30, C.ink);
    var pct = Math.max(0, Math.min(1, roundClock / (gates ? gates[gates.length - 1].spawnAt + TRAVEL : 1)));
    game.draw.rect(60, 150, W - 120, 16, '#ffffff', 0.3);
    game.draw.rect(60, 150, (W - 120) * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['B4', 0.2], ['D5', 0.2], ['G5', 0.35]], { tempo: 130, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
