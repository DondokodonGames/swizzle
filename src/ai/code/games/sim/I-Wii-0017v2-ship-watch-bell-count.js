// I-Wii-0017v2-ship-watch-bell-count.js
// 当直の鐘 — 航海士の石板に示された数だけ、船鐘の引き綱を引いてちょうど打ち鳴らす。多くても少なくても失敗
// 操作: 画面の下半分を押して下へ引いて離すと鐘が鳴る。短く引けば1打、印の結び目より長く引けば2打続けて(カンカン)鳴る。示された数ちょうどで手を止め、鐘が静まるのを待つ。砂時計が落ち切る前に。3つ目の数からは打った数の印が石板に残らないので、音を数える
// 終わり: 22秒のうちに5回ちょうどで打ち終えればCLEAR。打ちすぎ/足りないまま砂時計切れが2回、または時間切れでGAME OVER
// @mechanic: count_exact
// @theme: sailing_ship_watch_bell
// 世界観: 夜の帆船の甲板で、当直の水夫が航海士の掲げる石板の数だけ船鐘の引き綱を引き、2打ずつの組で時刻の鐘を打ち鳴らす
// 残るもの: 正誤(CLEAR/GAME OVER) + ちょうど打てた回数・2打組で打てた回数・しくじり・スコア
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 黒地に白ドット。画面の帯ごとに単色のセロハン(上=琥珀、下=緑)
  var STYLE = { bg: ['#05070c', '#101828'], main: ['#ffffff', '#d8d8d8', '#8a8a8a'], accent: ['#ffb000', '#30ff60'] };
  var WH = STYLE.main[0], LG = STYLE.main[1], DG = STYLE.main[2], AMBER = STYLE.accent[0], GREEN = STYLE.accent[1], BK = '#000000', RED = '#ff4040';

  var GAME_TITLE = 'WATCH BELL';
  var TIME_LIMIT = 22;
  var NEEDED = 5;
  var MAX_MISS = 2;
  var TASKS = [2, 3, 5, 4, 7, 6, 8];
  var LONG = 190;
  var BELL_X = W * 0.58, BELL_Y = H * 0.36, ROPE_Y = H * 0.72;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var taskI, N, count, pulls, pairs, ringQ, ringT, idleT, sandT, sandMax, gapT, grab, swing, strikeFlash;
  var good, misses, pairTotal, score, finalScore, timeLeft, readyT, stopT, stopKind, fin, cleared, postT, joyT, sadT, warnT, endWhy, nodT;

  // 水夫(自分)と航海士(石板)。白ドット
  var SAILOR_A = ['...wwwww....', '..wwwwwww...', '...sssss....', '...skssk....', '...sssss....', '..wwwwwww...', '.wwbwwwbww..', '.s.wwwwww.s.', '...ww..ww...', '...ww..ww...', '..ddd..ddd..'];
  var SAILOR_B = ['...wwwww....', '..wwwwwww...', '...sssss....', '...skssk....', '...sssss....', '..wwwwwww.s.', '.wwbwwwbwws.', '.s.wwwwww...', '...ww..ww...', '...ww..ww...', '..ddd..ddd..'];
  var SAILOR_SAD = ['............', '...wwwww....', '..wwwwwww...', '...sssss....', '...ksssk....', '...sssss....', '..wwwwwww...', '.wwbwwwbww..', '.s.wwwwww.s.', '...ww..ww...', '..ddd..ddd..'];
  var MATE_A = ['..kkkkkkk...', '.kkkkkkkkk..', '...sssss....', '...skssk....', '...ssmss....', '..kkkkkkk...', '.kkwkkkwkk..', '.kkkkkkkkk..', '..kk...kk...', '..kk...kk...', '.kkk...kkk..'];
  var MATE_NOD = ['............', '..kkkkkkk...', '.kkkkkkkkk..', '...sssss....', '...s.ss.s...', '..kkkkkkk...', '.kkwkkkwkk..', '.kkkkkkkkk..', '..kk...kk...', '..kk...kk...', '.kkk...kkk..'];
  var SAIL_PAL = { w: WH, s: LG, k: BK, b: DG, d: DG };
  var MATE_PAL = { k: LG, s: WH, w: WH, m: BK };
  var GLASS = ['wwwwwww', '.w...w.', '..w.w..', '...w...', '..w.w..', '.w...w.', 'wwwwwww'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: BK, bold: true });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true });
  }
  function dotLine(x1, y1, x2, y2, gap, r, col) {
    var d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.floor(d / gap));
    for (var i = 0; i <= n; i++) game.draw.rect(x1 + (x2 - x1) * i / n - r, y1 + (y2 - y1) * i / n - r, r * 2, r * 2, col);
  }

  function startTask(i) {
    taskI = i; N = TASKS[i % TASKS.length];
    count = 0; pulls = 0; pairs = 0; ringQ = 0; ringT = 0; idleT = 0;
    sandMax = 1.3 + N * 0.36; sandT = sandMax;
    grab = null; nodT = 0;
  }

  function initGame() {
    good = 0; misses = 0; pairTotal = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0;
    joyT = 0; sadT = 0; warnT = 0; endWhy = ''; gapT = 0; swing = 0; strikeFlash = 0;
    startTask(0);
  }

  // 綱を引いて離す(本番もデモも同じ処理): 長さで1打か2打
  function pull(len) {
    if (ringQ > 0 || stopT > 0 || gapT > 0) { game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.05 }); return; }
    if (len < 40) { game.audio.tone('G3', 0.04, { wave: 'square', volume: 0.05 }); return; }
    var n = len >= LONG ? 2 : 1;
    pulls++; if (n === 2) pairs++;
    ringQ = n; ringT = 0; idleT = 0;
  }

  function strike() {
    count++; swing = 1; strikeFlash = 0.18; idleT = 0;
    game.audio.tone('E6', 0.3, { wave: 'triangle', volume: 0.1 });
    game.audio.tone('E5', 0.22, { wave: 'square', volume: 0.04 });
    if (count > N) {
      // 打ちすぎ: その一打で止めて鐘を白く大きく
      ringQ = 0; stopT = 0.45; stopKind = 'over';
      game.fx.flash(WH, 0.15);
      game.audio.tone('C3', 0.3, { wave: 'square', volume: 0.1, slide: -60 });
    }
  }

  function judgeOk() {
    good++; joyT = 0.7; nodT = 0.8;
    var neat = pulls <= Math.ceil(N / 2) ? 1 : 0;
    if (neat) pairTotal++;
    var pts = 200 + Math.round(Math.max(0, sandT / sandMax) * 100) + neat * 80 + (taskI >= 2 ? 60 : 0);
    if (mode === S.PLAYING) score += pts;
    game.feedback.good(W * 0.24, H * 0.42, { text: neat ? 'PERFECT' : 'GOOD', color: GREEN, size: 60 });
    game.fx.popup('+' + pts, W * 0.24, H * 0.36, { color: WH, size: 42 });
    if (good === 3 && mode === S.PLAYING) {
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE', W / 2, H * 0.24, { color: AMBER, size: 90 });
    }
    if (mode === S.PLAYING && good >= NEEDED) { stopT = 0.4; stopKind = 'win'; game.audio.play('se_powerup', 0.4); return; }
    gapT = 0.55;
  }

  function resolveStop() {
    if (stopKind === 'win') { ending(true); return; }
    misses++; sadT = 0.9;
    game.feedback.bad(stopKind === 'over' ? BELL_X : W * 0.24, stopKind === 'over' ? BELL_Y - 170 : H * 0.42, { text: 'MISS', color: RED, size: 62 });
    if (mode === S.PLAYING && misses >= MAX_MISS) { endWhy = 'miss'; ending(false); return; }
    gapT = 0.55;
  }

  function stepDeck(dt) {
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (nodT > 0) nodT -= dt;
    if (strikeFlash > 0) strikeFlash -= dt;
    swing *= Math.pow(0.04, dt);
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    if (gapT > 0) { gapT -= dt; if (gapT <= 0) { startTask(taskI + 1); game.audio.tone('A4', 0.06, { wave: 'square', volume: 0.06 }); } return; }
    if (ringQ > 0) {
      ringT -= dt;
      if (ringT <= 0) { ringQ--; ringT = 0.2; strike(); }
      return;
    }
    idleT += dt;
    sandT -= dt;
    if (count === N && idleT >= 0.8) { judgeOk(); return; }
    if (sandT <= 0) {
      if (count === N) { judgeOk(); return; }
      // 足りないまま砂時計切れ: 止めて石板を白く大きく
      stopT = 0.45; stopKind = 'under';
      game.fx.flash(WH, 0.15);
      game.audio.tone('G2', 0.3, { wave: 'square', volume: 0.1 });
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 50) + (MAX_MISS - misses) * 150 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, H * 0.3 + (i % 2) * 120, { color: i % 2 ? AMBER : WH, count: 18, speed: 480 });
      game.fx.flash(WH, 0.2);
    } else sadT = 3;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    if (y < H * 0.5) { game.audio.play('se_tap', 0.06); return; }
    grab = { y0: y, len: 0 };
    game.audio.tone('D4', 0.03, { wave: 'square', volume: 0.05 });
  });
  game.onMove(function(x, y) {
    if (!grab) return;
    var was = grab.len;
    grab.len = Math.max(0, Math.min(320, y - grab.y0));
    // 結び目の長さを越えた合図
    if (was < LONG && grab.len >= LONG) game.audio.tone('A5', 0.04, { wave: 'square', volume: 0.06 });
  });
  game.onRelease(function(x, y) {
    if (!grab) return;
    var len = grab.len;
    grab = null;
    if (mode === S.PLAYING && !fin) { game.audio.play('se_tap', 0.15); pull(len); }
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function drawDeck(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 星と月
    for (var s = 0; s < 40; s++) {
      var sx = (s * 263) % W, sy = 240 + (s * 137) % 420;
      if ((Math.floor(t * 2) + s) % 7 !== 0) game.draw.rect(sx, sy, 4, 4, WH);
    }
    game.draw.circle(W * 0.85, 330, 50, WH);
    game.draw.circle(W * 0.85 - 22, 318, 46, STYLE.bg[0]);
    // マストと帆(点線)
    dotLine(W * 0.12, 240, W * 0.12, H * 0.62, 14, 3, LG);
    dotLine(W * 0.12, 300, W * 0.4, H * 0.5, 16, 2, DG);
    dotLine(W * 0.12, H * 0.5, W * 0.4, H * 0.5, 16, 2, DG);
    // 海(点の波、ゆれる)
    var roll = Math.sin(t * 0.9) * 14;
    for (var w = 0; w < 6; w++) for (var k = 0; k < 18; k++) {
      var wx = (k * 64 + t * 30 * (w % 2 ? 1 : -1) + w * 20) % (W + 64) - 32;
      game.draw.rect(wx, H * 0.62 + w * 24 + Math.sin(k + t * 2) * 4 + roll * 0.3, 18, 3, DG);
    }
    // 甲板(手すり)
    game.draw.rect(0, H * 0.68 + roll * 0.2, W, 8, WH);
    for (var p = 0; p < 12; p++) game.draw.rect(p * 96, H * 0.68 + roll * 0.2, 6, 60, LG);
    game.draw.rect(0, H * 0.71 + roll * 0.2, W, H * 0.3, '#0a0a0a');
    for (var b = 0; b < 8; b++) game.draw.rect(0, H * 0.74 + b * 60, W, 2, '#2a2a2a');
  }

  function drawBell(t) {
    var big = stopT > 0 && stopKind === 'over' ? 1.3 : 1;
    var fl = (big > 1 && Math.floor(t * 16) % 2 === 0) || strikeFlash > 0;
    var ang = Math.sin(t * 18) * swing * 0.35;
    // 鐘楼の枠
    game.draw.rect(BELL_X - 170, BELL_Y - 200, 340, 16, WH);
    game.draw.rect(BELL_X - 170, BELL_Y - 200, 16, 260, LG);
    game.draw.rect(BELL_X + 154, BELL_Y - 200, 16, 260, LG);
    // 鐘(段々の矩形で釣鐘形)
    var col = fl ? WH : LG;
    var cx = BELL_X + Math.sin(ang) * 30;
    for (var i = 0; i < 7; i++) {
      var ww = (50 + i * 14) * big, yy = BELL_Y - 150 + i * 26 * big;
      game.draw.rect(cx - ww + Math.sin(ang) * i * 4, yy, ww * 2, 26 * big, col);
    }
    game.draw.rect(cx - 150 * big, BELL_Y + 32 * big, 300 * big, 18 * big, WH);
    game.draw.rect(cx - 70 * big, BELL_Y - 110, 30, 100 * big, DG, 0.6);
    // 舌(クラッパー)
    game.draw.circle(cx - Math.sin(ang) * 60, BELL_Y + 70 * big, 18, WH);
    if (strikeFlash > 0) for (var r = 0; r < 3; r++) game.draw.circle(cx, BELL_Y, 190 + r * 40 + (0.18 - strikeFlash) * 400, WH, 0.12);
  }

  function drawRope(t) {
    var len = grab ? grab.len : 0;
    var x = BELL_X, top = BELL_Y + 90, knob = ROPE_Y + len;
    dotLine(x, top, x + Math.sin(t * 3) * 6, knob, 12, 5, WH);
    // 結び目(2打の長さの印)
    game.draw.rect(x - 40, ROPE_Y + LONG - 6, 80, 12, AMBER);
    game.draw.rect(x - 30, knob - 30, 60, 60, len >= LONG ? AMBER : WH);
    game.draw.rect(x - 18, knob - 18, 36, 36, BK);
    // 引いた長さで鳴る数の予告(点1つ/2つ)
    if (grab) {
      var n = len >= LONG ? 2 : len >= 40 ? 1 : 0;
      for (var d = 0; d < n; d++) game.draw.circle(x + 90 + d * 40, knob, 14, AMBER);
    }
  }

  function drawPeople(t) {
    // 航海士と石板(数)
    var mf = nodT > 0 ? MATE_NOD : MATE_A;
    game.draw.sprite(mf, MATE_PAL, W * 0.24, H * 0.6, 12, { anchor: 'center' });
    var big = stopT > 0 && stopKind === 'under' ? 1.25 : 1;
    var fl = big > 1 && Math.floor(t * 16) % 2 === 0;
    var bw = 280 * big, bh = 260 * big, bx = W * 0.24 - bw / 2, by = H * 0.4 - bh / 2;
    game.draw.rect(bx - 8, by - 8, bw + 16, bh + 16, fl ? WH : LG);
    game.draw.rect(bx, by, bw, bh, fl ? WH : '#1a1a1a');
    out('' + N, W * 0.24, by + 80 * big, 96 * big, fl ? BK : WH);
    // 2打ずつの組の印。打った数は最初の2回だけ残る
    var showTally = taskI < 2;
    for (var i = 0; i < N; i++) {
      var g = Math.floor(i / 2), k = i % 2;
      var dx = bx + 40 * big + g * 60 * big + k * 22 * big, dy = by + 190 * big;
      var hitDot = showTally && i < count;
      game.draw.circle(dx, dy, 9 * big, hitDot ? AMBER : WH, hitDot ? 1 : 0.6);
    }
    // 自分(水夫)
    var sf = sadT > 0 || (fin && !cleared) ? SAILOR_SAD : (grab || ringQ > 0 ? SAILOR_B : SAILOR_A);
    var hop = joyT > 0 ? -Math.abs(Math.sin(t * 12)) * 18 : 0;
    game.draw.sprite(sf, SAIL_PAL, BELL_X + 210, H * 0.8 + hop, 13, { anchor: 'center' });
    // 砂時計
    var r = Math.max(0, sandT / sandMax);
    game.draw.sprite(GLASS, { w: WH }, W * 0.88, H * 0.42, 12, { anchor: 'center' });
    game.draw.rect(W * 0.88 - 30, H * 0.42 - 30 - 0, 60, 30 * r, AMBER);
    game.draw.rect(W * 0.88 - 30, H * 0.42 + 40 - 30 * (1 - r), 60, 30 * (1 - r), AMBER);
    if (r < 0.3 && ringQ === 0 && gapT <= 0 && Math.floor(t * 8) % 2 === 0) game.draw.circle(W * 0.88, H * 0.42 - 70, 10, RED);
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 34, W - 120, 20, DG);
    game.draw.rect(60, 34, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? RED : WH);
    out(good + ' / ' + NEEDED, W / 2, 140, 66, WH);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(80 + m * 60, 120, 40, 40, m < misses ? RED : DG);
    out('' + score, W - 150, 140, 44, WH);
  }

  function drawScene(t) {
    drawDeck(t);
    drawBell(t);
    drawRope(t);
    drawPeople(t);
    // セロハンの帯
    game.draw.rect(0, 0, W, H * 0.3, AMBER, 0.12);
    game.draw.rect(0, H * 0.7, W, H * 0.3, GREEN, 0.1);
  }

  // ---- ATTRACT: 本物の pull()/strike() で実演。2は長く1回(カンカン)でちょうど、次の3は長く2回引いて打ちすぎMISS、5は長2+短1 ----
  var demo = { t: 0, x: BELL_X, y: ROPE_Y, press: false, plan: [], k: 0, ph: 0, pt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0;
      demo.k = 0; demo.ph = 0; demo.pt = 0; demo.task = 0;
    }
    stepDeck(dt);
    if (demo.task !== taskI) { demo.task = taskI; demo.k = 0; demo.ph = 0; demo.pt = 0; }
    var plan = taskI === 0 ? [260] : taskI === 1 ? [260, 260] : [260, 260, 100];
    demo.press = false;
    var hx = BELL_X, hy = ROPE_Y;
    if (demo.k < plan.length && ringQ === 0 && stopT <= 0 && gapT <= 0) {
      demo.pt += dt;
      if (demo.ph === 0) { if (demo.pt > 0.35) { demo.ph = 1; demo.pt = 0; grab = { y0: ROPE_Y, len: 0 }; } }
      else {
        demo.press = true;
        var target = plan[demo.k];
        grab.len = Math.min(target, demo.pt / 0.3 * target);
        if (demo.pt >= 0.38) { var l = grab.len; grab = null; pull(l); demo.k++; demo.ph = 0; demo.pt = 0; }
      }
    }
    if (grab) hy = ROPE_Y + grab.len;
    demo.x = hx; demo.y += (hy - demo.y) * Math.min(1, dt * 12);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 5, 96, AMBER);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 38, WH);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.97, 46, AMBER);
      else out('TAP TO START', W / 2, H * 0.97, 40, WH);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 520, BK, 0.9);
      game.draw.rect(90, H * 0.3, W - 180, 10, cleared ? GREEN : RED);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? GREEN : RED);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, WH);
      out(good + ' / ' + NEEDED + '   PERFECT ' + pairTotal, W / 2, H * 0.46, 44, WH);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, AMBER);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, AMBER);
      if (!cleared) out('あと' + (NEEDED - good) + '回!', W / 2, H * 0.27, 64, RED);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.97, 40, WH);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { exact: good, neatPairs: pairTotal, misses: misses, tasks: taskI + 1 };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepDeck(dt);
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.fx.flash(WH, 0.15);
        game.feedback.bad(W / 2, H * 0.24, { text: 'TIME UP', color: RED, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, AMBER);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 1], ['R', 0.5], ['E4', 0.5], ['A4', 1], ['C5', 1],
      ['B4', 1], ['R', 0.5], ['G4', 0.5], ['E4', 2],
      ['A4', 1], ['R', 0.5], ['C5', 0.5], ['D5', 1], ['C5', 1],
      ['B4', 1], ['G4', 1], ['A4', 2],
    ], { tempo: 88, wave: 'square', volume: 0.045, loop: true, bass: [['A2', 2], ['A2', 2], ['E2', 2], ['E2', 2], ['A2', 2], ['F2', 2], ['E2', 2], ['A2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
