// I-GBA-0066-tray-tilt-drop.js
// トレイティルトドロップ — 傾くトレイを指でずらし、玉を通路の外に落とさず的穴まで導く
// 操作: 画面を押さえてそのままドラッグし、玉の左右位置をずらして通路の中に保つ。手を離すと玉は中央に戻ろうとする
// 終わり: 玉が的穴まで到達すれば成功。通路からはみ出す/仕切りの閉じた側に入れば失敗
// @mechanic: guide_path
// @theme: workshop_marble_chute
// 世界観: 木工房の作業台に組まれた長い樋。職人が玉受けトレイを傾けて玉を転がし、奥の的穴まで一直線に落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した深度%
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドの床、等角、高さは影の距離で示す
  var C = {
    bg: '#1a2438', bg2: '#0e1524', floor: '#2a3a54', floorLine: '#3c5074',
    chute: '#4a3826', chuteEdge: '#7a5c3a', ball: '#e8c85a', ballDark: '#a8842a',
    gate: '#ff4d5e', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#eaf2ff', ink: '#080c14',
  };

  var GAME_TITLE = 'TRAY DROP';
  var DUR = 18;
  var TOP_Y = H * 0.16, BOT_Y = H * 0.80;
  // 通路のウェイポイント: {f: 深度0-1, cx: 中心x(0-1 * W), half: 半幅px}
  var WAY = [
    { f: 0.00, cx: 0.50, half: 210 },
    { f: 0.18, cx: 0.32, half: 190 },
    { f: 0.36, cx: 0.68, half: 170 },
    { f: 0.55, cx: 0.50, half: 150 },
    { f: 0.72, cx: 0.30, half: 130 },
    { f: 0.88, cx: 0.50, half: 100 },
    { f: 1.00, cx: 0.50, half: 60 },
  ];
  var GATE_F = 0.55, GATE_HALFBAND = 0.025;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function centerAt(f) {
    for (var i = 1; i < WAY.length; i++) {
      if (f <= WAY[i].f) {
        var a = WAY[i - 1], b = WAY[i];
        var t = (f - a.f) / (b.f - a.f || 1);
        return { cx: (a.cx + (b.cx - a.cx) * t) * W, half: a.half + (b.half - a.half) * t };
      }
    }
    return { cx: WAY[WAY.length - 1].cx * W, half: WAY[WAY.length - 1].half };
  }

  var depth, ballX, targetX, pressing, gateSide, milestoneShown;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CARPENTER = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) {
      var yy = H * 0.05 + i * (H * 0.9 / 10);
      game.draw.line(0, yy, W, yy - H * 0.03, C.floorLine, 2);
    }
    game.draw.sprite(CARPENTER, { '#': C.white }, W * 0.5, H * 0.90, 14, { anchor: 'center' });
  }

  function drawChute(d) {
    var steps = 24;
    for (var i = 1; i <= steps; i++) {
      var f0 = (i - 1) / steps, f1 = i / steps;
      var c0 = centerAt(f0), c1 = centerAt(f1);
      var y0 = TOP_Y + (BOT_Y - TOP_Y) * f0, y1 = TOP_Y + (BOT_Y - TOP_Y) * f1;
      game.draw.line(c0.cx - c0.half, y0, c1.cx - c1.half, y1, C.chuteEdge, 10);
      game.draw.line(c0.cx + c0.half, y0, c1.cx + c1.half, y1, C.chuteEdge, 10);
      game.draw.line(c0.cx, y0, c1.cx, y1, C.chute, c0.half * 2 - 10);
    }
    // ゲート(仕切り): GATE_F付近で片側を封鎖
    var gc = centerAt(GATE_F);
    var gy = TOP_Y + (BOT_Y - TOP_Y) * GATE_F;
    var gx0 = gateSide === 'left' ? gc.cx - gc.half : gc.cx;
    game.draw.rect(gx0, gy - 14, gc.half, 28, C.gate, 0.85);
    // 的穴
    var tc = centerAt(1);
    game.draw.circle(tc.cx, BOT_Y, tc.half + 10, C.gold, 0.35);
    game.draw.circle(tc.cx, BOT_Y, tc.half - 20, C.ink);
  }

  function initGame() {
    depth = 0; ballX = W * 0.5; targetX = W * 0.5; pressing = false;
    gateSide = Math.random() < 0.5 ? 'left' : 'right';
    milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    pressing = true; targetX = x;
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pressing || finished) return;
    targetX = x;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    pressing = false;
    game.audio.play('se_tap', 0.05);
  });

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

  function stepBall(dt) {
    var c = centerAt(depth);
    if (pressing) ballX += (targetX - ballX) * Math.min(1, dt * 9);
    else ballX += (c.cx - ballX) * Math.min(1, dt * 2.2);
    depth = Math.min(1, depth + dt / DUR);
    if (Math.abs(ballX - c.cx) > c.half) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(ballX, TOP_Y + (BOT_Y - TOP_Y) * depth, { text: 'MISS' });
      finish();
      return;
    }
    if (depth >= GATE_F - GATE_HALFBAND && depth <= GATE_F + GATE_HALFBAND) {
      var blocked = gateSide === 'left' ? ballX < c.cx : ballX > c.cx;
      if (blocked) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(ballX, TOP_Y + (BOT_Y - TOP_Y) * depth, { text: 'MISS' });
        finish();
        return;
      }
    }
    if (!milestoneShown && depth >= 0.5) {
      milestoneShown = true;
      game.fx.popup('50 / 100', ballX, TOP_Y + (BOT_Y - TOP_Y) * depth - 60, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.35);
    }
    if (depth >= 1) {
      finished = true; ok = true; hitStop = 0.12;
      game.feedback.good(ballX, BOT_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(ballX, BOT_Y, { color: C.gold, count: 18, speed: 380 });
      finish();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (depth === undefined) initGame();
      bg();
      stepDemo(dt);
      drawChute(depth);
      game.draw.circle(ballX, TOP_Y + (BOT_Y - TOP_Y) * depth, 22, C.ballDark);
      game.draw.circle(ballX, TOP_Y + (BOT_Y - TOP_Y) * depth, 17, C.ball);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawChute(depth);
      game.draw.circle(ballX, TOP_Y + (BOT_Y - TOP_Y) * depth, 20, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(Math.round(depth * 100) + ' / 100', W / 2, H * 0.10, 30, C.gold);
      if (!ok && depth > 0.8) txt('あと少し!', W / 2, H * 0.14, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(depth * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepBall(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawChute(depth);
    if (!finished || ok) game.draw.circle(ballX, TOP_Y + (BOT_Y - TOP_Y) * depth, 22, C.ballDark);
    if (!finished || ok) game.draw.circle(ballX, TOP_Y + (BOT_Y - TOP_Y) * depth, 17, C.ball);

    txt(Math.round(depth * 100) + ' / 100', W / 2, H * 0.04, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * depth, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  var demo = { t: 0, gx: W * 0.5, gy: H * 1.30, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) { depth = 0; ballX = W * 0.5; milestoneShown = false; }
    var f = Math.min(1, cyc / 3.5);
    depth = f;
    var c = centerAt(f);
    ballX += (c.cx - ballX) * Math.min(1, dt * 6);
    demo.gx = ballX; demo.gy = TOP_Y + (BOT_Y - TOP_Y) * f + H * 0.14;
    demo.press = cyc < 3.5;
    if (!milestoneShown && depth >= 0.5) { milestoneShown = true; game.fx.popup('50 / 100', ballX, TOP_Y + (BOT_Y - TOP_Y) * depth - 60, { color: C.gold, size: 34 }); }
  }

  game.onStart(function() {
    game.audio.melody([['F3', 0.3], ['A3', 0.3], ['C4', 0.3], ['F4', 0.6]], { tempo: 108, wave: 'triangle', volume: 0.05, loop: true, bass: [['F2', 1], ['C3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
