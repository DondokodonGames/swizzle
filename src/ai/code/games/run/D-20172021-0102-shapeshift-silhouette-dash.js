// D-20172021-0102-shapeshift-silhouette-dash.js
// シェイプシフト・シルエットダッシュ — 迫るゲートの輪郭を見て、下の3つの形ボタンから正しい姿へ切り替えて走り抜ける
// 操作: 画面下の丸・四角・三角の3ボタンから、迫るゲートと同じ形をタップして自分の姿を変える
// 終わり: 間違いが規定回数以内でゴールすれば成功。間違いが規定を超えれば失敗
// @mechanic: judge
// @theme: shapeshift_silhouette_dash
// 世界観: 姿を自在に変えられる精霊の飛脚が、迫るゲートの輪郭を見極めて丸・四角・三角へ瞬時に変身し、道を塞ぐ壁をすり抜けながら先へ進む
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく変身できた回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 紙のような白背景+黒一色の線画、アクセントのみ1色
  var C = {
    bg: '#f4f0e6', bg2: '#e6e0d0', ink: '#141210', accent: '#ff4d3d',
    good: '#2a8f5a', bad: '#ff4d3d', gold: '#d99a2b', white: '#f4f0e6',
  };
  var SHAPES = ['circle', 'square', 'triangle'];
  var BTN_X = [W * 0.22, W * 0.5, W * 0.78];
  var BTN_Y = H * 0.86;

  var GAME_TITLE = 'SILHOUETTE DASH';
  var GATE_Y = H * 0.5;
  var GATES = 6;
  var TRAVEL = 1.7;
  var MAX_MISS = 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 2, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, C.ink, pulse * 0.05);
  }

  function drawShapeIcon(shape, x, y, r, color) {
    if (shape === 'circle') game.draw.circle(x, y, r, color);
    else if (shape === 'square') game.draw.rect(x - r, y - r, r * 2, r * 2, color);
    else {
      game.draw.rect(x - r, y + r * 0.6, r * 2, r * 0.35, color);
      game.draw.rect(x - r * 0.65, y - r * 0.2, r * 1.3, r * 0.35, color);
      game.draw.rect(x - r * 0.3, y - r, r * 0.6, r * 0.35, color);
    }
  }

  var shapeIdx, gateIdx, gateT, targetShape, resolved, telegraphOn;
  var hits, misses;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function newGate() {
    var t;
    do { t = Math.floor(Math.random() * 3); } while (t === targetShape);
    targetShape = t;
    gateT = 0; resolved = false; telegraphOn = true;
  }

  function initGame() {
    shapeIdx = 0; gateIdx = 0; hits = 0; misses = 0; targetShape = -1; milestoneShown = false;
    newGate();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function pickShape(i) {
    if (finished || resolved) return;
    shapeIdx = i;
    game.audio.play('se_tap', 0.15);
  }

  function resolveGate() {
    if (resolved) return;
    resolved = true;
    if (shapeIdx === targetShape) {
      hits++;
      game.feedback.good(W / 2, GATE_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (hits === Math.floor(GATES / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('NICE', W / 2, GATE_Y - 180, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      misses++;
      hitStop = 0.3; shake = 0.26;
      game.feedback.bad(W / 2, GATE_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
  }

  function advance(dt) {
    gateT += dt;
    if (gateT >= TRAVEL) {
      if (!resolved) resolveGate();
      gateIdx++;
      if (misses > MAX_MISS) {
        ok = false; finished = true; hitStop = 0.3;
        game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
      if (gateIdx >= GATES) {
        ok = misses <= MAX_MISS; finished = true; hitStop = 0.25;
        if (ok) { game.fx.burst(W / 2, GATE_Y, { color: C.gold, count: 22, speed: 380 }); game.audio.play('se_success', 0.5); }
        else game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
      newGate();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      for (var i = 0; i < 3; i++) {
        if (Math.hypot(x - BTN_X[i], y - BTN_Y) < 100) { pickShape(i); if (gateT / TRAVEL > 0.15) resolveGate(); }
      }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var FACE_F = ['.##.', '####', '.##.'];
  function drawScene(sIdx, tShape, gT, showTel) {
    var gy = H * 0.2 + (gT / TRAVEL) * (GATE_Y - H * 0.2);
    if (showTel) drawShapeIcon(SHAPES[tShape], W / 2, gy, 90, C.ink);
    drawShapeIcon(SHAPES[sIdx], W / 2, H * 0.68, 64, C.accent);
    game.draw.sprite(FACE_F, { '#': C.white }, W / 2, H * 0.68, 8, { anchor: 'center' });
    for (var i = 0; i < 3; i++) {
      game.draw.circle(BTN_X[i], BTN_Y, 84, i === sIdx ? C.accent : '#00000010');
      drawShapeIcon(SHAPES[i], BTN_X[i], BTN_Y, 40, i === sIdx ? C.white : C.ink);
    }
  }

  var demo = { t: 0, gx: BTN_X[0], gy: BTN_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; }
    else if (!finished) advance(dt);
    var tx = BTN_X[targetShape >= 0 ? targetShape : 0];
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
    demo.gy = BTN_Y;
    demo.press = !resolved;
    if (!resolved && Math.abs(demo.gx - tx) < 12) { shapeIdx = targetShape; resolveGate(); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (shapeIdx === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(shapeIdx, targetShape, gateT, true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(shapeIdx, targetShape, gateT, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + GATES, W / 2, H * 0.15, 28, C.gold);
      if (!ok) txt('あと1個!', W / 2, H * 0.19, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: misses });
        else game.end.failure({ hits: hits, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      advance(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(shapeIdx, targetShape, gateT, true);

    txt(gateIdx + ' / ' + GATES, W / 2, H * 0.06, 28, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#00000022', 1);
    game.draw.rect(60, 150, (W - 120) * (gateIdx / GATES), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 58, C.accent);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.18], ['D5', 0.18], ['E5', 0.18], ['G5', 0.36]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
