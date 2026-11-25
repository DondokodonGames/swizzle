// D-20132016-0056-iris-gate-weave.js
// アイリスゲートウィーブ — 回転しながら迫る虹彩ゲートの隙間に合わせ、小さな探査機を左右に滑らせる
// 操作: ドラッグ/ホールドで探査機を左右に動かし、迫るゲートの隙間の位置に合わせる
// 終わり: 規定数(5枚)のゲートを隙間からすべて通過できれば成功。壁に触れれば即失敗
// @mechanic: dodge
// @theme: deep_probe_iris_gate
// 世界観: 無人深宇宙探査機が、次々と現れる回転式の虹彩ゲートの奥へ進入する。隙間は絶えず回転して位置を変え、縁に触れれば探査機は弾かれる
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過したゲート数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒背景に細い発光線のみ、面塗りは最小限
  var C = {
    bg: '#05070a', bg2: '#0a0f16', line: '#2ad4ff', lineDim: '#0f3a48',
    probe: '#ffe14d', warn: '#ff3d4d', good: '#4dffa0', bad: '#ff3d4d',
    gold: '#ffd400', white: '#eafcff', ink: '#03040a',
  };

  var GAME_TITLE = 'IRIS GATE';
  var GATE_COUNT = 5;
  var GATE_DUR = 2.3;
  var PLAYER_Y = H * 0.82;
  var GATE_Y_START = H * 0.14;
  var PLAYER_R = 30;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var passed, gateIdx, gate, playerX, targetX, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PROBE = ['..#..', '.###.', '#####', '.###.', '..#..'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 1; i < 6; i++) {
      var r = i * 110;
      game.draw.circle(W * 0.5, H * 0.4, r, C.lineDim, 0.5);
    }
  }

  function newGate(idx) {
    var half = Math.max(150 - idx * 14, 92);
    return { half: half, phase: idx * 1.7 + 0.4, speed: 1.1 + idx * 0.16, t: 0, resolved: false };
  }

  function gapCenterOf(g) {
    return W * 0.5 + Math.sin(g.phase + game.time.elapsed * g.speed) * (W * 0.27);
  }

  function initGame() {
    passed = 0; gateIdx = 0; gate = newGate(0);
    playerX = W * 0.5; targetX = W * 0.5;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function setTarget(x) { targetX = Math.max(PLAYER_R + 20, Math.min(W - PLAYER_R - 20, x)); }

  game.onPress(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) { game.audio.play('se_tap', 0.05); setTarget(x); } });
  game.onMove(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) setTarget(x); });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveGate() {
    var gc = gapCenterOf(gate);
    var inside = Math.abs(playerX - gc) < (gate.half - PLAYER_R * 0.4);
    if (inside) {
      passed++;
      hitStop = 0.12;
      game.feedback.good(playerX, PLAYER_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.35);
      if (passed === Math.ceil(GATE_COUNT / 2)) game.fx.popup('HALFWAY!', W * 0.5, PLAYER_Y - 200, { color: C.gold, size: 40 });
      if (passed >= GATE_COUNT) { ok = true; finished = true; finish(); return; }
      gateIdx++;
      gate = newGate(gateIdx);
    } else {
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(playerX, PLAYER_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function drawGate(g, yPos) {
    var gc = gapCenterOf(g);
    var warn = g.t / GATE_DUR > 0.62;
    var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
    var col = warn && blink ? C.warn : C.line;
    game.draw.line(0, yPos, gc - g.half, yPos, col, 12);
    game.draw.line(gc + g.half, yPos, W, yPos, col, 12);
    game.draw.circle(gc - g.half, yPos, 8, C.white);
    game.draw.circle(gc + g.half, yPos, 8, C.white);
  }

  function drawProbe(x, y, bobY) {
    game.draw.sprite(PROBE, { '#': C.probe }, x, y + bobY, 9, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: PLAYER_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      gate = newGate(0);
      gate.phase = 0.6;
      playerX = W * 0.5;
    }
    var gc = gapCenterOf(gate);
    var p = Math.min(1, cyc / 2.4);
    var chaseX = playerX + (gc - playerX) * Math.min(1, dt * 3.2 + p * 0.02);
    playerX = chaseX;
    demo.gx = playerX; demo.gy = PLAYER_Y + 90; demo.press = true;
    if (cyc >= 2.4 && cyc < 2.4 + dt) {
      game.feedback.good(playerX, PLAYER_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;

    if (state === S.ATTRACT) {
      if (gate === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGate(gate, GATE_Y_START + (H * 0.68) * Math.min(1, (demo.t % 3.0) / 2.4));
      drawProbe(playerX, PLAYER_Y, bob);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawProbe(playerX, PLAYER_Y, bob);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(passed + ' / ' + GATE_COUNT, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (GATE_COUNT - passed) + '枚!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { passed: passed, total: GATE_COUNT });
        else game.end.failure({ passed: passed, total: GATE_COUNT });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playerX += (targetX - playerX) * Math.min(1, dt * 8);
      gate.t += dt;
      if (gate.t >= GATE_DUR) resolveGate();
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawGate(gate, GATE_Y_START + (H * 0.68) * Math.min(1, gate.t / GATE_DUR));
    drawProbe(playerX, PLAYER_Y, bob);

    txt(passed + ' / ' + GATE_COUNT, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / GATE_COUNT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.4], ['E3', 0.4], ['G3', 0.4], ['B3', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
