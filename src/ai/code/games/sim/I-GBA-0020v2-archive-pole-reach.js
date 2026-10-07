// I-GBA-0020v2-archive-pole-reach.js
// アーカイブポールリーチ — 押している間だけ取り棒がまっすぐ伸び、上段の本の背にぴったりの長さで離す
// 操作: 画面を押している間だけ取り棒が真上へ伸び続ける。光っている本の背の高さに先端が来たところで指を離す
// 終わり: 4冊取れればCLEAR。足りずに離す/伸ばしすぎて棚板に当てるのが2回、または時間切れでGAME OVER
// @mechanic: hold_duration
// @theme: archive_reach_pole
// 世界観: 古い図書館の高い書架の前で、司書が伸縮する取り棒を伸ばし、上段で頼まれた本の背にぴったり届く長さで止めて一冊ずつ抜き取っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 取れた冊数と先端のズレ(px)
// スタイル: 90s PRE-RENDER
var STYLE = { bg: ['#16141c', '#2a2430', '#3b3140'], main: ['#b89a6a', '#6e5638'], accent: ['#f0c75a', '#d0523c'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TITLE = 'ARCHIVE REACH';
  var TIME_LIMIT = 15;
  var NEEDED = 4;
  var MISS_MAX = 2;
  var BASE_Y = H * 0.75;
  var TOP_Y = H * 0.14;
  var SHELF_L = 150, SHELF_R = W - 150;
  var ROW_Y = [1290, 1140, 990, 840, 690, 540, 390];
  var COLS = [W * 0.3, W * 0.5, W * 0.7];
  var TASKS = [
    { col: 1, row: 2, tol: 50, speed: 460 },
    { col: 0, row: 3, tol: 46, speed: 540 },
    { col: 2, row: 5, tol: 42, speed: 620 },
    { col: 1, row: 4, tol: 38, speed: 700 },
    { col: 0, row: 6, tol: 36, speed: 760 },
  ];

  var LIB_A = [
    '...hhhh...',
    '..hhhhhh..',
    '..hsssshh.',
    '..gsgsgs..',
    '..ssssss..',
    '...sffs...',
    '.vvvvvvvv.',
    'vvvwwvvvvs',
    'vvvwwvvvvs',
    'vv.vvvvv..',
    '...kkkk...',
    '...k..k...',
    '...k..k...',
    '..bb..bb..',
  ];
  var LIB_B = [
    '...hhhh...',
    '..hhhhhh..',
    '..hsssshh.',
    '..gsgsgs..',
    '..ssssss..',
    '...ssss...',
    '.vvvvvvvv.',
    'vvvwwvvvvs',
    'vvvwwvvvvs',
    'vv.vvvvv..',
    '...kkkk...',
    '...k..k...',
    '..k....k..',
    '.bb....bb.',
  ];
  var LIB_PAL = { h: '#5b4a3a', s: '#e3c29a', g: '#cfd6e0', f: '#a0584a', v: '#3e5a6e', w: '#e8e0d0', k: '#2a2a33', b: '#1a1418' };
  var HOOK = ['.mm.', 'm..m', '...m', '..m.', '.m..', 'mm..'];
  var HOOK_PAL = { m: '#e0dccf' };
  var BOOK = ['pppp', 'pllp', 'pppp', 'pllp', 'pppp'];
  var LAMP = ['.oo.', 'oyyo', 'oyyo', '.oo.'];

  var mode = 'ATTRACT';
  var clock, taskIx, hits, misses, errSum, len, holding, phase, phaseT, idle, libX, cue, done, endT, won, newRec, finalScore;
  var carried = [];
  var spineColors = [];
  for (var r = 0; r < ROW_Y.length; r++) {
    var rowc = [];
    for (var b = 0; b < 16; b++) rowc.push(['#6e3a2c', '#3c4f3a', '#48405e', '#7a6532', '#2f4550', '#5c2f3c'][(r * 7 + b * 3) % 6]);
    spineColors.push(rowc);
  }

  function taskAt(i) {
    var t = TASKS[Math.min(i, TASKS.length - 1)];
    return { x: COLS[t.col], y: ROW_Y[t.row] - 62, tol: t.tol, speed: t.speed, rowY: ROW_Y[t.row] };
  }

  function resetRun() {
    clock = TIME_LIMIT; taskIx = 0; hits = 0; misses = 0; errSum = 0;
    len = 0; holding = false; phase = 'ready'; phaseT = 0.8; idle = 0;
    libX = W * 0.5; cue = null; done = false; endT = 0; won = false; newRec = false; finalScore = 0;
    carried = [];
  }

  function say(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#07060a', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  // ── 背景(プリレンダ風の一枚絵: 暗い木目 + 粒状ノイズ + 奥行きの影) ───────────────
  function drawRoom(task) {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    game.draw.rect(SHELF_L - 30, TOP_Y + 20, SHELF_R - SHELF_L + 60, BASE_Y - TOP_Y, '#241a14');
    for (var i = 0; i < ROW_Y.length; i++) {
      var y = ROW_Y[i];
      for (var b = 0; b < 16; b++) {
        var bx = SHELF_L + 8 + b * 48;
        var bh = 96 + ((b * 13 + i * 5) % 30);
        game.draw.rect(bx, y - bh, 40, bh, spineColors[i][b]);
        game.draw.rect(bx + 4, y - bh + 14, 32, 5, '#c9a95a', 0.5);
        game.draw.rect(bx + 30, y - bh, 10, bh, '#000000', 0.25);
      }
      game.draw.rect(SHELF_L - 30, y, SHELF_R - SHELF_L + 60, 18, STYLE.main[1]);
      game.draw.rect(SHELF_L - 30, y, SHELF_R - SHELF_L + 60, 4, STYLE.main[0]);
      game.draw.rect(SHELF_L - 30, y + 18, SHELF_R - SHELF_L + 60, 10, '#000000', 0.35);
    }
    if (task) {
      var glow = 0.35 + 0.25 * Math.sin(t * 6);
      game.draw.rect(task.x - 30, task.rowY - 132, 60, 132, STYLE.accent[0], glow * 0.4);
      game.draw.sprite(BOOK, { p: '#e9b64a', l: '#fff2c0' }, task.x, task.rowY - 66, 13, { anchor: 'center' });
      game.draw.line(task.x - 44, task.y, task.x - 26, task.y, STYLE.accent[0], 4);
      game.draw.line(task.x + 26, task.y, task.x + 44, task.y, STYLE.accent[0], 4);
    }
    for (var k = 0; k < 40; k++) {
      var nx = (k * 211 + Math.floor(t * 12) * 37) % W;
      var ny = (k * 389 + Math.floor(t * 12) * 53) % H;
      game.draw.rect(nx, ny, 3, 3, '#ffffff', 0.05);
    }
    for (var m = 0; m < 7; m++) {
      var mx = (m * 157 + t * 18) % W, my = H * 0.3 + m * 110 + Math.sin(t * 0.8 + m) * 30;
      game.draw.circle(mx, my, 3, '#f5e3b0', 0.25);
    }
    var lp = 0.2 + 0.08 * Math.sin(t * 2.1);
    game.draw.circle(W * 0.5, TOP_Y - 20, 160, '#f7d27a', lp);
    game.draw.sprite(LAMP, { o: '#8a6a3a', y: '#ffe9a0' }, W * 0.5, TOP_Y - 30, 12, { anchor: 'center' });
    game.draw.rect(0, BASE_Y + 40, W, H - BASE_Y, '#1e1612', 0.9);
    game.draw.rect(0, BASE_Y + 40, W, 6, '#4a3626');
    game.draw.rect(0, 0, 60, H, '#000000', 0.35);
    game.draw.rect(W - 60, 0, 60, H, '#000000', 0.35);
  }

  function drawKeeper(x, extend, danger) {
    var bob = Math.sin(game.time.elapsed * 3) * 4;
    var fr = Math.floor(game.time.elapsed * 3) % 2 === 0 ? LIB_A : LIB_B;
    game.draw.circle(x, BASE_Y + 150, 70, '#000000', 0.35);
    game.draw.sprite(fr, LIB_PAL, x - 70, BASE_Y + 20 + bob, 14, { anchor: 'center' });
    var px = x;
    var tipY = BASE_Y - extend;
    game.draw.line(px, BASE_Y + 60, px, tipY, '#6d6a66', 14);
    game.draw.line(px - 3, BASE_Y + 60, px - 3, tipY, '#c8c4bb', 4);
    for (var s = BASE_Y; s > tipY + 40; s -= 120) game.draw.rect(px - 9, s, 18, 8, '#3a3834');
    game.draw.sprite(HOOK, HOOK_PAL, px + 4, tipY - 18, 7, { anchor: 'center' });
    if (danger) {
      var blink = Math.floor(game.time.elapsed * 14) % 2 === 0;
      if (blink) game.draw.rect(px - 60, danger - 6, 120, 30, STYLE.accent[1], 0.55);
    }
  }

  function drawCarried() {
    for (var i = 0; i < carried.length; i++) {
      var c = carried[i];
      game.draw.sprite(BOOK, { p: '#e9b64a', l: '#fff2c0' }, c.x, c.y, 9, { anchor: 'center' });
    }
  }

  // 先端の高さを判定(実プレイとデモ共通)
  function judgeTip(task) {
    var tipY = BASE_Y - len;
    var err = tipY - task.y;
    return { ok: Math.abs(err) <= task.tol, err: err, tipY: tipY, over: err < -task.tol };
  }

  function startCue(task, res) {
    cue = { t: 0.42, ok: res.ok, x: task.x, y: res.tipY, over: res.over, err: res.err };
    if (res.over) game.audio.play('se_break', 0.4);
    else game.audio.play('se_tap', 0.2);
  }

  function resolveCue(real) {
    var c = cue;
    if (c.ok) {
      game.feedback.good(c.x, c.y, { text: Math.abs(c.err) < 12 ? 'PERFECT' : 'GOOD', color: '#f7d27a' });
      game.audio.play('se_coin', 0.35);
      if (real) {
        hits++; errSum += Math.abs(c.err);
        carried.push({ x: c.x, y: c.y, vy: 0 });
        if (hits === 2) {
          game.fx.popup('NICE', W * 0.5, H * 0.3, { color: STYLE.accent[0], size: 64 });
          game.audio.play('se_milestone', 0.4);
        }
      }
    } else {
      game.feedback.bad(c.x, c.y, { text: 'MISS', shake: 14 });
      if (real) misses++;
    }
    cue = null;
  }

  function nextTask(real) {
    len = 0; holding = false; idle = 0;
    if (real) {
      if (hits >= NEEDED) return finish(true);
      if (misses >= MISS_MAX) return finish(false);
      taskIx++;
      if (taskIx >= TASKS.length) return finish(hits >= NEEDED);
    }
    phase = 'walk'; phaseT = 0.35;
  }

  function finish(ok) {
    if (done) return;
    done = true; won = ok; endT = 1.1;
    var avg = hits > 0 ? Math.round(errSum / hits) : 0;
    finalScore = hits * 100 + Math.max(0, 50 - avg) * hits + Math.round(Math.max(0, clock) * 10);
    newRec = ok && finalScore > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  // ── 共通シミュレーション(実プレイもデモもこれで動く) ─────────────────────────
  function simulate(dt, real) {
    var task = taskAt(taskIx);
    if (cue) {
      cue.t -= dt;
      if (cue.t <= 0) { resolveCue(real); phase = 'retract'; phaseT = 0.3; }
      return task;
    }
    if (phase === 'ready') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'walk'; phaseT = 0.35; game.audio.play('se_tap', 0.2); }
    } else if (phase === 'walk') {
      phaseT -= dt;
      libX += (task.x - libX) * Math.min(1, dt * 12);
      if (phaseT <= 0) { libX = task.x; phase = 'aim'; idle = 0; }
    } else if (phase === 'aim') {
      idle += dt;
      if (holding) { phase = 'extend'; }
      else if (idle > 3) {
        len = 0;
        startCue(task, { ok: false, err: 999, tipY: BASE_Y - 40, over: false });
      }
    } else if (phase === 'extend') {
      if (holding) {
        len += task.speed * dt;
        if (BASE_Y - len <= TOP_Y + 40) {
          holding = false;
          startCue(task, judgeTip(task));
        }
      }
    } else if (phase === 'retract') {
      phaseT -= dt;
      len = Math.max(0, len - dt * 2400);
      if (phaseT <= 0) nextTask(real);
    }
    for (var i = 0; i < carried.length; i++) {
      var c = carried[i];
      c.vy += 2200 * dt; c.y += c.vy * dt;
      if (c.y > BASE_Y + 110) { c.y = BASE_Y + 110; c.vy = 0; c.x += (W * 0.14 + i * 36 - c.x) * Math.min(1, dt * 6); }
    }
    return task;
  }

  function releasePole(real) {
    if (!holding) return;
    holding = false;
    if (phase === 'extend' && !cue) startCue(taskAt(taskIx), judgeTip(taskAt(taskIx)));
  }

  // ── ATTRACT: 成功1回 + 伸ばしすぎ1回を実ロジックで実演 ─────────────────────────
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, plan: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) {
      resetRun(); phase = 'walk'; phaseT = 0.35; taskIx = 0; demo.plan = 0;
    }
    if (cyc > 2.6 && demo.plan === 0) { demo.plan = 1; taskIx = 1; len = 0; holding = false; cue = null; phase = 'walk'; phaseT = 0.35; }
    var task = taskAt(taskIx);
    if (phase === 'aim' && !holding && (cyc % 2.6) > 0.5) { holding = true; game.audio.play('se_tap', 0.1); }
    if (phase === 'extend' && holding) {
      var stopAt = demo.plan === 0 ? task.y : task.y - task.tol - 70;
      if (BASE_Y - len <= stopAt) releasePole(false);
    }
    demo.press = holding;
    demo.gx = W * 0.5; demo.gy = H * 0.86;
    simulate(dt, false);
    if (phase === 'retract' && phaseT <= dt) { phase = 'idle'; }
  }

  game.onPress(function (x, y) {
    if (mode !== 'PLAYING' || done) return;
    if (phase === 'aim' || phase === 'walk') {
      holding = true;
      game.audio.play('se_tap', 0.25);
      game.fx.burst(libX, BASE_Y - 20, { color: '#c8c4bb', count: 4, speed: 120 });
    } else {
      game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.05 });
    }
  });

  game.onRelease(function (x, y) {
    if (mode !== 'PLAYING') return;
    if (holding) {
      game.audio.tone('G4', 0.06, { wave: 'triangle', volume: 0.08 });
      releasePole(true);
    }
  });

  game.onTap(function (x, y) {
    if (mode === 'ATTRACT') {
      game.audio.play('se_coin', 0.5);
      mode = 'PLAYING'; resetRun();
      return;
    }
    if (mode === 'RESULT') {
      game.audio.play('se_tap', 0.3);
      mode = 'ATTRACT'; resetRun(); demo.t = 0;
      return;
    }
  });

  function drawHud(task) {
    for (var i = 0; i < NEEDED; i++) {
      var got = i < hits;
      game.draw.sprite(BOOK, { p: got ? '#e9b64a' : '#4a3f36', l: got ? '#fff2c0' : '#5a4e44' }, 150 + i * 70, 92, 8, { anchor: 'center' });
    }
    for (var m = 0; m < MISS_MAX; m++) {
      game.draw.circle(W - 150 - m * 56, 92, 18, m < MISS_MAX - misses ? STYLE.accent[0] : '#3a3038');
    }
    say(hits + ' / ' + NEEDED, W * 0.5, 92, 44, '#f3e6c8');
    var frac = Math.max(0, clock / TIME_LIMIT);
    var low = clock < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, W - 160, 18, '#2a2226');
    game.draw.rect(80, 160, (W - 160) * frac, 18, low ? STYLE.accent[1] : STYLE.main[0]);
  }

  game.onUpdate(function (dt) {
    if (mode === 'ATTRACT') {
      if (clock === undefined) resetRun();
      stepDemo(dt);
      var dtask = taskAt(taskIx);
      drawRoom(dtask);
      var dDanger = phase === 'extend' && BASE_Y - len < dtask.y + 40 ? dtask.rowY - 150 : 0;
      drawKeeper(libX, len, dDanger);
      drawCarried();
      if (cue) game.draw.circle(cue.x, cue.y, 30 + (0.42 - cue.t) * 120, '#ffffff', 0.5);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      say(TITLE, W * 0.5, H * 0.07, 70, STYLE.accent[0]);
      say('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.115, 34, '#f3e6c8');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) say('► 100円 投入 ◄', W * 0.5, H * 0.95, 46, STYLE.accent[0]);
      else say('INSERT COIN', W * 0.5, H * 0.95, 38, '#f3e6c8');
      return;
    }

    if (mode === 'RESULT') {
      drawRoom(null);
      drawKeeper(libX, 0, 0);
      drawCarried();
      game.draw.rect(90, H * 0.2, W - 180, 520, '#0c0a10', 0.78);
      say(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.25, 96, won ? '#f7d27a' : STYLE.accent[1]);
      say(hits + ' / ' + NEEDED, W * 0.5, H * 0.32, 64, '#f3e6c8');
      say('SCORE ' + finalScore, W * 0.5, H * 0.38, 46, '#f3e6c8');
      say('BEST ' + Math.max(game.best || 0, won ? finalScore : 0), W * 0.5, H * 0.42, 38, STYLE.main[0]);
      if (newRec) say('NEW RECORD', W * 0.5, H * 0.46, 50, STYLE.accent[0]);
      else if (!won) say('あと' + Math.max(1, NEEDED - hits) + '冊!', W * 0.5, H * 0.46, 46, STYLE.accent[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W * 0.5, H * 0.94, 40, '#f3e6c8');
      return;
    }

    // PLAYING
    var task;
    if (done) {
      task = taskAt(taskIx);
      endT -= dt;
      if (endT <= 0) {
        mode = 'RESULT';
        var avg = hits > 0 ? Math.round(errSum / hits) : 0;
        if (won) game.end.success(finalScore, { books: hits, misses: misses, avgErrPx: avg });
        else game.end.failure({ books: hits, misses: misses, avgErrPx: avg });
      }
    } else {
      task = simulate(dt, true);
      if (phase !== 'ready' && !cue) {
        clock -= dt;
        if (clock <= 0) {
          clock = 0;
          game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: STYLE.accent[1], size: 72 });
          finish(false);
        }
      }
    }

    drawRoom(done ? null : task);
    var danger = phase === 'extend' && BASE_Y - len < task.y + 40 ? task.rowY - 150 : 0;
    if (danger && Math.floor(game.time.elapsed * 14) % 3 === 0) game.audio.tone('E6', 0.03, { wave: 'square', volume: 0.03 });
    drawKeeper(libX, len, danger);
    drawCarried();
    if (cue) {
      var k = 0.42 - cue.t;
      game.draw.circle(cue.x, cue.y, 26 + k * 140, '#ffffff', 0.55);
      game.draw.circle(cue.x, cue.y, 18, '#ffffff');
    }
    drawHud(task);
    if (phase === 'ready') say(phaseT > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.45, 96, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['D4', 1], ['F4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1],
      ['F4', 1], ['A4', 0.5], ['D5', 0.5], ['C5', 1.5], ['A4', 0.5],
    ], { tempo: 96, wave: 'triangle', volume: 0.06, loop: true, bass: true });
    mode = 'ATTRACT';
    resetRun();
  });
})(game);
