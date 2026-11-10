// I-Switch2-0004v3-gibbon-vine-lastgrab.js
// ぎりぎりつる渡り — 揺れて近づくつるを、向きを変えて離れ始める寸前まで待ってつかむほど高得点。テナガザルの子がつるを渡っていく
// 操作: 画面のどこかをタップするとテナガザルの子が手を伸ばしてつるの先をつかむ。つるの先が手の届く輪に入ると白く光る。近づくにつれて遅くなり(きしむ音の間隔が開く)、止まった所で向きを変えて離れていく。向きを変える前ならつかめて、変わる寸前ほど高得点。変わった後につかむと滑って下の枝へ落ちる。輪に届かない浅い揺れもあるので見送る
// 終わり: 22秒のうちに6本渡って実のなる木に着けばCLEAR。滑り落ちるのが2回、または時間切れでGAME OVER
// @mechanic: near_miss
// @theme: rainforest_gibbon_vine_swing
// 世界観: 霧の立つ熱帯の森で、テナガザルの子が揺れるつるを離れる寸前ぎりぎりでつかみ移り、樹冠の向こうの実のなる木を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡った本数・PERFECT数・最大連続・滑った回数・ぎりぎり得点のスコア
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面は横ストリップのベタ塗り、頂点は毎フレーム微小に揺らす、遠景はフォグ色で潰す
  var STYLE = { bg: ['#1d4f45', '#86c29a'], main: ['#2f7a4a', '#5aa85e', '#6b4a2e'], accent: ['#ffe14a', '#ffffff'] };
  var LEAF_D = STYLE.main[0], LEAF_L = STYLE.main[1], BARKC = STYLE.main[2], GOLD = STYLE.accent[0], WHITE = STYLE.accent[1];
  var INK = '#10241c', FOGC = '#a9d6b8', MISSC = '#ff4d4d', VINE = '#3d6b2a';

  var GAME_TITLE = 'VINE LASTGRAB';
  var TIME_LIMIT = 22;
  var NEEDED = 6;
  var MAX_MISS = 2;
  var GAP = 460, PIV_Y = 280, VL = 700, AFAR = 0.3, HOLD_X = 300, RX = 400, RY = 960, RR = 150;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var cur, camX, passes, passI, A, p, T, entered, thEnter, trans, grabTh, fallT, lockT, tickAcc, lastTip, demoMode;
  var stopT, stopKind, grabs, perfects, misses, streak, maxStreak, score, finalScore, timeLeft, readyT, fin, cleared, postT;
  var joyT, warnT, endWhy;

  var GIB_A = ['..a.......a.', '..a......a..', '..a.....a...', '..affffa....', '..ffffff....', '.fwccccwf...', '.fckcckcf...', '.fwccccwf...', '..ffffff....', '..ffffff....', '...ffff.....', '...f..f.....', '..ff..ff....'];
  var GIB_B = ['..a.........', '..a.........', '..a.........', '..affff.....', '..ffffffa...', '.fwccccwfa..', '.fckcckcf.a.', '.fwccccwf...', '..ffffff....', '..ffffff....', '...ffff.....', '..ff..ff....', '............'];
  var GIB_FLY = ['a..........a', '.a........a.', '..a.ffff.a..', '...ffffff...', '..fwccccwf..', '..fckcckcf..', '..fwccccwf..', '...ffffff...', '...ffffff...', '....ffff....', '...ff..ff...', '..ff....ff..', '............'];
  var GIB_SLIP = ['.a........a.', '..a......a..', '...a.ff.a...', '...ffffff...', '..fwccccwf..', '..fcoccocf..', '..fwccccwf..', '...ffffff...', '...ffffff...', '....ffff....', '..ff....ff..', '.f........f.', '............'];
  var GIB_PAL = { a: '#4a3426', f: '#4a3426', w: '#e8dcc0', c: '#d9b48a', k: INK, o: WHITE };
  var FRUIT = ['..gg..', '.oooo.', 'oooooo', 'oyoooo', 'oooooo', '.oooo.'];

  function out(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: INK, bold: true });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true });
  }
  function lx(a, b, y) { return b[1] === a[1] ? a[0] : a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); }
  // 三角形を横ストリップで塗る(ローポリの面)
  function tri(x1, y1, x2, y2, x3, y3, col, al, st) {
    var q = [[x1, y1], [x2, y2], [x3, y3]].sort(function(m, n) { return m[1] - n[1]; });
    var s = st || 8;
    for (var y = q[0][1]; y < q[2][1]; y += s) {
      var xa = lx(q[0], q[2], y), xb = y < q[1][1] ? lx(q[0], q[1], y) : lx(q[1], q[2], y);
      game.draw.rect(Math.min(xa, xb), y, Math.abs(xb - xa) + 1, s, col, al);
    }
  }
  function jit(i, t) { return Math.sin(t * 7 + i * 3.7) * 1.5; }

  function makePasses(k) {
    if (demoMode) return k === 1 ? [0.56, 0.56, 0.56] : [0.25, 0.56, 0.56];
    var arr = [], fakes = k < 2 ? 0 : k < 4 ? (Math.random() < 0.5 ? 1 : 0) : 1 + (Math.random() < 0.4 ? 1 : 0);
    for (var i = 0; i < fakes; i++) arr.push(0.2 + Math.random() * 0.07);
    for (var j = 0; j < 4; j++) arr.push(0.42 + Math.random() * 0.18);
    return arr;
  }
  function setupNext() {
    passes = makePasses(cur + 1); passI = 0; A = passes[0]; p = 0; entered = false; thEnter = 0;
    T = 1.8 - Math.min(cur, 5) * 0.06;
  }
  function thetaAt(pp, an) { var c = (1 - Math.cos(2 * Math.PI * pp)) / 2; return -AFAR + (an + AFAR) * c; }
  function vineX(k) { return HOLD_X + k * GAP - camX; }
  function tipOf(k, th) { var px = vineX(k); return { x: px - VL * Math.sin(th), y: PIV_Y + VL * Math.cos(th) }; }
  function nextTh() { return trans > 0 ? grabTh * (trans / 0.55) : thetaAt(p, A); }
  function inReach(tp) { return Math.hypot(tp.x - RX, tp.y - RY) < RR; }

  function initGame() {
    cur = 0; camX = 0; trans = 0; grabTh = 0; fallT = 0; lockT = 0; tickAcc = 0; lastTip = null;
    grabs = 0; perfects = 0; misses = 0; streak = 0; maxStreak = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = '';
    fin = false; cleared = false; postT = 0; joyT = 0; warnT = 0; endWhy = '';
    setupNext();
  }

  // つかむ(本番もデモも同じ処理)
  function grab() {
    if (trans > 0 || stopT > 0 || fallT > 0 || lockT > 0 || fin) { game.audio.tone('C4', 0.03, { wave: 'square', volume: 0.04 }); return; }
    var th = thetaAt(p, A), tp = tipOf(cur + 1, th);
    if (!inReach(tp)) {
      // 空をつかむ: 少しのあいだ手が戻らない
      lockT = 0.3; streak = 0;
      game.audio.tone('E3', 0.07, { wave: 'square', volume: 0.07 });
      game.fx.burst(RX, RY, { color: FOGC, count: 5, speed: 120 });
      return;
    }
    if (p >= 0.5) {
      // 向きが変わった後: 止めて、離れていくつるの先を白く大きく
      stopT = 0.45; stopKind = 'slip';
      game.fx.flash(WHITE, 0.14);
      game.audio.tone('C3', 0.28, { wave: 'sawtooth', volume: 0.08, slide: -70 });
      return;
    }
    if (!entered) { entered = true; thEnter = th; }
    var f = Math.max(0, Math.min(1, (th - thEnter) / Math.max(0.01, A - thEnter)));
    var perfect = f > 0.7;
    streak = perfect ? streak + 1 : 0;
    if (streak > maxStreak) maxStreak = streak;
    if (perfect) perfects++;
    grabs++;
    var pts = Math.round((100 + 400 * f * f) * (1 + 0.5 * Math.min(streak, 4)));
    if (mode === S.PLAYING) score += pts;
    game.feedback.good(tp.x, tp.y - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GOLD : LEAF_L, size: 62 });
    game.fx.popup('+' + pts, tp.x, tp.y - 170, { color: WHITE, size: 44 });
    if (streak >= 2) game.fx.popup('x' + (1 + 0.5 * Math.min(streak, 4)), tp.x + 150, tp.y - 60, { color: GOLD, size: 40 });
    game.audio.tone(392 * Math.pow(1.06, f * 10), 0.1, { wave: 'triangle', volume: 0.12 });
    if (grabs === 3 && mode === S.PLAYING) {
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE', W / 2, H * 0.3, { color: GOLD, size: 96 });
    }
    trans = 0.55; grabTh = th; joyT = 0.6;
  }

  function resolveStop() {
    if (stopKind === 'win') { ending(true); return; }
    misses++; streak = 0; fallT = 1.0;
    var tp = tipOf(cur + 1, thetaAt(p, A));
    game.feedback.bad(tp.x, tp.y - 80, { text: 'MISS', color: MISSC, size: 62 });
    if (mode === S.PLAYING && misses >= MAX_MISS) { endWhy = 'miss'; ending(false); }
  }

  function stepVines(dt) {
    if (joyT > 0) joyT -= dt;
    if (lockT > 0) lockT -= dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    if (fin) { if (fallT > 0) fallT -= dt; return; }
    if (trans > 0) {
      trans -= dt;
      camX += GAP * dt / 0.55;
      if (trans <= 0) {
        trans = 0; cur++; camX = cur * GAP;
        if (mode === S.PLAYING && grabs >= NEEDED) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.4); return; }
        setupNext();
        game.audio.tone('A4', 0.05, { wave: 'triangle', volume: 0.08 });
      }
      return;
    }
    if (fallT > 0) fallT -= dt;
    p += dt / T;
    if (p >= 1) { p -= 1; passI++; A = passes[passI % passes.length]; entered = false; }
    var th = thetaAt(p, A), tp = tipOf(cur + 1, th);
    if (!entered && p < 0.5 && inReach(tp)) { entered = true; thEnter = th; game.audio.tone('E6', 0.03, { wave: 'sine', volume: 0.06 }); }
    // きしむ音: つるの先が進んだ距離ごとに鳴る(遅くなるほど間が開く)
    if (lastTip) {
      tickAcc += Math.hypot(tp.x - lastTip.x, tp.y - lastTip.y);
      if (tickAcc > 46) { tickAcc = 0; game.audio.tone(p < 0.5 ? 'D5' : 'A4', 0.02, { wave: 'triangle', volume: 0.05 }); }
    }
    lastTip = tp;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 40) + (MAX_MISS - misses) * 150 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(120 + i * 170, H * 0.35 + (i % 2) * 140, { color: i % 2 ? GOLD : '#ff8a3a', count: 18, speed: 460 });
      game.fx.flash(WHITE, 0.2);
      joyT = 3;
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    if (y < 230) { game.audio.play('se_tap', 0.08); return; }
    game.fx.burst(x, y, { color: LEAF_L, count: 4, speed: 120 });
    grab();
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; demoMode = false; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; demoMode = true; initGame(); demo.t = 0; startBgm(); return; }
  });

  // ---- 描画 ----
  function drawForest(t) {
    game.draw.clear(STYLE.bg[0]);
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.45, STYLE.bg[1]], [1, '#1f3a26']]);
    // 遠景の木(パララックス0.25)+フォグ
    var o1 = -(camX * 0.25) % 360;
    for (var i = -1; i < 5; i++) {
      var bx = o1 + i * 360;
      tri(bx, 1300, bx + 180, 420 + (i % 2) * 90 + jit(i, t), bx + 360, 1300, '#2c6a52', 1, 10);
    }
    game.draw.rect(0, 400, W, 900, FOGC, 0.45);
    // 中景の大きな葉(0.6)
    var o2 = -(camX * 0.6) % 540;
    for (var k = -1; k < 4; k++) {
      var mx = o2 + k * 540;
      tri(mx, 1500, mx + 140, 1180 + jit(k, t), mx + 300, 1520, LEAF_D, 1, 8);
      tri(mx + 200, 1520, mx + 360, 1240 + jit(k + 9, t), mx + 520, 1530, '#3f8a52', 1, 8);
    }
    // 下の枝(滑ったら落ちる所)
    game.draw.rect(0, 1370, W, 30, BARKC);
    game.draw.rect(0, 1370, W, 8, '#8a6440');
    // 林床
    game.draw.rect(0, 1520, W, H - 1520, '#1a3322');
    for (var f = 0; f < 9; f++) {
      var fx = ((f * 150 - camX * 0.9) % 1350 + 1350) % 1350 - 135;
      tri(fx, H, fx + 60, 1600 + (f % 3) * 40 + jit(f, t), fx + 130, H, '#24502e', 1, 10);
    }
    // 樹冠(上)
    var o3 = -(camX) % 240;
    for (var c = -1; c < 6; c++) {
      var cx = o3 + c * 240;
      tri(cx, 220, cx + 120, 360 + (c % 2) * 50 + jit(c + 3, t), cx + 240, 220, c % 2 ? LEAF_D : LEAF_L, 1, 8);
    }
    game.draw.rect(0, 200, W, 40, '#245a3a');
  }

  function drawVine(k, th, t, isNext) {
    var px = vineX(k);
    if (px < -400 || px > W + 400) return;
    var tp = tipOf(k, th);
    game.draw.line(px, PIV_Y - 40, tp.x, tp.y, VINE, 12);
    game.draw.line(px + 3, PIV_Y - 40, tp.x + 3, tp.y, '#5c8f3a', 4);
    for (var l = 1; l < 6; l++) {
      var lxp = px + (tp.x - px) * l / 6, lyp = PIV_Y + (tp.y - PIV_Y) * l / 6;
      tri(lxp, lyp, lxp + (l % 2 ? 46 : -46), lyp + 10 + jit(l + k, t), lxp, lyp + 34, LEAF_L, 1, 4);
    }
    // つかむ先の輪
    var glow = isNext && inReach(tp) && p < 0.5 && trans <= 0 && stopT <= 0;
    var big = isNext && stopT > 0 && stopKind === 'slip' ? 1.5 : 1;
    var fl = big > 1 && Math.floor(t * 16) % 2 === 0;
    game.draw.circle(tp.x, tp.y, 30 * big, fl ? WHITE : glow ? WHITE : '#8fbf5a');
    game.draw.circle(tp.x, tp.y, 17 * big, fl ? MISSC : glow ? GOLD : VINE);
    if (glow && Math.floor(t * 10) % 2 === 0) game.draw.circle(tp.x, tp.y, 44, WHITE, 0.35);
  }

  function drawGibbon(t) {
    var hold = tipOf(cur, 0.04 * Math.sin(t * 2));
    var gx = hold.x, gy = hold.y, fr = Math.floor(t * 3) % 2 ? GIB_A : GIB_B;
    if (trans > 0) {
      var k = 1 - trans / 0.55, to = tipOf(cur + 1, grabTh * (trans / 0.55));
      gx = hold.x + (to.x - hold.x) * k; gy = hold.y + (to.y - hold.y) * k - Math.sin(Math.PI * k) * 90;
      fr = GIB_FLY;
    } else if (fallT > 0 || (stopT > 0 && stopKind === 'slip')) {
      var ft = fallT > 0 ? 1 - fallT : 0;
      var drop = ft < 0.4 ? (ft / 0.4) * 360 : 360 * (1 - (ft - 0.4) / 0.6);
      gy += Math.min(360, drop);
      fr = GIB_SLIP;
    }
    if (lockT > 0) gx += Math.sin(t * 50) * 8;
    if (fin && !cleared) fr = GIB_SLIP;
    if (fin && cleared) fr = GIB_FLY;
    var hop = joyT > 0 && trans <= 0 ? -Math.abs(Math.sin(t * 12)) * 12 : 0;
    game.draw.sprite(fr, GIB_PAL, gx - 30, gy + hop, 12, { anchor: 'topleft' });
    // 手の届く輪
    if (trans <= 0 && fallT <= 0 && !fin) {
      for (var a = 0; a < 20; a++) {
        var an = a / 20 * Math.PI * 2;
        game.draw.rect(RX + Math.cos(an) * RR - 3, RY + Math.sin(an) * RR - 3, 6, 6, WHITE, 0.35);
      }
    }
  }

  function drawGoal(t) {
    var gx = HOLD_X + NEEDED * GAP - camX + 120;
    if (gx > W + 300) return;
    game.draw.rect(gx, 400, 70, 1000, BARKC);
    tri(gx - 200, 520, gx + 35, 220, gx + 270, 520, LEAF_D, 1, 8);
    tri(gx - 160, 700, gx + 35, 420, gx + 230, 700, LEAF_L, 1, 8);
    for (var i = 0; i < 5; i++) game.draw.sprite(FRUIT, { g: LEAF_L, o: '#ff8a3a', y: GOLD }, gx - 120 + i * 60, 560 + (i % 2) * 70 + Math.sin(t * 3 + i) * 4, 9, { anchor: 'center' });
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 30, W - 120, 22, INK, 0.6);
    game.draw.rect(60, 30, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? MISSC : GOLD);
    for (var i = 0; i < NEEDED; i++) {
      var cx = W / 2 - 250 + i * 100;
      game.draw.line(cx, 78, cx, 140, i < grabs ? LEAF_L : '#2a4a38', 10);
      game.draw.circle(cx, 144, 14, i < grabs ? GOLD : '#2a4a38');
    }
    out(grabs + ' / ' + NEEDED, W / 2, 196, 40, WHITE);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(60 + m * 54, 90, 40, 40, m < misses ? MISSC : '#2a4a38');
    out('' + score, W - 140, 130, 46, WHITE);
  }

  function drawScene(t) {
    drawForest(t);
    drawGoal(t);
    drawVine(cur - 1, 0.05 * Math.sin(t * 1.5 + 1), t, false);
    drawVine(cur, 0.04 * Math.sin(t * 2), t, false);
    drawVine(cur + 1, nextTh(), t, true);
    if (trans > 0) drawVine(cur + 2, -AFAR * 0.5, t, false);
    drawGibbon(t);
  }

  // ---- ATTRACT: 本物の stepVines()/grab() で実演。1本目は向きが変わる直前でPERFECT、2本目は浅い揺れを見送り、深い揺れで遅れて滑る ----
  var demo = { t: 0, x: W * 0.62, y: H * 0.84, press: false, done: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { demoMode = true; initGame(); readyT = 0; demo.done = -1; }
    stepVines(dt);
    demo.press = false;
    if (trans <= 0 && stopT <= 0 && fallT <= 0 && demo.done !== cur * 10 + passI) {
      var tp = tipOf(cur + 1, thetaAt(p, A));
      var want = cur === 0 ? (p < 0.5 && thetaAt(p, A) > A - 0.012) : (passI >= 1 && p > 0.53 && inReach(tp));
      if (inReach(tp)) demo.press = p > 0.36;
      if (want) { grab(); demo.done = cur * 10 + passI; demo.press = true; }
    }
    demo.x += (W * 0.62 - demo.x) * Math.min(1, dt * 8);
    demo.y += (H * 0.84 - demo.y) * Math.min(1, dt * 8);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, 110 + Math.sin(t * 2) * 6, 86, GOLD);
      out('HI-SCORE ' + game.best, W / 2, 190, 38, WHITE);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, GOLD);
      else out('TAP TO START', W / 2, H * 0.975, 40, WHITE);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 540, INK, 0.9);
      game.draw.rect(90, H * 0.3, W - 180, 10, cleared ? GOLD : MISSC);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? GOLD : MISSC);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, WHITE);
      out(grabs + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, WHITE);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, GOLD);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, GOLD);
      if (!cleared) out('あと' + (NEEDED - grabs) + '本!', W / 2, H * 0.27, 64, MISSC);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, WHITE);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepVines(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { vines: grabs, perfect: perfects, maxStreak: maxStreak, slips: misses };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepVines(dt);
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: MISSC, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, GOLD);
  });

  function startBgm() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 2],
      ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['D5', 1],
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 0.5], ['A4', 2],
    ], { tempo: 112, wave: 'triangle', volume: 0.05, loop: true, bass: [['A2', 2], ['E2', 2], ['G2', 2], ['D2', 2], ['C3', 2], ['G2', 2], ['F2', 2], ['E2', 2]] });
  }

  game.onStart(function() {
    startBgm();
    mode = S.ATTRACT;
    demoMode = true;
    initGame();
  });
})(game);
