// I-DS-0011-circuit-solder.js
// サーキットソルダー — 基板の発光パッドを同色の相手まで指でなぞって繋ぐ
// 操作: 光っている発端パッドから指を離さずドラッグし、同じ色の受けパッドの上で離す
// 終わり: 制限時間内に全パッドを正しく繋げば成功。過熱ゲージが満タンになるか時間切れで失敗
// @mechanic: connect
// @theme: circuit_repair
// 世界観: 深夜の基板修理工房。小さな修理ドローンが過熱寸前の基板の断線を直す。発端と受けを同色で繋ぐたび冷えていくが、繋ぎ違えると過熱する
// 残るもの: 正誤(CLEAR/GAME OVER) + 繋いだ本数のスコア
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit PC MONITOR: 緑/琥珀モノクロ基調のCRT走査線、太いドット
  var C = {
    bg1: '#0a140a', bg2: '#051005', board: '#0e1f0e', grid: '#123a12',
    good: '#4dff7a', bad: '#ff4d4a', gold: '#ffd400', white: '#d8ffe0', ink: '#020602',
    pad: ['#4dff7a', '#ffd400', '#4dc8ff', '#ff8a4d'],
  };

  var GAME_TITLE = 'CIRCUIT SOLDER';
  var TIME_LIMIT = 18;
  var HEAT_MAX = 3;
  var PAD_R = 62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var SRC = [
    { x: W * 0.22, y: H * 0.30 }, { x: W * 0.78, y: H * 0.30 },
    { x: W * 0.22, y: H * 0.46 }, { x: W * 0.78, y: H * 0.46 },
  ];
  var DST = [
    { x: W * 0.32, y: H * 0.64 }, { x: W * 0.68, y: H * 0.64 },
    { x: W * 0.32, y: H * 0.58 }, { x: W * 0.68, y: H * 0.58 },
  ];

  var pads, done, endWait, finished, heat, connected, timeLeft, dragFrom, dragX, dragY;
  var ready, hitStop, shake, milestoneShown, warnT, dronePulse;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRONE_A = ['.####.', '######', '.#..#.', '.#..#.'];
  var DRONE_B = ['.####.', '######', '.#..#.', '..##..'];

  function boardBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(W * 0.08, H * 0.22, W * 0.84, H * 0.5, C.board);
    for (var i = 1; i < 10; i++) game.draw.line(W * 0.08, H * 0.22 + (H * 0.5) * (i / 10), W * 0.92, H * 0.22 + (H * 0.5) * (i / 10), C.grid, 2);
    for (var j = 1; j < 8; j++) game.draw.line(W * 0.08 + (W * 0.84) * (j / 8), H * 0.22, W * 0.08 + (W * 0.84) * (j / 8), H * 0.72, C.grid, 2);
    var frame = Math.floor(game.time.elapsed * 4) % 2 === 0 ? DRONE_A : DRONE_B;
    dronePulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 3);
    game.draw.sprite(frame, { '#': heat >= HEAT_MAX - 1 ? C.bad : C.good }, W * 0.5, H * 0.80, 14, { anchor: 'center' });
  }

  function drawWires() {
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (p.linked) game.draw.line(SRC[i].x, SRC[i].y, DST[i].x, DST[i].y, C.pad[i], 10);
    }
    if (dragFrom !== null) {
      game.draw.line(SRC[dragFrom].x, SRC[dragFrom].y, dragX, dragY, C.pad[dragFrom], 8, 0.85);
    }
  }

  function drawPads() {
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      var srcLit = !p.linked && (Math.floor(game.time.elapsed * 4 + i) % 2 === 0);
      game.draw.circle(SRC[i].x, SRC[i].y, PAD_R * 0.55, C.pad[i], p.linked ? 0.4 : (srcLit ? 1 : 0.7));
      game.draw.circle(SRC[i].x, SRC[i].y, PAD_R * 0.25, C.white, p.linked ? 0.2 : 0.9);
      game.draw.circle(DST[i].x, DST[i].y, PAD_R * 0.5, C.ink, 1);
      game.draw.circle(DST[i].x, DST[i].y, PAD_R * 0.5, C.pad[i], p.linked ? 1 : 0.35);
    }
  }

  function initGame() {
    pads = []; for (var i = 0; i < SRC.length; i++) pads.push({ linked: false });
    done = false; endWait = 0; finished = false;
    heat = 0; connected = 0; timeLeft = TIME_LIMIT;
    dragFrom = null; dragX = 0; dragY = 0;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false; warnT = 0;
  }

  function nearestSrc(x, y) {
    var best = -1, bd = PAD_R;
    for (var i = 0; i < SRC.length; i++) {
      if (pads[i].linked) continue;
      var d = Math.hypot(SRC[i].x - x, SRC[i].y - y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function beginDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var i = nearestSrc(x, y);
    if (i >= 0) { dragFrom = i; dragX = x; dragY = y; game.audio.play('se_tap', 0.08); }
  }

  function moveDrag(x, y) {
    if (dragFrom === null) return;
    dragX = x; dragY = y;
  }

  function endDrag(x, y) {
    if (dragFrom === null) return;
    var i = dragFrom; dragFrom = null;
    var d = Math.hypot(DST[i].x - x, DST[i].y - y);
    if (d < PAD_R * 0.9) {
      pads[i].linked = true; connected++;
      game.feedback.good(DST[i].x, DST[i].y, { text: 'LINK', color: C.pad[i] });
      game.fx.burst(DST[i].x, DST[i].y, { color: C.pad[i], count: 14, speed: 300 });
      game.audio.play('se_coin', 0.4);
      if (heat > 0) heat = Math.max(0, heat - 1);
      if (connected === 2 && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup(connected + ' / ' + pads.length, W / 2, H * 0.20, { color: C.gold, size: 44 });
        game.audio.play('se_milestone', 0.4);
      }
      if (connected >= pads.length) { ok = true; finished = true; finish(); }
    } else {
      heat++;
      hitStop = 0.12; shake = 0.18;
      game.feedback.bad(x, y, { text: 'SPARK' });
      game.audio.play('se_bad', 0.4);
      if (heat >= HEAT_MAX) { ok = false; finished = true; finish(); }
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); demo.t = 0; return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) beginDrag(x, y); });
  game.onMove(function(x, y) { if (state === S.PLAYING) moveDrag(x, y); });
  game.onRelease(function(x, y) { if (state === S.PLAYING) endDrag(x, y); });

  // ── ATTRACT ゴースト実演: 実際の beginDrag/moveDrag/endDrag を流用し2本繋いで見せる ──
  var demo = {
    t: 0, gx: SRC[0].x, gy: SRC[0].y, press: false, phase: 'move-in', idx: 0, wait: 0.4,
  };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) {
      pads = []; for (var i = 0; i < SRC.length; i++) pads.push({ linked: false });
      dragFrom = null; heat = 0; connected = 0; demo.idx = 0; demo.phase = 'move-in'; demo.wait = 0.4;
      demo.gx = SRC[0].x; demo.gy = SRC[0].y;
    }
    var srcP = SRC[demo.idx % SRC.length];
    var dstP = DST[demo.idx % SRC.length];
    if (demo.phase === 'move-in') {
      demo.gx += (srcP.x - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (srcP.y - demo.gy) * Math.min(1, dt * 6);
      if (Math.hypot(demo.gx - srcP.x, demo.gy - srcP.y) < 6) {
        demo.phase = 'drag'; demo.press = true; beginDrag(srcP.x, srcP.y);
      }
    } else if (demo.phase === 'drag') {
      demo.gx += (dstP.x - demo.gx) * Math.min(1, dt * 3.2);
      demo.gy += (dstP.y - demo.gy) * Math.min(1, dt * 3.2);
      moveDrag(demo.gx, demo.gy);
      if (Math.hypot(demo.gx - dstP.x, demo.gy - dstP.y) < 6) {
        endDrag(dstP.x, dstP.y);
        demo.press = false; demo.phase = 'wait'; demo.wait = 0.5; demo.idx++;
      }
    } else if (demo.phase === 'wait') {
      demo.wait -= dt;
      if (demo.wait <= 0) {
        if (demo.idx >= 2) { demo.idx = 0; }
        demo.phase = 'move-in';
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pads === undefined) initGame();
      boardBg();
      stepDemo(dt);
      drawWires();
      drawPads();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 46, C.good);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.90, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      boardBg();
      drawWires(); drawPads();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 50, ok ? C.good : C.bad);
      txt(connected + ' / ' + pads.length, W / 2, H * 0.145, 32, C.white);
      var best = Math.max(game.best, connected);
      txt('BEST ' + best, W / 2, H * 0.18, 24, C.gold);
      if (!ok && connected === pads.length - 1) txt('あと1個!', W / 2, H * 0.22, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(connected, { connected: connected, heat: heat });
        else game.end.failure({ connected: connected, heat: heat });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (heat >= HEAT_MAX - 1) warnT += dt; else warnT = 0;
      if (timeLeft <= 0) { ok = false; finished = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    boardBg();
    drawWires();
    drawPads();
    if (dragFrom !== null) game.draw.circle(dragX, dragY, 16, C.pad[dragFrom]);

    txt(connected + ' / ' + pads.length, W * 0.28, 110, 34, C.white, 'center');
    txt(Math.max(0, Math.ceil(timeLeft)) + 's', W * 0.72, 110, 34, C.white, 'center');
    game.draw.rect(60, 150, W - 120, 20, C.ink, 0.6);
    game.draw.rect(60, 150, (W - 120) * (heat / HEAT_MAX), 20, warnT > 0 && Math.floor(warnT * 8) % 2 === 0 ? C.white : C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['E4', 0.15], ['G4', 0.15], ['B4', 0.15], ['E5', 0.3]],
      { tempo: 140, wave: 'square', volume: 0.05, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
