// D-20132016-0045-auger-orbit-guide.js
// オーガーオービットガイド — 円を描くように回して鉱石球を誘導し、岩塊を避けて奥へ掘り進める
// 操作: 中心を軸に円を描くようになぞり、鉱石球の位置を岩塊のない側へ回して保つ
// 終わり: 規定回数(6回)の掘進パルスを岩塊なしでやり過ごせば成功。1回でも直撃すれば失敗
// @mechanic: rotate_gesture
// @theme: mining_auger_shaft
// 世界観: 地底深くへ穿つ採掘オーガーの縦坑。回転する坑壁に埋まる岩塊を避け、鉱石球を導いて奥の鉱脈を目指す採掘手
// 残るもの: 正誤(CLEAR/GAME OVER) + やり過ごしたパルス数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: くっきりした縁取り+平坦な陰影帯
  var C = {
    bg: '#241a30', bg2: '#140e1c', shaft: '#3a2c4a', shaftEdge: '#5a4470',
    rock: '#8a5a3a', rockEdge: '#5c3a20', ore: '#5ad0ff', oreEdge: '#1a7aa8',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0eaff', ink: '#0a060e',
  };

  var GAME_TITLE = 'AUGER ORBIT';
  var TOTAL = 6;
  var CX = W * 0.5, CY = H * 0.42;
  var RADIUS = 300;
  var PULSE_PERIOD = 1.7;
  var ROCK_COUNT = 3, ROCK_ARC = 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var passed, done, endWait, finished;
  var ready, hitStop, shake;
  var oreAngle, shaftAngle, shaftSpin, pulseT, resolvedPulse, telegraphOn;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3 + i);
      game.draw.circle(CX, CY, RADIUS + 60 + i * 40, C.shaftEdge, 0.05 + pulse * 0.3);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(game.time.elapsed * 1.1));
  }

  function drawShaft() {
    game.draw.circle(CX, CY, RADIUS + 34, C.shaftEdge);
    game.draw.circle(CX, CY, RADIUS + 10, C.shaft);
    var nearPulse = pulseT > PULSE_PERIOD * 0.5;
    for (var i = 0; i < ROCK_COUNT; i++) {
      var a0 = shaftAngle + (i / ROCK_COUNT) * Math.PI * 2;
      var warn = nearPulse && Math.floor(game.time.elapsed * 9) % 2 === 0;
      var steps = 18;
      for (var s = 0; s < steps; s++) {
        var a = a0 + (s / steps - 0.5) * ROCK_ARC;
        var rx = CX + Math.cos(a) * (RADIUS + 22);
        var ry = CY + Math.sin(a) * (RADIUS + 22);
        game.draw.circle(rx, ry, 26, warn ? C.bad : C.rock, warn ? 0.9 : 1);
      }
    }
  }

  function inRock(angle) {
    for (var i = 0; i < ROCK_COUNT; i++) {
      var a0 = shaftAngle + (i / ROCK_COUNT) * Math.PI * 2;
      var d = Math.atan2(Math.sin(angle - a0), Math.cos(angle - a0));
      if (Math.abs(d) < ROCK_ARC / 2) return true;
    }
    return false;
  }

  var ORE_SPRITE = ['.##.', '####', '.##.'];
  function drawOre() {
    var x = CX + Math.cos(oreAngle) * RADIUS;
    var y = CY + Math.sin(oreAngle) * RADIUS;
    var bob = Math.sin(game.time.elapsed * 5) * 3;
    game.draw.circle(x, y + bob, 34, C.oreEdge, 0.5);
    game.draw.sprite(ORE_SPRITE, { '#': C.ore }, x, y + bob, 12, { anchor: 'center' });
  }

  function drawCore() {
    var depthPct = passed / TOTAL;
    game.draw.circle(CX, CY, 60 + depthPct * 10, C.oreEdge, 0.4);
    game.draw.circle(CX, CY, 36, C.ore, 0.8);
  }

  function initGame() {
    passed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    oreAngle = -Math.PI / 2; shaftAngle = 0; shaftSpin = 0.5; pulseT = 0; resolvedPulse = false; telegraphOn = false;
  }

  function setAngleFromTouch(x, y) {
    oreAngle = Math.atan2(y - CY, x - CX);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    setAngleFromTouch(x, y);
    game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    setAngleFromTouch(x, y);
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.02);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolvePulse() {
    resolvedPulse = true;
    var ox = CX + Math.cos(oreAngle) * RADIUS;
    var oy = CY + Math.sin(oreAngle) * RADIUS;
    if (!inRock(oreAngle)) {
      passed++;
      hitStop = 0.08;
      game.feedback.good(ox, oy, { text: 'CLEAR', color: C.good });
      game.fx.burst(ox, oy, { color: C.ore, count: 16, speed: 320 });
      game.audio.play('se_good', 0.35);
      if (passed === 3) game.fx.popup('HALFWAY!', CX, H * 0.16, { color: C.gold, size: 38 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      ok = false; finished = true;
      hitStop = 0.35;
      game.feedback.bad(ox, oy, { text: 'HIT' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: CX, gy: CY - RADIUS, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (PULSE_PERIOD * 2.2);
    if (cyc < dt || demo.t <= dt) { passed = 0; shaftAngle = 0; oreAngle = -Math.PI / 2; }
    shaftAngle += shaftSpin * dt;
    var localT = cyc % PULSE_PERIOD;
    if (localT < dt || cyc <= dt) {
      var safe = 0;
      for (var a = 0; a < 6.28; a += 0.3) if (!inRock(a)) { safe = a; break; }
      oreAngle = safe;
    }
    var ox = CX + Math.cos(oreAngle) * RADIUS, oy = CY + Math.sin(oreAngle) * RADIUS;
    demo.gx = ox; demo.gy = oy; demo.press = true;
    if (localT > PULSE_PERIOD * 0.9 && !resolvedPulse) {
      resolvedPulse = true;
      passed = (passed + 1) % TOTAL;
      game.fx.burst(ox, oy, { color: C.ore, count: 10, speed: 240 });
      game.audio.play('se_good', 0.2);
    }
    if (localT < PULSE_PERIOD * 0.1) resolvedPulse = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (passed === undefined) initGame();
      bg();
      stepDemo(dt);
      drawShaft();
      drawCore();
      drawOre();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawShaft();
      drawCore();
      drawOre();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { pulses: passed, total: TOTAL });
        else game.end.failure({ pulses: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); pulseT = 0; resolvedPulse = false; }
    } else if (!finished) {
      shaftAngle += shaftSpin * dt;
      pulseT += dt;
      if (pulseT >= PULSE_PERIOD) {
        pulseT = 0;
        if (!resolvedPulse) resolvePulse();
        resolvedPulse = false;
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawShaft();
    drawCore();
    if (!finished) drawOre();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
