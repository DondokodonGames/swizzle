// D-20172021-0015-swarm-gate-run.js
// スウォーム・ゲート・ラン — 指に群れを追従させ、加算ゲートを縫って進みながら群れを増やして正面突破する
// 操作: 指を画面上で左右に動かすと群れがそのまま付いてくる。加算ゲートの真下を通って数を増やす
// 終わり: 終点で敵の数を上回れば正面突破に成功。届かなければ押し返されて失敗
// @mechanic: drag_follow
// @theme: swarm_breakthrough_run
// 世界観: 小さな群体を率いる先導者が、指の動きに群れを追従させながら加算ゲートをくぐり抜け、出口で待ち構える敵の数を数で上回って正面突破する
// 残るもの: 正誤(CLEAR/GAME OVER) + 最終的な群れの数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var C = {
    bg1: '#bfe8c8', bg2: '#7fc898', lane: '#a8d8b0', laneEdge: '#5a9868',
    gate: '#ffd400', gateDark: '#c89e00', swarm: '#3a8ae8', swarmDark: '#1a5aa8',
    enemy: '#e85a3a', good: '#39d67a', bad: '#ff4d5e', gold: '#ffd400', ink: '#0a2010', white: '#ffffff',
  };

  var GAME_TITLE = 'SWARM RUN';
  var GATE_COUNT = 7;
  var GATE_GAP = 1.9;
  var TRAVEL = 1.7;
  var SWARM_Y = H * 0.78;
  var FIELD_L = W * 0.14, FIELD_R = W * 0.86;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#082010', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SWARM_SPR = ['.##.', '####', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(FIELD_L, H * 0.16, FIELD_R - FIELD_L, H * 0.72, C.lane, 0.5);
    game.draw.rect(FIELD_L, H * 0.16, 8, H * 0.72, C.laneEdge);
    game.draw.rect(FIELD_R - 8, H * 0.16, 8, H * 0.72, C.laneEdge);
  }

  var gates, swarmX, count, enemyNum, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function buildGates() {
    var arr = [];
    var total = 0;
    for (var i = 0; i < GATE_COUNT; i++) {
      var v = 1 + Math.floor(Math.random() * 3);
      var cx = FIELD_L + 120 + Math.random() * (FIELD_R - FIELD_L - 240);
      arr.push({ spawnAt: i * GATE_GAP + 1.0, x: cx, w: 190, value: v, resolved: false });
      total += v;
    }
    return { gates: arr, enemyNum: Math.max(6, Math.round(total * 0.52)) };
  }

  function initGame() {
    var b = buildGates();
    gates = b.gates; enemyNum = b.enemyNum;
    swarmX = W * 0.5; count = 1; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function gateY(g) {
    var t = (roundClock - g.spawnAt) / TRAVEL;
    return H * 0.18 + t * (SWARM_Y - H * 0.18);
  }

  function drawSwarm() {
    var n = Math.min(14, count);
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2;
      var r = 16 + (i % 3) * 14;
      var bx = swarmX + Math.cos(ang + game.time.elapsed) * r;
      var by = SWARM_Y + Math.sin(ang + game.time.elapsed) * r * 0.6;
      game.draw.sprite(SWARM_SPR, { '#': C.swarm }, bx, by, 12, { anchor: 'center' });
    }
    txt(String(count), swarmX, SWARM_Y - 60, 34, C.swarmDark);
  }

  function drawScene() {
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (roundClock < g.spawnAt || g.resolved) continue;
      var gy = gateY(g);
      if (gy < H * 0.1 || gy > H * 0.86) continue;
      game.draw.rect(g.x - g.w / 2, gy - 16, g.w, 32, C.gate);
      game.draw.rect(g.x - g.w / 2, gy - 16, g.w, 6, C.gateDark);
      txt('+' + g.value, g.x, gy + 10, 26, C.gateDark);
    }
    drawSwarm();
    txt(String(enemyNum), FIELD_R + 60, H * 0.16, 30, C.enemy);
    game.draw.circle(FIELD_R + 60, H * 0.10, 26, C.enemy, 0.8);
  }

  function resolveGate(g) {
    g.resolved = true;
    if (Math.abs(swarmX - g.x) < g.w / 2) {
      count += g.value;
      game.feedback.good(swarmX, SWARM_Y - 40, { text: '+' + g.value, color: C.good });
      game.audio.play('se_coin', 0.35);
      if (!halfCalled && count >= enemyNum * 0.6) {
        halfCalled = true;
        game.fx.popup('NICE', swarmX, SWARM_Y - 100, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      game.feedback.bad(swarmX, SWARM_Y - 40, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.06);
    swarmX = Math.max(FIELD_L + 40, Math.min(FIELD_R - 40, x));
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    swarmX = Math.max(FIELD_L + 40, Math.min(FIELD_R - 40, x));
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: SWARM_Y, press: true };
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
      if (t > -0.3 && t < 0.95) swarmX = g.x;
      if (t >= 0.95) resolveGate(g);
    }
    if (roundClock >= total - 0.6 && !finished) {
      finished = true;
      ok = count >= enemyNum;
      finish();
    }
    demo.gx = swarmX; demo.gy = SWARM_Y; demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gates === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.ink);
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
      for (var i = 0; i < gates.length; i++) {
        var g = gates[i];
        if (g.resolved || roundClock < g.spawnAt) continue;
        var t = (roundClock - g.spawnAt) / TRAVEL;
        if (t >= 0.95) resolveGate(g);
      }
      var lastArrive = gates[gates.length - 1].spawnAt + TRAVEL;
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
    game.audio.melody([['F4', 0.2], ['A4', 0.2], ['C5', 0.2], ['F5', 0.35]], { tempo: 124, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
