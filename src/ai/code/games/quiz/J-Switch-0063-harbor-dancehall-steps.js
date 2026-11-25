// J-Switch-0063-harbor-dancehall-steps.js
// 港のダンスホール踏み譜 — 師匠が光らせながら踏んでいった床板の順番を覚え、同じ順に踏んで舞台を進む
// 操作: 師匠が踏み終えたら、光った床板を同じ順番にタップ。間違えた板を踏む/3秒止まるとつまずく(社内メモ。画面には出さない)
// 終わり: 3つの踏み譜(3歩・4歩・5歩)を間違えずに踏めばCLEAR。1歩でも間違える/止まる/時間切れでGAME OVER
// @mechanic: memory_sequence
// @theme: harbor_dancehall_steps
// 世界観: 港町の古いダンスホールの閉店後、見習いのタップダンサーが、師匠が音を鳴らしながら踏んでみせた床板の順番を覚えて一枚ずつ同じ順に踏み直し、夜明けの初舞台に出る許しをもらう
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく踏んだ歩数・すばやく続けて踏めたPERFECT数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線画。面はほぼ塗らず、線の明るさで光らせる
  var STYLE = { bg: ['#02030a', '#060a1c', '#000000'], main: ['#5affe0', '#2a8a7a', '#123a36'], accent: ['#ff5af0', '#ffe65a'] };
  var C = {
    bg1: '#060a1c', bg2: '#02030a', cyan: '#5affe0', cyanDim: '#1f6a60', mag: '#ff5af0', magDim: '#6a2466',
    yellow: '#ffe65a', white: '#eafffb', red: '#ff4a5a', ink: '#000000', good: '#9dffb2'
  };

  var GAME_TITLE = 'DANCEHALL STEPS';
  var TIME_LIMIT = 20;
  var NEEDED = 3;
  var LENS = [3, 4, 5];
  var SHOW_GAP = [0.55, 0.48, 0.42];
  var INPUT_WAIT = 3;
  var QUICK = 0.6;
  var GX = W / 2, GY = H * 0.5, TS = 220, GAP = 24;
  var NOTES = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5'];
  var TILES = [];
  for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) TILES.push({ x: GX + (c - 1) * (TS + GAP), y: GY + (r - 1) * (TS + GAP) });

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, pt, ready, timeLeft, round, seq, si, inputIdx, waitT, lastStepT, steps, perfects, glow, teacherTile, meTile, meHop, teachHop;
  var hitStop, outro, ok, endFx, wrongTile, combo;

  // ── sprites(線画風の細いドット)──────────────────────────────
  var DANCER = [
    ['..hhhh..', '..h..h..', '.hhhhhh.', '..w..w..', '..wwww..', '...ww..c', '.wwwwwwc', 'w.wwww.c', '..w..w..', '.w....w.', 'ww....ww'],
    ['..hhhh..', '..h..h..', '.hhhhhh.', '..w..w..', '..wwww..', 'c..ww...', 'cwwwwww.', 'c.wwww.w', '..w..w..', '..w..w..', '.ww..ww.']
  ];
  var MIRRORBALL = ['..wwww..', '.w.w.ww.', 'ww.w.w.w', 'w.w.w.ww', 'ww.w.w.w', '.ww.w.w.', '..wwww..'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.magDim, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function box(x, y, s, col, w) {
    var h = s / 2;
    game.draw.line(x - h, y - h, x + h, y - h, col, w);
    game.draw.line(x + h, y - h, x + h, y + h, col, w);
    game.draw.line(x + h, y + h, x - h, y + h, col, w);
    game.draw.line(x - h, y + h, x - h, y - h, col, w);
  }

  function tileAt(x, y) {
    for (var i = 0; i < TILES.length; i++) if (Math.abs(x - TILES[i].x) <= TS / 2 + GAP / 2 && Math.abs(y - TILES[i].y) <= TS / 2 + GAP / 2) return i;
    return -1;
  }

  function buildSeq(n) {
    var out = [], prev = -1;
    for (var i = 0; i < n; i++) {
      var k;
      do { k = Math.floor(Math.random() * 9); } while (k === prev);
      out.push(k); prev = k;
    }
    return out;
  }

  function startRound(r) {
    round = r; seq = buildSeq(LENS[r]); si = -1; inputIdx = 0; waitT = 0;
    phase = 'show'; pt = 0.5; teacherTile = 4; meTile = -1;
  }

  function initGame() {
    ready = 0.8; timeLeft = TIME_LIMIT; steps = 0; perfects = 0; combo = 0;
    glow = [0, 0, 0, 0, 0, 0, 0, 0, 0]; meHop = 0; teachHop = 0; lastStepT = 0;
    hitStop = 0; outro = 0; ok = false; endFx = false; wrongTile = -1;
    startRound(0);
    phase = 'ready';
  }

  function advance(dt, demo) {
    for (var g = 0; g < 9; g++) if (glow[g] > 0) glow[g] = Math.max(0, glow[g] - dt * 2.2);
    if (meHop > 0) meHop = Math.max(0, meHop - dt * 4);
    if (teachHop > 0) teachHop = Math.max(0, teachHop - dt * 4);
    if (phase === 'show') {
      pt -= dt;
      if (pt <= 0) {
        si++;
        if (si >= seq.length) {
          phase = 'input'; waitT = 0; lastStepT = 0; meTile = -1;
          if (!demo) game.audio.tone('G5', 0.05, { wave: 'triangle', volume: 0.04 });
          return;
        }
        var k = seq[si];
        teacherTile = k; teachHop = 1; glow[k] = 1;
        game.audio.tone(NOTES[k], 0.16, { wave: 'square', volume: demo ? 0.02 : 0.06 });
        pt = SHOW_GAP[round];
      }
    } else if (phase === 'input') {
      waitT += dt; lastStepT += dt;
      if (waitT > INPUT_WAIT) { wrongTile = -1; if (demo) startRound(0); else fail(); }
    } else if (phase === 'next') {
      pt -= dt;
      if (pt <= 0) {
        if (round + 1 >= NEEDED) { if (demo) { steps = 0; perfects = 0; startRound(0); } else endRun(true); }
        else startRound(round + 1);
      }
    }
  }

  // ── 一歩踏む(実プレイ・デモ共用)──────────────────────────────
  function stepOn(k, demo) {
    if (phase !== 'input') return;
    var want = seq[inputIdx];
    meTile = k; meHop = 1; waitT = 0;
    if (k !== want) {
      wrongTile = k;
      if (demo) { game.fx.burst(TILES[k].x, TILES[k].y, { color: C.red, count: 8, speed: 180 }); startRound(0); return; }
      fail();
      return;
    }
    var quick = inputIdx > 0 && lastStepT <= QUICK;
    lastStepT = 0; glow[k] = 1; inputIdx++; steps++;
    if (quick) { perfects++; combo++; } else combo = 0;
    game.audio.tone(NOTES[k], 0.12, { wave: 'square', volume: demo ? 0.02 : 0.06 });
    if (demo) { game.fx.burst(TILES[k].x, TILES[k].y, { color: C.cyan, count: 6, speed: 150 }); }
    else game.feedback.good(TILES[k].x, TILES[k].y - 140, { text: quick ? 'PERFECT' : 'GOOD', color: quick ? C.yellow : C.cyan, count: quick ? 10 : 6, volume: 0.25 });
    if (inputIdx >= seq.length) {
      phase = 'next'; pt = 0.7;
      if (!demo) {
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(round + 1 >= NEEDED ? 'CLEAR' : 'NICE', W / 2, H * 0.24, { color: C.mag, size: 72 });
      }
    }
  }

  function fail() {
    game.audio.tone('C3', 0.25, { wave: 'sawtooth', volume: 0.05, slide: -60 });
    endRun(false);
  }

  function endRun(win) {
    if (phase === 'stop') return;
    ok = win; phase = 'stop'; hitStop = 0.55; endFx = false;
    game.audio.stopBgm();
  }

  function score() { return steps * 50 + perfects * 30 + (ok ? Math.round(timeLeft * 15) : 0); }

  // ── input ───────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.4); state = S.ATTRACT; initGame(); demo.t = 0; startTheme(); return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    var k = tileAt(x, y);
    if (phase !== 'input' || k < 0) {
      game.audio.tone('A2', 0.03, { wave: 'triangle', volume: 0.03 });
      game.fx.burst(x, y, { color: C.cyanDim, count: 3, speed: 80 });
      return;
    }
    game.audio.play('se_tap', 0.15);
    stepOn(k, false);
  });

  // ── demo(師匠の踏み譜を覚えて踏み直す。2つ目の譜で1回踏み違える)────
  var demo = { t: 0, gx: GX, gy: H * 0.82, press: 0, next: 0, slip: false };
  var DEMO_CYC = 24;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'show'; demo.slip = false; demo.next = 0.4; }
    advance(dt, true);
    if (demo.press > 0) demo.press -= dt;
    var target = { x: GX + Math.sin(demo.t * 1.2) * 80, y: H * 0.82 };
    if (phase === 'input') {
      var want = seq[inputIdx];
      if (round === 1 && inputIdx === 2 && !demo.slip) want = (want + 4) % 9;
      target = TILES[want];
      demo.next -= dt;
      if (demo.next <= 0 && Math.hypot(demo.gx - target.x, demo.gy - target.y) < 30) {
        if (want !== seq[inputIdx]) demo.slip = true;
        stepOn(want, true); demo.press = 0.15; demo.next = 0.35;
      }
    } else demo.next = 0.3;
    demo.gx += (target.x - demo.gx) * Math.min(1, dt * 9);
    demo.gy += (target.y - demo.gy) * Math.min(1, dt * 9);
  }

  // ── drawing ─────────────────────────────────────────────────────
  function drawHall() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg2], [1, C.bg1]]);
    // アーチと柱(線画)
    for (var a = 0; a < 3; a++) {
      var ax = W * 0.2 + a * W * 0.3;
      game.draw.line(ax - 120, H * 0.28, ax - 120, H * 0.14, C.cyanDim, 3);
      game.draw.line(ax + 120, H * 0.28, ax + 120, H * 0.14, C.cyanDim, 3);
      for (var s = 0; s < 8; s++) {
        var a0 = Math.PI + s / 8 * Math.PI, a1 = Math.PI + (s + 1) / 8 * Math.PI;
        game.draw.line(ax + Math.cos(a0) * 120, H * 0.14 + Math.sin(a0) * 80, ax + Math.cos(a1) * 120, H * 0.14 + Math.sin(a1) * 80, C.cyanDim, 3);
      }
    }
    // ミラーボールと光の筋
    var mx = W / 2, my = 300 + Math.sin(t * 1.3) * 6;
    game.draw.line(mx, 230, mx, my - 30, C.cyanDim, 2);
    game.draw.sprite(MIRRORBALL, { w: C.white }, mx, my, 9, { anchor: 'center' });
    for (var b = 0; b < 6; b++) {
      var ang = t * 0.6 + b * Math.PI / 3;
      game.draw.line(mx, my, mx + Math.cos(ang) * 700, my + Math.abs(Math.sin(ang)) * 700 + 200, b % 2 ? C.magDim : C.cyanDim, 2);
    }
    // 客席のシルエット(線)
    for (var p = 0; p < 12; p++) {
      var px = 50 + p * 90, py = H * 0.8 + Math.sin(t * 2 + p) * 4;
      game.draw.line(px, py + 50, px, py + 10, C.magDim, 3);
      game.draw.line(px - 14, py, px + 14, py, C.magDim, 3);
    }
    game.draw.line(0, H * 0.79, W, H * 0.79, C.cyanDim, 3);
    game.draw.rect(0, 0, W, H, C.cyan, 0.012 + 0.012 * Math.sin(t * 1.6));
  }

  function drawFloor() {
    var t = game.time.elapsed;
    box(GX, GY, TS * 3 + GAP * 4, C.cyanDim, 4);
    for (var i = 0; i < 9; i++) {
      var tl = TILES[i];
      var g = glow[i];
      var hl = phase === 'stop' && hitStop > 0 && !ok;
      var isWant = hl && seq && seq[inputIdx] === i;
      var isWrong = hl && wrongTile === i;
      var col = isWrong ? C.red : (isWant ? C.yellow : (g > 0 ? C.cyan : C.cyanDim));
      var width = isWant || isWrong ? 10 + 4 * Math.sin(t * 30) : 7 + g * 8;
      box(tl.x, tl.y, TS, col, width);
      box(tl.x, tl.y, TS * 0.7, col, 4 + g * 3);
      if (g > 0) {
        game.draw.rect(tl.x - TS / 2, tl.y - TS / 2, TS, TS, C.cyan, g * 0.18);
        box(tl.x, tl.y, TS * (1 + (1 - g) * 0.3), C.cyan, 2);
      }
      if (isWant) game.draw.rect(tl.x - TS / 2, tl.y - TS / 2, TS, TS, C.yellow, 0.25);
      if (isWrong) {
        game.draw.line(tl.x - TS * 0.4, tl.y - TS * 0.3, tl.x + TS * 0.3, tl.y + TS * 0.4, C.red, 6);
        game.draw.line(tl.x + TS * 0.1, tl.y - TS * 0.4, tl.x - TS * 0.2, tl.y + TS * 0.3, C.red, 6);
      }
    }
  }

  function drawDancers() {
    var t = game.time.elapsed;
    // 師匠(マゼンタ): 見せている間は床板の上で踏む
    var showing = phase === 'show' || phase === 'ready';
    var tt = TILES[teacherTile];
    var tx = showing ? tt.x : W * 0.84, ty = showing ? tt.y - 30 : H * 0.72;
    game.draw.sprite(DANCER[Math.floor(t * 4) % 2], { h: C.mag, w: C.mag, c: C.yellow }, tx + Math.sin(t * 2) * 6, ty - teachHop * 40 + Math.sin(t * 5) * 3, 10, { anchor: 'center' });
    // 見習い(シアン)
    var mt = meTile >= 0 ? TILES[meTile] : { x: W * 0.16, y: H * 0.72 + 30 };
    game.draw.sprite(DANCER[Math.floor(t * 3 + 1) % 2], { h: C.cyan, w: C.cyan, c: C.white }, mt.x + Math.sin(t * 2.4) * 5, mt.y - 30 - meHop * 50 + Math.sin(t * 4) * 3, 10, { anchor: 'center' });
  }

  function drawProgress() {
    // 今の踏み譜の歩数(点)
    if (!seq) return;
    var n = seq.length, x0 = W / 2 - (n - 1) * 36;
    for (var i = 0; i < n; i++) {
      var done = phase === 'input' || phase === 'next' || phase === 'stop' ? i < inputIdx : i <= si;
      game.draw.circle(x0 + i * 72, H * 0.86, 18, done ? C.cyan : C.cyanDim, done ? 0.9 : 0.5);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.8);
    game.draw.line(0, 226, W, 226, C.cyanDim, 3);
    txt(Math.min(round + (phase === 'next' || (phase === 'stop' && ok) ? 1 : 0), NEEDED) + ' / ' + NEEDED, W / 2, 90, 64, C.mag);
    txt(String(Math.ceil(Math.max(0, timeLeft))), 70, 90, 52, C.cyan, 'left');
    if (combo >= 2) txt('x' + combo, W - 70, 90, 44, C.yellow, 'right');
    var lowT = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    var tw = (W - 120) * Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.line(60, 178, W - 60, 178, C.cyanDim, 4);
    game.draw.line(60, 178, 60 + tw, 178, lowT ? C.red : C.cyan, 10);
    if (phase === 'input') {
      var wb = Math.max(0, 1 - waitT / INPUT_WAIT);
      game.draw.line(GX - 180, H * 0.9, GX - 180 + 360 * wb, H * 0.9, waitT > 2 ? C.red : C.mag, 6);
    }
  }

  function startTheme() {
    game.audio.melody([['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['B4', 0.5], ['G4', 1], ['A4', 0.5], ['E4', 0.5], ['A4', 1]],
      { tempo: 140, wave: 'square', volume: 0.035, loop: true, bass: [['A2', 2], ['G2', 2], ['F2', 2], ['E2', 2]] });
  }

  // ── main loop ───────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawHall(); drawFloor(); drawDancers(); drawProgress();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.4) * 8, 96 + Math.sin(t * 2.2) * 6, 70, C.mag);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 184, 36, C.cyan);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 40, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.955, 34, C.cyan);
      return;
    }

    if (state === S.RESULT) {
      drawHall(); drawFloor(); drawDancers();
      game.draw.rect(0, H * 0.36, W, H * 0.26, C.ink, 0.8);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.41, 96, ok ? C.mag : C.red);
      txt(steps + ' / ' + (LENS[0] + LENS[1] + LENS[2]), W / 2, H * 0.47, 56, C.cyan);
      txt('SCORE ' + score(), W / 2, H * 0.52, 44, C.white);
      txt('PERFECT ' + perfects + '   BEST ' + (game.best || 0), W / 2, H * 0.57, 32, C.yellow);
      var left = 12 - steps;
      if (!ok && left > 0 && left <= 2) txt('あと' + left + '歩!', W / 2, H * 0.86, 56, C.red);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 38, C.cyan);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'show'; pt = 0.3; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'stop') {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0 && !endFx) {
          endFx = true;
          if (ok) {
            game.feedback.good(W / 2, H * 0.3, { text: 'CLEAR', color: C.mag, count: 26 });
            game.audio.play('se_success', 0.6);
          } else {
            var ft = TILES[wrongTile >= 0 ? wrongTile : seq[inputIdx]];
            game.feedback.bad(ft.x, ft.y - 150, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.red });
            game.audio.play('se_failure', 0.6);
          }
          outro = 1.2;
        }
      } else {
        outro -= dt;
        if (outro <= 0) {
          state = S.RESULT;
          var stats = { steps: steps, perfects: perfects, rounds: round + (ok ? 1 : 0) };
          if (ok) game.end.success(score(), stats); else game.end.failure(stats);
        }
      }
    } else {
      advance(dt, false);
      if (phase !== 'stop' && phase !== 'next') {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; wrongTile = -1; endRun(false); }
      }
    }

    drawHall(); drawFloor(); drawDancers(); drawProgress(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, GY, 96, C.yellow);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    startTheme();
  });
})(game);
