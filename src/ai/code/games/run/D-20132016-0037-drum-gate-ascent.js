// D-20132016-0037-drum-gate-ascent.js
// ドラムゲート上昇 — タップで浮かぶ気球ゴンドラを操り、回転する石ドラムの隙間を抜けて昇る
// 操作: 画面をタップした位置へゴンドラを横移動させ、隙間の位置に合わせる
// 終わり: 規定数(5基)のゲートを抜ければ成功。ドラムに接触すれば失敗
// @mechanic: camera_climb
// @theme: ruin_shaft_balloon
// 世界観: 地下遺跡の縦坑を昇る気球ゴンドラ。等間隔に並ぶ回転石ドラムの隙間だけを縫って頂上を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過したゲート数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 暗い背景に幾何学発光ライン、等角風のストライプ
  var C = {
    bg: '#0c0e1a', bg2: '#161a2e', drum: '#3a4468', drumEdge: '#5a68a0',
    gap: '#0c0e1a', pod: '#ffcf4d', podDark: '#c9932a', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#e8ecff', ink: '#06070c', warn: '#ff5577',
  };

  var GAME_TITLE = 'GATE ASCENT';
  var TOTAL = 5;
  var GATE_Y = H * 0.62;
  var POD_MARGIN = 90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var passed, done, endWait, finished;
  var ready, hitStop, shake;
  var podX, podTX, gates, gateIdx, altitude, seedN;
  function prng() { seedN = (seedN * 1103515245 + 12345) & 0x7fffffff; return (seedN % 1000) / 1000; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var POD_SPRITE = ['.####.', '######', '######', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    var scroll = (altitude * 40) % 80;
    for (var i = -1; i < 26; i++) {
      var y = i * 80 - scroll;
      game.draw.rect(0, y, W, 2, '#ffffff', 0.04 + 0.03 * Math.sin(game.time.elapsed * 1.2 + i));
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3));
  }

  function newGate(idx) {
    var gapW = Math.max(220, 340 - idx * 22);
    var gapX = POD_MARGIN + gapW / 2 + prng() * (W - POD_MARGIN * 2 - gapW);
    return { gapX: gapX, gapW: gapW, y: -260, spun: prng() * 6.28, spinSpeed: 2 + prng() * 1.5, resolved: false };
  }

  function initGame() {
    passed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    podX = W * 0.5; podTX = W * 0.5; altitude = 0;
    seedN = 7;
    gates = [newGate(0)];
    gateIdx = 0;
  }

  function drawDrum(gate) {
    var y = gate.y;
    if (y < -300 || y > H + 200) return;
    var leftW = gate.gapX - gate.gapW / 2;
    var rightX = gate.gapX + gate.gapW / 2;
    var nearGate = Math.abs(y - GATE_Y) < 260;
    var warn = nearGate && Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(0, y - 70, leftW, 140, warn ? C.warn : C.drum, warn ? 0.5 : 1);
    game.draw.rect(rightX, y - 70, W - rightX, 140, warn ? C.warn : C.drum, warn ? 0.5 : 1);
    game.draw.rect(0, y - 70, leftW, 10, C.drumEdge);
    game.draw.rect(rightX, y - 70, W - rightX, 10, C.drumEdge);
    // rotating spokes for the "drum" flavor
    for (var s = 0; s < 3; s++) {
      var a = gate.spun + s * 2.094;
      var sx = Math.min(leftW - 20, Math.max(20, leftW * 0.5 + Math.cos(a) * leftW * 0.35));
      game.draw.circle(sx, y, 8, C.drumEdge, 0.7);
      var sx2 = rightX + Math.min(W - rightX - 20, Math.max(20, (W - rightX) * 0.5 + Math.cos(a) * (W - rightX) * 0.35));
      game.draw.circle(sx2, y, 8, C.drumEdge, 0.7);
    }
  }

  function drawPod(x, chopFx) {
    var bob = Math.sin(game.time.elapsed * 3) * 5;
    game.draw.line(x, GATE_Y - 400 + bob, x, GATE_Y - 360 + bob, C.podDark, 4);
    game.draw.sprite(POD_SPRITE, { '#': C.pod }, x, GATE_Y - 400 + bob, 20, { anchor: 'center' });
    game.draw.circle(x, GATE_Y - 400 + bob + 50, 30, C.pod, 0.4);
  }

  function resolveGate(gate) {
    gate.resolved = true;
    var dx = Math.abs(podX - gate.gapX);
    if (dx < gate.gapW / 2 - 40) {
      passed++;
      hitStop = 0.08;
      game.feedback.good(podX, GATE_Y - 400, { text: 'PASS', color: C.good });
      game.fx.burst(podX, GATE_Y - 400, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.35);
      if (passed === 3) game.fx.popup('HALFWAY!', W * 0.5, H * 0.3, { color: C.gold, size: 38 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
      gateIdx++;
      var ng = newGate(gateIdx);
      gates.push(ng);
    } else {
      ok = false; finished = true;
      hitStop = 0.35;
      game.feedback.bad(podX, GATE_Y - 400, { text: 'HIT' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    podTX = Math.max(POD_MARGIN, Math.min(W - POD_MARGIN, x));
    game.audio.play('se_tap', 0.1);
    game.fx.burst(podTX, GATE_Y - 400, { color: C.pod, count: 4, speed: 120 });
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var GATE_SPEED = 620;

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3;
    if (cyc < dt || demo.t <= dt) {
      passed = 0; gateIdx = 0; seedN = 7; altitude = 0;
      gates = [newGate(0)];
      podX = W * 0.5; podTX = W * 0.5;
    }
    altitude += dt;
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      g.y += GATE_SPEED * dt;
      g.spun += g.spinSpeed * dt;
      if (!g.resolved && g.y >= GATE_Y - 60 && g.y - GATE_SPEED * dt < GATE_Y - 60) {
        podTX = g.gapX; demo.gx = g.gapX; demo.press = true;
      }
      if (!g.resolved && g.y >= GATE_Y) {
        g.resolved = true; passed++;
        game.fx.burst(podX, GATE_Y - 400, { color: C.gold, count: 10, speed: 260 });
        game.audio.play('se_good', 0.2);
        gateIdx++;
        gates.push(newGate(gateIdx));
      }
    }
    podX += (podTX - podX) * Math.min(1, dt * 5);
    while (gates.length && gates[0].y > H + 300) gates.shift();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gates === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var i = 0; i < gates.length; i++) drawDrum(gates[i]);
      drawPod(podX, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var j = 0; j < gates.length; j++) drawDrum(gates[j]);
      drawPod(podX, false);
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
      altitude += dt;
      podX += (podTX - podX) * Math.min(1, dt * 6);
      for (var k = 0; k < gates.length; k++) {
        var g = gates[k];
        if (g.resolved) continue;
        g.y += GATE_SPEED * dt;
        g.spun += g.spinSpeed * dt;
        if (g.y >= GATE_Y) resolveGate(g);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    for (var m = 0; m < gates.length; m++) drawDrum(gates[m]);
    if (!finished) drawPod(podX, false);

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
