// D-20132016-0039-prism-gate-dash.js
// プリズムゲートダッシュ — 色を切り替えながら、同じ色のゲートだけを抜けていく
// 操作: 画面をタップして玉の色を切り替え、近づくゲートと同じ色に合わせて通過する
// 終わり: 規定数(6基)のゲートを正しい色で抜ければ成功。違う色で当たれば失敗
// @mechanic: gap_fit
// @theme: crystal_tunnel_diver
// 世界観: 地底のプリズム坑道。色が移ろう光球を操り、同じ色の輪だけが開く関門を抜けて奥の間を目指す潜行者
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過したゲート数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高精細ピクセル、発光グロー、鮮やかなグラデーション
  var C = {
    bg: '#050414', bg2: '#0e0b2a', tunnel: '#1a1640', tunnelEdge: '#332a70',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0eaff', ink: '#04030c',
  };
  var COLORS = ['#ff4d7a', '#4da8ff', '#ffe14d'];
  var COLOR_NAME = ['RED', 'BLUE', 'GOLD'];

  var GAME_TITLE = 'PRISM DASH';
  var TOTAL = 6;
  var ORB_Y = H * 0.68;
  var ORB_X = W * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var passed, done, endWait, finished;
  var ready, hitStop, shake;
  var orbColor, gates, gateIdx, seedN;
  function prng() { seedN = (seedN * 1103515245 + 12345) & 0x7fffffff; return (seedN % 1000) / 1000; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 10; i++) {
      var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.4 + i * 0.5);
      game.draw.circle(W * 0.5, H * 0.4, 120 + i * 60, C.tunnelEdge, 0.06 + pulse * 0.4);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(game.time.elapsed * 1.1));
  }

  function newGate(idx) {
    return { colorIdx: Math.floor(prng() * 3), y: -260, resolved: false };
  }

  function initGame() {
    passed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    orbColor = 0; seedN = 11;
    gateIdx = 0;
    gates = [newGate(0)];
  }

  function drawGate(gate) {
    var y = gate.y;
    if (y < -260 || y > H + 200) return;
    var col = COLORS[gate.colorIdx];
    var nearHit = Math.abs(y - ORB_Y) < 300;
    var warn = nearHit && Math.floor(game.time.elapsed * 8) % 2 === 0;
    for (var w = 0; w < W; w += 90) {
      game.draw.rect(w, y - 60, 70, 120, warn ? '#ffffff' : col, warn ? 0.35 : 0.22);
    }
    game.draw.circle(W * 0.5, y, 150, col, 0.15);
    game.draw.rect(0, y - 8, W, 16, col, 0.9);
  }

  var ORB_SPRITE = ['.##.', '####', '####', '.##.'];
  function drawOrb(x, colorIdx, pulse) {
    var col = COLORS[colorIdx];
    var bob = Math.sin(game.time.elapsed * 3) * 4;
    game.draw.circle(x, ORB_Y + bob, 40 + (pulse ? 8 : 0), col, 0.3);
    game.draw.sprite(ORB_SPRITE, { '#': col }, x, ORB_Y + bob, 13, { anchor: 'center' });
    game.draw.circle(x, ORB_Y + bob, 10, C.white, 0.7);
  }

  var cyclePulse = 0;
  function cycleColor() {
    orbColor = (orbColor + 1) % 3;
    cyclePulse = 0.15;
    game.audio.play('se_tap', 0.12);
    game.audio.tone(440 + orbColor * 110, 0.08, { wave: 'square', volume: 0.08 });
  }

  function resolveGate(gate) {
    gate.resolved = true;
    if (gate.colorIdx === orbColor) {
      passed++;
      hitStop = 0.08;
      game.feedback.good(ORB_X, ORB_Y, { text: 'PASS', color: COLORS[gate.colorIdx] });
      game.fx.burst(ORB_X, ORB_Y, { color: COLORS[gate.colorIdx], count: 16, speed: 340 });
      game.audio.play('se_good', 0.35);
      if (passed === 3) game.fx.popup('HALFWAY!', W * 0.5, H * 0.3, { color: C.gold, size: 38 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
      gateIdx++;
      gates.push(newGate(gateIdx));
    } else {
      ok = false; finished = true;
      hitStop = 0.35;
      game.feedback.bad(ORB_X, ORB_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    cycleColor();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var GATE_SPEED = 460;

  var demo = { t: 0, gx: ORB_X, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      passed = 0; gateIdx = 0; seedN = 11; orbColor = 0;
      gates = [newGate(0)];
    }
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      g.y += GATE_SPEED * dt;
      if (!g.resolved && g.y >= ORB_Y - 120 && g.y - GATE_SPEED * dt < ORB_Y - 120 && g.colorIdx !== orbColor) {
        orbColor = g.colorIdx; cyclePulse = 0.15;
        demo.press = true;
        game.audio.play('se_tap', 0.1);
      }
      if (!g.resolved && g.y >= ORB_Y) {
        g.resolved = true; passed++;
        game.fx.burst(ORB_X, ORB_Y, { color: COLORS[g.colorIdx], count: 10, speed: 260 });
        game.audio.play('se_good', 0.2);
        gateIdx++;
        gates.push(newGate(gateIdx));
        demo.press = false;
      }
    }
    while (gates.length && gates[0].y > H + 300) gates.shift();
  }

  game.onUpdate(function(dt) {
    if (cyclePulse > 0) cyclePulse -= dt;

    if (state === S.ATTRACT) {
      if (gates === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var i = 0; i < gates.length; i++) drawGate(gates[i]);
      drawOrb(ORB_X, orbColor, cyclePulse > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var j = 0; j < gates.length; j++) drawGate(gates[j]);
      drawOrb(ORB_X, orbColor, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '基!', W / 2, H * 0.18, 26, C.white);
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
      for (var k = 0; k < gates.length; k++) {
        var g = gates[k];
        if (g.resolved) continue;
        g.y += GATE_SPEED * dt;
        if (g.y >= ORB_Y) resolveGate(g);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    for (var m = 0; m < gates.length; m++) drawGate(gates[m]);
    if (!finished) drawOrb(ORB_X, orbColor, cyclePulse > 0);

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    txt(COLOR_NAME[orbColor], W / 2, H * 0.11, 24, COLORS[orbColor]);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F#4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 135, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
