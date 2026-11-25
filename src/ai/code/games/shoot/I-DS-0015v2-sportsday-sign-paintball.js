// I-DS-0015v2-sportsday-sign-paintball.js
// 大看板ぬりあて — 塗り残しの白い場所を狙って絵の具玉を撃ち当て、限られた玉で大看板を塗りつぶす
// 操作: 看板の白い所をタップすると、下の少年が絵の具玉をその場所へ放る。塗った所に当てても無駄玉。3枚目の看板は風で揺れる(社内メモ)
// 終わり: 3枚の看板の白をすべて塗れば成功。玉が尽きて白が残る/時間切れで失敗
// @mechanic: aim_shoot
// @theme: sportsday_signboard_paint
// 世界観: 運動会前日の校庭で、看板係の少年が大看板の塗り残しの白い部分を見つけては玩具の発射器で絵の具玉を当てて塗りつぶす
// 残るもの: 正誤(CLEAR/GAME OVER) + 塗った割合・無駄玉の数・最大連続命中
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、大きいアイコン、飛ぶ数字
  var STYLE = { bg: ['#4ec3ff', '#bfefff', '#e0a060'], main: ['#ff3355', '#ffd21f', '#2b7bff'], accent: ['#21d07a', '#111111'] };
  var A = {
    sky: STYLE.bg[0], skyLow: STYLE.bg[1], dirt: STYLE.bg[2],
    red: STYLE.main[0], yellow: STYLE.main[1], blue: STYLE.main[2], green: STYLE.accent[0], ink: STYLE.accent[1],
    white: '#ffffff', paper: '#fbfbf4', wood: '#a0683a', orange: '#ff8a1f', purple: '#a24bff',
  };
  var PAINTS = [A.red, A.yellow, A.blue, A.green, A.orange, A.purple];

  var GAME_TITLE = 'PAINT SHOT';
  var TIME_LIMIT = 18;
  var COLS = 14, ROWS = 10, CELL = 64;
  var BX = (W - COLS * CELL) / 2, BY = H * 0.19;
  var SPLAT = 1.75;
  var BOARDS = [
    { blobs: [[3, 3, 1.5], [9, 6, 1.6], [11, 2, 1.2]], spare: 2, sway: 0 },
    { blobs: [[2, 7, 1.5], [6, 2, 1.1], [8, 6, 0.9], [12, 3, 1.5]], spare: 2, sway: 0 },
    { blobs: [[2, 2, 1.2], [5, 7, 1.5], [8, 3, 1.1], [11, 7, 1.0], [12, 2, 0.9]], spare: 2, sway: 95 },
  ];
  var BOY_X = W / 2, BOY_Y = H * 0.82;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var grid, whiteLeft, whiteTotal, painted, boardIx, ammo, balls, shots, waste, streak, topStreak, score, timeLeft;
  var swayX, swayT, prep, over, clear, stall, resultT, sentEnd, nextT, cool, mood, halfOk, alarm;

  var BOY_A = ['..hhhh..', '.hhhhhh.', '.ffffff.', '.fefeff.', '..ffff..', '.rrrrrr.', 'rrrrrrrr', 'f.rrrr.f', '..bbbb..', '..b..b..', '.kk..kk.'];
  var BOY_B = ['..hhhh..', '.hhhhhh.', '.ffffff.', '.ffffff.', '..ffff..', '.rrrrrr.', 'rrrrrrrr', 'f.rrrr.f', '..bbbb..', '.b....b.', 'kk....kk'];
  var BOY_YAY = ['f.hhhh.f', 'rhhhhhhr', 'rffffffr', '.fefeff.', '..fmmf..', '..rrrr..', '.rrrrrr.', '..rrrr..', '..bbbb..', '.b....b.', 'kk....kk'];
  var BOY_OOPS = ['........', '..hhhh..', '.hhhhhh.', '.ffffff.', '.feffef.', '..fmmf..', 'frrrrrrf', '.rrrrrr.', '..bbbb..', '..b..b..', '.kk..kk.'];
  var BOY_PAL = { h: '#2a1a10', f: '#ffcf9e', e: '#111111', m: '#ff3355', r: '#ffffff', b: '#2b7bff', k: '#111111' };
  var BALL = ['.pppp.', 'pppppp', 'pppppp', 'pppppp', 'pppppp', '.pppp.'];
  var FLAG = ['ppp', 'pp.', 'p..'];

  function pop(str, x, y, sz, col) {
    game.draw.text(str, x - 4, y, { size: sz, color: A.ink, bold: true, align: 'center' });
    game.draw.text(str, x + 4, y, { size: sz, color: A.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y + 5, { size: sz, color: A.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function baseColor(c, r) {
    var cx = c - COLS / 2 + 0.5, cy = r - ROWS / 2 + 0.5;
    if (cx * cx + cy * cy < 9) return A.red;
    if ((c + r) % 6 < 2) return A.yellow;
    return r < ROWS / 2 ? A.blue : A.green;
  }

  function loadBoard(ix) {
    boardIx = ix;
    var b = BOARDS[ix];
    grid = []; whiteLeft = 0;
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) {
        var white = false;
        for (var k = 0; k < b.blobs.length; k++) {
          var bl = b.blobs[k];
          if (Math.hypot(c - bl[0], r - bl[1]) <= bl[2]) white = true;
        }
        row.push({ col: white ? null : baseColor(c, r), fresh: 0, flash: 0 });
        if (white) whiteLeft++;
      }
      grid.push(row);
    }
    ammo = b.blobs.length + b.spare;
    balls = []; nextT = 0;
  }

  function initGame() {
    whiteTotal = 0;
    for (var i = 0; i < BOARDS.length; i++) {
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var w = false;
        for (var k = 0; k < BOARDS[i].blobs.length; k++) { var bl = BOARDS[i].blobs[k]; if (Math.hypot(c - bl[0], r - bl[1]) <= bl[2]) w = true; }
        if (w) whiteTotal++;
      }
    }
    painted = 0; shots = 0; waste = 0; streak = 0; topStreak = 0; score = 0; timeLeft = TIME_LIMIT;
    swayX = 0; swayT = 0; prep = 0.8; over = false; clear = false; stall = 0; resultT = 0; sentEnd = false;
    cool = 0; mood = null; halfOk = false; alarm = 0;
    loadBoard(0);
  }

  function boardLeft() { return BX + swayX; }

  // ---- 撃つ(本番もデモも同じ) ----
  function fire(x, y) {
    if (ammo <= 0 || cool > 0 || nextT > 0) return false;
    ammo--; shots++; cool = 0.16;
    var col = PAINTS[shots % PAINTS.length];
    balls.push({ sx: BOY_X + 110, sy: BOY_Y - 70, tx: x, ty: y, t: 0, dur: 0.34, col: col });
    game.audio.play('se_jump', 0.35);
    mood = { k: 'throw', t: 0.25 };
    return true;
  }

  function splat(x, y, col, live) {
    var hit = 0;
    var lc = (x - boardLeft()) / CELL - 0.5, lr = (y - BY) / CELL - 0.5;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if (Math.hypot(c - lc, r - lr) <= SPLAT) {
        var cell = grid[r][c];
        if (cell.col === null) { hit++; whiteLeft--; }
        cell.col = col; cell.fresh = 0.3;
      }
    }
    game.fx.burst(x, y, { color: col, count: 14, speed: 360 });
    if (hit > 0) {
      streak++; if (streak > topStreak) topStreak = streak;
      if (live) { painted += hit; score += hit * 10 * Math.min(4, streak); }
      game.feedback.good(x, y - 50, { text: '+' + hit * 10 * Math.min(4, streak), color: A.yellow, size: 64 });
      if (streak >= 3) game.fx.popup('COMBO x' + streak, W / 2, BY - 50, { color: A.green, size: 60 });
      mood = { k: 'yay', t: 0.5 };
      if (live && !halfOk && painted >= whiteTotal / 2) {
        halfOk = true;
        game.fx.popup('NICE', W / 2, H * 0.6, { color: A.yellow, size: 90 });
        game.audio.play('se_milestone', 0.5);
      }
    } else {
      streak = 0;
      if (live) waste++;
      game.feedback.bad(x, y - 40, { text: 'MISS', shake: 8 });
      mood = { k: 'oops', t: 0.5 };
    }
    if (whiteLeft <= 0) {
      game.audio.play('se_powerup', 0.45);
      game.fx.popup('CLEAR', W / 2, H * 0.36, { color: A.white, size: 96 });
      nextT = 1.0;
      if (live) score += ammo * 100;
    }
  }

  function stepYard(dt, live) {
    if (cool > 0) cool -= dt;
    swayT += dt;
    swayX = BOARDS[boardIx].sway ? Math.sin(swayT * 1.7) * BOARDS[boardIx].sway : 0;
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      b.t += dt;
      if (b.t >= b.dur) { balls.splice(i, 1); splat(b.tx, b.ty, b.col, live); }
    }
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if (grid[r][c].fresh > 0) grid[r][c].fresh -= dt;
      if (grid[r][c].flash > 0) grid[r][c].flash -= dt;
    }
    if (mood) { mood.t -= dt; if (mood.t <= 0) mood = null; }
    if (nextT > 0) {
      nextT -= dt;
      if (nextT <= 0) {
        if (!live) return;
        if (boardIx >= BOARDS.length - 1) finish(true);
        else loadBoard(boardIx + 1);
      }
    } else if (live && ammo <= 0 && balls.length === 0 && whiteLeft > 0) {
      for (var rr = 0; rr < ROWS; rr++) for (var cc = 0; cc < COLS; cc++) if (grid[rr][cc].col === null) grid[rr][cc].flash = 0.5;
      game.feedback.bad(W / 2, BY + ROWS * CELL / 2, { text: 'MISS', size: 70 });
      stall = 0.5;
      finish(false);
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; clear = ok;
    if (!stall) stall = 0.4;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) score += Math.round(timeLeft * 40);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) {
      if (!sentEnd) return;
      state = S.ATTRACT; initGame(); demo.t = 0; return;
    }
    if (over || stall > 0) return;
    if (prep > 0) { game.audio.play('se_tap', 0.08); return; }
    var onBoard = y > BY - 20 && y < BY + ROWS * CELL + 20;
    if (!onBoard) {
      game.audio.tone('D3', 0.04, { wave: 'square', volume: 0.05 });
      game.fx.burst(x, y, { color: A.white, count: 3, speed: 80 });
      return;
    }
    if (!fire(x, Math.max(BY, Math.min(BY + ROWS * CELL, y)))) {
      game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.06 });
      game.fx.burst(BOY_X + 110, BOY_Y - 70, { color: A.ink, count: 3, speed: 60 });
    }
  });

  // ---- 描画 ----
  function schoolyard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, A.sky], [0.6, A.skyLow], [0.62, A.dirt], [1, '#c8884a']]);
    // 校舎
    game.draw.rect(60, H * 0.08, W - 120, H * 0.1, A.white, 0.7);
    for (var w = 0; w < 9; w++) game.draw.rect(100 + w * 100, H * 0.1, 60, 50, A.sky, 0.6);
    // 万国旗(揺れる)
    for (var f = 0; f < 12; f++) {
      var fx = 30 + f * 90, fy = H * 0.635 + Math.sin(t * 2 + f) * 6;
      game.draw.sprite(FLAG, { p: PAINTS[f % PAINTS.length] }, fx, fy, 14, { anchor: 'topleft' });
    }
    game.draw.line(0, H * 0.635, W, H * 0.635, A.ink, 3);
    // トラックの白線
    for (var l = 0; l < 3; l++) game.draw.rect(0, H * 0.7 + l * 90, W, 8, A.white, 0.7);
  }

  function signboard() {
    var x0 = boardLeft(), t = game.time.elapsed;
    // 吊り縄と脚
    game.draw.line(x0 + 60, H * 0.17, x0 + 60, BY, A.ink, 6);
    game.draw.line(x0 + COLS * CELL - 60, H * 0.17, x0 + COLS * CELL - 60, BY, A.ink, 6);
    game.draw.rect(x0 - 20, BY - 20, COLS * CELL + 40, ROWS * CELL + 40, A.ink);
    game.draw.rect(x0 - 10, BY - 10, COLS * CELL + 20, ROWS * CELL + 20, A.wood);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var cell = grid[r][c];
      var x = x0 + c * CELL, y = BY + r * CELL;
      if (cell.col === null) {
        var glow = 0.75 + 0.25 * Math.sin(t * 7 + (c + r) * 0.4);
        game.draw.rect(x, y, CELL, CELL, A.paper);
        game.draw.rect(x + 4, y + 4, CELL - 8, CELL - 8, A.white, glow);
        if (cell.flash > 0) game.draw.rect(x - 6, y - 6, CELL + 12, CELL + 12, A.red, 0.5);
      } else {
        var g = cell.fresh > 0 ? 1 + cell.fresh : 1;
        game.draw.rect(x + CELL / 2 - CELL * g / 2, y + CELL / 2 - CELL * g / 2, CELL * g, CELL * g, cell.col);
      }
    }
    // 白の塊の縁(狙う物: 白縁+明滅)
    for (var r2 = 0; r2 < ROWS; r2++) for (var c2 = 0; c2 < COLS; c2++) {
      if (grid[r2][c2].col !== null) continue;
      var x2 = x0 + c2 * CELL, y2 = BY + r2 * CELL;
      if (r2 === 0 || grid[r2 - 1][c2].col !== null) game.draw.rect(x2, y2, CELL, 6, A.ink);
      if (r2 === ROWS - 1 || grid[r2 + 1][c2].col !== null) game.draw.rect(x2, y2 + CELL - 6, CELL, 6, A.ink);
      if (c2 === 0 || grid[r2][c2 - 1].col !== null) game.draw.rect(x2, y2, 6, CELL, A.ink);
      if (c2 === COLS - 1 || grid[r2][c2 + 1].col !== null) game.draw.rect(x2 + CELL - 6, y2, 6, CELL, A.ink);
    }
  }

  function flyingBalls() {
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i], k = b.t / b.dur;
      var x = b.sx + (b.tx - b.sx) * k, y = b.sy + (b.ty - b.sy) * k - Math.sin(k * Math.PI) * 220;
      var s = 11 - k * 4;
      game.draw.sprite(BALL, { p: A.ink }, x + 3, y + 3, s + 2, { anchor: 'center' });
      game.draw.sprite(BALL, { p: b.col }, x, y, s, { anchor: 'center' });
    }
  }

  function boy() {
    var t = game.time.elapsed;
    var fr = Math.floor(t * 3) % 2 === 0 ? BOY_A : BOY_B;
    var dy = 0;
    if (mood && mood.k === 'yay') { fr = BOY_YAY; dy = -Math.abs(Math.sin(t * 14)) * 22; }
    if (mood && mood.k === 'oops') fr = BOY_OOPS;
    if (mood && mood.k === 'throw') dy = 8;
    if (over && state !== S.ATTRACT) fr = clear ? BOY_YAY : BOY_OOPS;
    game.draw.rect(BOY_X - 120, BOY_Y + 96, 240, 20, A.ink, 0.25);
    game.draw.sprite(fr, BOY_PAL, BOY_X, BOY_Y + dy, 18, { anchor: 'center' });
    // 発射器(バケツ形の玩具)
    game.draw.rect(BOY_X + 70, BOY_Y - 70, 80, 90, A.ink);
    game.draw.rect(BOY_X + 78, BOY_Y - 62, 64, 74, PAINTS[(shots + 1) % PAINTS.length]);
    game.draw.rect(BOY_X + 78, BOY_Y - 62, 64, 12, A.white, 0.5);
    // 残り玉
    for (var a = 0; a < 7; a++) {
      var have = a < ammo;
      game.draw.sprite(BALL, { p: have ? PAINTS[(shots + 1 + a) % PAINTS.length] : '#b08a60' }, W * 0.07 + (a % 4) * 66, H * 0.85 + Math.floor(a / 4) * 66, 9, { anchor: 'center', alpha: have ? 1 : 0.5 });
    }
  }

  function drawHud() {
    var pct = Math.round((1 - whiteLeft / Math.max(1, countWhiteInitial())) * 100);
    pop(pct + '%', W / 2, 64, 62, A.white);
    game.draw.text('SCORE ' + score, W - 40, 44, { size: 32, color: A.ink, bold: true, align: 'right' });
    for (var b = 0; b < BOARDS.length; b++) {
      game.draw.rect(50 + b * 56, 28, 44, 36, A.ink);
      game.draw.rect(54 + b * 56, 32, 36, 28, b < boardIx || (b === boardIx && nextT > 0) || (over && clear) ? A.green : A.white);
    }
    game.draw.rect(60, 120, W - 120, 26, A.ink);
    game.draw.rect(65, 125, (W - 130) * Math.max(0, timeLeft / TIME_LIMIT), 16, timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2 ? A.red : A.yellow);
  }

  var initialWhite = -1, initialFor = -1;
  function countWhiteInitial() {
    if (initialFor !== boardIx || initialWhite < 0) {
      initialFor = boardIx; initialWhite = 0;
      var bl = BOARDS[boardIx].blobs;
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        for (var k = 0; k < bl.length; k++) if (Math.hypot(c - bl[k][0], r - bl[k][1]) <= bl[k][2]) { initialWhite++; break; }
      }
    }
    return initialWhite;
  }

  function drawResult() {
    game.draw.rect(0, H * 0.2, W, H * 0.4, A.ink, 0.72);
    pop(clear ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 112, clear ? A.yellow : A.red);
    pop('SCORE ' + score, W / 2, H * 0.36, 62, A.white);
    pop(Math.round((painted / whiteTotal) * 100) + '%   MISS ' + waste, W / 2, H * 0.42, 46, A.green);
    if (clear && score > game.best) {
      if (Math.floor(resultT * 4) % 2 === 0) pop('NEW RECORD', W / 2, H * 0.49, 66, A.yellow);
    } else {
      pop('BEST ' + Math.max(game.best, clear ? score : 0), W / 2, H * 0.49, 44, A.yellow);
    }
    if (!clear) pop('あと' + Math.max(1, 100 - Math.round((painted / whiteTotal) * 100)) + '%!', W / 2, H * 0.56, 66, A.yellow);
    if (sentEnd && Math.floor(game.time.elapsed * 2) % 2 === 0) pop('TAP TO CONTINUE', W / 2, H * 0.965, 36, A.white);
  }

  // ---- ATTRACT: fire()で 白に命中 → 塗った所に撃って無駄玉(失敗例) → 残りの白に命中して看板を仕上げる ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.6, press: 0, ix: 0 };
  var DEMO_AIMS = [[3, 3, 1.0], [6, 8, 1.9], [9, 6, 2.8], [11, 2, 3.6]];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) { initGame(); prep = 0; demo.ix = 0; }
    stepYard(dt, false);
    if (demo.press > 0) demo.press -= dt;
    if (demo.ix < DEMO_AIMS.length) {
      var a = DEMO_AIMS[demo.ix];
      var tx = boardLeft() + (a[0] + 0.5) * CELL, ty = BY + (a[1] + 0.5) * CELL;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 7);
      demo.gy += (ty - demo.gy) * Math.min(1, dt * 7);
      if (cyc >= a[2]) { fire(tx, ty); demo.press = 0.22; demo.ix++; }
    } else {
      demo.gx += (W * 0.7 - demo.gx) * Math.min(1, dt * 2);
      demo.gy += (H * 0.62 - demo.gy) * Math.min(1, dt * 2);
    }
  }

  // ---- メインループ ----
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      schoolyard();
      signboard();
      flyingBalls();
      boy();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      pop(GAME_TITLE, W / 2, H * 0.06 + Math.sin(game.time.elapsed * 3) * 6, 104, A.yellow);
      pop('HI-SCORE ' + game.best, W / 2, H * 0.115, 42, A.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) pop('► 100円 投入 ◄', W / 2, H * 0.965, 46, A.yellow);
      else pop('TAP TO START', W / 2, H * 0.965, 42, A.white);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      schoolyard(); signboard(); boy(); drawHud();
      if (clear && Math.floor(resultT * 6) !== Math.floor((resultT - dt) * 6)) {
        game.fx.burst(game.random(140, W - 140), game.random(H * 0.2, H * 0.55), { color: PAINTS[Math.floor(game.random(0, 6)) % 6], count: 18, speed: 460 });
      }
      drawResult();
      if (!sentEnd && resultT >= 1.3) {
        sentEnd = true;
        var st = { paintedPct: Math.round((painted / whiteTotal) * 100), shots: shots, wasted: waste, topStreak: topStreak };
        if (clear) game.end.success(score, st); else game.end.failure(st);
      }
      return;
    }

    if (stall > 0) {
      stall -= dt;
      if (stall <= 0 && over) { state = S.RESULT; resultT = 0; }
    } else if (over) {
      state = S.RESULT; resultT = 0;
    } else if (prep > 0) {
      prep -= dt;
      if (prep <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      stepYard(dt, true);
      if (timeLeft < 4) {
        alarm -= dt;
        if (alarm <= 0) { alarm = 0.5; game.audio.tone('B5', 0.04, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && !over) {
        timeLeft = 0;
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c].col === null) grid[r][c].flash = 0.5;
        game.feedback.bad(W / 2, BY + ROWS * CELL / 2, { text: 'TIME UP', size: 70 });
        stall = 0.5;
        finish(false);
      }
    }

    schoolyard();
    signboard();
    flyingBalls();
    boy();
    drawHud();
    if (prep > 0) pop(prep > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, A.yellow);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['C5', 0.25], ['D5', 0.25], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
      ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['G4', 0.5], ['C5', 2],
    ], { tempo: 140, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
